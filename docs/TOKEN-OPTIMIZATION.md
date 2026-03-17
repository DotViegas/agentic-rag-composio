# Otimização de Tokens - Implementação Completa

## 🎯 Problema Identificado

O sistema estava consumindo tokens excessivos em dois pontos críticos:

1. **`COMPOSIO_SEARCH_TOOLS` result**: ~7,769 tokens por chamada
2. **`state.artifacts`**: ~10k-50k tokens (com base64 de arquivos)

**Total desperdiçado**: ~20k-60k tokens por execução

---

## ✅ Soluções Implementadas

### 1. SearchToolsOptimizer (`src/search-tools-optimizer.js`)

**Redução**: 7,769 tokens → ~500-800 tokens (90% de economia)

#### O que mantém:
- ✅ `session_id` (crítico para continuidade)
- ✅ `primary_tools` (top 3-5 tools com info mínima)
- ✅ `related_tools` (apenas referência, sem schema)
- ✅ `connection_status` (resumido: active/needsAuth)
- ✅ `plan_summary` (3-5 steps principais)
- ✅ `critical_pitfalls` (top 3)
- ✅ `time_context` (para queries temporais)

#### O que remove:
- ❌ `reference_workbench_snippets` (~500-1000 tokens)
- ❌ `plan_id` (metadata interna)
- ❌ Schemas de `related_tools` (carrega depois se necessário)
- ❌ Exemplos longos nos schemas
- ❌ Campos de metadata interna

#### Métodos principais:

```javascript
// Extrai essencial do SEARCH_TOOLS
const optimized = searchToolsOptimizer.extractEssentials(searchResult);

// Cria manifest compacto para o agente
const manifest = searchToolsOptimizer.createAgentManifest(optimized);

// Formata para incluir no prompt (texto ultra-compacto)
const promptText = searchToolsOptimizer.formatForPrompt(manifest);
```

#### Exemplo de output formatado:

```
SESSION_ID: meal

AVAILABLE_TOOLS: GOOGLEDRIVE_FIND_FILE, GOOGLEDRIVE_GET_FILE_METADATA

AUTH_REQUIRED: googledrive
ACTION: Call COMPOSIO_MANAGE_CONNECTIONS first

KEY_STEPS:
1. Search/list candidates using GOOGLEDRIVE_FIND_FILE
2. Disambiguate shortlisted ids using GOOGLEDRIVE_GET_FILE_METADATA
3. Retrieve content using GOOGLEDRIVE_DOWNLOAD_FILE

WARNINGS:
⚠️  pageSize ≤ 1000; follow nextPageToken or you'll miss matches
⚠️  q must follow Drive query syntax
⚠️  Workspace files require export

CURRENT_TIME_UTC: 2026-03-16T23:18:33.761Z
```

**Tokens**: ~200-300 (vs ~7,769 original)

---

### 2. ArtifactsOptimizer (`src/artifacts-optimizer.js`)

**Redução**: ~10k-50k tokens → ~200-400 tokens (95% de economia)

#### Estratégia:

1. **DROP_KEYS**: Remove campos proibidos (base64, conteúdo grande)
2. **ALLOW_KEYS**: Mantém apenas campos úteis (IDs, links, metadados)
3. **download_ref**: Cria referência para conteúdo de arquivo (não inclui o conteúdo)
4. **Truncate**: Limita strings a 160 chars

#### O que mantém:

**Drive:**
- `file_id`, `new_file_id`, `file_name`, `file_path`
- `mime_type`, `web_view_link`
- `upload_status`, `version`, `updated_at`
- `original_rows`, `new_rows`, `final_row_count`
- `file_size` (número, não conteúdo)

**Gmail:**
- `message_id`, `thread_id`
- `recipient`, `to`, `cc`, `bcc`
- `subject`, `sent_at`, `status`
- `attachment_name` (nome, não conteúdo)

**Generic:**
- `url`, `auth_url`, `connection_url`
- `verification_status`, `success`, `error`

#### O que remove:

- ❌ `file_content` (base64)
- ❌ `modified_content` (base64)
- ❌ `downloaded_file_content` (base64 ou s3_url)
- ❌ `body_raw`, `html`, `text_body`
- ❌ Qualquer string > 500 chars que pareça base64

#### download_ref (Handle para Conteúdo)

Quando detecta conteúdo de arquivo, cria referência:

```javascript
{
  "download_ref": {
    "type": "s3_url",           // ou "base64_stored"
    "url": "https://s3...",     // se disponível
    "expires_in": 3600,         // ~1 hora
    "mime_type": "application/vnd...",
    "note": "Content stored in checkpoint, not in prompt"
  }
}
```

