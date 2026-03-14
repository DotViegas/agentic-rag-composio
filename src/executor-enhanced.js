/**
 * Executor aprimorado com todas as melhorias
 * Integra: validação, retry, paginação, checkpoints
 */

import { Agent, run, hostedMcpTool } from '@openai/agents';
import { SchemaValidator } from './validator.js';
import { RetryPolicy, ErrorType } from './retry-policy.js';
import { PaginationManager } from './pagination-manager.js';
import { CheckpointManager } from './checkpoint-manager.js';

export class EnhancedTaskExecutor {
  constructor(composioSession, logger, executionMode = 'normal', userId) {
    this.session = composioSession;
    this.logger = logger;
    this.executionMode = executionMode;
    this.userId = userId;
    this.iterationCount = 0;
    
    // Inicializar módulos de melhoria
    this.validator = new SchemaValidator(logger);
    this.retryPolicy = new RetryPolicy(logger);
    this.paginationManager = new PaginationManager(logger);
    this.checkpointManager = new CheckpointManager(logger);
    
    // Cache de schemas carregados
    this.toolSchemas = new Map();
  }

  async executeWithPlan(plan, state, agentInstructions, userConfirmed = false) {
    this.logger.phase('EXECUÇÃO COM PLANO (ENHANCED)');
    
    // Marcar que usuário já confirmou riscos (se aplicável)
    this.userConfirmed = userConfirmed;
    
    for (let i = 0; i < plan.subtasks.length; i++) {
      const subtask = plan.subtasks[i];
      state.current_subtask_index = i;
      
      this.logger.subtask(i + 1, plan.subtasks.length, subtask.title);
      
      // Gerar chave de idempotência
      const idempotencyKey = this.checkpointManager.generateIdempotencyKey(
        this.userId,
        state.trace_id,
        subtask.id,
        subtask.inputs_required
      );

      // Verificar se já foi executada (idempotência)
      const existingCheckpoint = this.checkpointManager.hasCompletedCheckpoint(idempotencyKey);
      
      if (existingCheckpoint.exists) {
        this.logger.success(`Subtarefa já executada anteriormente (idempotência)`);
        this.logger.field('  Checkpoint', idempotencyKey.substring(0, 16) + '...');
        
        // Restaurar artefatos do checkpoint
        state.artifacts[subtask.id] = existingCheckpoint.checkpoint.artifacts;
        state.addCheckpoint(subtask.id, {
          status: 'completed',
          artifacts: existingCheckpoint.checkpoint.artifacts,
          outputs: existingCheckpoint.checkpoint.outputs,
          from_checkpoint: true
        });
        
        continue; // Pular para próxima subtarefa
      }

      // Verificar dependências
      if (!this.checkDependencies(subtask, state)) {
        throw new Error(`Dependências não satisfeitas para subtask ${subtask.id}`);
      }

      // Verificar riscos - APENAS logar, não bloquear se usuário já confirmou
      if (subtask.hasRisks()) {
        this.logRisks(subtask);
      }

      // Executar subtarefa com retry
      try {
        const startTime = Date.now();
        
        const result = await this.retryPolicy.executeWithRetry(
          async () => await this.executeSubtask(subtask, state, agentInstructions),
          { subtask_id: subtask.id }
        );

        const duration = Date.now() - startTime;
        
        // Validar resultado
        this.validateSubtaskResult(subtask, result.result);
        
        // Salvar artefatos
        state.artifacts[subtask.id] = result.result.artifacts || {};
        
        this.logger.info('Salvando artefatos da subtarefa...');
        this.logger.field('Subtask ID', subtask.id);
        this.logger.field('Artefatos', JSON.stringify(state.artifacts[subtask.id]));
        
        // Salvar checkpoint
        const checkpointData = {
          status: 'completed',
          artifacts: result.result.artifacts,
          outputs: result.result.outputs,
          tool_calls: result.result.tool_calls || [],
          duration_ms: duration,
          retries: result.attempts - 1
        };
        
        state.addCheckpoint(subtask.id, checkpointData);
        this.checkpointManager.saveCheckpoint(idempotencyKey, subtask.id, checkpointData);
        
        this.logger.checkpoint(subtask.id, 'Subtarefa concluída com sucesso');
        
      } catch (error) {
        // Tratamento especial para erro de autenticação
        if (error.errorType === 'AUTH' && error.needsUserAction) {
          this.logger.success('🔐 Autenticação necessária detectada');
          this.logger.field('Link de autenticação', error.authUrl);
          
          // Salvar estado de "aguardando autenticação"
          state.addCheckpoint(subtask.id, {
            status: 'pending_auth',
            auth_url: error.authUrl,
            message: error.message,
            artifacts: { auth_url: error.authUrl }
          });
          
          // Propagar erro de autenticação para o orquestrador
          throw error;
        }
        
        state.addError(subtask.id, error);
        this.logger.error(`Falha na subtarefa ${subtask.id}: ${error.message}`);
        
        // Sugerir ação corretiva
        if (error.errorType) {
          const suggestion = this.retryPolicy.suggestAction(error.errorType, error);
          this.logger.warning(`Ação sugerida: ${suggestion.action}`);
          this.logger.info(`  ${suggestion.message}`);
        }
        
        if (this.executionMode === 'strict') {
          throw error;
        }
        
        this.logger.warning('Continuando execução apesar do erro (modo normal)');
      }
    }

    // Salvar estado completo
    this.checkpointManager.saveExecutionState(state.trace_id, {
      trace_id: state.trace_id,
      status: state.status,
      artifacts: state.artifacts,
      checkpoints: state.checkpoints,
      tool_calls: state.tool_calls,
      errors: state.errors
    });

    return state;
  }

