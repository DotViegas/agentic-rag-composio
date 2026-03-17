# FAQ - Detecção de Autenticação

## Perguntas Frequentes

### 1. Como o sistema detecta que uma conta não está conectada?

O agente é instruído a chamar `COMPOSIO_MANAGE_CONNECTIONS` com `action="check"` antes de executar qualquer ferramenta. Quando a conexão não está ativa, o Composio retorna um link de autenticação, e o agente retorna JSON estruturado com esse link.

### 2. O que acontece quando a autenticação é necessária?

1. O agente retorna JSON com `auth_url`
2. O sistema detecta e adiciona flag `needs_authentication: true`
3. A execução para imediatamente (próximas subtarefas não são executadas)
4. Um checkpoint é salvo com status `pending_auth`
5. O usuário recebe o link de autenticação

### 3. Por que as próximas subtarefas não são executadas?

Porque elas provavelmente dependem da conexão que não está ativa. Executá-las seria desperdiçar recursos e gerar erros desnecessários. É mais eficiente parar e pedir autenticação primeiro.

### 4. O que acontece após o usuário autenticar?

Após autenticar:
1. A conexão é ativada automaticamente pelo Composio
2. O usuário pode reenviar a mesma requisição
3. O sistema usa o checkpoint salvo (idempotência)
4. A execução continua de onde parou

### 5. Como o agente sabe qual toolkit verificar?

O planejador identifica os toolkits necessários para cada subtarefa e os inclui em `toolkit_candidates`. O agente usa essa informação para chamar `COMPOSIO_MANAGE_CONNECTIONS` com o toolkit correto.

### 6. E se o agente não seguir as instruções?

O sistema tem um fallback que detecta palavras-chave no texto (ex: "não está ativa", "precisa autenticar") e extrai o link de autenticação. Mas o método primário (JSON estruturado) é mais confiável.

### 7. Posso desabilitar essa funcionalidade?

Não é recomendado, pois ela melhora a experiência do usuário. Mas tecnicamente, você poderia modificar as instruções do agente em `src/executor-enhanced.js`.

### 8. O checkpoint é salvo mesmo quando precisa de autenticação?

Sim! O checkpoint é salvo com status `pending_auth` e flag `needs_authentication: true`. Isso permite retomar a execução após autenticação.

### 9. Como verifico se o checkpoint foi salvo corretamente?

```bash
# Ver checkpoint
cat .checkpoints/checkpoint_*.json | jq '.'

# Verificar status
cat .checkpoints/checkpoint_*.json | jq '.status'
# Deve retornar: "pending_auth"

# Verificar flag
cat .checkpoints/checkpoint_*.json | jq '.needs_authentication'
# Deve retornar: true

# Ver auth_url
cat .checkpoints/checkpoint_*.json | jq '.artifacts.auth_url'
# Deve retornar: "https://connect.composio.dev/link/..."
```

### 10. O que é o método "primário" vs "fallback"?

**Método Primário (Recomendado):**
- Agente chama `COMPOSIO_MANAGE_CONNECTIONS`
- Retorna JSON estruturado com `auth_url`
- Mais confiável e previsível

**Método Fallback:**
- Detecta palavras-chave no texto
- Extrai link do texto
- Usado apenas se JSON estruturado não for retornado

### 11. Posso usar múltiplos toolkits na mesma subtarefa?

Sim, mas o agente deve verificar a conexão de cada toolkit separadamente chamando `COMPOSIO_MANAGE_CONNECTIONS` para cada um.

### 12. O que acontece se múltiplos toolkits precisam de autenticação?

O sistema para na primeira subtarefa que detecta falta de conexão. Após o usuário autenticar esse toolkit, ele pode reenviar a requisição e o sistema verificará o próximo toolkit.

### 13. Como o sistema diferencia erro de autenticação de outros erros?

Através da presença de `auth_url` nos artefatos. Se `auth_url` está presente, é tratado como autenticação necessária (não erro). Outros erros são tratados pelo retry policy.

### 14. O retry policy é acionado quando precisa de autenticação?

Não. Quando `needs_authentication: true`, o sistema para a execução imediatamente sem tentar retry. Autenticação não é um erro recuperável por retry.

### 15. Posso personalizar a mensagem de autenticação?

