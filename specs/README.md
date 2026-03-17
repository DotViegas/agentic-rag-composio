# Especificações do Agente

Esta pasta contém as instruções e especificações para o agente LLM.

## 📋 Arquivos

### agent.md

Instruções completas para o agente executor, incluindo:

- **Meta Tools do Composio**
  - `COMPOSIO_SEARCH_TOOLS` - Descoberta de ferramentas
  - `COMPOSIO_MANAGE_CONNECTIONS` - Gerenciamento de autenticação
  - `COMPOSIO_MULTI_EXECUTE_TOOL` - Execução paralela de ferramentas
  - `COMPOSIO_REMOTE_WORKBENCH` - Sandbox Python para operações complexas
  - `COMPOSIO_REMOTE_BASH_TOOL` - Comandos bash para processamento

- **Diretrizes de Execução**
  - Como planejar tarefas
  - Como descobrir e executar ferramentas
  - Como lidar com autenticação
  - Como usar o Workbench para operações complexas
  - Como formatar respostas

- **Boas Práticas**
  - Validação de pré-requisitos
  - Tratamento de erros
  - Confirmações de segurança
  - Otimização de performance

### cloud-guide-v2.md

Guia de deploy e configuração em ambientes cloud:

- Configurações de ambiente
- Deploy em produção
- Variáveis de ambiente
- Boas práticas de segurança
- Otimizações para cloud

## 🔗 Como é Usado

Os arquivos desta pasta são carregados automaticamente pelo orquestrador em `src/agent.js`:

- **`agent.md`** - Fornecido ao LLM durante todas as fases (planejamento, execução, verificação)
- **`cloud-guide-v2.md`** - Carregado para contexto de deploy e configuração

## 📝 Modificações

Ao modificar as especificações:

1. Mantenha a estrutura clara e organizada
2. Use exemplos práticos
3. Seja específico sobre comportamentos esperados
4. Documente casos especiais e edge cases
5. Teste as mudanças com diferentes tipos de tarefas

## 🔗 Links Relacionados

- [README Principal](../README.md) - Documentação principal do projeto
- [Documentação Técnica](../docs/) - Documentação completa do sistema
- [Código Fonte](../src/agent.js) - Orquestrador que carrega estas especificações
