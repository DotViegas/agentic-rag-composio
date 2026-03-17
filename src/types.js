/**
 * Tipos e estruturas de dados para o orquestrador
 */

export class ExecutionPlan {
  constructor(data) {
    this.goal = data.goal || '';
    this.subtasks = data.subtasks || [];
    this.clarifying_questions = data.clarifying_questions || [];
    this.global_success_criteria = data.global_success_criteria || '';
    this.stop_conditions = data.stop_conditions || [];
  }
}

export class Subtask {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.toolkit_candidates = data.toolkit_candidates || [];
    this.intent = data.intent || '';
    this.deps = data.deps || [];
    this.inputs_required = data.inputs_required || [];
    this.outputs_expected = data.outputs_expected || [];
    this.success_criteria = data.success_criteria || '';
    this.risk_flags = data.risk_flags || {
      destrutivo: false,
      publico: false,
      bulk: false,
      admin: false,
      financeiro: false
    };
    this.metadata = data.metadata || {};
  }

  hasRisks() {
    return Object.values(this.risk_flags).some(flag => flag === true);
  }

  isCriticalRisk() {
    return this.risk_flags.destrutivo || 
           this.risk_flags.admin || 
           this.risk_flags.financeiro ||
           this.risk_flags.bulk;
  }
}

export class ExecutionState {
  constructor() {
    this.trace_id = this.generateTraceId();
    this.artifacts = {}; // { subtask_id: { file_id, message_id, etc } }
    this.checkpoints = []; // histórico de checkpoints
    this.tool_calls = []; // histórico de chamadas
    this.errors = [];
    this.confirmations = []; // confirmações do usuário
    this.current_subtask_index = 0;
    this.status = 'initialized'; // initialized, planning, executing, verifying, completed, failed, pending_auth
    this.auth_required = false; // Flag para indicar que autenticação é necessária
    this.auth_url = null; // URL de autenticação
    this.auth_message = null; // Mensagem de autenticação
  }

  generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addCheckpoint(subtaskId, data) {
    this.checkpoints.push({
      timestamp: new Date().toISOString(),
      subtask_id: subtaskId,
      data: data
    });
  }

  addToolCall(toolName, args, result, duration, error = null) {
    this.tool_calls.push({
      timestamp: new Date().toISOString(),
      tool: toolName,
      args: this.redactSecrets(args),
      result_summary: this.summarizeResult(result),
      duration_ms: duration,
      error: error,
      pagination_count: result?.pagination_count || 0
    });
  }

  addError(subtaskId, error) {
    this.errors.push({
      timestamp: new Date().toISOString(),
      subtask_id: subtaskId,
      error: error.message,
      stack: error.stack
    });
  }

  redactSecrets(obj) {
    if (!obj) return obj;
    const redacted = JSON.parse(JSON.stringify(obj));
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'credential', 'auth'];
    
    const redact = (o) => {
      for (const key in o) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          o[key] = '[REDACTED]';
        } else if (typeof o[key] === 'object' && o[key] !== null) {
          redact(o[key]);
        }
      }
    };
    
    redact(redacted);
    return redacted;
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

export const ExecutionMode = {
  NORMAL: 'normal',
  STRICT: 'strict'
};
