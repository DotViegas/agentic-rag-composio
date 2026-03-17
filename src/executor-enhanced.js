/**
 * Executor aprimorado com todas as melhorias
 * Integra: validação, retry, paginação, checkpoints
 */

import { Agent, run, hostedMcpTool } from '@openai/agents';
import { SchemaValidator } from './validator.js';
import { RetryPolicy, ErrorType } from './retry-policy.js';
import { PaginationManager } from './pagination-manager.js';
import { CheckpointManager } from './checkpoint-manager.js';
import { SearchToolsExtractor } from './search-tools-extractor.js';
import { SearchToolsOptimizer } from './search-tools-optimizer.js';
import { ArtifactsOptimizer } from './artifacts-optimizer.js';
import { SchemaManager } from './schema-manager.js';
import { SchemaBasedArtifactExtractor } from './schema-based-artifact-extractor.js';
import { PersistentCache } from './persistent-cache.js';

export class EnhancedTaskExecutor {
  constructor(composioSession, logger, executionMode = 'normal', userId, debugManager = null) {
    this.session = composioSession;
    this.logger = logger;
    this.executionMode = executionMode;
    this.userId = userId;
    this.debugManager = debugManager;
    this.iterationCount = 0;
    
    // Inicializar módulos de melhoria
    this.validator = new SchemaValidator(logger);
    this.retryPolicy = new RetryPolicy(logger);
    this.paginationManager = new PaginationManager(logger);
    this.checkpointManager = new CheckpointManager(logger);
    
    // Novos módulos para extração baseada em schema
    this.schemaManager = new SchemaManager(logger);
    this.artifactExtractor = new SchemaBasedArtifactExtractor(logger);
    
    // 🚀 NOVO: Cache persistente em disco
    this.persistentCache = new PersistentCache(logger, {
      searchToolsTTL: 24 * 60 * 60 * 1000, // 24 horas
      toolSchemasTTL: 7 * 24 * 60 * 60 * 1000, // 7 dias
      connectionsTTL: 5 * 60 * 1000, // 5 minutos
    });
    
    // Cache de schemas carregados (DEPRECATED - usar schemaManager)
    this.toolSchemas = new Map();
    
    // Cache de SEARCH_TOOLS com TTL/LRU (otimização + memory leak prevention)
    // NOTA: Este cache em memória será gradualmente substituído pelo persistentCache
    this.searchToolsCache = new Map(); // key: use_case, value: { data, timestamp }
    this.cacheMaxSize = 100; // LRU limit
    this.cacheTTL = 15 * 60 * 1000; // 15 minutos
    this.currentUseCase = null; // Track current use case for validation
    
    // Extrator eficiente de SEARCH_TOOLS
    this.searchToolsExtractor = new SearchToolsExtractor(logger);
    
    // Otimizador de SEARCH_TOOLS (reduz ~90% dos tokens)
    this.searchToolsOptimizer = new SearchToolsOptimizer(logger);
    
    // Otimizador de Artifacts (remove base64, reduz ~95% dos tokens)
    this.artifactsOptimizer = new ArtifactsOptimizer(logger);
  }

  /**
   * Limpar cache expirado (TTL) e aplicar LRU
   */
  cleanExpiredCache() {
    const now = Date.now();
    
    // Remover entradas expiradas (TTL)
    for (const [key, value] of this.searchToolsCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.searchToolsCache.delete(key);
        this.logger.info(`Cache expirado removido: ${key}`);
      }
    }
    
