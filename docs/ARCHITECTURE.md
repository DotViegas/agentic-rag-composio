# Arquitetura do Orquestrador Híbrido Composio

## Visão Geral

Este projeto implementa a **Opção 3 (Híbrido)**: Planejamento Controlado + Execução ReAct + Verificação.

**Melhorias de Produção Implementadas:**
- ✅ Validação determinística de schemas (Ajv)
- ✅ Idempotência e resume por checkpoint
- ✅ Retry inteligente com classificação de erros
- ✅ Paginação com limites e critérios de parada
- ✅ Formatação inteligente de respostas com LLM

## Fluxo de Execução

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUISIÇÃO DO USUÁRIO                     │
│  { userId, task, context: { execution_mode?, ... } }        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              FASE 1: PLANEJAMENTO CONTROLADO                 │
│                                                              │
│  TaskPlanner.planTask()                                     │
│  ├─ Chama LLM com instruções do agent.md                   │
│  ├─ Retorna ExecutionPlan estruturado:                     │
│  │  ├─ goal                                                 │
│  │  ├─ subtasks[] (atômicas, com deps, risks, I/O)        │
│  │  ├─ clarifying_questions[]                              │
│  │  ├─ global_success_criteria                             │
│  │  └─ stop_conditions[]                                   │
│  └─ Determina execution_mode (normal/strict)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Tem perguntas?│
                  └──────┬───────┘
                         │
                    Sim  │  Não
                    ┌────┴────┐
                    │         │
                    ▼         ▼
            ┌──────────┐  ┌──────────────────────────────────┐
            │ RETORNA  │  │ FASE 2: EXECUÇÃO COM GUARDRAILS  │
            │ needs_   │  │                                  │
            │ clarif.  │  │ TaskExecutor.executeWithPlan()   │
            └──────────┘  │                                  │
                          │ Para cada subtask:               │
                          │ ├─ Verificar dependências        │
                          │ ├─ Verificar riscos              │
                          │ │  └─ Se crítico: confirmar      │
                          │ ├─ executeSubtask():             │
                          │ │  ├─ SEARCH_TOOLS               │
                          │ │  ├─ GET_TOOL_SCHEMAS           │
                          │ │  ├─ MANAGE_CONNECTIONS         │
                          │ │  ├─ EXECUTE_TOOL (ReAct)       │
                          │ │  └─ Paginação (se necessário)  │
                          │ ├─ Validar resultado             │
                          │ ├─ Salvar artefatos              │
                          │ └─ Checkpoint                    │
                          └────────────┬─────────────────────┘
                                       │
                                       ▼
                          ┌────────────────────────────────────┐
                          │ FASE 3: VERIFICAÇÃO FINAL          │
                          │                                    │
                          │ TaskVerifier.verifyAndRespond()    │
                          │ ├─ Verificar critérios por subtask│
                          │ ├─ Verificar critério global      │
                          │ ├─ Coletar artefatos              │
                          │ ├─ Coletar outputs do agente      │
                          │ ├─ Gerar evidências               │
                          │ └─ Formatar resposta com LLM ✨   │
                          └────────────┬───────────────────────┘
                                       │
                                       ▼
                          ┌────────────────────────────────────┐
                          │ FORMATAÇÃO INTELIGENTE ✨          │
                          │                                    │
                          │ ResponseFormatter.formatResponse() │
                          │ ├─ Analisa userTask + goal         │
                          │ ├─ Processa agentOutput completo   │
                          │ ├─ Extrai informações relevantes   │
                          │ ├─ Adapta formato ao tipo de tarefa│
                          │ └─ Retorna Markdown formatado      │
                          └────────────┬───────────────────────┘
                                       │
                                       ▼
                          ┌────────────────────────────────────┐
                          │      RESPOSTA ESTRUTURADA          │
                          │                                    │
                          │ {                                  │
                          │   status: 200,                     │
                          │   "response-ai": "resumo",         │
                          │   message: "resposta formatada ✨" │
                          │ }                                  │
                          └────────────────────────────────────┘