  checkDependencies(subtask, state) {
    for (const depId of subtask.deps) {
      const checkpoint = state.checkpoints.find(cp => cp.subtask_id === depId);
      if (!checkpoint || checkpoint.data.status !== 'completed') {
        this.logger.error(`Dependência ${depId} não foi completada`);
        return false;
      }
    }
    return true;
  }

  logRisks(subtask) {
    const risks = Object.entries(subtask.risk_flags)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key);

    if (risks.length > 0) {
      if (this.userConfirmed) {
        this.logger.info(`⚠️  Executando operação de risco (confirmada pelo usuário): ${risks.join(', ')}`);
      } else {
        this.logger.risk(risks.join(', '));
      }
    }
  }

  async executeSubtask(subtask, state, agentInstructions) {
    const startTime = Date.now();
    const toolCalls = [];
    
    // Configuração de paginação
    const paginationConfig = this.paginationManager.extractPaginationConfig(subtask);
    
    const agent = new Agent({
      name: 'Subtask Executor Enhanced',
      model: 'gpt-4o-mini', // Mudado para mini
      instructions: `${agentInstructions}

TAREFA ORIGINAL DO USUÁRIO:
"${subtask.title}"

CONTEXTO DA TAREFA:
${JSON.stringify(state.artifacts, null, 2)}

SUBTAREFA ATUAL:
ID: ${subtask.id}
Título: ${subtask.title}
Intent: ${subtask.intent}
Toolkits candidatos: ${subtask.toolkit_candidates.join(', ')}
Inputs necessários: ${subtask.inputs_required.join(', ')}
Outputs esperados: ${subtask.outputs_expected.join(', ')}
Critério de sucesso: ${subtask.success_criteria}

CONFIGURAÇÃO DE PAGINAÇÃO:
Max páginas: ${paginationConfig.max_pages}
Max itens: ${paginationConfig.max_items}
Stop condition: ${paginationConfig.stop_condition || 'nenhuma'}

ARTEFATOS DISPONÍVEIS (de subtarefas anteriores):
${JSON.stringify(state.artifacts, null, 2)}

INSTRUÇÕES OBRIGATÓRIAS:
1. VOCÊ JÁ TEM TODAS AS INFORMAÇÕES NECESSÁRIAS no título e intent da subtarefa
2. NÃO peça informações que já foram fornecidas
3. Descobrir ferramentas com COMPOSIO_SEARCH_TOOLS
4. Carregar schemas com COMPOSIO_GET_TOOL_SCHEMAS
5. Garantir autenticação com COMPOSIO_MANAGE_CONNECTIONS (só executar com ACTIVE)
6. ANTES de executar: validar argumentos contra o schema
7. Executar com COMPOSIO_MULTI_EXECUTE_TOOL ou COMPOSIO_EXECUTE_TOOL
8. Se houver paginação, respeitar limites configurados
9. NUNCA invente tool_slug, IDs, parâmetros ou outputs
10. Retorne os artefatos gerados (IDs, links, status)

IMPORTANTE: Extraia as informações necessárias (email, assunto, etc) do título da subtarefa e execute a ação.

Retorne um JSON com:
{
  "artifacts": { "message_id": "...", "file_id": "..." },
  "outputs": { "campo1": "valor1" },
  "success": true
}`,
      tools: [
        hostedMcpTool({
          serverLabel: 'composio',
          serverUrl: this.session.mcp.url,
          headers: this.session.mcp.headers
        })
      ]
    });

    let currentPhase = '';
    let currentToolSchema = null;
    
    const result = await run(agent, subtask.intent, {
      onStepStart: (step) => {
        this.iterationCount++;
        
        if (step.type === 'tool_call') {
          const toolName = step.toolName || '';
          
          // Detectar e logar fases
          if (toolName.includes('SEARCH_TOOLS') && currentPhase !== 'search') {
            this.logger.phase('Descobrir ferramentas com COMPOSIO_SEARCH_TOOLS');
            currentPhase = 'search';
          } else if (toolName.includes('GET_TOOL_SCHEMAS') && currentPhase !== 'schemas') {
            this.logger.phase('Carregar schemas completos com COMPOSIO_GET_TOOL_SCHEMAS');
            currentPhase = 'schemas';
          } else if (toolName.includes('MANAGE_CONNECTIONS') && currentPhase !== 'auth') {
            this.logger.phase('Garantir autenticação com COMPOSIO_MANAGE_CONNECTIONS');
            currentPhase = 'auth';
          } else if ((toolName.includes('EXECUTE_TOOL') || toolName.includes('MULTI_EXECUTE')) && currentPhase !== 'execute') {
            this.logger.phase('Executar com COMPOSIO_MULTI_EXECUTE_TOOL');
            currentPhase = 'execute';
            
            // VALIDAÇÃO DE SCHEMA ANTES DE EXECUTAR
            if (currentToolSchema && step.arguments) {
              this.logger.info('Validando argumentos contra schema...');
              const validation = this.validator.validateWithAutoFix(
                step.toolName,
                step.arguments,
                currentToolSchema
              );
              
              if (!validation.valid) {
                throw new Error(
                  `Validação de schema falhou para ${step.toolName}:\n` +
                  validation.errors.join('\n')
                );
              }
              
              if (validation.fixed) {
                this.logger.warning('Argumentos foram corrigidos automaticamente');
                step.arguments = validation.args;
              }
            }
          }
          
          this.logger.tool(step.toolName, this.iterationCount);
          if (step.arguments && Object.keys(step.arguments).length > 0) {
            this.logger.field('Argumentos', '');
            this.logger.json(step.arguments, 2);
          }
        }
      },
      onStepEnd: (step) => {
        if (step.type === 'tool_call') {
          const duration = Date.now() - startTime;
          
          // Salvar schema se foi GET_TOOL_SCHEMAS
          if (step.toolName.includes('GET_TOOL_SCHEMAS') && step.result) {
            try {
              const schemas = Array.isArray(step.result) ? step.result : [step.result];
              schemas.forEach(schema => {
                if (schema.tool_slug && schema.schema) {
                  this.toolSchemas.set(schema.tool_slug, schema.schema);
                  currentToolSchema = schema.schema;
                }
              });
            } catch (e) {
              this.logger.warning('Falha ao cachear schema');
            }
          }
          
          if (step.error) {
            this.logger.error(`Erro: ${step.error}`);
            toolCalls.push({
              tool: step.toolName,
              args: step.arguments,
              error: step.error,
              duration_ms: duration
            });
          } else if (step.result) {
            this.logger.success('Resultado obtido');
            
            // Formatar resultado
            if (typeof step.result === 'string') {
              const preview = step.result.length > 300 ? step.result.substring(0, 300) + '...' : step.result;
              console.log(`  ${preview}`);
            } else {
              const resultStr = JSON.stringify(step.result, null, 2);
              const preview = resultStr.length > 500 ? resultStr.substring(0, 500) + '...' : resultStr;
              preview.split('\n').forEach(line => console.log(`  ${line}`));
            }
            
            toolCalls.push({
              tool: step.toolName,
              args: step.arguments,
              result_summary: this.summarizeResult(step.result),
              duration_ms: duration
            });
          }
        }
      }
    });

    // Extrair artefatos do resultado
    let artifacts = {};
    let outputs = {};
    
    // O finalOutput é uma string por padrão, não JSON
    const outputText = result.finalOutput || '';
    
    this.logger.info('Processando resultado do agente...');
    this.logger.field('Output do agente', outputText.substring(0, 500)); // Mostrar primeiros 500 chars
    
    try {
      if (outputText) {
        // Tentar parsear como JSON primeiro
        const parsed = JSON.parse(outputText);
        artifacts = parsed.artifacts || {};
        outputs = parsed.outputs || {};
        this.logger.success('Resultado parseado como JSON');
      }
    } catch {
      // Se não for JSON, extrair artefatos do texto
      this.logger.info('Extraindo artefatos do texto da resposta');
      artifacts = this.extractArtifactsFromText(outputText);
      outputs = { raw_output: outputText };
    }

    // Se não encontrou artefatos, tentar extrair do histórico de tool calls
    if (Object.keys(artifacts).length === 0 && toolCalls.length > 0) {
      this.logger.info('Tentando extrair artefatos dos tool calls...');
      this.logger.field('Total de tool calls', toolCalls.length);
      
      // Procurar no último tool call bem-sucedido
      const lastSuccessfulCall = [...toolCalls].reverse().find(tc => !tc.error && tc.result_summary);
      if (lastSuccessfulCall) {
        this.logger.field('Último tool call', lastSuccessfulCall.tool);
        this.logger.field('Resultado', lastSuccessfulCall.result_summary);
        const extractedFromTools = this.extractArtifactsFromText(lastSuccessfulCall.result_summary);
        artifacts = { ...artifacts, ...extractedFromTools };
      } else {
        this.logger.warning('Nenhum tool call bem-sucedido encontrado');
      }
    }

    this.logger.field('Artefatos encontrados', Object.keys(artifacts).length);
    if (Object.keys(artifacts).length > 0) {
      this.logger.json(artifacts, 2);
    } else {
      this.logger.warning('Nenhum artefato foi extraído');
    }

    return {
      artifacts,
      outputs,
      tool_calls: toolCalls,
      success: true
    };
  }

  extractArtifactsFromText(text) {
    if (!text) return {};
    
    const artifacts = {};
    
    this.logger.info('🔍 Analisando texto para extração de artefatos...');
    this.logger.field('Texto (primeiros 200 chars)', text.substring(0, 200));
    
    // Padrões mais abrangentes para capturar IDs e URLs
    const patterns = {
      message_id: [
        /\*\*Message ID\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i, // **Message ID:** `19cea79d0389d430`
        /\*\*Mensagem ID\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i, // **Mensagem ID**: `19cea636e7539772`
        /\*\*ID da mensagem\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i, // **ID da mensagem**: `abc123`
        /Message ID[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /Mensagem ID[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /ID da mensagem[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /message[_\s-]?id[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /id[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /<([a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+)>/i, // Email message ID format
      ],
      thread_id: [
        /\*\*Thread ID\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /\*\*ID da thread\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /Thread ID[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /ID da thread[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /thread[_\s-]?id[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
      ],
      auth_url: [
        /\[.*?\]\((https:\/\/connect\.composio\.dev\/[^\)]+)\)/i, // Markdown link
        /(https:\/\/connect\.composio\.dev\/[^\s\)]+)/i, // URL direta
      ],
      connection_url: [
        /\[.*?\]\((https:\/\/[^\)]*connect[^\)]+)\)/i,
        /(https:\/\/[^\s]*connect[^\s]+)/i,
      ],
      file_id: [
        /\*\*File ID\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i, // **File ID**: `abc123`
        /\*\*ID do arquivo\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i, // **ID do arquivo**: `1LWpgOp-VtDvPRZ8DmuQFta5_rxkuKabw`
        /File ID[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /ID do arquivo[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /file[_\s-]?id[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /arquivo[_\s-]?id[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /file[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
      ],
      issue_id: [
        /\*\*Issue ID\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /\*\*ID da issue\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /Issue ID[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /ID da issue[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /issue[_\s-]?(?:id|number)[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /#(\d+)/i, // GitHub issue format
      ],
      event_id: [
        /\*\*Event ID\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /\*\*ID do evento\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /Event ID[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /ID do evento[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /event[_\s-]?id[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
      ],
      revision: [
        /\*\*Revision\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /\*\*Revisão\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /Revision[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /Revisão[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /rev(?:ision)?[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
      ],
      url: [
        /(https?:\/\/[^\s\)]+)/i,
      ],
      // Padrão genérico para IDs em backticks
      generic_id: [
        /`([a-zA-Z0-9_.-]{10,})`/i, // Qualquer ID em backticks com pelo menos 10 caracteres
      ]
    };

    for (const [key, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        const match = text.match(pattern);
        if (match && match[1]) {
          artifacts[key] = match[1];
          this.logger.success(`✅ Extraído ${key}: ${match[1]}`);
          break; // Usar primeira correspondência
        }
      }
    }

    // Se não encontrou file_id mas encontrou generic_id, tentar mapear
    if (!artifacts.file_id && artifacts.generic_id) {
      // Se o contexto sugere que é um file_id (contém palavras relacionadas a arquivo)
      const fileContext = /arquivo|file|document|doc/i.test(text);
      if (fileContext) {
        artifacts.file_id = artifacts.generic_id;
        delete artifacts.generic_id;
        this.logger.success(`✅ Mapeado generic_id para file_id: ${artifacts.file_id}`);
      }
    }

    // Se não encontrou message_id mas encontrou generic_id, tentar mapear
    if (!artifacts.message_id && artifacts.generic_id) {
      // Se o contexto sugere que é um message_id (contém palavras relacionadas a mensagem)
      const messageContext = /mensagem|message|email|enviado|sent/i.test(text);
      if (messageContext) {
        artifacts.message_id = artifacts.generic_id;
        delete artifacts.generic_id;
        this.logger.success(`✅ Mapeado generic_id para message_id: ${artifacts.message_id}`);
      }
    }

    // Procurar por "success", "completed", "sent", "enviado" para confirmar execução
    const successKeywords = [
      'success', 'sent', 'created', 'completed', 
      'enviado', 'sucesso', 'concluído', 'registrado'
    ];
    
    const lowerText = text.toLowerCase();
    if (successKeywords.some(keyword => lowerText.includes(keyword))) {
      artifacts.status = 'success';
      this.logger.success(`✅ Status de sucesso detectado`);
    }

    this.logger.field('Artefatos extraídos', Object.keys(artifacts).length);
    if (Object.keys(artifacts).length > 0) {
      this.logger.json(artifacts, 2);
    }

    return artifacts;
  }

  validateSubtaskResult(subtask, result) {
    // Verificar se há link de autenticação (caso especial)
    const hasAuthUrl = result.artifacts && (result.artifacts.url || result.artifacts.auth_url || result.artifacts.connection_url);
    const outputText = result.outputs?.raw_output || '';
    const needsAuth = outputText.toLowerCase().includes('autenticar') || 
                      outputText.toLowerCase().includes('conectar') ||
                      outputText.toLowerCase().includes('authenticate') ||
                      outputText.toLowerCase().includes('connect') ||
                      outputText.toLowerCase().includes('autenticação');

    if (hasAuthUrl && needsAuth) {
      this.logger.info('🔐 Autenticação necessária detectada');
      this.logger.field('Link de conexão', result.artifacts.url || result.artifacts.auth_url || result.artifacts.connection_url);
      
      // Criar erro especial de autenticação
      const authError = new Error(outputText);
      authError.errorType = 'AUTH';
      authError.authUrl = result.artifacts.url || result.artifacts.auth_url || result.artifacts.connection_url;
      authError.message = outputText;
      authError.needsUserAction = true;
      
      throw authError;
    }

    // Se não há outputs esperados, considerar válido
    if (!subtask.outputs_expected || subtask.outputs_expected.length === 0) {
      this.logger.success(`Subtarefa ${subtask.id} concluída (sem outputs esperados)`);
      return;
    }

    const missingOutputs = [];
    
    for (const expectedOutput of subtask.outputs_expected) {
      const hasInArtifacts = result.artifacts && result.artifacts[expectedOutput];
      const hasInOutputs = result.outputs && result.outputs[expectedOutput];
      
      if (!hasInArtifacts && !hasInOutputs) {
        missingOutputs.push(expectedOutput);
      }
    }

    if (missingOutputs.length > 0) {
      // Verificar se há indicação de sucesso mesmo sem IDs específicos
      const hasSuccessIndicator = result.artifacts && result.artifacts.status === 'success';
      
      if (hasSuccessIndicator) {
        this.logger.warning(
          `Outputs esperados não encontrados (${missingOutputs.join(', ')}), mas operação indica sucesso`
        );
        
        if (this.executionMode === 'strict') {
          this.logger.warning('Modo STRICT: validação relaxada devido a indicador de sucesso');
        }
        
        this.logger.success(`Validação da subtarefa ${subtask.id} concluída (com avisos)`);
        return;
      }
      
      this.logger.warning(
        `Outputs esperados não encontrados: ${missingOutputs.join(', ')}`
      );
      
      if (this.executionMode === 'strict') {
        throw new Error(
          `Validação falhou: outputs '${missingOutputs.join(', ')}' não encontrados. ` +
          `Critério de sucesso: ${subtask.success_criteria}`
        );
      }
    }

    this.logger.success(`Validação da subtarefa ${subtask.id} concluída`);
  }

  summarizeResult(result) {
    if (!result) return null;
    if (typeof result === 'string') {
      return result.length > 200 ? result.substring(0, 200) + '...' : result;
    }
    const str = JSON.stringify(result);
    return str.length > 200 ? str.substring(0, 200) + '...' : str;
  }
}
