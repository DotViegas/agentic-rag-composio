# Guia Rápido - Detecção de Autenticação

## 🎯 Resumo em 30 Segundos

O sistema verifica automaticamente se a conta está conectada ANTES de executar ferramentas. Se não estiver, para a execução e retorna o link de autenticação ao usuário.

## 🔑 Conceitos-Chave

| Conceito | Descrição |
|----------|-----------|
| **COMPOSIO_MANAGE_CONNECTIONS** | Meta tool que verifica status da conexão |
| **auth_url** | Link de autenticação do Composio |
| **pending_auth** | Status indicando que autenticação é necessária |
| **needs_authentication** | Flag que para a execução |
| **Checkpoint** | Estado salvo para retomar após autenticação |

## 📋 Checklist de Verificação

### Para Desenvolvedores

- [ ] Agente chama `COMPOSIO_MANAGE_CONNECTIONS` antes de executar ferramentas
- [ ] Agente retorna JSON estruturado com `auth_url` quando não conectado
- [ ] Sistema detecta `auth_url` nos artefatos
- [ ] Sistema adiciona flag `needs_authentication: true`
- [ ] Execução para (break do loop)
- [ ] Checkpoint salvo com status `pending_auth`
- [ ] Usuário recebe link de autenticação

### Para Testes

- [ ] Toolkit não está conectado para o userId de teste
- [ ] Requisição enviada com sucesso
- [ ] Resposta tem status 200
- [ ] Mensagem contém link de autenticação
- [ ] Apenas primeira subtarefa executada
- [ ] Checkpoint salvo em `.checkpoints/`
- [ ] Checkpoint tem status `pending_auth`

## 🚀 Comandos Rápidos

### Iniciar Servidor
```bash
npm start
```

### Fazer Requisição de Teste
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "task": "Buscar arquivo no Google Drive"
  }'
```

### Verificar Checkpoint
```bash
# Ver último checkpoint
ls -lt .checkpoints/ | head -2

# Ver conteúdo
cat .checkpoints/checkpoint_*.json | jq '.'

# Verificar status
cat .checkpoints/checkpoint_*.json | jq '.status'

# Ver auth_url
cat .checkpoints/checkpoint_*.json | jq '.artifacts.auth_url'
```

### Ativar Debug
```bash
echo "DEBUG=true" >> .env
npm start
```

## 📊 Fluxo Simplificado

```
1. Usuário → Requisição
2. Sistema → Planeja subtarefas
3. Agente → Verifica conexão (COMPOSIO_MANAGE_CONNECTIONS)
4. Composio → Retorna auth_url (se não conectado)
5. Agente → Retorna JSON com auth_url
6. Sistema → Detecta e para execução
7. Usuário → Recebe link de autenticação
```

## 🔍 Detecção

### Método Primário ✅
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

### Método Fallback ⚠️
- Palavras-chave: "não está ativa", "precisa autenticar"
- Link no texto: `https://connect.composio.dev/...`

## 📝 Exemplos de Código

### Chamada do Agente
```javascript
COMPOSIO_MANAGE_CONNECTIONS({
  toolkit: "googledrive",
  action: "check"
})
```

### Resposta do Composio (Não Conectado)
```json
{
  "status": "not_connected",
  "auth_url": "https://connect.composio.dev/link/xyz789..."
}
```

### Resposta do Agente
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

### Detecção no Sistema
```javascript
if (artifacts.auth_url || artifacts.status === 'pending_auth') {
  artifacts.needs_authentication = true;
  return { artifacts, outputs, success: true };
}
```

### Parada da Execução
```javascript
if (result.result.artifacts?.needs_authentication) {
  state.status = 'pending_auth';
  state.auth_required = true;
  state.auth_url = result.result.artifacts.auth_url;
  break; // Para o loop
}
```

## 🎨 Resposta ao Usuário

### Conectado ✅
```json
{
  "status": 200,
  "response-ai": "Tarefa concluída com sucesso",
  "message": "Arquivo encontrado: Relatório.xlsx"
}
```

### Não Conectado ❌
```json
{
  "status": 200,
  "response-ai": "Autenticação necessária para continuar",
  "message": "Para continuar com a tarefa, você precisa autenticar sua conta.\n\n[Clique aqui para conectar ao Google Drive](https://connect.composio.dev/link/xyz789...)\n\nApós a autenticação, a conexão será ativada automaticamente."
}
```

