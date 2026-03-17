/**
 * Sistema de Debug Completo
 * Captura TODA a execução sem cortes quando DEBUG=true
 */

import fs from 'fs';
import path from 'path';

export class DebugManager {
  constructor(traceId, enabled = false) {
    this.traceId = traceId;
    this.enabled = enabled;
    this.debugDir = './.debug';
    this.debugData = {
      trace_id: traceId,
      timestamp_start: new Date().toISOString(),
      timestamp_end: null,
      duration_ms: 0,
      enabled: enabled,
      request: {},
      phases: {
        planning: {},
        execution: {},
        verification: {}
      },
      llm_calls: [],
      tool_calls: [],
      checkpoints: [],
      errors: [],
      warnings: [],
      logs: [],
      final_response: null,
      metadata: {
        node_version: process.version,
        platform: process.platform,
        memory_usage: {}
      }
    };
    
    this.startTime = Date.now();
    
    if (this.enabled) {
      this.ensureDebugDir();
      this.log('info', '🐛 Debug mode ATIVADO - Capturando execução completa');
    }
  }

  ensureDebugDir() {
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
  }

  /**
   * Registra requisição inicial
   */
  captureRequest(userId, task, context) {
    if (!this.enabled) return;
    
    this.debugData.request = {
      user_id: userId,
      task: task,
      context: context,
      timestamp: new Date().toISOString()
    };
    
    this.log('info', `Requisição capturada: userId=${userId}, task="${task}"`);
  }

  /**
   * Captura fase de planejamento
   */
  capturePlanning(plan, agentInstructions) {
    if (!this.enabled) return;
    
    this.debugData.phases.planning = {
      timestamp: new Date().toISOString(),
      goal: plan.goal,
      subtasks: plan.subtasks.map(st => ({
        id: st.id,
        title: st.title,
        intent: st.intent,
        toolkit_candidates: st.toolkit_candidates,
        inputs_required: st.inputs_required,
        outputs_expected: st.outputs_expected,
        success_criteria: st.success_criteria,
        risk_flags: st.risk_flags,
        deps: st.deps
      })),
      clarifying_questions: plan.clarifying_questions,
      global_success_criteria: plan.global_success_criteria,
      stop_conditions: plan.stop_conditions,
      agent_instructions_length: agentInstructions.length
    };
    
    this.log('info', `Planejamento capturado: ${plan.subtasks.length} subtarefas`);
  }

  /**
   * Captura chamada LLM (COMPLETA, sem truncamento)
   */
  captureLLMCall(phase, model, messages, response, duration_ms) {
    if (!this.enabled) return;
    
    const llmCall = {
      timestamp: new Date().toISOString(),
      phase: phase,
      model: model,
      messages: messages, // COMPLETO
      response: response, // COMPLETO
      duration_ms: duration_ms,
      tokens: {
        prompt: response?.usage?.prompt_tokens || 0,
        completion: response?.usage?.completion_tokens || 0,
        total: response?.usage?.total_tokens || 0
      }
    };
    
    this.debugData.llm_calls.push(llmCall);
    this.log('info', `LLM call capturada: ${phase}, model=${model}, tokens=${llmCall.tokens.total}`);
  }

  /**
   * Captura chamada de ferramenta (COMPLETA, sem truncamento)
   */
  captureToolCall(toolName, args, result, error, duration_ms, metadata = {}) {
    if (!this.enabled) return;
    
    const toolCall = {
      timestamp: new Date().toISOString(),
      tool_name: toolName,
      arguments: args, // COMPLETO
      result: result, // COMPLETO
      error: error,
      duration_ms: duration_ms,
      metadata: metadata
    };
    
    this.debugData.tool_calls.push(toolCall);
    
    const status = error ? 'ERROR' : 'SUCCESS';
    this.log('info', `Tool call capturada: ${toolName} - ${status} (${duration_ms}ms)`);
  }

  /**
   * Captura checkpoint de subtarefa
   */
  captureCheckpoint(subtaskId, checkpointData) {
    if (!this.enabled) return;
    
    const checkpoint = {
      timestamp: new Date().toISOString(),
      subtask_id: subtaskId,
      data: checkpointData // COMPLETO
    };
    
    this.debugData.checkpoints.push(checkpoint);
    this.log('info', `Checkpoint capturado: ${subtaskId}, status=${checkpointData.status}`);
  }

