/**
 * Extrator de Artefatos Baseado em Schema
 * 
 * Estratégia: Confiar 100% nos output_parameters do schema da Composio
 * Fallback: Busca guiada pelo schema quando campo exato não existe
 * 
 * Baseado na análise da documentação Composio:
 * - output_parameters define o contrato de retorno
 * - Campos são toolkit-specific (file_id, message_id, etc)
 * - Não há garantia absoluta de aderência, então usamos "melhor esforço"
 */

export class SchemaBasedArtifactExtractor {
  constructor(logger) {
    this.logger = logger;
    
    // Padrões de campos que são tipicamente "artefatos"
    this.artifactPatterns = {
      ids: ['id', '_id', 'file_id', 'message_id', 'thread_id', 'issue_id', 
            'event_id', 'task_id', 'document_id', 'folder_id', 'drive_id',
            'channel_id', 'user_id', 'account_id', 'project_id', 'repo_id'],
      urls: ['url', 'link', 'href', 'web_view_link', 'download_url', 
             'upload_url', 'share_link', 'permalink', 'web_url'],
      status: ['status', 'state', 'result', 'success', 'successful'],
      metadata: ['revision', 'version', 'etag', 'modified_time', 'created_time']
    };
  }

  /**
   * Extrair artefatos do resultado da tool usando seu schema
   * 
   * @param {Object} toolResult - Resultado da execução { data, error, successful, ... }
   * @param {Object} outputSchema - output_parameters do schema da tool
   * @param {Array} expectedOutputs - Outputs esperados pela subtarefa (opcional)
   * @returns {Object} Artefatos extraídos
   */
  extractFromToolResult(toolResult, outputSchema, expectedOutputs = []) {
    if (!toolResult || !toolResult.data) {
      this.logger.warning('Tool result vazio ou sem campo data');
      return {};
    }

    const artifacts = {};

    // Estratégia 1: Extrair campos declarados no output_parameters
    if (outputSchema && outputSchema.properties) {
      this.logger.info('📋 Extraindo artefatos usando output_parameters do schema');
      const schemaArtifacts = this.extractFromSchema(toolResult.data, outputSchema);
      Object.assign(artifacts, schemaArtifacts);
    }

    // Estratégia 2: Buscar outputs esperados pela subtarefa
    if (expectedOutputs.length > 0) {
      this.logger.info('🎯 Buscando outputs esperados pela subtarefa');
      const expectedArtifacts = this.extractExpectedOutputs(
        toolResult.data, 
        expectedOutputs
      );
      Object.assign(artifacts, expectedArtifacts);
    }

    // Estratégia 3: Busca guiada por padrões comuns (fallback)
    if (Object.keys(artifacts).length === 0) {
      this.logger.info('🔍 Usando busca guiada por padrões comuns (fallback)');
      const patternArtifacts = this.extractByPatterns(toolResult.data);
      Object.assign(artifacts, patternArtifacts);
    }

    // Adicionar status de sucesso
    if (toolResult.successful !== undefined) {
      artifacts.status = toolResult.successful ? 'success' : 'failed';
    }

    this.logger.info(`✅ Extraídos ${Object.keys(artifacts).length} artefatos`);
    if (Object.keys(artifacts).length > 0) {
      this.logger.json(artifacts, 2);
    }

    return artifacts;
  }

  /**
   * Extrair campos baseado no output_parameters do schema
   */
  extractFromSchema(data, outputSchema) {
    const artifacts = {};
    const properties = outputSchema.properties || {};

    for (const [fieldName, fieldDef] of Object.entries(properties)) {
      // Buscar campo no data (suporta nested paths)
      const value = this.getNestedValue(data, fieldName);
      
      if (value !== undefined && value !== null) {
        // Verificar se é um campo "artefato" (ID, URL, status, etc)
        if (this.isArtifactField(fieldName, fieldDef)) {
          artifacts[fieldName] = value;
          this.logger.success(`  ✓ ${fieldName}: ${this.formatValue(value)}`);
        }
      }
    }

    return artifacts;
  }

  /**
   * Extrair outputs esperados pela subtarefa
   */
  extractExpectedOutputs(data, expectedOutputs) {
    const artifacts = {};

    for (const outputName of expectedOutputs) {
      const value = this.getNestedValue(data, outputName);
      
      if (value !== undefined && value !== null) {
        artifacts[outputName] = value;
        this.logger.success(`  ✓ ${outputName}: ${this.formatValue(value)}`);
      } else {
        this.logger.warning(`  ✗ Output esperado não encontrado: ${outputName}`);
      }
    }

    return artifacts;
  }

  /**
   * Busca guiada por padrões comuns (fallback quando schema não está disponível)
   */
  extractByPatterns(data, prefix = '') {
    const artifacts = {};

    if (typeof data !== 'object' || data === null) {
      return artifacts;
    }

    for (const [key, value] of Object.entries(data)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const lowerKey = key.toLowerCase();

      // Verificar se é um campo de artefato
      let isArtifact = false;
      let artifactType = null;

      for (const [type, patterns] of Object.entries(this.artifactPatterns)) {
        if (patterns.some(pattern => lowerKey.includes(pattern))) {
          isArtifact = true;
          artifactType = type;
          break;
        }
      }

      if (isArtifact) {
        // Extrair valor (primitivo ou string)
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          artifacts[key] = value;
          this.logger.success(`  ✓ ${key} (${artifactType}): ${this.formatValue(value)}`);
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursão para objetos aninhados (máximo 2 níveis)
        if (!prefix || prefix.split('.').length < 2) {
          const nested = this.extractByPatterns(value, fullKey);
          Object.assign(artifacts, nested);
        }
      }
    }

    return artifacts;
  }

  /**
   * Verificar se um campo é considerado "artefato"
   */
  isArtifactField(fieldName, fieldDef) {
    const lowerName = fieldName.toLowerCase();
    
    // Verificar por nome
    for (const patterns of Object.values(this.artifactPatterns)) {
      if (patterns.some(pattern => lowerName.includes(pattern))) {
        return true;
      }
    }

    // Verificar por tipo/formato no schema
    if (fieldDef.format === 'uri' || fieldDef.format === 'url') {
      return true;
    }

    if (fieldDef.type === 'string' && fieldDef.description) {
      const desc = fieldDef.description.toLowerCase();
      if (desc.includes('id') || desc.includes('url') || desc.includes('link')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Buscar valor em objeto aninhado usando dot notation
   * Exemplo: getNestedValue(data, 'file.id') → data.file.id
   */
  getNestedValue(obj, path) {
    if (!path) return undefined;
    
    // Suportar tanto 'field' quanto 'nested.field'
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Formatar valor para exibição no log
   */
  formatValue(value) {
    if (typeof value === 'string') {
      return value.length > 50 ? value.substring(0, 50) + '...' : value;
    }
    return String(value);
  }

  /**
   * Validar se artefatos atendem aos outputs esperados
   */
  validateArtifacts(artifacts, expectedOutputs) {
    const missing = [];
    const found = [];

    for (const output of expectedOutputs) {
      if (artifacts[output] !== undefined) {
        found.push(output);
      } else {
        missing.push(output);
      }
    }

    return {
      valid: missing.length === 0,
      found,
      missing,
      hasPartial: found.length > 0 && missing.length > 0
    };
  }
}
