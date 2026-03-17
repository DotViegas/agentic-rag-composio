# Setup para Testes do Planner Híbrido

## 🎯 Objetivo

Configurar as conexões necessárias para testar o planner híbrido com múltiplos toolkits.

## 📋 Pré-requisitos

- Node.js instalado
- Variáveis de ambiente configuradas (`.env`):
  - `COMPOSIO_API_KEY`
  - `OPENAI_API_KEY`

## 🚀 Passo a Passo

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar conexões de teste

Execute o script de setup que irá gerar os links de autenticação:

```bash
npm run setup:connections
```

O script irá:
1. ✅ Verificar quais toolkits já estão conectados
2. 🔗 Gerar links de autenticação para toolkits não conectados
3. ⏳ Aguardar você conectar as contas (timeout: 5 minutos por toolkit)
4. ✅ Confirmar quando as conexões estiverem ativas

### 3. Conectar as contas

Quando o script mostrar um link como:

```
📋 LINK DE AUTENTICAÇÃO:
   https://backend.composio.dev/api/v3/auth/...
   
   👆 Abra este link no navegador para conectar gmail
```

1. Copie o link
2. Abra no navegador
3. Faça login na conta (Gmail, Google Drive, Dropbox, etc.)
4. Autorize o acesso
5. Aguarde a confirmação no terminal

### 4. Verificar conexões

Após conectar todas as contas, o script mostrará um resumo:

```
📊 RESUMO DAS CONEXÕES
================================================================================

✅ Toolkits conectados:
   - googledrive
   - gmail
   - dropbox

🎉 TODAS AS CONEXÕES NECESSÁRIAS ESTÃO ATIVAS!
   Você pode executar os testes agora: npm run test:planner
```

### 5. Executar os testes

```bash
npm run test:planner
```

## 🔧 Toolkits Necessários

Os testes precisam dos seguintes toolkits conectados:

| Toolkit | Teste 1 | Teste 2 | Teste 3 | Descrição |
|---------|---------|---------|---------|-----------|
| `googledrive` | ✅ | ✅ | ✅ | Buscar e baixar arquivos |
| `gmail` | ❌ | ✅ | ✅ | Enviar emails |
| `dropbox` | ❌ | ❌ | ✅ | Baixar arquivos do Dropbox |

## 🧪 Testes Disponíveis

### Teste 1: Tarefa com 1 Ferramenta
```
Buscar arquivo Faturas_para_pagar_LUNA 16-03-2026.xlsx no Google Drive
```
- Requer: `googledrive`
- Objetivo: Avaliar qualidade das subtasks para operação simples

### Teste 2: Tarefa com 2 Ferramentas
```
Buscar arquivo relatorio.xlsx no Drive e enviar por email para gerente@empresa.com
```
- Requer: `googledrive`, `gmail`
- Objetivo: Avaliar capacidade de mesclar 2 execution plans

### Teste 3: Tarefa com 5 Ferramentas
```
Baixar planilha vendas.xlsx do Dropbox, processar dados com Python,
gerar gráfico, salvar no Google Drive, e enviar relatório por email
```
- Requer: `googledrive`, `gmail`, `dropbox`, `workbench`
- Objetivo: Problema real complexo com múltiplos toolkits

## 🔍 Troubleshooting

### Problema: "Timeout ao aguardar conexão"

**Solução:**
1. Verifique se você completou o fluxo de OAuth no navegador
2. Execute o script novamente: `npm run setup:connections`
3. O script detectará automaticamente as conexões já ativas

### Problema: "Toolkit não encontrado"

**Solução:**
1. Verifique se o toolkit está disponível na sua conta Composio
2. Verifique se a API key está correta no `.env`

### Problema: "SEARCH_TOOLS retorna results vazio"

**Causa:** O toolkit não está conectado para o usuário de teste.

**Solução:**
1. Execute `npm run setup:connections` novamente
2. Conecte todas as contas necessárias
3. Execute os testes novamente

## 📊 Resultados Esperados

Após conectar todas as contas, os testes devem mostrar:

```
1. Teste 1:
   ✅ Score: 45-60/100
   📋 Subtarefas: 6
   🔵 Composio (real): 6
   🔧 Toolkits: 1

2. Teste 2:
   ✅ Score: 70-85/100
   📋 Subtarefas: 8-12
   🔵 Composio (real): 8-12
   🔧 Toolkits: 2

3. Teste 3:
   ✅ Score: 75-90/100
   📋 Subtarefas: 12-18
   🔵 Composio (real): 12-18
   🔧 Toolkits: 4
```

## 🔄 Reconectar Contas

Se precisar reconectar uma conta:

```bash
# Execute o script novamente
npm run setup:connections

# O script detectará automaticamente quais contas precisam ser reconectadas
```

## 📝 Notas

- As conexões são persistentes e não expiram automaticamente
- Você só precisa conectar as contas uma vez
- O script pode ser executado múltiplas vezes sem problemas
- User ID de teste: `test-format-file`

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs do script de setup
2. Verifique se as variáveis de ambiente estão corretas
3. Verifique se a API key do Composio tem permissões adequadas