  /**
   * Captura fase de execução
   */
  captureExecution(state, executionMode) {
    if (!this.enabled) return;
    
    this.debugData.phases.execution = {
      timestamp: new Date().toISOString(),
      execution_mode: executionMode,
      artifacts: state.artifacts, // COMPLETO
      checkpoints_count: state.checkpoints.length,
      tool_calls_count: state.tool_calls.length,
      errors_count: state.errors.length,
      current_subtask_index: state.current_subtask_index,
      status: state.status
    };
    
    this.log('info', `Execução capturada: ${state.checkpoints.length} checkpoints, ${state.errors.length} erros`);
  }

  /**
   * Captura fase de verificação
   */
  captureVerification(verification, state) {
    if (!this.enabled) return;
    
    this.debugData.phases.verification = {
      timestamp: new Date().toISOString(),
      success: verification.success,
      failures: verification.failures,
      warnings: verification.warnings,
      artifacts_collected: verification.artifacts_collected,
      evidence: verification.evidence,
      final_state: {
        artifacts: state.artifacts,
        checkpoints: state.checkpoints,
        tool_calls: state.tool_calls,
        errors: state.errors
      }
    };
    
    this.log('info', `Verificação capturada: success=${verification.success}`);
  }

  /**
   * Captura resposta final
   */
  captureFinalResponse(response) {
    if (!this.enabled) return;
    
    this.debugData.final_response = response; // COMPLETO
    this.log('info', 'Resposta final capturada');
  }

  /**
   * Captura erro
   */
  captureError(phase, error, context = {}) {
    if (!this.enabled) return;
    
    const errorData = {
      timestamp: new Date().toISOString(),
      phase: phase,
      message: error.message,
      stack: error.stack,
      error_type: error.errorType || 'UNKNOWN',
      context: context
    };
    
    this.debugData.errors.push(errorData);
    this.log('error', `Erro capturado: ${phase} - ${error.message}`);
  }

  /**
   * Captura warning
   */
  captureWarning(message, context = {}) {
    if (!this.enabled) return;
    
    const warning = {
      timestamp: new Date().toISOString(),
      message: message,
      context: context
    };
    
    this.debugData.warnings.push(warning);
    this.log('warning', `Warning capturado: ${message}`);
  }

  /**
   * Log interno (adiciona ao array de logs)
   */
  log(level, message, data = null) {
    if (!this.enabled) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      data: data
    };
    
