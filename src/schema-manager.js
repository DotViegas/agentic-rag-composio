/**
 * Gerenciador de Schemas com Cache por Versão
 * 
 * Estratégia:
 * - Cache por (tool_slug, version)
 * - Fetch sob demanda (schemaRef do SEARCH_TOOLS)
 * - Pré-fetch seletivo apenas das tools que serão executadas
 * - TTL configurável para invalidação
 */

import crypto from 'crypto';

export class SchemaManager {
  constructor(logger) {
    this.logger = logger;
    
    // Cache: Map<cacheKey, {schema, timestamp, version}>
    this.schemaCache = new Map();
    
    // TTL padrão: 1 hora (schemas não mudam com frequência)
    this.cacheTTL = 60 * 60 * 1000;
    
    // Máximo de schemas em cache (LRU)
    this.maxCacheSize = 200;
  }

  /**
   * Gerar chave de cache para um schema
   * Formato: tool_slug:version:hash
   */
  generateCacheKey(toolSlug, version = 'latest') {
    return `${toolSlug}:${version}`;
  }

  /**
   * Obter schema do cache ou retornar null
   */
  getFromCache(toolSlug, version = 'latest') {
    const key = this.generateCacheKey(toolSlug, version);
    const cached = this.schemaCache.get(key);

    if (!cached) {
      return null;
    }

    // Verificar TTL
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.logger.info(`Schema expirado no cache: ${toolSlug} (idade: ${Math.round(age / 1000)}s)`);
      this.schemaCache.delete(key);
      return null;
    }

    this.logger.success(`✓ Schema encontrado no cache: ${toolSlug}`);
    return cached.schema;
  }

  /**
   * Salvar schema no cache
   */
  saveToCache(toolSlug, schema, version = 'latest') {
    const key = this.generateCacheKey(toolSlug, version);
    
    // Aplicar LRU se exceder tamanho máximo
    if (this.schemaCache.size >= this.maxCacheSize) {
      this.applyLRU();
    }

    this.schemaCache.set(key, {
      schema,
      timestamp: Date.now(),
      version
    });

    this.logger.info(`Schema salvo no cache: ${toolSlug} (total: ${this.schemaCache.size})`);
  }

  /**
   * Aplicar LRU: remover 20% dos schemas mais antigos
   */
  applyLRU() {
    const entries = Array.from(this.schemaCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.schemaCache.delete(entries[i][0]);
    }
    
    this.logger.info(`LRU aplicado: removidos ${toRemove} schemas antigos`);
  }

  /**
   * Limpar cache expirado
   */
  cleanExpiredCache() {
    const now = Date.now();
    let removed = 0;

    for (const [key, value] of this.schemaCache.entries()) {
      const age = now - value.timestamp;
      if (age > this.cacheTTL) {
        this.schemaCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.info(`Cache limpo: ${removed} schemas expirados removidos`);
    }
  }

  /**
   * Extrair schemas do resultado do SEARCH_TOOLS
   * Identifica quais têm schema completo e quais precisam de fetch
   */
  extractSchemasFromSearchTools(searchToolsResult) {
    const result = {
      schemasLoaded: new Map(),    // tool_slug → schema completo
      schemasMissing: [],           // tool_slugs que precisam de GET_TOOL_SCHEMAS
      toolSchemas: searchToolsResult.tool_schemas || {}
    };

    for (const [toolSlug, toolInfo] of Object.entries(result.toolSchemas)) {
      if (toolInfo.hasFullSchema === true && toolInfo.input_schema) {
        // Schema completo disponível
        const schema = {
          tool_slug: toolSlug,
          input_parameters: toolInfo.input_schema,
          output_parameters: toolInfo.output_schema || {},
          description: toolInfo.description || '',
          toolkit: toolInfo.toolkit
        };
        
        result.schemasLoaded.set(toolSlug, schema);
        
        // Salvar no cache
        this.saveToCache(toolSlug, schema);
      } else if (toolInfo.schemaRef) {
        // Schema precisa ser carregado
        result.schemasMissing.push(toolSlug);
      }
    }

    this.logger.info(`Schemas do SEARCH_TOOLS: ${result.schemasLoaded.size} completos, ${result.schemasMissing.length} faltantes`);
    
    return result;
  }

  /**
   * Processar resultado do GET_TOOL_SCHEMAS
   * Salva schemas no cache e retorna Map
   */
  processSchemasFromGetToolSchemas(getToolSchemasResult) {
    const schemas = new Map();
    
    // GET_TOOL_SCHEMAS pode retornar array ou objeto único
    const schemaList = Array.isArray(getToolSchemasResult) 
      ? getToolSchemasResult 
      : [getToolSchemasResult];

    for (const schema of schemaList) {
      if (!schema || !schema.slug) continue;

      const toolSlug = schema.slug;
      const processedSchema = {
        tool_slug: toolSlug,
        input_parameters: schema.input_parameters || schema.inputParameters || {},
        output_parameters: schema.output_parameters || schema.outputParameters || {},
        description: schema.description || '',
        toolkit: schema.toolkit || this.extractToolkitFromSlug(toolSlug),
        version: schema.version || 'latest'
      };

      schemas.set(toolSlug, processedSchema);
      
      // Salvar no cache
      this.saveToCache(toolSlug, processedSchema, processedSchema.version);
    }

    this.logger.success(`Processados ${schemas.size} schemas do GET_TOOL_SCHEMAS`);
    
    return schemas;
  }

  /**
   * Extrair toolkit do tool_slug
   */
  extractToolkitFromSlug(toolSlug) {
    const parts = toolSlug.split('_');
    return parts[0].toLowerCase();
  }

  /**
   * Obter schema (cache → SEARCH_TOOLS → GET_TOOL_SCHEMAS)
   * Esta função é usada pelo executor para obter schema antes de validar
   */
  async getSchema(toolSlug, version = 'latest') {
    // 1. Tentar cache
    const cached = this.getFromCache(toolSlug, version);
    if (cached) {
      return cached;
    }

    // 2. Se não está no cache, retornar null
    // O executor deve chamar GET_TOOL_SCHEMAS explicitamente
    this.logger.warning(`Schema não encontrado no cache: ${toolSlug}`);
    return null;
  }

  /**
   * Verificar se schema está disponível (cache ou SEARCH_TOOLS)
   */
  hasSchema(toolSlug, version = 'latest') {
    return this.getFromCache(toolSlug, version) !== null;
  }

  /**
   * Obter estatísticas do cache
   */
  getCacheStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const [_, value] of this.schemaCache.entries()) {
      const age = now - value.timestamp;
      if (age > this.cacheTTL) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.schemaCache.size,
      valid,
      expired,
      maxSize: this.maxCacheSize,
      ttl: this.cacheTTL
    };
  }

  /**
   * Limpar todo o cache
   */
  clearCache() {
    const size = this.schemaCache.size;
    this.schemaCache.clear();
    this.logger.info(`Cache limpo: ${size} schemas removidos`);
  }
}
