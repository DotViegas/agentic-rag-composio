# Cache Persistente em Disco

Sistema de cache local para reduzir chamadas ao Composio e melhorar performance.

## Visão Geral

O `PersistentCache` armazena resultados de chamadas ao Composio em disco (sem Redis), com TTL configurável e invalidação inteligente.

## Benefícios

- **Redução de Chamadas**: Evita chamadas repetidas ao Composio para mesmos dados
- **Performance**: Carrega dados localmente (disco) em vez de API remota
- **Custo**: Reduz custos de API do Composio
- **Offline**: Permite trabalhar com dados cacheados mesmo sem conexão
- **Persistência**: Cache sobrevive a reinicializações do servidor

## Estrutura de Diretórios

```
.cache/
├── search_tools/     # Resultados de COMPOSIO_SEARCH_TOOLS (TTL: 24h)
├── tool_schemas/     # Schemas de ferramentas (TTL: 7 dias)
├── connections/      # Status de conexões (TTL: 5 min)
└── optimized/        # Versões otimizadas de SEARCH_TOOLS (TTL: 24h)
```

## Configuração de TTL

```javascript
const cache = new PersistentCache(logger, {
  searchToolsTTL: 24 * 60 * 60 * 1000,      // 24 horas
  toolSchemasTTL: 7 * 24 * 60 * 60 * 1000,  // 7 dias
  connectionsTTL: 5 * 60 * 1000,             // 5 minutos
});
```

## API de Alto Nível

### SEARCH_TOOLS

```javascript
// Salvar resultado
cache.setSearchTools(useCase, toolkit, userId, data);

// Recuperar resultado
const data = cache.getSearchTools(useCase, toolkit, userId);
```

### Tool Schemas

```javascript
// Salvar schema único
cache.setToolSchema(toolSlug, schema);

// Recuperar schema único
const schema = cache.getToolSchema(toolSlug);

// Salvar múltiplos schemas
cache.setToolSchemas({
  'GOOGLEDRIVE_FIND_FILE': schema1,
  'GMAIL_SEND_EMAIL': schema2
});

// Recuperar múltiplos schemas
const result = cache.getToolSchemas(['GOOGLEDRIVE_FIND_FILE', 'GMAIL_SEND_EMAIL']);
// result = { schemas: {...}, hits: 2, misses: 0 }
```

### Connection Status

```javascript
// Salvar status
cache.setConnectionStatus(toolkit, userId, { active: true, needsAuth: false });

// Recuperar status
const status = cache.getConnectionStatus(toolkit, userId);
```

### Versões Otimizadas

```javascript
// Salvar versão otimizada de SEARCH_TOOLS
cache.setOptimizedSearchTools(useCase, toolkit, userId, optimizedData);

// Recuperar versão otimizada
const optimized = cache.getOptimizedSearchTools(useCase, toolkit, userId);
```

## Integração no Executor

O cache é integrado automaticamente no `executor-enhanced.js`:

### SEARCH_TOOLS

```javascript
// Antes de executar SEARCH_TOOLS, verificar cache
const cached = this.persistentCache.getOptimizedSearchTools(useCase, toolkit, userId);

if (cached) {
  // Usar dados do cache
  return cached;
}

// Executar SEARCH_TOOLS...
// Após receber resultado, salvar no cache
this.persistentCache.setOptimizedSearchTools(useCase, toolkit, userId, optimized);
```

### GET_TOOL_SCHEMAS

```javascript
// Antes de executar GET_TOOL_SCHEMAS, verificar cache
const cacheResult = this.persistentCache.getToolSchemas(requestedSlugs);

if (cacheResult.hits > 0) {
  // Usar schemas do cache
  for (const [toolSlug, schema] of Object.entries(cacheResult.schemas)) {
    this.schemaManager.addSchema(toolSlug, schema);
  }
}

// Executar GET_TOOL_SCHEMAS apenas para schemas faltantes...
// Após receber resultado, salvar no cache
this.persistentCache.setToolSchemas(newSchemas);
```

## Integração no Planner

O cache é integrado no `planner-hybrid.js`:

