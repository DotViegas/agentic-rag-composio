/**
 * Cache Persistente em Disco
 * Reduz chamadas ao Composio armazenando resultados localmente
 * Sem dependências externas (apenas fs nativo do Node.js)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PersistentCache {
  constructor(logger, options = {}) {
    this.logger = logger;
    
    // Configurações
    this.cacheDir = options.cacheDir || path.join(__dirname, '..', '.cache');
    this.ttl = {
      search_tools: options.searchToolsTTL || 24 * 60 * 60 * 1000, // 24 horas
      tool_schemas: options.toolSchemasTTL || 7 * 24 * 60 * 60 * 1000, // 7 dias
      connections: options.connectionsTTL || 5 * 60 * 1000, // 5 minutos
      default: options.defaultTTL || 60 * 60 * 1000 // 1 hora
    };
    
    // Criar diretórios de cache
    this.initCacheDirectories();
    
    // Estatísticas
    this.stats = {
      hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0
    };
  }

  /**
   * Inicializa estrutura de diretórios
   */
  initCacheDirectories() {
    const dirs = [
      this.cacheDir,
      path.join(this.cacheDir, 'search_tools'),
      path.join(this.cacheDir, 'tool_schemas'),
      path.join(this.cacheDir, 'connections'),
      path.join(this.cacheDir, 'optimized')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.info(`📁 Cache directory created: ${dir}`);
      }
    }
  }

  /**
   * Gera chave de cache normalizada
   */
  generateKey(type, params) {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    const hash = crypto.createHash('md5').update(normalized).digest('hex');
    return `${type}_${hash}`;
  }

  /**
   * Caminho do arquivo de cache
   */
  getCachePath(type, key) {
    return path.join(this.cacheDir, type, `${key}.json`);
  }

  /**
   * Verifica se cache está válido (não expirado)
   */
  isValid(cacheData, ttl) {
    if (!cacheData || !cacheData.timestamp) return false;
    const age = Date.now() - cacheData.timestamp;
    return age < ttl;
  }

  /**
   * GET: Busca no cache
   */
  get(type, params, ttl = null) {
    const key = this.generateKey(type, params);
    const cachePath = this.getCachePath(type, key);

    try {
      if (!fs.existsSync(cachePath)) {
        this.stats.misses++;
        return null;
      }

      const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      const effectiveTTL = ttl || this.ttl[type] || this.ttl.default;

      if (!this.isValid(data, effectiveTTL)) {
        this.logger.info(`⏰ Cache expired: ${type}/${key.substring(0, 16)}...`);
        fs.unlinkSync(cachePath);
        this.stats.misses++;
        this.stats.evictions++;
        return null;
      }

      this.stats.hits++;
      this.logger.success(`✅ Cache HIT: ${type}/${key.substring(0, 16)}...`);
      return data.value;
    } catch (error) {
      this.logger.warning(`⚠️  Cache read error: ${error.message}`);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * SET: Salva no cache
   */
  set(type, params, value) {
    const key = this.generateKey(type, params);
    const cachePath = this.getCachePath(type, key);

    try {
      const cacheData = {
        key,
        params,
        value,
        timestamp: Date.now(),
        type
      };

      fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
      this.stats.writes++;
      this.logger.info(`💾 Cache WRITE: ${type}/${key.substring(0, 16)}...`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Cache write error: ${error.message}`);
      return false;
    }
  }

  /**
   * DELETE: Remove do cache
   */
  delete(type, params) {
    const key = this.generateKey(type, params);
    const cachePath = this.getCachePath(type, key);

    try {
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
        this.logger.info(`🗑️  Cache DELETE: ${type}/${key.substring(0, 16)}...`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`❌ Cache delete error: ${error.message}`);
      return false;
    }
  }

  /**
   * CLEAR: Limpa todo o cache de um tipo
   */
  clear(type = null) {
    try {
      if (type) {
        const typeDir = path.join(this.cacheDir, type);
        if (fs.existsSync(typeDir)) {
          const files = fs.readdirSync(typeDir);
          for (const file of files) {
            fs.unlinkSync(path.join(typeDir, file));
          }
          this.logger.info(`🗑️  Cache cleared: ${type} (${files.length} files)`);
        }
      } else {
        // Limpar tudo
        const types = ['search_tools', 'tool_schemas', 'connections', 'optimized'];
        let totalFiles = 0;
        for (const t of types) {
          const typeDir = path.join(this.cacheDir, t);
          if (fs.existsSync(typeDir)) {
            const files = fs.readdirSync(typeDir);
            for (const file of files) {
              fs.unlinkSync(path.join(typeDir, file));
            }
            totalFiles += files.length;
          }
        }
        this.logger.info(`🗑️  All cache cleared (${totalFiles} files)`);
      }
      return true;
    } catch (error) {
      this.logger.error(`❌ Cache clear error: ${error.message}`);
      return false;
    }
  }

  /**
   * CLEANUP: Remove entradas expiradas
   */
  cleanup() {
    const types = ['search_tools', 'tool_schemas', 'connections', 'optimized'];
    let removed = 0;

    for (const type of types) {
      const typeDir = path.join(this.cacheDir, type);
      if (!fs.existsSync(typeDir)) continue;

      const files = fs.readdirSync(typeDir);
      const ttl = this.ttl[type] || this.ttl.default;

      for (const file of files) {
        const filePath = path.join(typeDir, file);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (!this.isValid(data, ttl)) {
            fs.unlinkSync(filePath);
            removed++;
          }
        } catch (error) {
          // Arquivo corrompido, remover
          fs.unlinkSync(filePath);
          removed++;
        }
      }
    }

    if (removed > 0) {
      this.logger.info(`🧹 Cache cleanup: ${removed} expired entries removed`);
    }
    return removed;
  }

  // ============================================================================
  // MÉTODOS DE ALTO NÍVEL (High-Level API)
  // ============================================================================

  /**
   * GET: SEARCH_TOOLS result
   */
  getSearchTools(useCase, toolkit = null, userId = null) {
    const params = { useCase };
    if (toolkit) params.toolkit = toolkit;
    if (userId) params.userId = userId;
    return this.get('search_tools', params, this.ttl.search_tools);
  }

  /**
   * SET: SEARCH_TOOLS result
   */
  setSearchTools(useCase, toolkit = null, userId = null, data) {
    const params = { useCase };
    if (toolkit) params.toolkit = toolkit;
    if (userId) params.userId = userId;
    return this.set('search_tools', params, data);
  }

  /**
   * GET: Tool Schema
   */
  getToolSchema(toolSlug) {
    return this.get('tool_schemas', { toolSlug }, this.ttl.tool_schemas);
  }

  /**
   * SET: Tool Schema
   */
  setToolSchema(toolSlug, schema) {
    return this.set('tool_schemas', { toolSlug }, schema);
  }

  /**
   * GET: Tool Schemas (múltiplos)
   */
  getToolSchemas(toolSlugs) {
    const schemas = {};
    let hits = 0;
    let misses = 0;

    for (const toolSlug of toolSlugs) {
      const schema = this.getToolSchema(toolSlug);
      if (schema) {
        schemas[toolSlug] = schema;
        hits++;
      } else {
        misses++;
      }
    }

    this.logger.info(`📋 Tool schemas cache: ${hits} hits, ${misses} misses`);
    return { schemas, hits, misses };
  }

  /**
   * SET: Tool Schemas (múltiplos)
   */
  setToolSchemas(schemasMap) {
    let saved = 0;
    for (const [toolSlug, schema] of Object.entries(schemasMap)) {
      if (this.setToolSchema(toolSlug, schema)) {
        saved++;
      }
    }
    this.logger.info(`💾 Saved ${saved} tool schemas to cache`);
    return saved;
  }

  /**
   * GET: Connection Status
   */
  getConnectionStatus(toolkit, userId) {
    const params = { toolkit, userId };
    return this.get('connections', params, this.ttl.connections);
  }

  /**
   * SET: Connection Status
   */
  setConnectionStatus(toolkit, userId, status) {
    const params = { toolkit, userId };
    return this.set('connections', params, status);
  }

  /**
   * GET: Optimized SEARCH_TOOLS (compact version)
   */
  getOptimizedSearchTools(useCase, toolkit = null, userId = null) {
    const params = { useCase, type: 'optimized' };
    if (toolkit) params.toolkit = toolkit;
    if (userId) params.userId = userId;
    return this.get('optimized', params, this.ttl.search_tools);
  }

  /**
   * SET: Optimized SEARCH_TOOLS (compact version)
   */
  setOptimizedSearchTools(useCase, toolkit = null, userId = null, optimizedData) {
    const params = { useCase, type: 'optimized' };
    if (toolkit) params.toolkit = toolkit;
    if (userId) params.userId = userId;
    return this.set('optimized', params, optimizedData);
  }

  /**
   * INVALIDATE: Invalidar cache de um toolkit específico
   */
  invalidateToolkit(toolkit) {
    let removed = 0;

    // Invalidar search_tools deste toolkit
    const searchDir = path.join(this.cacheDir, 'search_tools');
    if (fs.existsSync(searchDir)) {
      const files = fs.readdirSync(searchDir);
      for (const file of files) {
        const filePath = path.join(searchDir, file);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (data.params.toolkit === toolkit) {
            fs.unlinkSync(filePath);
            removed++;
          }
        } catch (error) {
          // Ignorar erros
        }
      }
    }

    // Invalidar connections deste toolkit
    const connDir = path.join(this.cacheDir, 'connections');
    if (fs.existsSync(connDir)) {
      const files = fs.readdirSync(connDir);
      for (const file of files) {
        const filePath = path.join(connDir, file);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (data.params.toolkit === toolkit) {
            fs.unlinkSync(filePath);
            removed++;
          }
        } catch (error) {
          // Ignorar erros
        }
      }
    }

    this.logger.info(`🗑️  Invalidated ${removed} cache entries for toolkit: ${toolkit}`);
    return removed;
  }

  /**
   * GET STATS: Estatísticas do cache
   */
  getStats() {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      writes: this.stats.writes,
      evictions: this.stats.evictions,
      hit_rate: this.stats.hits + this.stats.misses > 0 
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * RESET STATS: Resetar estatísticas
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0
    };
  }

  /**
   * GET SIZE: Tamanho do cache em disco
   */
  getCacheSize() {
    const types = ['search_tools', 'tool_schemas', 'connections', 'optimized'];
    let totalSize = 0;
    let totalFiles = 0;

    for (const type of types) {
      const typeDir = path.join(this.cacheDir, type);
      if (!fs.existsSync(typeDir)) continue;

      const files = fs.readdirSync(typeDir);
      totalFiles += files.length;

      for (const file of files) {
        const filePath = path.join(typeDir, file);
        try {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        } catch (error) {
          // Ignorar erros
        }
      }
    }

    return {
      bytes: totalSize,
      kb: (totalSize / 1024).toFixed(2),
      mb: (totalSize / 1024 / 1024).toFixed(2),
      files: totalFiles
    };
  }
}