## 🔧 Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `src/executor-enhanced.js` | Instruções do agente, detecção, parada |
| `src/agent.js` | Tratamento de estado `pending_auth` |
| `src/types.js` | Campos de autenticação no estado |
| `.checkpoints/` | Checkpoints salvos |
| `docs/AUTH-DETECTION.md` | Documentação completa |
| `examples/test-auth-detection.http` | Exemplo de teste |

## 📚 Documentação

| Documento | Conteúdo |
|-----------|----------|
| [AUTH-DETECTION.md](AUTH-DETECTION.md) | Documentação completa |
| [AUTH-DETECTION-FLOW.md](AUTH-DETECTION-FLOW.md) | Fluxo visual |
| [AUTH-DETECTION-SUMMARY.md](AUTH-DETECTION-SUMMARY.md) | Resumo executivo |
| [AUTH-DETECTION-FAQ.md](AUTH-DETECTION-FAQ.md) | Perguntas frequentes |
| [CHANGELOG-AUTH-DETECTION.md](CHANGELOG-AUTH-DETECTION.md) | Histórico de mudanças |

## 🐛 Debug

### Logs Importantes
```
🔐 Autenticação necessária detectada no JSON estruturado
🔐 Parando execução - autenticação necessária
⏸️  Execução pausada - usuário precisa autenticar
```

### Verificar Debug Report
```bash
cat .debug/debug_trace_*.json | jq '.tool_calls[] | select(.tool | contains("MANAGE_CONNECTIONS"))'
```

## ⚡ Dicas Rápidas

1. **Sempre use JSON estruturado**: Mais confiável que texto
2. **Verifique logs**: Procure por 🔐 nos logs
3. **Checkpoint é seu amigo**: Permite retomar após autenticação
4. **Teste sem conexão**: Desconecte toolkit antes de testar
5. **Debug ajuda**: Ative `DEBUG=true` para ver tudo

## 🎯 Casos de Uso

### Caso 1: Buscar Arquivo
```
Tarefa: "Buscar arquivo 'Relatório.xlsx' no Google Drive"
Toolkit: googledrive
Resultado: Link de autenticação se não conectado
```

### Caso 2: Enviar Email
```
Tarefa: "Enviar email para joao@example.com"
Toolkit: gmail
Resultado: Link de autenticação se não conectado
```

### Caso 3: Criar Issue
```
Tarefa: "Criar issue no GitHub"
Toolkit: github
Resultado: Link de autenticação se não conectado
```

## 🔄 Fluxo de Retomada

```
1. Usuário autentica (clica no link)
2. Composio ativa conexão
3. Usuário reenvia mesma requisição
4. Sistema verifica checkpoint (idempotência)
5. Execução continua de onde parou
6. Tarefa concluída com sucesso
```

## ✅ Validação

### Verificar se Está Funcionando

1. **Fazer requisição sem conexão**
   - Deve retornar link de autenticação
   - Status 200 (não erro)

2. **Verificar checkpoint**
   - Deve existir em `.checkpoints/`
   - Status deve ser `pending_auth`

3. **Verificar logs**
   - Deve mostrar 🔐 nos logs
   - Deve mostrar "Parando execução"

4. **Verificar resposta**
   - Deve conter link do Composio
   - Deve ter mensagem clara

## 🚨 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Agente não chama MANAGE_CONNECTIONS | Verificar instruções em `executor-enhanced.js` |
| Sistema não detecta auth_url | Verificar se JSON está estruturado corretamente |
| Execução não para | Verificar flag `needs_authentication` |
| Checkpoint não salva | Verificar permissões do diretório `.checkpoints/` |
| Usuário não recebe link | Verificar tratamento em `agent.js` |

## 📞 Suporte

- **Documentação**: [docs/AUTH-DETECTION.md](AUTH-DETECTION.md)
- **FAQ**: [docs/AUTH-DETECTION-FAQ.md](AUTH-DETECTION-FAQ.md)
- **Exemplos**: [examples/test-auth-detection.http](../examples/test-auth-detection.http)

---

**Versão**: 1.0.0  
**Última Atualização**: 2024  
**Status**: ✅ Pronto para Produção