Sim, você pode modificar a mensagem em `src/agent.js` no método `executeTask()`, onde o estado `pending_auth` é tratado.

### 16. O link de autenticação expira?

Sim, links do Composio geralmente expiram após um período (ex: 10 minutos). Se expirar, o usuário precisa fazer uma nova requisição para obter um novo link.

### 17. Como testo essa funcionalidade?

Use o arquivo `examples/test-auth-detection.http`:

```bash
POST http://localhost:3000/execute
Content-Type: application/json

{
  "userId": "test_user_auth",
  "task": "Buscar arquivo no Google Drive"
}
```

Certifique-se de que o Google Drive não está conectado para o `userId` de teste.

### 18. O que acontece se o usuário já está autenticado?

O `COMPOSIO_MANAGE_CONNECTIONS` retorna status `connected` e o agente continua normalmente executando a ferramenta. Nenhuma parada ocorre.

### 19. Posso ver os logs da detecção?

Sim! Os logs mostram:
- `🔐 Autenticação necessária detectada no JSON estruturado`
- `🔐 Parando execução - autenticação necessária`
- `⏸️ Execução pausada - usuário precisa autenticar`

### 20. Como funciona a idempotência após autenticação?

Quando o usuário reenvia a mesma requisição após autenticar:
1. O sistema gera a mesma chave de idempotência
2. Verifica se há checkpoint existente
3. Se a subtarefa já foi executada com sucesso, pula
4. Se estava `pending_auth`, executa novamente (agora com conexão ativa)

### 21. O debug captura a detecção de autenticação?

Sim! Quando `DEBUG=true`, o relatório inclui:
- Chamada de `COMPOSIO_MANAGE_CONNECTIONS`
- Resposta com `auth_url`
- Checkpoint salvo com `pending_auth`
- Estado atualizado com `auth_required: true`

### 22. Posso forçar verificação de conexão mesmo se já conectado?

Sim, o agente sempre chama `COMPOSIO_MANAGE_CONNECTIONS` com `action="check"` antes de executar ferramentas, independentemente do status anterior.

### 23. Como o sistema lida com conexões expiradas?

Se a conexão estava ativa mas expirou, o `COMPOSIO_MANAGE_CONNECTIONS` retornará status indicando expiração e um novo link de autenticação. O fluxo é o mesmo.

### 24. Posso usar essa funcionalidade com MCP?

Sim! O `COMPOSIO_MANAGE_CONNECTIONS` é uma meta tool disponível tanto via MCP quanto via SDK nativo.

### 25. O que acontece se o Composio estiver fora do ar?

Se o Composio não responder, o retry policy será acionado. Após 3 tentativas, o erro será retornado ao usuário. Autenticação só é detectada se o Composio responder com `auth_url`.

## Troubleshooting

### Problema: Agente não está chamando COMPOSIO_MANAGE_CONNECTIONS

**Solução:** Verifique as instruções do agente em `src/executor-enhanced.js`. Certifique-se de que a instrução #5 está presente e correta.

### Problema: Sistema não detecta auth_url

**Solução:** 
1. Verifique se o agente está retornando JSON estruturado
2. Verifique os logs para ver o output do agente
3. Certifique-se de que `auth_url` está nos artefatos

### Problema: Execução não para após detectar autenticação

**Solução:** Verifique se a flag `needs_authentication` está sendo adicionada aos artefatos em `src/executor-enhanced.js`.

### Problema: Checkpoint não está sendo salvo

**Solução:** Verifique se o diretório `.checkpoints/` existe e tem permissões de escrita.

### Problema: Usuário não recebe link de autenticação

**Solução:** Verifique se o estado `pending_auth` está sendo tratado corretamente em `src/agent.js`.

## Recursos Adicionais

- **Documentação Completa**: [docs/AUTH-DETECTION.md](AUTH-DETECTION.md)
- **Fluxo Visual**: [docs/AUTH-DETECTION-FLOW.md](AUTH-DETECTION-FLOW.md)
- **Changelog**: [docs/CHANGELOG-AUTH-DETECTION.md](CHANGELOG-AUTH-DETECTION.md)
- **Resumo**: [docs/AUTH-DETECTION-SUMMARY.md](AUTH-DETECTION-SUMMARY.md)
- **Exemplo de Teste**: [examples/test-auth-detection.http](../examples/test-auth-detection.http)
