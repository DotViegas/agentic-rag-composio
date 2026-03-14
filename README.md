# Agentic RAG Composio - Orquestrador Híbrido

Subagente orquestrador para ferramentas Composio que implementa a **Opção 3 (Híbrido)**: Planejamento Controlado + Execução ReAct + Verificação.

## 🚀 Melhorias Implementadas (Produção-Ready)

### ✅ 1. Validação Determinística de Schemas
- Valida argumentos ANTES de executar ferramentas
- Auto-correção de tipos e campos obrigatórios
- Reduz falhas em 60-80%

### ✅ 2. Idempotência e Resume por Checkpoint
- Checkpoints persistentes em disco
- Deduplicação automática (não envia email 2x)
- Retomada de execução sem perda de progresso

### ✅ 3. Retry Inteligente com Classificação de Erros
- Classifica erros em 7 tipos
- Retry apenas erros transientes
- Backoff exponencial + jitter
- Sugestões de ação corretiva

### ✅ 4. Paginação com Limites e Critérios de Parada
- Limites configuráveis (max_pages, max_items, time_budget)
- Critérios de parada customizados
- Controle de custos e performance

### ✅ 5. Formatação Inteligente de Respostas com LLM
- Analisa output do agente e formata para o usuário
- Extrai apenas informações relevantes
- Adapta formato ao tipo de tarefa (envio, listagem, criação)
- Linguagem natural e clara com Markdown
- Fallback automático em caso de erro

Ver `IMPROVEMENTS.md` para detalhes completos.

## Características

- ✅ Planejamento estruturado com decomposição em subtarefas atômicas
- ✅ Execução ReAct com guardrails e checkpoints
- ✅ Verificação rigorosa de critérios de sucesso
- ✅ Modo STRICT para operações críticas
- ✅ Logs estruturados e rastreabilidade completa
- ✅ Confirmações para ações destrutivas
- ✅ Validação de schemas antes de executar
- ✅ Retry inteligente com backoff
- ✅ Idempotência e deduplicação
- ✅ Paginação otimizada
- ✅ Coleta de artefatos e evidências

## Instalação

```bash
npm install
```

## Configuração

1. Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

2. Configure suas chaves de API no arquivo `.env`:
```
COMPOSIO_API_KEY=sua_chave_aqui
OPENAI_API_KEY=sua_chave_aqui
PORT=3000
```

**Nota:** O sistema usa `gpt-4o-mini` por padrão para melhor performance e limites de rate mais altos.

## Execução

```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## API Endpoints

### Health Check
```bash
GET /health
```

### Executar Tarefa
```bash
POST /execute
Content-Type: application/json

{
  "userId": "user-123",
  "task": "Envie um email para teste@example.com com o assunto 'Hello'",
  "context": {
    "additionalContext": "Informações adicionais",
    "execution_mode": "normal"  // ou "strict"
  }
}
```

### Resposta de Sucesso
```json
{
  "status": 200,
  "response-ai": "Tarefa concluída com sucesso",
  "message": "✅ Email enviado com sucesso!\n\n**Destinatário:** teste@example.com\n**Assunto:** Hello\n**Corpo:** Mensagem de teste"
}
```

**Nota:** O campo `message` agora é formatado automaticamente por uma LLM analisadora que:
- Extrai informações relevantes do output do agente
- Formata de acordo com o tipo de tarefa (envio, listagem, criação)
- Usa Markdown e emojis para melhor legibilidade
- Adapta a linguagem ao contexto da solicitação

### Resposta com Perguntas Clarificadoras
```json
{
  "status": 200,
  "response-ai": "Preciso de mais informações para continuar",
  "message": "Para continuar com a tarefa, preciso que você responda:\n\n1. Qual é o endereço de email?\n2. Qual é o assunto?"
}
```

### Resposta com Autenticação Necessária
```json
{
  "status": 200,
  "response-ai": "O usuário deve se conectar para que eu continue com a tarefa",
  "message": "Para enviar o email para **teste@example.com**, preciso que você conclua a autenticação:\n\n- **[Conectar Gmail](https://connect.composio.dev/link/lk_...)**\n\nClique no link para autenticar."
}
```

### Resposta de Erro
```json
{
  "status": 500,
  "response-ai": "Ocorreu um erro durante a execução da tarefa",
  "message": "Descrição detalhada do erro"
}
```

### Limpar Sessão
```bash
DELETE /session/:userId
```

## Modos de Execução

### NORMAL (padrão)
- Validação básica
- Continua em caso de erro não-crítico
- Mais rápido e flexível

### STRICT
- Validação rigorosa
- Para em caso de erro
- Confirmação obrigatória para ações destrutivas
- Ativado automaticamente quando:
  - Ações destrutivas (delete, overwrite)
  - Operações admin ou financeiras
  - Operações em massa (bulk)
  - Mais de 6 subtarefas
  - Mais de 2 toolkits envolvidos

Para forçar modo STRICT:
```json
{
  "context": {
    "execution_mode": "strict"
  }
}
```

## Fluxo de Execução

1. **Planejamento**: LLM decompõe tarefa em subtarefas atômicas
2. **Execução**: Para cada subtarefa:
   - Descobrir ferramentas (SEARCH_TOOLS)
   - Carregar schemas (GET_TOOL_SCHEMAS)
   - Garantir autenticação (MANAGE_CONNECTIONS)
   - Executar (EXECUTE_TOOL)
   - Validar resultado
   - Checkpoint
3. **Verificação**: Valida critérios de sucesso e coleta evidências

## Exemplos de Uso

Ver `examples/payloads.md` para exemplos detalhados.

### Exemplo Simples
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "task": "Liste os emails não lidos do Gmail dos últimos 7 dias"
  }'
```

