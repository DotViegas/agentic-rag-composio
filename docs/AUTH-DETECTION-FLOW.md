# Fluxo de Detecção de Autenticação - Diagrama Visual

## Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USUÁRIO FAZ REQUISIÇÃO                       │
│  POST /execute { userId: "user123", task: "Buscar arquivo..." }    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FASE 1: PLANEJAMENTO                          │
│  • Sistema decompõe tarefa em subtarefas                            │
│  • Identifica toolkits necessários (ex: googledrive)                │
│  • Cria plano de execução (DAG)                                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FASE 2: EXECUÇÃO - SUBTAREFA 1                   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. Agente chama COMPOSIO_MANAGE_CONNECTIONS                  │  │
│  │    • toolkit: "googledrive"                                  │  │
│  │    • action: "check"                                         │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 2. Composio verifica status da conexão                       │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
│                           │                                          │
│              ┌────────────┴────────────┐                            │
│              │                         │                            │
│              ▼                         ▼                            │
│  ┌─────────────────────┐   ┌─────────────────────┐                │
│  │   CONECTADO ✅      │   │  NÃO CONECTADO ❌   │                │
│  │                     │   │                     │                │
│  │ Retorna:            │   │ Retorna:            │                │
│  │ {                   │   │ {                   │                │
│  │   status:           │   │   status:           │                │
│  │   "connected"       │   │   "not_connected",  │                │
│  │ }                   │   │   auth_url:         │                │
│  │                     │   │   "https://..."     │                │
│  │                     │   │ }                   │                │
│  └──────────┬──────────┘   └──────────┬──────────┘                │
│             │                          │                            │
│             ▼                          ▼                            │
│  ┌─────────────────────┐   ┌─────────────────────┐                │
│  │ Agente executa      │   │ Agente retorna JSON │                │
│  │ ferramenta          │   │ estruturado:        │                │
│  │                     │   │                     │                │
│  │ GOOGLEDRIVE_        │   │ {                   │                │
│  │ FIND_FILE(...)      │   │   "artifacts": {    │                │
│  │                     │   │     "auth_url":     │                │
│  │                     │   │     "https://...",  │                │
│  │                     │   │     "status":       │                │
│  │                     │   │     "pending_auth", │                │
│  │                     │   │     "toolkit":      │                │
│  │                     │   │     "googledrive"   │                │
│  │                     │   │   },                │                │
│  │                     │   │   "success": true   │                │
│  │                     │   │ }                   │                │
│  └──────────┬──────────┘   └──────────┬──────────┘                │
│             │                          │                            │
│             │                          ▼                            │
│             │              ┌─────────────────────┐                 │
│             │              │ Sistema detecta     │                 │
│             │              │ auth_url nos        │                 │
│             │              │ artefatos           │                 │
│             │              └──────────┬──────────┘                 │
│             │                         │                            │
│             │                         ▼                            │
│             │              ┌─────────────────────┐                 │
│             │              │ Adiciona flag:      │                 │
│             │              │ needs_authentication│                 │
│             │              │ = true              │                 │
│             │              └──────────┬──────────┘                 │
│             │                         │                            │
│             │                         ▼                            │
│             │              ┌─────────────────────┐                 │
│             │              │ Salva checkpoint    │                 │
│             │              │ status:             │                 │
│             │              │ "pending_auth"      │                 │
│             │              └──────────┬──────────┘                 │
│             │                         │                            │
│             │                         ▼                            │
│             │              ┌─────────────────────┐                 │
│             │              │ ⏸️  PARA EXECUÇÃO  │                 │
│             │              │ (break do loop)     │                 │
│             │              │                     │                 │
│             │              │ Subtarefas 2, 3...  │                 │
│             │              │ NÃO são executadas  │                 │
│             │              └──────────┬──────────┘                 │
│             │                         │                            │
└─────────────┼─────────────────────────┼────────────────────────────┘
              │                         │
              │                         ▼
              │              ┌─────────────────────┐
              │              │ Estado atualizado:  │
              │              │ • status:           │
              │              │   "pending_auth"    │
              │              │ • auth_required:    │
              │              │   true              │
              │              │ • auth_url: "..."   │
              │              └──────────┬──────────┘
              │                         │
              ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    RESPOSTA AO USUÁRIO                               │
│                                                                      │
│  ┌────────────────────────┐   ┌────────────────────────┐           │
│  │ CONECTADO ✅           │   │ NÃO CONECTADO ❌       │           │
│  │                        │   │                        │           │
│  │ {                      │   │ {                      │           │
│  │   status: 200,         │   │   status: 200,         │           │
│  │   "response-ai":       │   │   "response-ai":       │           │
│  │   "Tarefa concluída",  │   │   "Autenticação        │           │
│  │   message: "..."       │   │    necessária",        │           │
│  │ }                      │   │   message:             │           │
│  │                        │   │   "[Link de conexão]"  │           │
│  │                        │   │ }                      │           │
│  └────────────────────────┘   └────────────────────────┘           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Detalhamento por Componente

