/**
 * Gerenciamento de checkpoints e idempotência
 * Melhoria #2: Resume real e deduplicação
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export class CheckpointManager {
  constructor(logger, storageDir = './.checkpoints') {
    this.logger = logger;
    this.storageDir = storageDir;
    this.ensureStorageDir();
  }

  ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Gera chave de idempotência para uma subtarefa
   */
  generateIdempotencyKey(userId, traceId, subtaskId, stableInputs) {
    const data = JSON.stringify({
      userId,
      traceId,
      subtaskId,
      inputs: this.normalizeInputs(stableInputs)
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Normaliza inputs para gerar hash estável
   */
  normalizeInputs(inputs) {
    if (!inputs) return {};
    
    // Ordenar chaves para hash consistente
    const sorted = {};
    Object.keys(inputs).sort().forEach(key => {
      sorted[key] = inputs[key];
    });
    
    return sorted;
  }

  /**
   * Verifica se subtarefa já foi executada com sucesso
   */
  hasCompletedCheckpoint(idempotencyKey) {
    const checkpointPath = this.getCheckpointPath(idempotencyKey);
    
    if (!fs.existsSync(checkpointPath)) {
      return { exists: false, checkpoint: null };
    }

    try {
      const data = fs.readFileSync(checkpointPath, 'utf-8');
      const checkpoint = JSON.parse(data);
      
      // Verificar se checkpoint está completo e válido
      if (checkpoint.status === 'completed' && checkpoint.artifacts) {
        this.logger.info(`Checkpoint encontrado: ${idempotencyKey.substring(0, 8)}...`);
        return { exists: true, checkpoint };
      }
      
      return { exists: false, checkpoint: null };
    } catch (error) {
      this.logger.warning(`Checkpoint corrompido: ${idempotencyKey}`);
      return { exists: false, checkpoint: null };
    }
  }

  /**
   * Salva checkpoint de uma subtarefa
   */
  saveCheckpoint(idempotencyKey, subtaskId, data) {
    const checkpoint = {
      idempotency_key: idempotencyKey,
      subtask_id: subtaskId,
      timestamp: new Date().toISOString(),
      status: data.status,
      artifacts: data.artifacts || {},
      outputs: data.outputs || {},
      tool_calls: data.tool_calls || [],
      duration_ms: data.duration_ms || 0,
      retries: data.retries || 0
    };

    const checkpointPath = this.getCheckpointPath(idempotencyKey);
    
    try {
      fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
      this.logger.checkpoint(subtaskId, `Checkpoint salvo: ${idempotencyKey.substring(0, 8)}...`);
      return true;
    } catch (error) {
      this.logger.error(`Falha ao salvar checkpoint: ${error.message}`);
      return false;
    }
  }

  /**
   * Carrega checkpoint por chave
   */
  loadCheckpoint(idempotencyKey) {
    const result = this.hasCompletedCheckpoint(idempotencyKey);
    return result.checkpoint;
  }

  /**
   * Salva estado completo da execução
   */
  saveExecutionState(traceId, state) {
    const statePath = path.join(this.storageDir, `state_${traceId}.json`);
    
    try {
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
      this.logger.trace(`Estado salvo: ${traceId}`);
      return true;
    } catch (error) {
      this.logger.error(`Falha ao salvar estado: ${error.message}`);
      return false;
    }
  }

  /**
   * Carrega estado completo da execução
   */
  loadExecutionState(traceId) {
    const statePath = path.join(this.storageDir, `state_${traceId}.json`);
    
    if (!fs.existsSync(statePath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(statePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`Falha ao carregar estado: ${error.message}`);
      return null;
    }
  }

  /**
   * Lista todos os checkpoints de um trace
   */
  listCheckpointsForTrace(traceId) {
    const files = fs.readdirSync(this.storageDir);
    const checkpoints = [];

    for (const file of files) {
      if (file.startsWith('checkpoint_') && file.endsWith('.json')) {
        try {
          const data = fs.readFileSync(path.join(this.storageDir, file), 'utf-8');
          const checkpoint = JSON.parse(data);
          
          // Filtrar por trace_id se disponível
          checkpoints.push(checkpoint);
        } catch (error) {
          // Ignorar checkpoints corrompidos
        }
      }
    }

    return checkpoints;
  }

  /**
   * Limpa checkpoints antigos
   */
  cleanupOldCheckpoints(maxAgeMs = 7 * 24 * 60 * 60 * 1000) { // 7 dias
    const now = Date.now();
    const files = fs.readdirSync(this.storageDir);
    let cleaned = 0;

    for (const file of files) {
      const filePath = path.join(this.storageDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.info(`Limpeza: ${cleaned} checkpoints antigos removidos`);
    }

    return cleaned;
  }

  getCheckpointPath(idempotencyKey) {
    return path.join(this.storageDir, `checkpoint_${idempotencyKey}.json`);
  }

  /**
   * Verifica se uma operação é replay-safe
   */
  isReplaySafe(subtask) {
    // Operações destrutivas não são replay-safe
    if (subtask.risk_flags.destrutivo) {
      return false;
    }

    // Operações de leitura são sempre replay-safe
    const readOnlyIntents = ['list', 'get', 'search', 'find', 'read', 'fetch'];
    const isReadOnly = readOnlyIntents.some(intent => 
      subtask.intent.toLowerCase().includes(intent)
    );

    return isReadOnly;
  }
}