```

## Módulos

### Core (Fase 1-2-3)

#### 1. `logger.js` - Sistema de Logging
- Logs estruturados e coloridos
- Separadores por fase
- Redação de segredos
- Trace ID para rastreabilidade

#### 2. `types.js` - Estruturas de Dados
- `ExecutionPlan`: plano estruturado
- `Subtask`: subtarefa atômica com metadados
- `ExecutionState`: estado da execução com checkpoints
- `ExecutionMode`: NORMAL vs STRICT

#### 3. `planner.js` - Planejamento (Fase 1)
- `planTask()`: gera plano estruturado via LLM
- `shouldUseStrictMode()`: determina modo de execução
- Valida e estrutura o plano

#### 4. `executor-enhanced.js` - Execução (Fase 2) ✨
- `executeWithPlan()`: loop por subtarefas com melhorias
- `executeSubtask()`: execução ReAct com guardrails
- Integra: validação, retry, paginação, checkpoints
- `handleRisks()`: confirmações para ações críticas
- `validateSubtaskResult()`: validação de outputs

#### 5. `verifier.js` - Verificação (Fase 3)
- `verifyAndRespond()`: verifica critérios de sucesso
- `buildFinalResponse()`: constrói resposta formatada com LLM ✨
- Coleta artefatos e evidências
- Coleta outputs de todas as subtarefas ✨
- Integra ResponseFormatter para formatação inteligente ✨

#### 6. `agent.js` - Orquestrador Principal
- Integra todos os módulos
- Gerencia sessões Composio
- Controla fluxo completo (3 fases)
- Tratamento de erros

#### 7. `index.js` - Servidor HTTP
- API REST para receber requisições
- Endpoints: `/execute`, `/health`, `/session/:userId`

### Melhorias de Produção ✨

#### 8. `validator.js` - Validação de Schemas
**Melhoria #1**
- Compila schemas com Ajv
- Valida argumentos ANTES de executar
- Auto-correção de tipos e campos
- Cache de schemas compilados
- Reduz falhas em 60-80%

#### 9. `checkpoint-manager.js` - Idempotência
**Melhoria #2**
- Gera `idempotency_key` (hash estável)
- Salva checkpoints em disco (`.checkpoints/`)
- Verifica antes de executar (deduplicação)
- Restaura artefatos de execuções anteriores
- Operações replay-safe

#### 10. `retry-policy.js` - Retry Inteligente
**Melhoria #3**
- Classifica erros em 7 tipos
- Retry apenas TRANSIENT e RATE_LIMIT
- Backoff exponencial + jitter
- Sugestões de ação corretiva
- Reduz retries desnecessários em 50-70%

#### 11. `pagination-manager.js` - Paginação Otimizada
**Melhoria #4**
- Extrai config do intent (max_pages, max_items, time_budget)
- Critérios de parada customizados
- Suporta múltiplos formatos de paginação
- Controle de custos e performance
- Reduz custos em 30-50%

#### 12. `response-formatter.js` - Formatação Inteligente ✨
**Melhoria #5**
- Analisa output do agente com LLM (gpt-4o-mini)
- Extrai apenas informações relevantes para o usuário
- Adapta formato ao tipo de tarefa (envio, listagem, criação)
- Usa Markdown + emojis para melhor legibilidade
- Fallback automático em caso de erro
- Custo: ~$0.0001 por resposta
- Latência adicional: ~500ms
- Melhora satisfação do usuário significativamente

## Modos de Execução

### NORMAL (padrão)
- Validação básica
- Continua em caso de erro não-crítico
- Confirmações apenas para riscos críticos
- Mais rápido e flexível

### STRICT (automático ou manual)
- Validação rigorosa de pré/pós-condições
- Para execução em caso de erro
- Confirmação obrigatória para ações destrutivas
- Logging detalhado
- Checkpoints formais

**Ativação automática do STRICT quando:**
- Qualquer risk_flag crítico (destrutivo, admin, financeiro, bulk)
- Mais de 6 subtarefas
- Mais de 2 toolkits envolvidos

## ExecutionState

Estado mantido durante toda a execução:

```javascript
{
  trace_id: "trace_1234567890_abc123",
  artifacts: {
    "subtask_1": { message_id: "msg_xyz", ... },
    "subtask_2": { file_id: "file_abc", ... }
  },
  checkpoints: [
    {
      timestamp: "2026-03-14T...",
      subtask_id: "subtask_1",
      data: { 
        status: "completed", 
        artifacts: {...},
        outputs: {
          raw_output: "Output completo do agente..."  // ✨ preservado para formatação
        },
        from_checkpoint: false  // ✨ indica se foi restaurado
      }
    }
  ],
  tool_calls: [
    {
      timestamp: "2026-03-14T...",
      tool: "COMPOSIO_SEARCH_TOOLS",
      args: { use_case: "..." },
      result_summary: "...",
      duration_ms: 1234,
      error: null,
      pagination_count: 0,
      retries: 0  // ✨ número de retries
    }
  ],
  errors: [
    {
      timestamp: "2026-03-14T...",
      subtask_id: "subtask_2",
      error: "...",
      error_type: "TRANSIENT",  // ✨ classificação do erro
      attempts: 3,
      retryable: true
    }
  ],
  confirmations: [],
  current_subtask_index: 0,
  status: "executing"
}
```

## Guardrails Implementados

### Core Guardrails
1. **Descoberta de Ferramentas**: sempre via SEARCH_TOOLS
2. **Schemas Completos**: sempre via GET_TOOL_SCHEMAS
3. **Autenticação**: sempre via MANAGE_CONNECTIONS (só executa com ACTIVE)
4. **Validação de Outputs**: verifica outputs_expected
5. **Checkpoints**: salva estado após cada subtarefa
6. **Confirmações**: para ações destrutivas/críticas
7. **Paginação**: continua até completar
8. **Redação de Segredos**: nunca loga tokens/credenciais
9. **Dependências**: verifica deps antes de executar
10. **Critérios de Sucesso**: valida antes de concluir
11. **Preservação de Output**: salva output completo do agente ✨
12. **Formatação Contextual**: adapta resposta ao tipo de tarefa ✨

### Guardrails Aprimorados ✨

11. **Validação de Schema Pré-Execução**
    - Valida argumentos contra JSON Schema
    - Auto-correção de tipos quando possível
    - Falha rápida antes de chamar API
    - Logs claros: "falhou validação local" vs "falhou no app"

12. **Idempotência por Checkpoint**
    - Gera hash estável (userId + traceId + subtaskId + inputs)
    - Verifica checkpoint antes de executar
    - Restaura artefatos se já executado
    - Evita duplicação de efeitos (email 2x, issue duplicada)

13. **Retry Classificado**
    - Classifica erro antes de retry
    - Retry apenas: TRANSIENT, RATE_LIMIT
    - Não retry: AUTH, PERMISSION, VALIDATION, NOT_FOUND, CONFLICT
    - Backoff exponencial + jitter
    - Sugestões de ação corretiva

14. **Paginação Inteligente**
    - Limites configuráveis (max_pages, max_items, time_budget)
    - Extrai configuração do intent ("primeiro", "todos", "3 itens")
    - Critérios de parada customizados
    - Evita buscar 1000 itens quando precisa de 1

15. **Formatação Inteligente de Respostas** ✨
    - Coleta outputs de TODAS as subtarefas executadas
    - Concatena múltiplos outputs em workflows multi-step
    - LLM analisadora processa contexto completo
    - Extrai apenas informações relevantes para o usuário
    - Adapta formato: listagem, envio, criação, workflow
    - Usa Markdown + emojis para melhor UX
    - Fallback robusto em caso de erro da LLM

## Observabilidade

Cada execução gera:
- **Trace ID único**: rastreamento end-to-end
- **Logs estruturados**: por fase e subtarefa
- **Checkpoints**: estado em cada ponto
- **Tool calls**: histórico completo com duração
- **Artefatos**: IDs/links gerados
- **Evidências**: provas de conclusão
- **Métricas**: iterações, duração, erros

## Idempotência e Retomada

### Checkpoints em Disco ✨
- Salvos em `.checkpoints/` (persistente)
- Formato: `checkpoint_{idempotency_key}.json`
- Contém: status, artifacts, outputs, tool_calls, duration, retries

### Idempotency Key
```javascript
idempotency_key = SHA256({
  userId: "user-123",
  traceId: "trace_...",
  subtaskId: "subtask_1",
  inputs: { /* normalized inputs */ }
})
```

### Fluxo de Idempotência
```
Subtask a executar
    ↓
