/**
 * Política de retry e classificação de erros
 * Melhoria #3: Retry inteligente com backoff
 */

export const ErrorType = {
  TRANSIENT: 'transient',      // 429, 503, timeout, network
  AUTH: 'auth',                 // 401, token expirado
  PERMISSION: 'permission',     // 403, escopo insuficiente
  NOT_FOUND: 'not_found',       // 404, recurso não existe
  VALIDATION: 'validation',     // 400, argumentos inválidos
  CONFLICT: 'conflict',         // 409, recurso já existe
  RATE_LIMIT: 'rate_limit',     // 429 específico
  UNKNOWN: 'unknown'
};

export class RetryPolicy {
  constructor(logger) {
    this.logger = logger;
    this.maxRetries = 3;
    this.baseDelayMs = 1000;
    this.maxDelayMs = 30000;
  }

  /**
   * Classifica erro baseado em código/mensagem
   */
  classifyError(error) {
    const errorStr = error.message?.toLowerCase() || '';
    const statusCode = error.status || error.statusCode;

    // Rate limit
    if (statusCode === 429 || errorStr.includes('rate limit')) {
      return ErrorType.RATE_LIMIT;
    }

    // Auth
    if (statusCode === 401 || 
        errorStr.includes('unauthorized') ||
        errorStr.includes('token') ||
        errorStr.includes('authentication')) {
      return ErrorType.AUTH;
    }

    // Permission
    if (statusCode === 403 || 
        errorStr.includes('forbidden') ||
        errorStr.includes('permission') ||
        errorStr.includes('scope')) {
      return ErrorType.PERMISSION;
    }

    // Not found
    if (statusCode === 404 || errorStr.includes('not found')) {
      return ErrorType.NOT_FOUND;
    }

    // Validation
    if (statusCode === 400 || 
        errorStr.includes('invalid') ||
        errorStr.includes('validation') ||
        errorStr.includes('bad request')) {
      return ErrorType.VALIDATION;
    }

    // Conflict
    if (statusCode === 409 || 
        errorStr.includes('conflict') ||
        errorStr.includes('already exists')) {
      return ErrorType.CONFLICT;
    }

    // Transient
    if (statusCode === 503 ||
        statusCode === 502 ||
        statusCode === 504 ||
        errorStr.includes('timeout') ||
        errorStr.includes('network') ||
        errorStr.includes('connection')) {
      return ErrorType.TRANSIENT;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Determina se erro é retryable
   */
  isRetryable(errorType) {
    return errorType === ErrorType.TRANSIENT || 
           errorType === ErrorType.RATE_LIMIT;
  }

  /**
   * Calcula delay para próximo retry com backoff exponencial + jitter
   */
  calculateDelay(attemptNumber, errorType) {
    let delay = this.baseDelayMs * Math.pow(2, attemptNumber - 1);
    
    // Rate limit: delay maior
    if (errorType === ErrorType.RATE_LIMIT) {
      delay = delay * 2;
    }

    // Adicionar jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    delay = delay + jitter;

    // Limitar ao máximo
    return Math.min(delay, this.maxDelayMs);
  }

  /**
   * Executa função com retry automático
   */
  async executeWithRetry(fn, context = {}) {
    let lastError;
    let attemptNumber = 0;

    while (attemptNumber < this.maxRetries) {
      attemptNumber++;

      try {
        this.logger.trace(`Tentativa ${attemptNumber}/${this.maxRetries}`);
        const result = await fn();
        
        if (attemptNumber > 1) {
          this.logger.success(`Sucesso após ${attemptNumber} tentativas`);
        }
        
        return {
          success: true,
          result,
          attempts: attemptNumber
        };

      } catch (error) {
        lastError = error;
        const errorType = this.classifyError(error);
        
        this.logger.warning(`Erro (tentativa ${attemptNumber}): ${errorType} - ${error.message}`);

        // Verificar se deve fazer retry
        if (!this.isRetryable(errorType)) {
          this.logger.error(`Erro não-retryable: ${errorType}`);
          throw this.enhanceError(error, errorType, attemptNumber);
        }

        // Se não é a última tentativa, aguardar antes de retry
        if (attemptNumber < this.maxRetries) {
          const delay = this.calculateDelay(attemptNumber, errorType);
          this.logger.info(`Aguardando ${Math.round(delay)}ms antes de retry...`);
          await this.sleep(delay);
        }
      }
    }

    // Esgotou tentativas
    const errorType = this.classifyError(lastError);
    this.logger.error(`Falha após ${this.maxRetries} tentativas: ${errorType}`);
    throw this.enhanceError(lastError, errorType, attemptNumber);
  }

  /**
   * Adiciona metadados ao erro
   */
  enhanceError(error, errorType, attempts) {
    const enhanced = new Error(error.message);
    enhanced.originalError = error;
    enhanced.errorType = errorType;
    enhanced.attempts = attempts;
    enhanced.retryable = this.isRetryable(errorType);
    enhanced.stack = error.stack;
    
    return enhanced;
  }

  /**
   * Sugere ação corretiva baseada no tipo de erro
   */
  suggestAction(errorType, error) {
    switch (errorType) {
      case ErrorType.AUTH:
        return {
          action: 'reconnect',
          message: 'Autenticação necessária. Execute MANAGE_CONNECTIONS para reconectar.'
        };
      
      case ErrorType.PERMISSION:
        return {
          action: 'request_scope',
          message: 'Permissão insuficiente. Solicite escopos adicionais ao usuário.',
          details: error.message
        };
      
      case ErrorType.VALIDATION:
        return {
          action: 'fix_arguments',
          message: 'Argumentos inválidos. Revise schema e corrija inputs.',
          details: error.message
        };
      
      case ErrorType.NOT_FOUND:
        return {
          action: 'search_alternative',
          message: 'Recurso não encontrado. Tente buscar ou criar.',
          details: error.message
        };
      
      case ErrorType.CONFLICT:
        return {
          action: 'resolve_conflict',
          message: 'Conflito detectado. Recurso pode já existir ou estar em uso.',
          details: error.message
        };
      
      case ErrorType.RATE_LIMIT:
        return {
          action: 'wait',
          message: 'Rate limit atingido. Aguarde antes de continuar.',
          details: error.message
        };
      
      default:
        return {
          action: 'investigate',
          message: 'Erro desconhecido. Investigação manual necessária.',
          details: error.message
        };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