### 1. COMPOSIO_MANAGE_CONNECTIONS

```javascript
// Chamada do agente
COMPOSIO_MANAGE_CONNECTIONS({
  toolkit: "googledrive",
  action: "check"
})

// Resposta quando CONECTADO
{
  status: "connected",
  connected_account_id: "ca_abc123...",
  // ... outros dados
}

// Resposta quando NÃO CONECTADO
{
  status: "not_connected",
  auth_url: "https://connect.composio.dev/link/xyz789...",
  message: "Connection not found. Please authenticate."
}
```

### 2. Resposta do Agente (JSON Estruturado)

```json
{
  "artifacts": {
    "auth_url": "https://connect.composio.dev/link/xyz789...",
    "status": "pending_auth",
    "toolkit": "googledrive"
  },
  "outputs": {
    "message": "Autenticação necessária para Google Drive."
  },
  "success": true
}
```

### 3. Detecção no Sistema

```javascript
// src/executor-enhanced.js - executeSubtask()

// Após parsear JSON
if (artifacts.auth_url || artifacts.status === 'pending_auth') {
  this.logger.warning('🔐 Autenticação necessária detectada');
  
  // Adicionar flag
  artifacts.needs_authentication = true;
  
  // Retornar imediatamente
  return {
    artifacts,
    outputs,
    tool_calls: toolCalls,
    success: true
  };
}
```

### 4. Parada da Execução

```javascript
// src/executor-enhanced.js - executeWithPlan()

// Após executar subtarefa
if (result.result.artifacts && result.result.artifacts.needs_authentication) {
  this.logger.warning('🔐 Parando execução - autenticação necessária');
  
  // Salvar checkpoint
  const checkpointData = {
    status: 'pending_auth',
    needs_authentication: true,
    // ...
  };
  
  // Atualizar estado
  state.status = 'pending_auth';
  state.auth_required = true;
  state.auth_url = result.result.artifacts.auth_url;
  
  // PARAR LOOP
  break;
}
```

### 5. Resposta Final

```javascript
// src/agent.js - executeTask()

if (state.status === 'pending_auth' && state.auth_required) {
  return {
    status: 200,
    'response-ai': 'Autenticação necessária para continuar',
    message: `[Link de autenticação](${state.auth_url})`
  };
}
```

## Comparação: Fluxo Antigo vs Novo

### ❌ Fluxo Antigo (Reativo)

```
Usuário → Planejamento → Execução
                            ↓
                    Tenta executar ferramenta
                            ↓
                    ❌ ERRO: Não conectado
                            ↓
                    Agente retorna texto com erro
                            ↓
                    Sistema detecta palavras-chave
                            ↓
                    Extrai link do texto
                            ↓
                    Para execução
                            ↓
                    Retorna link ao usuário
```

**Problemas:**
- Tentativa desnecessária de executar
- Depende de parsing de texto
- Menos confiável

### ✅ Fluxo Novo (Proativo)

```
Usuário → Planejamento → Execução
                            ↓
                    Verifica conexão PRIMEIRO
                    (COMPOSIO_MANAGE_CONNECTIONS)
                            ↓
                    ✅ Conectado → Executa ferramenta
                    ❌ Não conectado → Retorna auth_url
                            ↓
                    Agente retorna JSON estruturado
                            ↓
                    Sistema detecta auth_url
                            ↓
                    Para execução
                            ↓
                    Retorna link ao usuário
```

**Benefícios:**
- Verifica ANTES de tentar
- JSON estruturado
- Mais confiável

## Checkpoint Salvo

```json
{
  "subtask_id": "subtask_1",
  "status": "pending_auth",
  "artifacts": {
    "auth_url": "https://connect.composio.dev/link/xyz789...",
    "status": "pending_auth",
    "toolkit": "googledrive",
    "needs_authentication": true
  },
  "outputs": {
    "message": "Autenticação necessária para Google Drive."
  },
  "needs_authentication": true,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Estado da Execução

```json
{
  "trace_id": "trace_1234567890_abc123",
  "status": "pending_auth",
  "auth_required": true,
  "auth_url": "https://connect.composio.dev/link/xyz789...",
  "auth_message": "Para continuar com a tarefa, você precisa autenticar sua conta.",
  "current_subtask_index": 0,
  "artifacts": {
    "subtask_1": {
      "auth_url": "https://connect.composio.dev/link/xyz789...",
      "status": "pending_auth",
      "toolkit": "googledrive",
      "needs_authentication": true
    }
  },
  "checkpoints": [
    {
      "subtask_id": "subtask_1",
      "status": "pending_auth",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Legenda

- ✅ = Conexão ativa / Sucesso
- ❌ = Conexão não ativa / Erro
- ⏸️ = Execução pausada
- 🔐 = Autenticação necessária
- ▼ = Fluxo continua
- ┌─┐ = Bloco de processo
- │ = Conexão vertical
- ─ = Conexão horizontal