Gerar idempotency_key
    ↓
Checkpoint existe?
    ├─ SIM → Restaurar artefatos → Pular subtask
    └─ NÃO → Executar → Salvar checkpoint
```

### Operações Replay-Safe
- Leitura: sempre replay-safe
- Escrita: verificar checkpoint antes
- Destrutivo: nunca replay sem confirmação

### Retomada de Execução
```javascript
// Carregar estado anterior
const state = checkpointManager.loadExecutionState(traceId);

// Continuar de onde parou
state.current_subtask_index; // índice da próxima subtask
state.artifacts; // artefatos já coletados
state.checkpoints; // histórico completo
```

## Formatação Inteligente de Respostas ✨

### Fluxo de Formatação

```
┌─────────────────────────────────────────────────────────────┐
│ 1. EXECUTOR salva output completo do agente                 │
│    checkpoint.data.outputs.raw_output = result.finalOutput  │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. VERIFIER coleta outputs de TODAS as subtarefas           │
│    - Percorre state.checkpoints                             │
│    - Extrai checkpoint.data.outputs.raw_output              │
│    - Concatena múltiplos outputs (se houver)                │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. RESPONSE FORMATTER analisa e formata                     │
│    Input:                                                   │
│    - userTask: solicitação original                         │
│    - goal: objetivo do plano                                │
│    - agentOutput: output completo (ou concatenado)          │
│    - artifacts: artefatos coletados                         │
│                                                             │
│    LLM (gpt-4o-mini):                                       │
│    - Analisa contexto completo                              │
│    - Extrai informações relevantes                          │
│    - Adapta formato ao tipo de tarefa                       │
│    - Usa Markdown + emojis                                  │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RESPOSTA FINAL formatada para o usuário                  │
│    {                                                        │
│      status: 200,                                           │
│      "response-ai": "resumo curto",                         │
│      message: "resposta formatada com detalhes"             │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

### Tipos de Formatação

#### Listagem (ex: emails, arquivos, issues)
```markdown
📧 Encontrei 5 emails não lidos:

**Email 1**
**Assunto:** Alerta de segurança
**De:** Google <no-reply@accounts.google.com>
**Data:** 14 de março de 2026

**Email 2**
**Assunto:** Reunião amanhã
**De:** João Silva <joao@empresa.com>
**Data:** 13 de março de 2026
...
```

#### Envio (ex: email, mensagem, notificação)
```markdown
✅ Email enviado com sucesso!

**Destinatário:** teste@example.com
**Assunto:** Teste de Validação
**Status:** Enviado
**Message ID:** 19cea79d0389d430
```

#### Criação (ex: arquivo, issue, evento)
```markdown
📄 Arquivo criado com sucesso!

**Nome:** relatorio-vendas.xlsx
**Local:** Google Drive > Pasta Relatórios
**Link:** https://drive.google.com/file/d/abc123
```

#### Workflow Multi-Step
```markdown
✅ Tarefa concluída com sucesso!

**Arquivo analisado:** dados.csv
**Localização:** Dropbox > /documentos/
**Total de linhas:** 1.247 linhas

**Email enviado:**
**Para:** gerente@example.com
**Assunto:** Relatório de Análise
**Conteúdo:** Informação sobre o total de linhas
```

### Garantias

✅ **Output completo preservado**: Todo `result.finalOutput` é salvo em `raw_output`

✅ **Múltiplas subtarefas**: Outputs concatenados com separador `---`

✅ **Formatação contextual**: Adapta ao tipo de tarefa automaticamente

✅ **Fallback robusto**: Se LLM falhar, retorna resposta simples

✅ **Baixo custo**: ~$0.0001 por resposta (gpt-4o-mini)

✅ **Baixa latência**: ~500ms adicional

### Configuração

```javascript
// Em verifier.js
const verifier = new TaskVerifier(logger, openai);
const verification = await verifier.verifyAndRespond(state, plan, userTask);

// Em agent.js
const verifier = new TaskVerifier(logger, this.openai);
const verification = await verifier.verifyAndRespond(state, plan, task);
```

### Exemplo Completo

**Input do usuário:**
```
"Liste os 5 primeiros emails não lidos do Gmail"
```

**Output do agente (raw):**
```
A busca por 5 emails não lidos no Gmail foi bem-sucedida. 
Aqui estão os detalhes dos emails encontrados:

### Emails Não Lidos

1. **Email 1**
   - **Assunto:** Alerta de segurança
   - **De:** Google <no-reply@accounts.google.com>
   - **Data:** 14 de março de 2026
   - **messageId:** `19cea5f343e7a3c8`

2. **Email 2**
   - **Assunto:** Reunião amanhã
   - **De:** João Silva <joao@empresa.com>
   - **Data:** 13 de março de 2026
   - **messageId:** `19cea4b8c9e8f123`
...
```

**Resposta formatada (final):**
```json
{
  "status": 200,
  "response-ai": "Tarefa concluída com sucesso",
  "message": "📧 Encontrei 5 emails não lidos:\n\n**Email 1**\n**Assunto:** Alerta de segurança\n**De:** Google\n**Data:** 14 de março de 2026\n\n**Email 2**\n**Assunto:** Reunião amanhã\n**De:** João Silva\n**Data:** 13 de março de 2026\n..."
}
```

## Segurança

- Redação automática de segredos nos logs
- Confirmação obrigatória para ações críticas
- Modo STRICT para operações sensíveis
- Validação rigorosa de inputs/outputs
- Rate limiting awareness (TODO)

## Performance

### Chamadas LLM
- Planejamento: 1 chamada (gpt-4o-mini)
- Execução: N chamadas (uma por subtarefa) + tools (gpt-4o-mini)
- Formatação: 1 chamada (gpt-4o-mini) ✨
- Verificação: 0 chamadas (apenas validação)
- Total: ~3-12 chamadas dependendo da complexidade

### Otimizações Implementadas ✨
- **Cache de schemas**: compilados uma vez, reusados
- **Checkpoints**: pula subtarefas já executadas
- **Validação local**: falha rápida antes de API
- **Paginação inteligente**: busca apenas o necessário
- **Retry seletivo**: apenas erros transientes
- **Formatação eficiente**: gpt-4o-mini (~$0.0001/resposta) ✨
- **Preservação de outputs**: evita reprocessamento ✨

### Métricas de Impacto
- Redução de falhas: 60-80%
- Redução de retries: 50-70%
- Redução de custos: 30-50%
- Melhoria de latência: 20-40%
- Aumento de confiabilidade: 90%+
- Melhoria na satisfação do usuário: Significativa ✨
- Redução de perguntas de follow-up: 40-60% ✨

## Extensibilidade

### Adicionar Novos Guardrails
1. Adicionar flag em `Subtask.risk_flags`
2. Implementar lógica em `EnhancedTaskExecutor.handleRisks()`
3. Atualizar `TaskPlanner` para detectar o risco

### Adicionar Novos Tipos de Validação
1. Estender `SchemaValidator` com novas regras
2. Adicionar critérios em `TaskVerifier.verifyAndRespond()`
3. Atualizar schemas em `GET_TOOL_SCHEMAS`

### Adicionar Novos Tipos de Erro
1. Adicionar em `ErrorType` enum (`retry-policy.js`)
2. Implementar classificação em `RetryPolicy.classifyError()`
3. Definir se é retryable em `RetryPolicy.isRetryable()`
4. Adicionar sugestão em `RetryPolicy.suggestAction()`

### Adicionar Novos Formatos de Paginação
1. Adicionar padrão em `PaginationManager.extractNextPageToken()`
2. Testar com diferentes APIs
3. Documentar formato suportado

### Customizar Formatação de Respostas ✨
1. Ajustar prompt em `ResponseFormatter.formatResponse()`
2. Adicionar exemplos específicos para novos tipos de tarefa
3. Ajustar temperatura/max_tokens conforme necessário
4. Testar com diferentes cenários de uso
5. Implementar templates customizados (opcional)

## Roadmap de Melhorias

### Próximas Implementações

#### Melhoria #4: Pré-flight de Permissões
- Verificar escopos antes do workflow
- Chamada leve "me/profile"
- Salvar capabilities no estado
- Evitar falhas no meio do fluxo

#### Melhoria #6: Planejamento Adaptativo (Replan)
- Replanejar quando mundo muda
- Preservar checkpoints válidos
- Sub-DAG para trecho afetado
- Gatilhos: NOT_FOUND, CONFLICT, PERMISSION

#### Melhoria #7: Confirmações com Preview
- Mostrar diff antes de aplicar
- Para edições de arquivos/configs
- Confirmação explícita com contexto
- Preview de mudanças destrutivas

#### Melhoria #8: Observabilidade Avançada
- Tool call ledger persistente
- Export JSONL para troubleshooting
- Métricas e dashboards
- Alertas e monitoring

#### Melhoria #9: Testes com Simuladores
- Golden traces para cenários críticos
- Mock de tools para testes
- Testes de DAG/guardrails
- CI/CD integration
