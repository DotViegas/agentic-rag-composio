# Fluxo de Formatação de Resposta

## Visão Geral

Este documento explica como o output do agente é capturado e formatado para o usuário final.

## Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO FAZ REQUISIÇÃO                                       │
│    "Liste os 5 primeiros emails não lidos do Gmail"             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PLANNER DECOMPÕE EM SUBTAREFAS                               │
│    - Subtask 1: Buscar emails não lidos (max 5)                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. EXECUTOR EXECUTA SUBTAREFA                                   │
│    - Agente OpenAI executa com ferramentas Composio             │
│    - result.finalOutput contém resposta do agente               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. EXECUTOR SALVA OUTPUT                                        │
│    outputs: {                                                   │
│      raw_output: "A busca por 5 emails não lidos no Gmail..."  │
│    }                                                            │
│    ↓ Salvo no checkpoint                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. VERIFIER COLETA OUTPUTS                                      │
│    - Percorre TODOS os checkpoints                              │
│    - Coleta checkpoint.data.outputs.raw_output de cada um       │
│    - Concatena múltiplos outputs (se houver)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. RESPONSE FORMATTER ANALISA E FORMATA                         │
│    Input:                                                       │
│    - userTask: "Liste os 5 primeiros emails não lidos..."      │
│    - goal: "Listar 5 emails não lidos do Gmail"                │
│    - agentOutput: "A busca por 5 emails não lidos no Gmail..." │
│    - artifacts: { status: "success" }                           │
│                                                                 │
│    LLM Analisadora (gpt-4o-mini):                               │
│    - Analisa o contexto                                         │
│    - Extrai informações relevantes                              │
│    - Formata com Markdown + emojis                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. RESPOSTA FINAL FORMATADA                                     │
│    {                                                            │
│      "status": 200,                                             │
│      "response-ai": "Tarefa concluída com sucesso",             │
│      "message": "📧 Encontrei 5 emails não lidos:\n\n..."       │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
```

## Exemplo Detalhado: Listagem de Emails

### 1. Output do Agente (Raw)

```
A busca por 5 emails não lidos no Gmail foi bem-sucedida. Aqui estão os detalhes dos emails encontrados:

### Emails Não Lidos

1. **Email 1**
   - **Assunto:** Alerta de segurança
   - **De:** Google <no-reply@accounts.google.com>
   - **Data:** 14 de março de 2026
   - **messageId:** `19cea5f343e7a3c8`

2. **Email 2**
   - **Assunto:** joao, falta só um passo para garantir o que é seu!
   - **De:** PHYSIA - TRAINING AND RESEARCH LTDA <atendimento@eduzz.com>
   - **Data:** 13 de março de 2026
   - **messageId:** `19cea4b8c9e8f123`

3. **Email 3**
   - **Assunto:** Sua fatura chegou
   - **De:** Banco XYZ <noreply@banco.com>
   - **Data:** 13 de março de 2026
   - **messageId:** `19cea3a7b8d7e234`

4. **Email 4**
   - **Assunto:** Reunião amanhã às 10h
   - **De:** João Silva <joao@empresa.com>
   - **Data:** 12 de março de 2026
   - **messageId:** `19cea2b6a7c6d345`

5. **Email 5**
   - **Assunto:** Newsletter Semanal
   - **De:** Tech News <news@technews.com>
   - **Data:** 12 de março de 2026
   - **messageId:** `19cea1c5b6d5e456`
```

### 2. Captura no Executor

```javascript
// Em executor-enhanced.js - executeSubtask()
const outputText = result.finalOutput || '';

// Salva no checkpoint
return {
  artifacts: { status: 'success' },
  outputs: { 
    raw_output: outputText  // ← TODO o texto acima é salvo aqui
  },
  tool_calls: toolCalls,
  success: true
};
```

### 3. Coleta no Verifier

```javascript
// Em verifier.js - buildFinalResponse()
const allOutputs = [];
for (const checkpoint of state.checkpoints) {
  const rawOutput = checkpoint.data?.outputs?.raw_output;
  if (rawOutput && rawOutput.trim()) {
    allOutputs.push(rawOutput);  // ← Coleta de TODOS os checkpoints
  }
}

agentOutput = allOutputs.join('\n\n---\n\n');  // ← Concatena se houver múltiplos
```

### 4. Formatação com LLM

```javascript
// Em response-formatter.js
const formattedResponse = await formatter.formatResponse(
  userTask,        // "Liste os 5 primeiros emails não lidos do Gmail"
  goal,            // "Listar 5 emails não lidos do Gmail"
  agentOutput,     // ← TODO o texto do agente (raw)
  artifacts        // { status: "success" }
);
```

### 5. Resposta Final Formatada

```markdown
📧 Encontrei 5 emails não lidos:

**Email 1**
**Assunto:** Alerta de segurança
**De:** Google <no-reply@accounts.google.com>
**Data:** 14 de março de 2026

**Email 2**
**Assunto:** joao, falta só um passo para garantir o que é seu!
**De:** PHYSIA - TRAINING AND RESEARCH LTDA <atendimento@eduzz.com>
**Data:** 13 de março de 2026

**Email 3**
**Assunto:** Sua fatura chegou
**De:** Banco XYZ <noreply@banco.com>
**Data:** 13 de março de 2026

**Email 4**
**Assunto:** Reunião amanhã às 10h
**De:** João Silva <joao@empresa.com>
**Data:** 12 de março de 2026

**Email 5**
**Assunto:** Newsletter Semanal
**De:** Tech News <news@technews.com>
**Data:** 12 de março de 2026
```

## Exemplo: Envio de Email

### 1. Output do Agente (Raw)

```
O email foi enviado com sucesso para **joaovictorviegas53@gmail.com** com o assunto **"Teste de Validação"**. 

Aqui estão os detalhes do envio:

- **Message ID:** 19cea79d0389d430
- **Status:** Enviado
- **Thread ID:** 19cea79d0389d430

Se precisar de mais alguma coisa, estou à disposição!
```

### 2. Resposta Final Formatada

```markdown
✅ Email enviado com sucesso!

**Destinatário:** joaovictorviegas53@gmail.com
**Assunto:** Teste de Validação
**Status:** Enviado
**Message ID:** 19cea79d0389d430
```

## Exemplo: Workflow Multi-Step

### 1. Subtarefa 1 - Output do Agente

```
Arquivo 'dados.csv' encontrado no Dropbox.
Path: /documentos/dados.csv
File ID: id:abc123xyz
```

### 2. Subtarefa 2 - Output do Agente

```
Arquivo analisado com sucesso.
Total de linhas: 1.247 linhas (incluindo cabeçalho)
```

### 3. Subtarefa 3 - Output do Agente

```
Email enviado para gerente@example.com
Assunto: Relatório de Análise - dados.csv
Corpo: O arquivo dados.csv contém 1.247 linhas de dados.
Message ID: 19cea88e1490e541
```

### 4. Outputs Concatenados (Input para Formatter)

```
Arquivo 'dados.csv' encontrado no Dropbox.
Path: /documentos/dados.csv
File ID: id:abc123xyz

---

Arquivo analisado com sucesso.
Total de linhas: 1.247 linhas (incluindo cabeçalho)

---

Email enviado para gerente@example.com
Assunto: Relatório de Análise - dados.csv
Corpo: O arquivo dados.csv contém 1.247 linhas de dados.
Message ID: 19cea88e1490e541
```

### 5. Resposta Final Formatada

```markdown
✅ Tarefa concluída com sucesso!

**Arquivo analisado:** dados.csv
**Localização:** Dropbox > /documentos/
**Total de linhas:** 1.247 linhas

**Email enviado:**
**Para:** gerente@example.com
**Assunto:** Relatório de Análise - dados.csv
**Conteúdo:** Informação sobre o total de linhas do arquivo
```

## Garantias do Sistema

✅ **Output completo é preservado**: Todo o texto retornado pelo agente é salvo em `raw_output`

✅ **Múltiplas subtarefas são concatenadas**: Se houver workflow multi-step, todos os outputs são unidos

✅ **Formatação inteligente**: LLM analisa e extrai apenas informações relevantes

✅ **Fallback robusto**: Se LLM falhar, retorna output original

✅ **Logs detalhados**: Todo o fluxo é logado para debug

## Verificação

Para verificar se o output está sendo capturado corretamente, procure nos logs:

```
ℹ️  Processando resultado do agente...
Output do agente: A busca por 5 emails não lidos no Gmail...
```

E depois:

```
🔄 Construindo resposta final com LLM formatadora...
Outputs coletados: 1
Output do agente (prévia): A busca por 5 emails não lidos no Gmail...
```

Se você ver essas mensagens, o output está sendo capturado e passado corretamente para o formatter!