    this.debugData.logs.push(logEntry);
  }

  /**
   * Captura uso de memória
   */
  captureMemoryUsage() {
    if (!this.enabled) return;
    
    const usage = process.memoryUsage();
    this.debugData.metadata.memory_usage = {
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
      heap_total: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heap_used: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`
    };
  }

  /**
   * Finaliza debug e salva relatório completo
   */
  async finalize() {
    if (!this.enabled) return null;
    
    const endTime = Date.now();
    this.debugData.timestamp_end = new Date().toISOString();
    this.debugData.duration_ms = endTime - this.startTime;
    
    // Capturar uso de memória final
    this.captureMemoryUsage();
    
    // Adicionar estatísticas
    this.debugData.statistics = {
      total_llm_calls: this.debugData.llm_calls.length,
      total_tool_calls: this.debugData.tool_calls.length,
      total_checkpoints: this.debugData.checkpoints.length,
      total_errors: this.debugData.errors.length,
      total_warnings: this.debugData.warnings.length,
      total_logs: this.debugData.logs.length,
      total_tokens: this.debugData.llm_calls.reduce((sum, call) => sum + (call.tokens?.total || 0), 0),
      duration_seconds: (this.debugData.duration_ms / 1000).toFixed(2)
    };
    
    // Salvar relatório completo
    const reportPath = await this.saveReport();
    
    this.log('info', `🎯 Debug finalizado: ${reportPath}`);
    
    return reportPath;
  }

  /**
   * Salva relatório JSON completo
   */
  async saveReport() {
    const filename = `debug_${this.traceId}.json`;
    const filepath = path.join(this.debugDir, filename);
    
    try {
      // Salvar com formatação bonita (indentação)
      fs.writeFileSync(filepath, JSON.stringify(this.debugData, null, 2), 'utf-8');
      
      // Calcular tamanho do arquivo
      const stats = fs.statSync(filepath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🐛 DEBUG REPORT SALVO`);
      console.log(`${'='.repeat(80)}`);
      console.log(`📁 Arquivo: ${filepath}`);
      console.log(`📊 Tamanho: ${sizeMB} MB`);
      console.log(`⏱️  Duração: ${this.debugData.statistics.duration_seconds}s`);
      console.log(`🔧 LLM Calls: ${this.debugData.statistics.total_llm_calls}`);
      console.log(`🛠️  Tool Calls: ${this.debugData.statistics.total_tool_calls}`);
      console.log(`📍 Checkpoints: ${this.debugData.statistics.total_checkpoints}`);
      console.log(`❌ Erros: ${this.debugData.statistics.total_errors}`);
      console.log(`⚠️  Warnings: ${this.debugData.statistics.total_warnings}`);
      console.log(`📝 Logs: ${this.debugData.statistics.total_logs}`);
      console.log(`🎫 Tokens: ${this.debugData.statistics.total_tokens}`);
      console.log(`${'='.repeat(80)}\n`);
      
      return filepath;
    } catch (error) {
      console.error(`❌ Erro ao salvar debug report: ${error.message}`);
      return null;
    }
  }

  /**
   * Cria relatório resumido em Markdown
   */
  async saveMarkdownReport() {
    if (!this.enabled) return null;
    
    const filename = `debug_${this.traceId}.md`;
    const filepath = path.join(this.debugDir, filename);
    
    const md = this.generateMarkdownReport();
    
    try {
      fs.writeFileSync(filepath, md, 'utf-8');
      return filepath;
    } catch (error) {
      console.error(`❌ Erro ao salvar markdown report: ${error.message}`);
      return null;
    }
  }

  /**
   * Gera relatório em Markdown
   */
  generateMarkdownReport() {
    const stats = this.debugData.statistics;
    
    let md = `# Debug Report\n\n`;
    md += `**Trace ID:** ${this.traceId}\n`;
    md += `**Data:** ${this.debugData.timestamp_start}\n`;
    md += `**Duração:** ${stats.duration_seconds}s\n\n`;
    
    md += `## Estatísticas\n\n`;
    md += `- **LLM Calls:** ${stats.total_llm_calls}\n`;
    md += `- **Tool Calls:** ${stats.total_tool_calls}\n`;
    md += `- **Checkpoints:** ${stats.total_checkpoints}\n`;
    md += `- **Erros:** ${stats.total_errors}\n`;
    md += `- **Warnings:** ${stats.total_warnings}\n`;
    md += `- **Tokens:** ${stats.total_tokens}\n\n`;
    
    md += `## Requisição\n\n`;
    md += `**User ID:** ${this.debugData.request.user_id}\n`;
    md += `**Task:** ${this.debugData.request.task}\n\n`;
    
    if (this.debugData.phases.planning.subtasks) {
      md += `## Planejamento\n\n`;
      md += `**Goal:** ${this.debugData.phases.planning.goal}\n\n`;
      md += `**Subtarefas:**\n\n`;
      this.debugData.phases.planning.subtasks.forEach((st, idx) => {
        md += `${idx + 1}. **${st.title}**\n`;
        md += `   - Intent: ${st.intent}\n`;
        md += `   - Toolkits: ${st.toolkit_candidates.join(', ')}\n`;
        md += `   - Outputs: ${st.outputs_expected.join(', ')}\n\n`;
      });
    }
    
    if (this.debugData.errors.length > 0) {
      md += `## Erros\n\n`;
      this.debugData.errors.forEach((err, idx) => {
        md += `${idx + 1}. **${err.phase}** - ${err.message}\n`;
        md += `   \`\`\`\n   ${err.stack}\n   \`\`\`\n\n`;
      });
    }
    
    if (this.debugData.final_response) {
      md += `## Resposta Final\n\n`;
      md += `\`\`\`json\n${JSON.stringify(this.debugData.final_response, null, 2)}\n\`\`\`\n`;
    }
    
    return md;
  }
}
