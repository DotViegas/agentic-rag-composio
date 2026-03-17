# Detecção Automática de Falta de Conexão

## Visão Geral

O sistema agora detecta automaticamente quando uma conta não está conectada e para a execução das subtarefas, retornando sucesso com o link de autenticação para o usuário.

## Como Funciona

### 1. Verificação de Conexão

O agente é instruído a SEMPRE chamar `COMPOSIO_MANAGE_CONNECTIONS` com `action="check"` antes de executar qualquer ferramenta:

```javascript
// Exemplo de chamada
COMPOSIO_MANAGE_CONNECTIONS({
  toolkit: "googledrive",
  action: "check"
})
```

**Respostas possíveis:**
- **Conectado**: Retorna status da conexão ativa
- **Não conectado**: Retorna link de autenticação do Composio

### 2. Detecção de Autenticação Necessária

Quando `COMPOSIO_MANAGE_CONNECTIONS` retorna um link de autenticação, o agente deve retornar JSON estruturado:

```json
{
  "artifacts": {
    "auth_url": "https://connect.composio.dev/link/...",
    "status": "pending_auth",
    "toolkit": "googledrive"
  },
  "outputs": {
    "message": "Autenticação necessária. Clique no link para conectar."
  },
  "success": true
}
```

### 3. Parada da Execução

Quando o sistema detecta `auth_url` nos artefatos:

1. A subtarefa atual é marcada como `pending_auth` (não como erro)
2. Os artefatos incluem:
   - `auth_url`: Link de autenticação
   - `status`: "pending_auth"
   - `toolkit`: Nome do toolkit que precisa de autenticação
   - `needs_authentication`: true (flag para parar execução)
3. As próximas subtarefas NÃO são executadas
4. O checkpoint é salvo com status "pending_auth"

### 4. Resposta ao Usuário

O sistema retorna uma resposta de sucesso (status 200) com:

```json
{
  "status": 200,
  "response-ai": "Autenticação necessária para continuar",
  "message": "Para continuar com a tarefa, você precisa autenticar sua conta.\n\n[Clique aqui para conectar](https://connect.composio.dev/...)\n\nApós a autenticação, a conexão será ativada automaticamente."
}
```

## Fluxo Completo

### Passo a Passo

1. **Agente recebe subtarefa**: "Buscar arquivo no Google Drive"

2. **Agente chama COMPOSIO_MANAGE_CONNECTIONS**:
   ```javascript
   COMPOSIO_MANAGE_CONNECTIONS({
     toolkit: "googledrive",
     action: "check"
   })
   ```

3. **Composio retorna** (se não conectado):
   ```json
   {
     "status": "not_connected",
     "auth_url": "https://connect.composio.dev/link/abc123..."
   }
   ```

4. **Agente retorna JSON estruturado**:
   ```json
   {
     "artifacts": {
       "auth_url": "https://connect.composio.dev/link/abc123...",
       "status": "pending_auth",
       "toolkit": "googledrive"
     },
     "outputs": {
       "message": "Autenticação necessária para Google Drive."
     },
     "success": true
   }
   ```

5. **Sistema detecta autenticação necessária**:
   - Adiciona flag `needs_authentication: true`
   - Salva checkpoint como `pending_auth`
   - Para execução das próximas subtarefas

6. **Usuário recebe**:
   ```
   Para continuar com a tarefa, você precisa autenticar sua conta.
   
   [Clique aqui para conectar ao Google Drive](https://connect.composio.dev/link/abc123...)
   
   Após a autenticação, a conexão será ativada automaticamente.
   ```

## Detecção Primária vs Fallback

### Detecção Primária (Recomendada)

O agente chama `COMPOSIO_MANAGE_CONNECTIONS` e retorna JSON estruturado:

```json
{
  "artifacts": {
    "auth_url": "https://connect.composio.dev/link/...",
    "status": "pending_auth",
    "toolkit": "googledrive"
  },
  "success": true
}
```

**Vantagens:**
- ✅ Mais confiável
- ✅ Estruturado e previsível
- ✅ Inclui informação do toolkit
- ✅ Segue o padrão do Composio

### Detecção Fallback

Se o agente não retornar JSON estruturado, o sistema detecta através de:

1. **Palavras-chave no texto**:
   - Português: "não está ativa", "precisa autenticar", etc.
   - Inglês: "not connected", "need to authenticate", etc.

2. **Link de conexão no texto**:
   - Formato markdown: `[texto](https://connect.composio.dev/...)`
   - URL direta: `https://connect.composio.dev/...`

**Quando usar:**
- Apenas como fallback se o agente não seguir as instruções
- Para compatibilidade com respostas antigas

## Benefícios

1. **Experiência do Usuário**: Usuário recebe link de autenticação imediatamente, sem executar subtarefas desnecessárias
2. **Eficiência**: Não desperdiça recursos executando subtarefas que vão falhar
3. **Clareza**: Mensagem clara sobre o que precisa ser feito
4. **Idempotência**: Checkpoint salvo permite retomar execução após autenticação

## Implementação Técnica

### Arquivos Modificados

1. **src/executor-enhanced.js**:
   - `executeSubtask()`: Detecta falta de conexão no output do agente
   - `validateSubtaskResult()`: Adiciona flag `needs_authentication`
   - `executeWithPlan()`: Para execução quando detecta autenticação necessária

2. **src/agent.js**:
   - `executeTask()`: Verifica estado `pending_auth` e retorna resposta apropriada

3. **src/types.js**:
   - `ExecutionState`: Adiciona campos `auth_required`, `auth_url`, `auth_message`

### Campos Adicionados

**ExecutionState:**
```javascript
{
  status: 'pending_auth',
  auth_required: true,
  auth_url: 'https://connect.composio.dev/...',
  auth_message: 'Mensagem completa do agente'
}
```

**Checkpoint:**
```javascript
{
  status: 'pending_auth',
  artifacts: {
    auth_url: 'https://connect.composio.dev/...',
    status: 'pending_auth',
    message: 'Mensagem completa',
    needs_authentication: true
  },
  needs_authentication: true
}
```

## Testes

Execute o teste de exemplo:

```bash
# Arquivo: examples/test-auth-detection.http
POST http://localhost:3000/execute
Content-Type: application/json

{
  "userId": "test_user_auth",
  "task": "Buscar o arquivo 'Relatório Mensal.xlsx' no Google Drive e enviar por email"
}
```

**Resultado esperado:**
- Status 200
- Mensagem com link de autenticação
- Apenas primeira subtarefa executada
- Checkpoint salvo com `pending_auth`

## Próximos Passos

Após o usuário autenticar:

1. Usuário clica no link de autenticação
2. Completa o fluxo OAuth no Composio
3. Conexão é ativada automaticamente
4. Usuário pode reenviar a mesma tarefa
5. Sistema retoma execução (idempotência via checkpoint)