    // Aplicar LRU se exceder tamanho máximo
    if (this.searchToolsCache.size > this.cacheMaxSize) {
      const entries = Array.from(this.searchToolsCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - this.cacheMaxSize);
      
      toRemove.forEach(([key]) => {
        this.searchToolsCache.delete(key);
        this.logger.info(`Cache LRU removido: ${key}`);
      });
    }
  }

  /**
   * 🚨 VALIDAÇÃO HARDCODED: Verificar se o toolkit está correto para a tarefa
   */
  validateToolkitSelection(subtask) {
    const title = subtask.title.toLowerCase();
    const intent = subtask.intent.toLowerCase();
    const combined = `${title} ${intent}`;
    const toolkits = subtask.toolkit_candidates || [];
    
    // Regra 1: Se menciona "arquivo" + "drive" ou "google drive" E não é apenas processamento, DEVE ter googledrive
    const mentionsFileDrive = (
      (combined.includes('arquivo') || combined.includes('file')) &&
      (combined.includes('drive') || combined.includes('google drive'))
    );
    
    const hasFileExtension = /\.(xlsx|xls|docx|doc|pdf|txt|csv|pptx|png|jpg|jpeg)/i.test(combined);
    
    // Exceção: Se é apenas processamento/transformação (não busca/download/upload), workbench sozinho é OK
    const isOnlyProcessing = 
      (combined.includes('adicionar') || combined.includes('editar') || combined.includes('processar') || combined.includes('transformar')) &&
      !combined.includes('buscar') &&
      !combined.includes('baixar') &&
      !combined.includes('download') &&
      !combined.includes('upload') &&
      !combined.includes('publicar') &&
      !combined.includes('google drive');
    
    if ((mentionsFileDrive || hasFileExtension) && !toolkits.includes('googledrive') && !isOnlyProcessing) {
      this.logger.error('🚨 ERRO DE TOOLKIT: Tarefa menciona arquivo no Drive mas não usa googledrive!');
      this.logger.field('Tarefa', subtask.title);
      this.logger.field('Toolkits', toolkits.join(', '));
      this.logger.field('Esperado', 'googledrive');
      
      throw new Error(
        `VALIDAÇÃO HARDCODED FALHOU: Tarefa "${subtask.title}" menciona arquivo no Drive ` +
        `mas toolkit_candidates não inclui "googledrive". ` +
        `Toolkits atuais: [${toolkits.join(', ')}]. ` +
        `CORREÇÃO: Use toolkit_candidates: ["googledrive"] para operações com arquivos no Drive.`
      );
    }
    
    // Regra 2: Se usa googlesheets mas menciona "arquivo" ou "buscar" ou "baixar", ERRO
    if (toolkits.includes('googlesheets')) {
      const invalidForSheets = 
        combined.includes('buscar arquivo') ||
        combined.includes('search file') ||
        combined.includes('baixar arquivo') ||
        combined.includes('download file') ||
        combined.includes('arquivo no drive') ||
        combined.includes('file in drive') ||
        hasFileExtension;
      
      if (invalidForSheets) {
        this.logger.error('🚨 ERRO DE TOOLKIT: Tarefa usa googlesheets mas deveria usar googledrive!');
        this.logger.field('Tarefa', subtask.title);
        this.logger.field('Problema', 'Google Sheets não busca/baixa arquivos - use Google Drive');
        
        throw new Error(
          `VALIDAÇÃO HARDCODED FALHOU: Tarefa "${subtask.title}" usa "googlesheets" ` +
          `mas menciona operações de arquivo (buscar/baixar/arquivo no drive). ` +
          `Google Sheets é APENAS para editar células via API. ` +
          `CORREÇÃO: Use toolkit_candidates: ["googledrive"] para operações com arquivos.`
        );
      }
    }
    
    // Regra 3: Se usa gmail mas menciona "arquivo" ou "drive", ERRO
    if (toolkits.includes('gmail')) {
      const invalidForGmail = 
        combined.includes('arquivo no drive') ||
        combined.includes('file in drive') ||
        combined.includes('buscar arquivo') ||
        combined.includes('search file') ||
        (combined.includes('arquivo') && combined.includes('drive'));
      
      if (invalidForGmail) {
        this.logger.error('🚨 ERRO DE TOOLKIT: Tarefa usa gmail mas menciona arquivos do Drive!');
        this.logger.field('Tarefa', subtask.title);
        this.logger.field('Problema', 'Gmail não acessa arquivos do Drive - use Google Drive');
        
        throw new Error(
          `VALIDAÇÃO HARDCODED FALHOU: Tarefa "${subtask.title}" usa "gmail" ` +
          `mas menciona arquivos do Drive. Gmail é APENAS para emails. ` +
          `CORREÇÃO: Use toolkit_candidates: ["googledrive"] para arquivos do Drive.`
        );
      }
    }
    
    this.logger.success('✅ Validação de toolkit: OK');
    this.logger.field('Toolkits', toolkits.join(', '));
  }

  /**
   * Validação hard: rejeitar tools fora da allowlist e campos inválidos
   */
  validateToolCall(toolSlug, args) {
    // 1. Verificar allowlist (se houver cache)
    if (this.currentUseCase) {
      const cached = this.searchToolsCache.get(this.currentUseCase);
      if (cached && cached.data.filtered_tools) {
        if (!cached.data.filtered_tools.includes(toolSlug)) {
          throw new Error(
            `🛡️ Validação Hard: Tool "${toolSlug}" não está na allowlist. ` +
            `Tools permitidas: ${cached.data.filtered_tools.join(', ')}`
          );
        }
      }
    }
    
    // 2. Verificar campos contra schema
    const schema = this.toolSchemas.get(toolSlug);
    if (schema && schema.input_schema && schema.input_schema.properties) {
      const validFields = Object.keys(schema.input_schema.properties);
      
      for (const field of Object.keys(args)) {
        if (!validFields.includes(field)) {
          throw new Error(
            `🛡️ Validação Hard: Campo "${field}" não existe no schema de "${toolSlug}". ` +
            `Campos válidos: ${validFields.join(', ')}`
          );
        }
      }
    }
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
        
        // 🔐 VERIFICAR SE PRECISA DE AUTENTICAÇÃO - PARAR EXECUÇÃO
        if (result.result.artifacts && result.result.artifacts.needs_authentication) {
          this.logger.warning('🔐 Autenticação necessária detectada - parando execução das subtarefas');
          this.logger.field('Link de autenticação', result.result.artifacts.auth_url || result.result.artifacts.url);
          
          // Salvar checkpoint como sucesso (aguardando autenticação)
          const checkpointData = {
            status: 'pending_auth',
            artifacts: result.result.artifacts,
            outputs: result.result.outputs,
            tool_calls: result.result.tool_calls || [],
            duration_ms: duration,
            retries: result.attempts - 1,
            needs_authentication: true
          };
          
          state.addCheckpoint(subtask.id, checkpointData);
          this.checkpointManager.saveCheckpoint(idempotencyKey, subtask.id, checkpointData);
          
          // Capturar checkpoint no debug
          if (this.debugManager) {
            this.debugManager.captureCheckpoint(subtask.id, checkpointData);
          }
          
          this.logger.checkpoint(subtask.id, 'Subtarefa pausada (aguardando autenticação)');
          
          // Marcar estado como aguardando autenticação
          state.status = 'pending_auth';
          state.auth_required = true;
          state.auth_url = result.result.artifacts.auth_url || result.result.artifacts.url;
          state.auth_message = result.result.artifacts.message;
          
          // PARAR EXECUÇÃO - não continuar com as próximas subtarefas
          this.logger.warning('⏸️  Execução pausada - usuário precisa autenticar antes de continuar');
          break; // Sair do loop de subtarefas
        }
        
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
        
        // Capturar checkpoint no debug
        if (this.debugManager) {
          this.debugManager.captureCheckpoint(subtask.id, checkpointData);
        }
        
        this.logger.checkpoint(subtask.id, 'Subtarefa concluída com sucesso');
        
      } catch (error) {
        // Capturar erro no debug
        if (this.debugManager) {
          this.debugManager.captureError('subtask_execution', error, { subtask_id: subtask.id });
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
    
    // 🚨 VALIDAÇÃO HARDCODED: Verificar toolkit correto baseado na tarefa
    this.validateToolkitSelection(subtask);
    
    // Configuração de paginação
    const paginationConfig = this.paginationManager.extractPaginationConfig(subtask);
    
    const agent = new Agent({
      name: 'Subtask Executor Enhanced',
      model: 'gpt-4o-mini',
      instructions: `VOCÊ É UM EXECUTOR DE SUBTAREFAS ESPECIALIZADO.

REGRA #1 (MAIS IMPORTANTE): SEMPRE especifique o parâmetro "toolkit" ao chamar COMPOSIO_SEARCH_TOOLS ou COMPOSIO_MANAGE_CONNECTIONS.

TOOLKIT CORRETO PARA ESTA TAREFA: ${subtask.toolkit_candidates.filter(t => t !== 'workbench').join(', ').toUpperCase()}

${subtask.toolkit_candidates.includes('googledrive') ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 ATENÇÃO: Esta tarefa usa GOOGLE DRIVE (não Sheets, não Gmail!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OBRIGATÓRIO:
✅ COMPOSIO_SEARCH_TOOLS(use_case="...", toolkit="googledrive")
✅ COMPOSIO_MANAGE_CONNECTIONS(toolkit="googledrive", action="check")

PROIBIDO:
❌ toolkit="googlesheets" - Sheets é para células, NÃO para arquivos!
❌ toolkit="gmail" - Gmail é para emails, NÃO para arquivos!
❌ Omitir o parâmetro toolkit - SEMPRE especifique!

Esta tarefa é sobre ARQUIVOS no Google Drive.
Google Drive = buscar/baixar/upload ARQUIVOS
Google Sheets = editar CÉLULAS (não use para arquivos!)
Gmail = enviar/ler EMAILS (não use para arquivos!)

SE VOCÊ USAR O TOOLKIT ERRADO, RECEBERÁ UM ERRO E A EXECUÇÃO FALHARÁ.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

${agentInstructions}

SUBTAREFA ATUAL:
ID: ${subtask.id}
Título: ${subtask.title}
Intent: ${subtask.intent}
Toolkits candidatos: ${subtask.toolkit_candidates.join(', ')}
${agentInstructions}

SUBTAREFA ATUAL:
ID: ${subtask.id}
Título: ${subtask.title}
Intent: ${subtask.intent}
Toolkits candidatos: ${subtask.toolkit_candidates.join(', ')}
Inputs necessários: ${subtask.inputs_required.join(', ')}
Critério de sucesso: ${subtask.success_criteria}

CONFIGURAÇÃO DE PAGINAÇÃO:
Max páginas: ${paginationConfig.max_pages}
Max itens: ${paginationConfig.max_items}
Stop condition: ${paginationConfig.stop_condition || 'nenhuma'}

${this.artifactsOptimizer.formatForPrompt(
  this.artifactsOptimizer.buildArtifactsManifest(state.artifacts)
)}

🔄 IMPORTANTE - PROPAGAÇÃO DE ARTEFATOS:
Se esta subtarefa depende de artefatos de subtarefas anteriores, você DEVE:
1. Verificar quais artefatos estão disponíveis acima
2. Usar os valores corretos (ex: file_id, message_id, etc.)
3. Retornar TODOS os artefatos relevantes no JSON final

NOTA: Conteúdos de arquivo (base64, binários) estão armazenados em checkpoint.
Use file_id, download_ref ou web_view_link para referenciar arquivos.

INSTRUÇÕES OBRIGATÓRIAS:
1. VOCÊ JÁ TEM TODAS AS INFORMAÇÕES NECESSÁRIAS no título e intent da subtarefa
2. NÃO peça informações que já foram fornecidas
3. Descobrir ferramentas com COMPOSIO_SEARCH_TOOLS (SEMPRE especifique toolkit!)
4. Carregar schemas com COMPOSIO_GET_TOOL_SCHEMAS
5. Garantir autenticação com COMPOSIO_MANAGE_CONNECTIONS (SEMPRE especifique toolkit!)
   - SEMPRE chame COMPOSIO_MANAGE_CONNECTIONS(toolkit="...", action="check") ANTES de executar qualquer ferramenta
   - Se a conexão não estiver ativa, COMPOSIO_MANAGE_CONNECTIONS retornará um link de autenticação
   - Quando receber link de autenticação, retorne JSON com:
     {
       "artifacts": {
         "auth_url": "link_recebido",
         "status": "pending_auth",
         "toolkit": "nome_do_toolkit"
       },
       "outputs": {
         "message": "Autenticação necessária. Clique no link para conectar."
       },
       "success": true
     }
6. ANTES de executar: validar argumentos contra o schema
7. Para operações COMPLEXAS (edição de arquivos, processamento de dados, bulk):
   - Use COMPOSIO_REMOTE_WORKBENCH
   - Escreva código Python usando helpers: run_composio_tool, invoke_llm, upload_local_file
   - Exemplo: file_data = run_composio_tool("DROPBOX_DOWNLOAD_FILE", {...})
8. Para operações SIMPLES: Use COMPOSIO_MULTI_EXECUTE_TOOL ou COMPOSIO_EXECUTE_TOOL
9. Se houver paginação, respeitar limites configurados
10. NUNCA invente tool_slug, IDs, parâmetros ou outputs
11. Retorne os artefatos gerados (IDs, links, status)

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
          
          // 🚨 VALIDAÇÃO CRÍTICA: Verificar se SEARCH_TOOLS está usando toolkit correto
          if (toolName.includes('SEARCH_TOOLS') && step.arguments) {
            const requestedToolkit = step.arguments.toolkit;
            const expectedToolkits = subtask.toolkit_candidates;
            
            // Se não especificou toolkit, ERRO!
            if (!requestedToolkit) {
              this.logger.error('🚨 ERRO CRÍTICO: COMPOSIO_SEARCH_TOOLS chamado SEM especificar toolkit!');
              this.logger.field('Toolkits esperados', expectedToolkits.join(', '));
              this.logger.field('Toolkit fornecido', 'NENHUM');
              
              throw new Error(
                `VALIDAÇÃO CRÍTICA FALHOU: COMPOSIO_SEARCH_TOOLS foi chamado sem especificar o parâmetro "toolkit". ` +
                `Você DEVE especificar toolkit="${expectedToolkits[0]}" nos argumentos. ` +
                `Exemplo correto: COMPOSIO_SEARCH_TOOLS(use_case="...", toolkit="${expectedToolkits[0]}")`
              );
            }
            
            // Se especificou toolkit errado, ERRO!
            if (!expectedToolkits.includes(requestedToolkit)) {
              this.logger.error('🚨 ERRO CRÍTICO: COMPOSIO_SEARCH_TOOLS usando toolkit ERRADO!');
              this.logger.field('Toolkit esperado', expectedToolkits.join(', '));
              this.logger.field('Toolkit fornecido', requestedToolkit);
              
              throw new Error(
                `VALIDAÇÃO CRÍTICA FALHOU: COMPOSIO_SEARCH_TOOLS foi chamado com toolkit="${requestedToolkit}" ` +
                `mas a subtarefa requer toolkit="${expectedToolkits.join('" ou "')}". ` +
                `CORREÇÃO: Use COMPOSIO_SEARCH_TOOLS(use_case="...", toolkit="${expectedToolkits[0]}")`
              );
            }
            
            this.logger.success(`✅ SEARCH_TOOLS usando toolkit correto: ${requestedToolkit}`);
          }
          
          // 🚨 VALIDAÇÃO CRÍTICA: Verificar se MANAGE_CONNECTIONS está usando toolkit correto
          if (toolName.includes('MANAGE_CONNECTIONS') && step.arguments) {
            const requestedToolkit = step.arguments.toolkit;
            const expectedToolkits = subtask.toolkit_candidates.filter(t => t !== 'workbench'); // Workbench não precisa de conexão
            
            // Se não especificou toolkit, ERRO!
            if (!requestedToolkit && expectedToolkits.length > 0) {
              this.logger.error('🚨 ERRO CRÍTICO: COMPOSIO_MANAGE_CONNECTIONS chamado SEM especificar toolkit!');
              this.logger.field('Toolkits esperados', expectedToolkits.join(', '));
              this.logger.field('Toolkit fornecido', 'NENHUM');
              
              throw new Error(
                `VALIDAÇÃO CRÍTICA FALHOU: COMPOSIO_MANAGE_CONNECTIONS foi chamado sem especificar o parâmetro "toolkit". ` +
                `Você DEVE especificar toolkit="${expectedToolkits[0]}" nos argumentos. ` +
                `Exemplo correto: COMPOSIO_MANAGE_CONNECTIONS(toolkit="${expectedToolkits[0]}", action="check")`
              );
            }
            
            // Se especificou toolkit errado, ERRO!
            if (requestedToolkit && !expectedToolkits.includes(requestedToolkit)) {
              this.logger.error('🚨 ERRO CRÍTICO: COMPOSIO_MANAGE_CONNECTIONS usando toolkit ERRADO!');
              this.logger.field('Toolkit esperado', expectedToolkits.join(', '));
              this.logger.field('Toolkit fornecido', requestedToolkit);
              
              throw new Error(
                `VALIDAÇÃO CRÍTICA FALHOU: COMPOSIO_MANAGE_CONNECTIONS foi chamado com toolkit="${requestedToolkit}" ` +
                `mas a subtarefa requer toolkit="${expectedToolkits.join('" ou "')}". ` +
                `CORREÇÃO: Use COMPOSIO_MANAGE_CONNECTIONS(toolkit="${expectedToolkits[0]}", action="check")`
              );
            }
            
            if (requestedToolkit) {
              this.logger.success(`✅ MANAGE_CONNECTIONS usando toolkit correto: ${requestedToolkit}`);
            }
          }
          
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
          } else if (toolName.includes('REMOTE_WORKBENCH') && currentPhase !== 'workbench') {
            this.logger.phase('🔧 Executar código no COMPOSIO_REMOTE_WORKBENCH');
            this.logger.info('Sandbox Python persistente com helpers built-in');
            this.logger.info('Disponível: run_composio_tool, invoke_llm, upload_local_file, etc.');
            currentPhase = 'workbench';
          } else if (toolName.includes('REMOTE_BASH') && currentPhase !== 'bash') {
            this.logger.phase('💻 Executar comando bash com COMPOSIO_REMOTE_BASH_TOOL');
            this.logger.info('Mesmo sandbox do Workbench');
            currentPhase = 'bash';
          } else if ((toolName.includes('EXECUTE_TOOL') || toolName.includes('MULTI_EXECUTE')) && currentPhase !== 'execute') {
            this.logger.phase('Executar com COMPOSIO_MULTI_EXECUTE_TOOL');
            currentPhase = 'execute';
            
            // VALIDAÇÃO DE SCHEMA ANTES DE EXECUTAR
            if (currentToolSchema && step.arguments) {
              this.logger.info('Validando argumentos contra schema...');
              
              // Validação hard: allowlist + campos
              try {
                this.validateToolCall(step.toolName, step.arguments);
              } catch (validationError) {
                this.logger.error(validationError.message);
                throw validationError;
              }
              
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
          
          // Capturar tool call no debug (COMPLETO, sem truncamento)
          if (this.debugManager) {
            this.debugManager.captureToolCall(
              step.toolName,
              step.arguments,
              step.result,
              step.error,
              duration,
              {
                iteration: this.iterationCount,
                subtask_id: subtask.id,
                phase: currentPhase
              }
            );
          }
          
          // Cachear resultado do SEARCH_TOOLS (otimização avançada)
          if (step.toolName.includes('SEARCH_TOOLS') && step.result) {
            try {
              const useCase = step.arguments?.use_case || 'default';
              const toolkit = step.arguments?.toolkit || null;
              
              // 🚀 CACHE PERSISTENTE: Verificar se já temos em disco
              const cachedOptimized = this.persistentCache.getOptimizedSearchTools(useCase, toolkit, this.userId);
              
              if (cachedOptimized) {
                this.logger.success('✅ SEARCH_TOOLS carregado do cache persistente');
                this.logger.field('  Use case', useCase);
                this.logger.field('  Toolkit', toolkit || 'all');
                
                // Usar dados do cache
                this.searchToolsCache.set(useCase, {
                  data: cachedOptimized,
                  timestamp: Date.now()
                });
                
                this.currentUseCase = useCase;
                return; // Não precisa processar novamente
              }
              
              // 🚀 OTIMIZAÇÃO: Reduzir ~7k tokens para ~500-800 tokens
              const optimized = this.searchToolsOptimizer.extractEssentials(step.result);
              
              if (!optimized) {
                this.logger.warning('Falha ao otimizar SEARCH_TOOLS');
                return;
              }
              
              // Criar manifest compacto para o agente
              const agentManifest = this.searchToolsOptimizer.createAgentManifest(optimized);
              
              // Etapa 2: Extrair resumo operacional (mantido para compatibilidade)
              const summary = this.searchToolsExtractor.extractOperationalSummary(step.result);
              
              if (!summary) {
                this.logger.warning('Falha ao extrair resumo operacional do SEARCH_TOOLS');
                return;
              }
              
              // Etapa 2.5: Extrair schemas disponíveis no SEARCH_TOOLS
              const schemaInfo = this.schemaManager.extractSchemasFromSearchTools(step.result);
              this.logger.info(`Schemas extraídos do SEARCH_TOOLS: ${schemaInfo.schemasLoaded.size} completos`);
              
              // Etapa 3: Filtrar tools por objetivo e toolkit
              const objective = step.arguments?.use_case || '';
              const allowedToolkits = this.searchToolsExtractor.extractAllowedToolkits(objective);
              const filteredTools = this.searchToolsExtractor.filterToolsByObjective(
                summary.candidate_tools,
                objective,
                allowedToolkits
              );
              
              // Criar plano compacto (máximo 5 tools)
              const compactPlan = this.searchToolsExtractor.createCompactToolPlan(
                filteredTools,
                step.result.tool_schemas || {},
                objective
              );
              
              // Calcular tamanhos
              const originalSize = JSON.stringify(step.result).length;
              const compactSize = JSON.stringify(compactPlan).length;
              const reduction = ((1 - compactSize / originalSize) * 100).toFixed(1);
              
              // Cachear dados essenciais com timestamp (memória)
              this.searchToolsCache.set(useCase, {
                data: {
                  // 🚀 OTIMIZADO: Manifest compacto (~500-800 tokens)
                  optimized: optimized,
                  agent_manifest: agentManifest,
                  
                  // Dados legados (para compatibilidade)
                  summary,
                  filtered_tools: filteredTools,
                  compact_plan: compactPlan,
                  original_size: originalSize,
                  compact_size: compactSize,
                  reduction_percent: reduction,
                  schemas_loaded: schemaInfo.schemasLoaded,
                  schemas_missing: schemaInfo.schemasMissing
                },
                timestamp: Date.now()
              });
              
              // 🚀 CACHE PERSISTENTE: Salvar em disco
              this.persistentCache.setOptimizedSearchTools(
                useCase,
                toolkit,
                this.userId,
                {
                  optimized,
                  agent_manifest: agentManifest,
                  summary,
                  filtered_tools: filteredTools,
                  compact_plan: compactPlan,
                  schemas_loaded: Array.from(schemaInfo.schemasLoaded),
                  schemas_missing: schemaInfo.schemasMissing
                }
              );
              
              // Limpar cache expirado periodicamente
              this.cleanExpiredCache();
              
              // Guardar use case atual para validação
              this.currentUseCase = useCase;
              
              // Logging detalhado
              this.logger.success('✅ SEARCH_TOOLS processado e cacheado (extração eficiente)');
              this.logger.field('  Use case', useCase);
              this.logger.field('  Tools candidatas', summary.candidate_tools.length);
              this.logger.field('  Tools filtradas', filteredTools.length);
              this.logger.field('  Tools no plano', compactPlan.length);
              this.logger.field('  Schemas carregados', schemaInfo.schemasLoaded.size);
              
              if (schemaInfo.schemasMissing.length > 0) {
                this.logger.warning(`  ⚠️  Schemas faltantes: ${schemaInfo.schemasMissing.join(', ')}`);
                this.logger.info('     Use COMPOSIO_GET_TOOL_SCHEMAS para carregar');
              } else {
                this.logger.success('  ✅ Todos os schemas disponíveis');
              }
              
              if (summary.connections_needed.length > 0) {
                this.logger.warning(`  ⚠️  Conexões necessárias: ${summary.connections_needed.join(', ')}`);
                this.logger.info('     Use COMPOSIO_MANAGE_CONNECTIONS antes de executar');
              } else {
                this.logger.success('  ✅ Todas as conexões ativas');
              }
              
              this.logger.field('  Session ID', summary.session_id);
              this.logger.success(`  📊 Redução de tamanho: ${reduction}% (${originalSize} → ${compactSize} bytes)`);
              
              // Mostrar plano compacto formatado
              const promptFormat = this.searchToolsExtractor.formatForPrompt(summary, compactPlan);
              this.logger.info('\n' + promptFormat + '\n');
              
            } catch (e) {
              this.logger.warning('Falha ao processar SEARCH_TOOLS: ' + e.message);
              this.logger.trace(e.stack);
            }
          }
          
          // Salvar schemas se foi GET_TOOL_SCHEMAS
          if (step.toolName.includes('GET_TOOL_SCHEMAS') && step.result) {
            try {
              this.logger.info('📋 Processando schemas do GET_TOOL_SCHEMAS');
              
              // 🚀 CACHE PERSISTENTE: Verificar se já temos schemas em disco
              const requestedSlugs = step.arguments?.tool_slugs || [];
              const cacheResult = this.persistentCache.getToolSchemas(requestedSlugs);
              
              if (cacheResult.hits > 0) {
                this.logger.success(`✅ ${cacheResult.hits} schemas carregados do cache persistente`);
                
                // Adicionar schemas do cache ao schemaManager
                for (const [toolSlug, schema] of Object.entries(cacheResult.schemas)) {
                  this.schemaManager.addSchema(toolSlug, schema);
                  this.toolSchemas.set(toolSlug, schema);
                }
              }
              
              // Processar schemas novos usando SchemaManager
              const schemas = this.schemaManager.processSchemasFromGetToolSchemas(step.result);
              
              // 🚀 CACHE PERSISTENTE: Salvar schemas novos em disco
              const schemasToCache = {};
              for (const [toolSlug, schema] of schemas.entries()) {
                // Só cachear se não estava no cache antes
                if (!cacheResult.schemas[toolSlug]) {
                  schemasToCache[toolSlug] = schema;
                }
              }
              
              if (Object.keys(schemasToCache).length > 0) {
                this.persistentCache.setToolSchemas(schemasToCache);
              }
              
              // Manter compatibilidade com código legado (toolSchemas Map)
              for (const [toolSlug, schema] of schemas.entries()) {
                this.toolSchemas.set(toolSlug, schema);
              }
              
              this.logger.success(`✅ ${schemas.size} schemas processados e cacheados`);
              
              // Mostrar estatísticas do cache
              const stats = this.schemaManager.getCacheStats();
              this.logger.field('  Cache total', `${stats.valid} válidos, ${stats.expired} expirados`);
              
            } catch (e) {
              this.logger.warning('Falha ao processar GET_TOOL_SCHEMAS: ' + e.message);
              this.logger.trace(e.stack);
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
    
    this.logger.info('🎨 Processando resultado do agente...');
    this.logger.field('Output do agente', outputText.substring(0, 500)); // Mostrar primeiros 500 chars
    
    try {
      if (outputText) {
        // Remover markdown code blocks se existirem
        let cleanedText = outputText.trim();
        
        // Procurar por blocos JSON em markdown (```json ... ``` ou ``` ... ```)
        const jsonBlockMatch = cleanedText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
        if (jsonBlockMatch) {
          // Extrair apenas o conteúdo do bloco JSON
          cleanedText = jsonBlockMatch[1].trim();
          this.logger.info('📝 Bloco JSON extraído do markdown');
        } else if (cleanedText.startsWith('```')) {
          // Fallback: remover marcadores se o texto começa com ```
          cleanedText = cleanedText.replace(/^```(?:json)?\s*\n?/i, '');
          cleanedText = cleanedText.replace(/\n?```\s*$/i, '');
        }
        
        // Tentar parsear como JSON
        const parsed = JSON.parse(cleanedText);
        artifacts = parsed.artifacts || {};
        outputs = parsed.outputs || {};
        
        this.logger.success('✅ Resultado parseado como JSON');
        this.logger.field('Artefatos do JSON', Object.keys(artifacts).length);
        if (Object.keys(artifacts).length > 0) {
          this.logger.json(artifacts, 2);
        }
        
        // 🔐 VERIFICAR SE É RESPOSTA DE AUTENTICAÇÃO NECESSÁRIA
        if (artifacts.auth_url || artifacts.status === 'pending_auth') {
          this.logger.warning('🔐 Autenticação necessária detectada no JSON estruturado');
          this.logger.field('Link de autenticação', artifacts.auth_url);
          this.logger.field('Toolkit', artifacts.toolkit || 'não especificado');
          
          // Adicionar flag de autenticação necessária
          artifacts.needs_authentication = true;
          
          // Retornar imediatamente
          return {
            artifacts,
            outputs,
            tool_calls: toolCalls,
            success: true // Considerar sucesso pois o agente identificou corretamente a necessidade de autenticação
          };
        }
      }
    } catch (parseError) {
      // Se não for JSON, extrair artefatos dos tool calls usando schemas
      this.logger.info('❌ Não é JSON válido, extraindo artefatos dos tool calls');
      this.logger.field('Erro de parse', parseError.message);
    }
    
    // 🔐 DETECÇÃO DE FALTA DE CONEXÃO NO TEXTO (FALLBACK)
    // Se não conseguiu parsear JSON, verificar se o agente menciona autenticação no texto
    const needsAuthKeywords = [
      'não está ativa',
      'não está conectada',
      'não está autenticada',
      'precisa autenticar',
      'precisa conectar',
      'autenticar essa conexão',
      'conectar ao',
      'connection is not active',
      'not connected',
      'not authenticated',
      'need to authenticate',
      'need to connect',
      'authenticate this connection',
      'connect to'
    ];
    
    const lowerOutput = outputText.toLowerCase();
    const needsAuth = needsAuthKeywords.some(keyword => lowerOutput.includes(keyword));
    
    // Procurar por link de conexão no texto
    const authLinkMatch = outputText.match(/\[.*?\]\((https:\/\/connect\.composio\.dev\/[^\)]+)\)/i) ||
                          outputText.match(/(https:\/\/connect\.composio\.dev\/[^\s\)]+)/i);
    
    if (needsAuth && authLinkMatch) {
      this.logger.warning('🔐 Falta de conexão detectada no output do agente (fallback)');
      this.logger.field('Link de autenticação', authLinkMatch[1]);
      
      // Retornar artefatos com flag de autenticação necessária
      return {
        artifacts: {
          auth_url: authLinkMatch[1],
          status: 'pending_auth',
          message: outputText,
          needs_authentication: true
        },
        outputs: {
          raw_output: outputText
        },
        tool_calls: toolCalls,
        success: true // Considerar sucesso pois o agente identificou corretamente a necessidade de autenticação
      };
    }

    // Se não encontrou artefatos no JSON, extrair dos tool calls usando schemas
    if (Object.keys(artifacts).length === 0 && toolCalls.length > 0) {
      this.logger.info('🔍 Extraindo artefatos dos tool calls usando schemas...');
      this.logger.field('Total de tool calls', toolCalls.length);
      
      // Procurar no último tool call bem-sucedido
      const successfulCalls = toolCalls.filter(tc => !tc.error && tc.result_summary);
      
      if (successfulCalls.length > 0) {
        this.logger.info(`Encontrados ${successfulCalls.length} tool calls bem-sucedidos`);
        
        // Processar cada tool call
        for (const toolCall of successfulCalls) {
          const toolSlug = toolCall.tool;
          
          // Tentar obter schema do cache
          const schema = this.schemaManager.getSchema(toolSlug);
          
          if (schema && schema.output_parameters) {
            this.logger.info(`📋 Usando schema de ${toolSlug} para extração`);
            
            // Extrair artefatos usando o schema
            const extractedArtifacts = this.artifactExtractor.extractFromToolResult(
              { data: toolCall.result_summary, successful: true },
              schema.output_parameters,
              subtask.outputs_expected
            );
            
            // Merge com artefatos existentes
            artifacts = { ...artifacts, ...extractedArtifacts };
          } else {
            this.logger.warning(`⚠️  Schema não disponível para ${toolSlug}, usando extração por padrões`);
            
            // Fallback: extração por padrões
            const extractedArtifacts = this.artifactExtractor.extractByPatterns(
              toolCall.result_summary
            );
            artifacts = { ...artifacts, ...extractedArtifacts };
          }
        }
      } else {
        this.logger.warning('Nenhum tool call bem-sucedido encontrado');
      }
    }

    // Fallback final: se ainda não tem artefatos, tentar extrair do texto
    if (Object.keys(artifacts).length === 0 && outputText) {
      this.logger.info('🔍 Fallback: extraindo artefatos do texto da resposta');
      artifacts = this.artifactExtractor.extractByPatterns({ text: outputText });
    }

    this.logger.field('Artefatos encontrados', Object.keys(artifacts).length);
    if (Object.keys(artifacts).length > 0) {
      this.logger.json(artifacts, 2);
    } else {
      this.logger.warning('⚠️  Nenhum artefato foi extraído');
    }

    // Se não tem outputs, usar artefatos como outputs
    if (Object.keys(outputs).length === 0) {
      outputs = { ...artifacts };
    }
    
    // 🔄 PROPAGAÇÃO AUTOMÁTICA: Copiar artefatos importantes de subtarefas anteriores
    // Se esta subtarefa tem dependências, propagar artefatos críticos
    if (subtask.deps && subtask.deps.length > 0) {
      const criticalKeys = ['file_id', 'message_id', 'thread_id', 'issue_id', 'event_id', 'user_id', 'session_id'];
      
      for (const depId of subtask.deps) {
        const depArtifacts = state.artifacts[depId];
        if (depArtifacts) {
          for (const key of criticalKeys) {
            // Se o artefato crítico existe na dependência mas não no resultado atual, copiar
            if (depArtifacts[key] && !artifacts[key]) {
              artifacts[key] = depArtifacts[key];
              this.logger.info(`🔄 Propagando artefato crítico: ${key} = ${depArtifacts[key]}`);
            }
          }
        }
      }
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
        /\*\*Arquivo ID\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i, // **Arquivo ID**: `121qoFoT5POAo9YPA8O7QDgwMfPJwEeFa`
        /\*\*ID do arquivo\*\*[:\s]+`?([a-zA-Z0-9_.-]+)`?/i, // **ID do arquivo**: `1LWpgOp-VtDvPRZ8DmuQFta5_rxkuKabw`
        /File ID[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
        /Arquivo ID[:\s]+`?([a-zA-Z0-9_.-]+)`?/i,
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
                      outputText.toLowerCase().includes('autenticação') ||
                      outputText.toLowerCase().includes('conexão');

    if (hasAuthUrl && needsAuth) {
      this.logger.success('🔐 Autenticação necessária detectada - retornando link');
      this.logger.field('Link de conexão', result.artifacts.url || result.artifacts.auth_url || result.artifacts.connection_url);
      
      // NÃO lançar erro - autenticação é um resultado válido
      // Adicionar auth_url aos outputs esperados para passar na validação
      if (!result.artifacts.auth_url && result.artifacts.url) {
        result.artifacts.auth_url = result.artifacts.url;
      }
      if (!result.artifacts.auth_url && result.artifacts.connection_url) {
        result.artifacts.auth_url = result.artifacts.connection_url;
      }
      
      // Marcar como sucesso parcial (aguardando autenticação)
      result.artifacts.status = 'pending_auth';
      result.artifacts.message = outputText;
      result.artifacts.needs_authentication = true; // Flag para parar execução
      
      this.logger.success(`Validação da subtarefa ${subtask.id} concluída (aguardando autenticação)`);
      return; // Retornar sem erro
    }

    // Se não há outputs esperados OU lista está vazia, considerar válido
    if (!subtask.outputs_expected || subtask.outputs_expected.length === 0) {
      this.logger.success(`Subtarefa ${subtask.id} concluída (outputs determinados dinamicamente)`);
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
