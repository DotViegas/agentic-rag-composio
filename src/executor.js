/**
 * Módulo de execução - Fase 2
 * Executa subtarefas com guardrails e checkpoints
 */

import { Agent, run, hostedMcpTool } from '@openai/agents';

export class TaskExecutor {
  constructor(composioSession, logger, executionMode = 'normal') {
    this.session = composioSession;
    this.logger = logger;
    this.executionMode = executionMode;
    this.iterationCount = 0;
  }

  async executeWithPlan(plan, state, agentInstructions) {
    this.logger.phase('EXECUÇÃO COM PLANO');
    
    for (let i = 0; i < plan.subtasks.length; i++) {
      const subtask = plan.subtasks[i];
      state.current_subtask_index = i;
      
      this.logger.subtask(i + 1, plan.subtasks.length, subtask.title);
      
      // Verificar dependências
      if (!this.checkDependencies(subtask, state)) {
        throw new Error(`Dependências não satisfeitas para subtask ${subtask.id}`);
      }

      // Verificar riscos e solicitar confirmação se necessário
      if (subtask.hasRisks()) {
        await this.handleRisks(subtask, state);
      }

      // Executar subtarefa
      try {
        const result = await this.executeSubtask(subtask, state, agentInstructions);
        
        // Validar resultado
        this.validateSubtaskResult(subtask, result);
        
        // Salvar artefatos
        state.artifacts[subtask.id] = result.artifacts || {};
        
        // Checkpoint
        state.addCheckpoint(subtask.id, {
          status: 'completed',
          artifacts: result.artifacts,
          outputs: result.outputs
        });
        
        this.logger.checkpoint(subtask.id, 'Subtarefa concluída com sucesso');
        
      } catch (error) {
        state.addError(subtask.id, error);
        this.logger.error(`Falha na subtarefa ${subtask.id}: ${error.message}`);
        
        if (this.executionMode === 'strict') {
          throw error; // No strict mode, falha em uma subtarefa para tudo
        }
        
        // No modo normal, continua mas registra o erro
        this.logger.warning('Continuando execução apesar do erro (modo normal)');
      }
    }

    return state;
  }

  checkDependencies(subtask, state) {
    // Verificar se todas as dependências foram completadas
    for (const depId of subtask.deps) {
      const checkpoint = state.checkpoints.find(cp => cp.subtask_id === depId);
      if (!checkpoint || checkpoint.data.status !== 'completed') {
        this.logger.error(`Dependência ${depId} não foi completada`);
        return false;
      }
    }
    return true;
  }

  async handleRisks(subtask, state) {
    const risks = Object.entries(subtask.risk_flags)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key);

    if (risks.length > 0) {
      this.logger.risk(risks.join(', '));
      
      if (subtask.isCriticalRisk()) {
        this.logger.confirmation(
          `Esta operação é ${risks.join(', ')}. ` +
          `Subtarefa: ${subtask.title}. ` +
          `Confirme antes de prosseguir.`
        );
        
        // Em produção, aqui você pausaria e esperaria confirmação do usuário
        // Por enquanto, registramos a necessidade de confirmação
        state.confirmations.push({
          subtask_id: subtask.id,
          risks: risks,
          timestamp: new Date().toISOString(),
          status: 'required' // Em produção: 'pending', 'approved', 'rejected'
        });
        
        if (this.executionMode === 'strict') {
          throw new Error(
            `Confirmação necessária para operação crítica: ${risks.join(', ')}. ` +
            `Execução pausada no modo strict.`
          );
        }
      }
    }
  }

  async executeSubtask(subtask, state, agentInstructions) {
    const startTime = Date.now();
    
    // Criar agente específico para esta subtarefa
    const agent = new Agent({
      name: 'Subtask Executor',
      model: 'gpt-4o',
      instructions: `${agentInstructions}

SUBTAREFA ATUAL:
ID: ${subtask.id}
Título: ${subtask.title}
Intent: ${subtask.intent}
Toolkits candidatos: ${subtask.toolkit_candidates.join(', ')}
Inputs necessários: ${subtask.inputs_required.join(', ')}
Outputs esperados: ${subtask.outputs_expected.join(', ')}
Critério de sucesso: ${subtask.success_criteria}

ARTEFATOS DISPONÍVEIS (de subtarefas anteriores):
${JSON.stringify(state.artifacts, null, 2)}

INSTRUÇÕES OBRIGATÓRIAS:
1. Descobrir ferramentas com COMPOSIO_SEARCH_TOOLS
2. Carregar schemas com COMPOSIO_GET_TOOL_SCHEMAS se necessário
3. Garantir autenticação com COMPOSIO_MANAGE_CONNECTIONS (só executar com ACTIVE)
4. Executar com COMPOSIO_MULTI_EXECUTE_TOOL
5. Se houver paginação, continue até completar
6. NUNCA invente tool_slug, IDs, parâmetros ou outputs
7. Retorne os artefatos gerados (IDs, links, status)

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
          
          if (step.error) {
            this.logger.error(`Erro: ${step.error}`);
            state.addToolCall(step.toolName, step.arguments, null, duration, step.error);
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
            
            state.addToolCall(step.toolName, step.arguments, step.result, duration);
          }
        }
      }
    });

    // Extrair artefatos do resultado
    let artifacts = {};
    let outputs = {};
    
    try {
      if (result.finalOutput) {
        // Tentar parsear como JSON
        const parsed = JSON.parse(result.finalOutput);
        artifacts = parsed.artifacts || {};
        outputs = parsed.outputs || {};
      }
    } catch {
      // Se não for JSON, extrair IDs manualmente do texto
      artifacts = this.extractArtifactsFromText(result.finalOutput || '');
      outputs = { raw_output: result.finalOutput };
    }

    return {
      artifacts,
      outputs,
      success: true
    };
  }

  extractArtifactsFromText(text) {
    const artifacts = {};
    
    // Padrões comuns de IDs
    const patterns = {
      message_id: /message[_\s]id[:\s]+([a-zA-Z0-9_-]+)/i,
      file_id: /file[_\s]id[:\s]+([a-zA-Z0-9_-]+)/i,
      issue_id: /issue[_\s](?:id|number)[:\s]+([a-zA-Z0-9_-]+)/i,
      event_id: /event[_\s]id[:\s]+([a-zA-Z0-9_-]+)/i,
      revision: /rev(?:ision)?[:\s]+([a-zA-Z0-9_-]+)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        artifacts[key] = match[1];
      }
    }

    return artifacts;
  }

  validateSubtaskResult(subtask, result) {
    // Verificar se outputs esperados estão presentes
    for (const expectedOutput of subtask.outputs_expected) {
      const hasInArtifacts = result.artifacts && result.artifacts[expectedOutput];
      const hasInOutputs = result.outputs && result.outputs[expectedOutput];
      
      if (!hasInArtifacts && !hasInOutputs) {
        this.logger.warning(
          `Output esperado '${expectedOutput}' não encontrado no resultado`
        );
        
        if (this.executionMode === 'strict') {
          throw new Error(
            `Validação falhou: output '${expectedOutput}' não encontrado. ` +
            `Critério de sucesso: ${subtask.success_criteria}`
          );
        }
      }
    }

    this.logger.success(`Validação da subtarefa ${subtask.id} concluída`);
  }
}