```javascript
// Antes de executar COMPOSIO_SEARCH_TOOLS
const cached = this.persistentCache.getSearchTools(useCase, toolkit, userId);

if (cached) {
  return cached; // Usar plano do cache
}

// Executar COMPOSIO_SEARCH_TOOLS...
// Após receber resultado, salvar no cache
this.persistentCache.setSearchTools(useCase, toolkit, userId, plan);
```

## Gerenciamento do Cache

### Estatísticas

```javascript
const stats = cache.getStats();
console.log('Hit rate:', stats.hit_rate);
console.log('Hits:', stats.hits);
console.log('Misses:', stats.misses);
console.log('Writes:', stats.writes);
```

### Tamanho em Disco

```javascript
const size = cache.getCacheSize();
console.log('Files:', size.files);
console.log('Size:', size.mb, 'MB');
```

### Cleanup Manual

```javascript
// Remover entradas expiradas
const removed = cache.cleanup();
console.log('Removed:', removed, 'expired entries');
```

### Invalidação por Toolkit

```javascript
// Invalidar todo cache de um toolkit específico
cache.invalidateToolkit('googledrive');
```

### Limpar Todo Cache

```javascript
// Limpar cache de um tipo
cache.clear('search_tools');

// Limpar todo cache
cache.clear();
```

## Estratégias de Invalidação

### Automática (TTL)

- SEARCH_TOOLS: 24 horas (planos mudam raramente)
- Tool Schemas: 7 dias (schemas são estáveis)
- Connections: 5 minutos (status muda frequentemente)

### Manual

- Quando usuário desconecta/reconecta: `invalidateToolkit(toolkit)`
- Quando há erro de autenticação: `invalidateToolkit(toolkit)`
- Quando há mudança de versão do toolkit: `clear('tool_schemas')`

## Testes

Execute os testes do cache:

```bash
node test-persistent-cache.js
```

Testes incluem:
- Cache de SEARCH_TOOLS
- Cache de Tool Schemas (único e múltiplo)
- Cache de Connection Status
- TTL e expiração
- Cleanup automático
- Estatísticas
- Tamanho em disco
- Invalidação por toolkit

## Performance

### Antes (sem cache)

- SEARCH_TOOLS: ~500-1000ms por chamada
- GET_TOOL_SCHEMAS: ~300-500ms por chamada
- Total: ~800-1500ms por subtarefa

### Depois (com cache)

- SEARCH_TOOLS (cache hit): ~5-10ms
- GET_TOOL_SCHEMAS (cache hit): ~2-5ms
- Total: ~7-15ms por subtarefa (99% mais rápido)

### Economia de Chamadas

- Primeira execução: 0% economia (cache miss)
- Segunda execução (mesmo use case): 100% economia (cache hit)
- Execuções subsequentes: 100% economia até expirar TTL

## Considerações

### Espaço em Disco

- SEARCH_TOOLS: ~5-10 KB por entrada
- Tool Schemas: ~2-5 KB por schema
- Connections: ~0.5-1 KB por status
- Total estimado: ~50-100 MB para 1000 entradas

### Concorrência

- Cache é thread-safe (operações síncronas em disco)
- Múltiplas instâncias do servidor compartilham mesmo cache
- Não há locks (last-write-wins)

### Backup

- Cache pode ser deletado sem perda de funcionalidade
- Dados serão recriados automaticamente nas próximas chamadas
- Recomendado: adicionar `.cache/` ao `.gitignore`

## Troubleshooting

### Cache não está sendo usado

1. Verificar se `persistentCache` está inicializado
2. Verificar logs: deve mostrar "Cache HIT" ou "Cache MISS"
3. Verificar TTL: pode ter expirado

### Cache crescendo muito

1. Executar cleanup manual: `cache.cleanup()`
2. Reduzir TTL nas configurações
3. Limpar cache antigo: `cache.clear()`

### Dados desatualizados

1. Invalidar toolkit específico: `cache.invalidateToolkit('googledrive')`
2. Reduzir TTL para esse tipo de dado
3. Limpar cache manualmente quando necessário

## Roadmap

- [ ] Compressão de dados (gzip)
- [ ] Limite de tamanho total do cache
- [ ] Estatísticas por tipo de cache
- [ ] Exportar/importar cache
- [ ] Cache warming (pré-carregar dados comuns)