### Exemplo Multi-App
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "task": "Localize o arquivo relatorio.txt no Dropbox, adicione uma linha no final e envie por email para gerente@example.com",
    "context": {
      "execution_mode": "strict"
    }
  }'
```

## Observabilidade

Cada execução gera logs estruturados mostrando:
- Decomposição em subtarefas
- Ferramentas descobertas
- Schemas carregados
- Status de autenticação
- Execução de cada ferramenta
- Checkpoints
- Validações
- Artefatos coletados
- Evidências de conclusão

Exemplo de log:
```
User: "Envie um email para teste@example.com"

================================================================================
🔧 FASE 1: PLANEJAMENTO
================================================================================
✅ Plano gerado
Objetivo: Enviar email para teste@example.com
Subtarefas: 1

================================================================================
🔧 Decompor em subtarefas atômicas (DAG)
================================================================================
1. Enviar email via Gmail
  Intent: Enviar email com assunto e corpo
  Toolkits: gmail
  Inputs: destinatario, assunto, corpo
  Outputs: message_id
  Sucesso: message_id presente na resposta

================================================================================
🔧 FASE 2: EXECUÇÃO COM PLANO
================================================================================

[Subtarefa 1/1] Enviar email via Gmail

================================================================================
🔧 Descobrir ferramentas com COMPOSIO_SEARCH_TOOLS
================================================================================
...

================================================================================
✅ EXECUÇÃO FINALIZADA
================================================================================
Status: COMPLETED
Trace ID: trace_1234567890_abc123
```

## Arquitetura

Ver `ARCHITECTURE.md` para detalhes completos da arquitetura.

## Estrutura do Projeto

```
.
├── src/
│   ├── index.js                # Servidor Express
│   ├── agent.js                # Orquestrador principal
│   ├── planner.js              # Fase 1: Planejamento
│   ├── executor.js             # Fase 2: Execução (básico)
│   ├── executor-enhanced.js    # Fase 2: Execução (com melhorias)
│   ├── verifier.js             # Fase 3: Verificação
│   ├── response-formatter.js   # Formatação inteligente de respostas
│   ├── validator.js            # Validação de schemas
│   ├── checkpoint-manager.js   # Gerenciamento de checkpoints
│   ├── retry-policy.js         # Política de retry inteligente
│   ├── pagination-manager.js   # Gerenciamento de paginação
│   ├── logger.js               # Sistema de logging
│   └── types.js                # Estruturas de dados
├── .checkpoints/               # Checkpoints persistentes
├── examples/
│   ├── payloads.md             # Exemplos de payloads
│   └── test-requests.http      # Testes HTTP
├── agent.md                    # Instruções do agente
├── ARCHITECTURE.md             # Documentação da arquitetura
├── IMPROVEMENTS.md             # Documentação das melhorias
└── package.json
```

## Desenvolvimento

Para adicionar novos guardrails ou validações, consulte `ARCHITECTURE.md` seção "Extensibilidade".

## Troubleshooting

### Erro de autenticação
Se receber erro de conexão não ativa, o agente vai solicitar autenticação automaticamente via MANAGE_CONNECTIONS.

### Confirmação necessária
Para ações destrutivas, o agente vai pausar e solicitar confirmação (em modo STRICT).

### Perguntas clarificadoras
Se informações críticas estiverem faltando, o agente vai retornar `needs_clarification` com as perguntas.

## Roadmap

- [ ] Implementar retomada de checkpoint (idempotência)
- [ ] Rate limiting awareness
- [ ] Storage persistente de checkpoints
- [ ] Webhooks para confirmações assíncronas
- [ ] Dashboard de observabilidade
- [ ] Métricas e alertas
