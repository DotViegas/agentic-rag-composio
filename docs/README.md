# Documentação do Projeto

Esta pasta contém toda a documentação técnica do Agentic RAG Composio.

## 📖 Índice

### Arquitetura e Design

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arquitetura completa do sistema
  - Visão geral do sistema
  - Fluxo de execução (3 fases)
  - Componentes e módulos
  - Decisões de design

### Melhorias e Otimizações

- **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Log de melhorias implementadas
  - Validação de schemas
  - Sistema de retry inteligente
  - Gerenciamento de paginação
  - Checkpoints e idempotência
  - Formatação de respostas

- **[TOKEN-OPTIMIZATION.md](TOKEN-OPTIMIZATION.md)** - Otimizações de tokens
  - Estratégias de redução de custos
  - Análise de consumo
  - Técnicas de otimização

- **[SEARCH-TOOLS-OPTIMIZATION.md](SEARCH-TOOLS-OPTIMIZATION.md)** - Otimização de busca de ferramentas
  - Estratégias de busca
  - Cache e performance
  - Redução de chamadas LLM

### Implementações Específicas

- **[CACHE-IMPLEMENTATION-SUMMARY.md](CACHE-IMPLEMENTATION-SUMMARY.md)** - Sistema de cache
  - Cache persistente
  - Estratégias de invalidação
  - Performance

- **[PERSISTENT-CACHE.md](PERSISTENT-CACHE.md)** - Detalhes do cache persistente
  - Implementação técnica
  - Casos de uso
  - Configuração

### Guias e Tutoriais

- **[cloud-guide-v2.md](cloud-guide-v2.md)** - Guia de deploy em cloud
  - Deploy em produção
  - Configurações de ambiente
  - Boas práticas

- **[SETUP-TESTES.md](SETUP-TESTES.md)** - Configuração de testes
  - Setup de ambiente de testes
  - Conexões e autenticação
  - Exemplos de testes

## 🔗 Links Relacionados

- [README Principal](../README.md) - Documentação principal do projeto
- [Instruções do Agente](../specs/agent.md) - Instruções para o agente LLM
- [Exemplos HTTP](../examples/) - Exemplos de requisições
