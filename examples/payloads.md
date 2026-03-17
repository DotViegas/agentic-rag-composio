# Exemplos de Payloads para o Agentic RAG Composio

## Estrutura Básica do Payload

```json
{
  "userId": "string (obrigatório)",
  "task": "string (obrigatório)",
  "context": {
    "additionalContext": "string (opcional)"
  }
}
```

### Campos:
- `userId`: Identificador único do usuário/agente que está fazendo a requisição
- `task`: Descrição clara da tarefa a ser executada
- `context.additionalContext`: Informações extras que podem ajudar na execução

---

## Exemplos Práticos

### 1. Enviar Email (Gmail)

```json
{
  "userId": "user-123",
  "task": "Envie um email para joao@example.com com o assunto 'Reunião Amanhã' e corpo 'Olá, confirmo nossa reunião às 14h.'",
  "context": {
    "additionalContext": "Email profissional, tom formal"
  }
}
```

### 2. Buscar Emails Não Lidos

```json
{
  "userId": "user-123",
  "task": "Liste todos os emails não lidos do Gmail dos últimos 7 dias e mostre os assuntos",
  "context": {
    "additionalContext": "Apenas emails da caixa de entrada principal, ignorar spam"
  }
}
```

### 3. Criar Issue no GitHub

```json
{
  "userId": "dev-team-001",
  "task": "Crie uma issue no repositório 'meu-projeto' com título 'Bug no login' e descrição 'Usuários não conseguem fazer login com email'",
  "context": {
    "additionalContext": "Adicionar label 'bug' e 'priority-high'"
  }
}
```

### 4. Postar Mensagem no Slack

```json
{
  "userId": "bot-notifications",
  "task": "Envie uma mensagem no canal #geral do Slack dizendo 'Deploy concluído com sucesso na produção'",
  "context": {
    "additionalContext": "Incluir emoji de sucesso"
  }
}
```

### 5. Editar Arquivo no Dropbox e Enviar por Email (Usa Workbench)

```json
{
  "userId": "user-456",
  "task": "Localize o arquivo 'relatorio.txt' no Dropbox, adicione a linha 'Atualizado em 14/03/2026' no final, salve e envie por email para gerente@example.com",
  "context": {
    "additionalContext": "Assunto do email: 'Relatório Atualizado'. Use o Workbench para editar o arquivo."
  }
}
```

**Nota:** Esta operação deve usar `COMPOSIO_REMOTE_WORKBENCH` para:
1. Baixar o arquivo do Dropbox
2. Editar o conteúdo adicionando a nova linha
3. Fazer upload da versão atualizada
4. Enviar por email

### 6. Buscar e Processar Múltiplos Itens

```json
{
  "userId": "automation-001",
  "task": "Liste todos os pull requests abertos no GitHub do repositório 'api-backend' e envie um resumo no Slack no canal #dev",
  "context": {
    "additionalContext": "Incluir título, autor e número de cada PR"
  }
}
```

### 7. Criar Evento no Google Calendar

```json
{
  "userId": "user-789",
  "task": "Crie um evento no Google Calendar para amanhã às 15h com título 'Reunião de Sprint' e duração de 1 hora",
  "context": {
    "additionalContext": "Adicionar descrição: 'Revisão das tarefas da semana'"
  }
}
```

### 8. Operação com Confirmação (Ação Destrutiva)

```json
{
  "userId": "admin-001",
  "task": "Delete o arquivo 'backup-old.zip' do Dropbox na pasta /arquivos",
  "context": {
    "additionalContext": "Confirmar antes de deletar, verificar se não é o backup mais recente"
  }
}
```

### 9. Tarefa Complexa Multi-App

```json
{
  "userId": "workflow-bot",
  "task": "Busque o último commit do GitHub no repositório 'frontend', crie uma issue com o título 'Review do commit [hash]' e notifique no Slack canal #code-review",
  "context": {
    "additionalContext": "Incluir link do commit na issue e na mensagem do Slack"
  }
}
```

### 10. Busca com Paginação

```json
{
  "userId": "data-collector",
  "task": "Liste TODOS os arquivos da pasta /documentos no Dropbox, incluindo subpastas",
  "context": {
    "additionalContext": "Preciso da lista completa, não apenas os primeiros resultados"
  }
}
```

---

## Como Enviar via cURL

```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "task": "Envie um email para teste@example.com com assunto Hello",
    "context": {
      "additionalContext": "Email de teste"
    }
  }'
```

## Como Enviar via JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user-123',
    task: 'Liste os emails não lidos do Gmail',
    context: {
      additionalContext: 'Últimos 7 dias apenas'
    }
  })
});

const result = await response.json();
console.log(result);
```

## Como Enviar via Python

```python
import requests

payload = {
    "userId": "user-123",
    "task": "Crie uma issue no GitHub com título 'Bug encontrado'",
    "context": {
        "additionalContext": "Repositório: meu-projeto"
    }
}

response = requests.post(
    'http://localhost:3000/execute',
    json=payload
)

result = response.json()
print(result)
```

---

## Resposta Esperada

### Sucesso:
```json
{
  "success": true,
  "userId": "user-123",
  "task": "Envie um email...",
  "result": "Email enviado com sucesso. Message ID: msg_abc123xyz",
  "metadata": {
    "timestamp": "2026-03-14T01:30:00.000Z",
    "sessionUrl": "https://composio.dev/..."
  }
}
```

### Erro:
```json
{
  "success": false,
  "userId": "user-123",
  "task": "Envie um email...",
  "error": "Conexão com Gmail não está ativa. Por favor, autentique.",
  "metadata": {
    "timestamp": "2026-03-14T01:30:00.000Z"
  }
}
```

---

## Dicas para Montar Boas Tarefas

1. **Seja específico**: Inclua todos os detalhes necessários (destinatários, títulos, conteúdos)
2. **Use contexto adicional**: Para informações que ajudam mas não são parte da tarefa principal
3. **Indique restrições**: Prazos, formatos, filtros, permissões
4. **Para ações destrutivas**: Seja explícito sobre o que deve ser confirmado
5. **Para buscas**: Especifique se quer "todos" os resultados ou apenas alguns
6. **Mantenha userId consistente**: Para manter a sessão e autenticações ativas

---

## Gerenciamento de Sessão

### Limpar sessão de um usuário:
```bash
curl -X DELETE http://localhost:3000/session/user-123
```

Isso remove a sessão em cache. Na próxima requisição, uma nova sessão será criada.