#### Métodos principais:

```javascript
// Constrói manifest enxuto
const manifest = artifactsOptimizer.buildArtifactsManifest(state.artifacts);

// Formata para incluir no prompt
const promptText = artifactsOptimizer.formatForPrompt(manifest);

// Log de economia
artifactsOptimizer.logOptimization(state.artifacts, manifest);
```

#### Exemplo de output formatado:

```
ARTIFACTS FROM PREVIOUS SUBTASKS:

subtask_1:
  file_id: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ
  file_name: Faturas_para_pagar_LUNA 16-03-2026.xlsx
  link: https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/view

subtask_2:
  download_ref: base64_stored (Content stored in checkpoint, not in prompt)
  file_size: 45678

subtask_3:
  rows: 151
  row_added: {"data":["2026-03-16","Fornecedor XYZ","R$ 1.500,00","Pendente"],"position":151}

subtask_4:
  new_file_id: 1xYzAbCdEfGhIjKlMnOpQrStUv
  link: https://drive.google.com/file/d/1xYzAbCdEfGhIjKlMnOpQrStUv/view
  version: v2
  status: success
```

**Tokens**: ~200-400 (vs ~10k-50k original)

---

## 📊 Impacto Total

### Antes da Otimização:
- SEARCH_TOOLS: ~7,769 tokens
- Artifacts: ~10k-50k tokens
- **Total por execução**: ~20k-60k tokens desperdiçados

### Depois da Otimização:
- SEARCH_TOOLS: ~500-800 tokens
- Artifacts: ~200-400 tokens
- **Total por execução**: ~700-1,200 tokens

### Economia:
- **Redução**: 90-95% dos tokens
- **Economia por execução**: ~19k-59k tokens
- **Custo evitado**: ~$0.01-0.03 por execução (gpt-4o-mini)

---

## 🔄 Integração no Código

### executor-enhanced.js

```javascript
import { SearchToolsOptimizer } from './search-tools-optimizer.js';
import { ArtifactsOptimizer } from './artifacts-optimizer.js';

// No constructor
this.searchToolsOptimizer = new SearchToolsOptimizer(logger);
this.artifactsOptimizer = new ArtifactsOptimizer(logger);

// Ao processar SEARCH_TOOLS
const optimized = this.searchToolsOptimizer.extractEssentials(step.result);
const manifest = this.searchToolsOptimizer.createAgentManifest(optimized);

// Ao passar artifacts para o agente
const artifactsManifest = this.artifactsOptimizer.buildArtifactsManifest(state.artifacts);
const artifactsText = this.artifactsOptimizer.formatForPrompt(artifactsManifest);

// No prompt do agente
instructions: `
...
${artifactsText}
...
`
```

---

## 🎯 Padrão Recomendado: Two-Store Pattern

### A) Artifact Store Completo (fora do prompt)
- Guarda tudo (incluindo base64)
- Vai para checkpoint/DB/disco
- Usado para auditoria e reuso

### B) Artifact Manifest (vai para o prompt)
- Apenas IDs, links, metadados
- Nunca base64, nunca texto grande
- Usado pelo agente para decisões

```javascript
// Salvar completo no checkpoint
checkpointManager.saveCheckpoint(key, {
  artifacts: state.artifacts  // COMPLETO com base64
});

// Passar manifest enxuto para o agente
const manifest = artifactsOptimizer.buildArtifactsManifest(state.artifacts);
// Usar manifest no prompt
```

---

## 📝 Checklist de Validação

- [x] SEARCH_TOOLS otimizado (90% redução)
- [x] Artifacts otimizado (95% redução)
- [x] Base64 nunca vai para o prompt
- [x] download_ref criado para conteúdo de arquivo
- [x] Schemas carregados sob demanda (GET_TOOL_SCHEMAS)
- [x] Session_id preservado para continuidade
- [x] Logs de economia implementados
- [x] Compatibilidade com código existente mantida

---

## 🚀 Próximos Passos (Opcional)

1. **Cache persistente**: Salvar optimized results em Redis/DB
2. **Lazy schema loading**: Carregar schemas apenas quando executar
3. **Compression**: Gzip de checkpoints grandes
4. **Metrics**: Dashboard de consumo de tokens por execução

---

## 📚 Referências

- `src/search-tools-optimizer.js` - Otimizador de SEARCH_TOOLS
- `src/artifacts-optimizer.js` - Otimizador de Artifacts
- `examples/state-artifacts-example.json` - Exemplos de artifacts
- `examples/search-tools-result-example.json` - Exemplo de SEARCH_TOOLS
- Feedback do suporte Composio (implementado 100%)
