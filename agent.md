# agent.md — Instruções para um Agente usar o Composio MCP Tool Router

## Objetivo
Executar tarefas em apps externos com alta confiabilidade usando o Composio (Tool Router), seguindo um fluxo **planejar → validar → executar → verificar**, sem inventar ferramentas, parâmetros ou resultados.

---

## Princípios fundamentais

- **Ferramentas primeiro**: sempre que o pedido envolver apps/serviços externos (Gmail, Drive, Dropbox, Slack, GitHub etc.), descubra ferramentas via `COMPOSIO_SEARCH_TOOLS` antes de executar qualquer ação.
- **Nada de suposições**: nunca invente *tool_slug*, campos de input, IDs, paths, ou formatos. Se não souber, busque schema ou pergunte.
- **Schema rígido**: execute tools apenas com argumentos **100% compatíveis** com o schema retornado.
- **Sem execução sem conexão ACTIVE**: nunca chame tools de um toolkit sem conexão ativa confirmada.
- **Paginação obrigatória**: para listagens/buscas, pagine até terminar (ou até atender o objetivo) — não entregue resultados parciais quando “todos”/“completo” for solicitado.
- **Checkpoints**: capture IDs e artefatos retornados (message_id, file_id, issue_id, event_id, rev/version etc.) para retomar fluxos sem refazer etapas.
- **Ações destrutivas exigem confirmação**: deletar, sobrescrever, mover, revogar acesso, enviar mensagem em massa, alterar permissões, encerrar recursos etc.

---

## Fluxo padrão (para 95%+ dos casos)

### 1) Normalizar o pedido do usuário
Extraia e registre:
- **objetivo final**
- **apps envolvidos**
- **restrições** (prazo, formato, destinatários, tom, anexos, permissões)
- **critérios de sucesso** (o que comprova que acabou)

Se faltar informação crítica, faça **1–3 perguntas objetivas** (não um interrogatório).

---

### 2) Decompor em subtarefas atômicas (DAG)
Quebre em passos que caibam em **uma chamada de tool** cada.

Para cada passo, defina:
- **ação**
- **inputs necessários**
- **outputs esperados**
- **dependências**
- **critério de sucesso**
- **risco** (destrutivo? irreversível? público?)

Exemplo (Dropbox → Email com anexo):
1. localizar arquivo no Dropbox → retorna `file_id/path`
2. baixar/exportar → retorna `content/local_file`
3. editar conteúdo → retorna `new_content`
4. upload nova versão/cópia → retorna `rev/version`
5. enviar email com anexo → retorna `message_id`

---

### 3) Descobrir ferramentas com `COMPOSIO_SEARCH_TOOLS`
**Regra**: antes de qualquer execução, chamar `COMPOSIO_SEARCH_TOOLS`.

Como montar queries:
- Faça **1 query por subtarefa** (atômica).
- Inclua o **app** no texto do use case (ex.: “download file from dropbox”).
- Coloque identificadores (email, canal, path) em `known_fields` quando já conhecidos.

Checklist ao ler a resposta:
- ferramentas relevantes + alternativas
- ferramentas de pré-requisito (ex.: “get id”, “list folders”, “search messages”)
- pitfalls (IDs vs nomes, formatos, paginação, limites)
- se algum tool vem com `schemaRef` (precisa schema completo)

---

### 4) Carregar schemas completos com `COMPOSIO_GET_TOOL_SCHEMAS`
Se o tool não vier com schema completo (ou vier com `schemaRef`), chame `COMPOSIO_GET_TOOL_SCHEMAS` para os `tool_slugs` que você vai usar.

**Proibição**: não execute um tool se você não viu o schema completo e não tem certeza dos campos obrigatórios.

---

### 5) Garantir autenticação com `COMPOSIO_MANAGE_CONNECTIONS`
Antes de executar:
- verifique se o toolkit está **ACTIVE**
- se não estiver, chame `COMPOSIO_MANAGE_CONNECTIONS` com o **nome exato** do toolkit e entregue o link ao usuário
- só continue quando ACTIVE

---

### 6) Executar com `COMPOSIO_MULTI_EXECUTE_TOOL`
- Use para passos independentes em paralelo (ex.: buscar IDs em dois sistemas).
- Para passos com dependência, execute em sequência (1 → 2 → 3…).
- Sempre defina:
  - `current_step`
  - `current_step_metric` (ex.: “2/5 steps”, “10/200 items”)
- Após cada execução:
  - valide presença dos campos essenciais (IDs, status, conteúdo)
  - salve outputs relevantes no estado do workflow

---

### 7) Tratar paginação (sempre que existir)
Se a resposta retornar `next_page_token`, `cursor`, `page`, etc.:
- continue chamando o tool com o token até:
  - achar o item desejado **ou**
  - esgotar páginas **ou**
  - atingir limite acordado com o usuário

---

### 8) Segurança e confirmação (antes de ações destrutivas)
Antes de:
- sobrescrever arquivo
- apagar/mover recursos
- enviar para muitos destinatários
- alterar permissões/compartilhamento
- postar em canal público
- criar custos (ads, infra, compras)

Faça confirmação explícita com resumo:
- o que será alterado
- onde
- impacto
- possibilidade de rollback (se houver)

---

### 9) Verificação final e resposta
Conclua somente quando critérios de sucesso forem atendidos.
Retorne:
- o que foi feito (passos relevantes)
- links/IDs gerados (quando disponíveis)
- onde encontrar o resultado no app
- próximos passos opcionais

---

## Regras de qualidade (obrigatórias)

### “Não inventar”
- não invente IDs, paths, tool slugs, campos, formatos
- não invente que “enviou” algo sem `message_id`/confirmação do tool
- se faltar dado: busque via tool ou pergunte

### Perguntas ao usuário (mínimo necessário)
Pergunte apenas o que:
- é obrigatório para o schema
- evita erro grave (destinatário errado, overwrite)
- resolve ambiguidade real (múltiplos arquivos com mesmo nome)

### Consistência de timezone e datas
- interprete datas na timezone do usuário quando relevante
- normalize para o formato requerido pelo tool

---

## Padrões de implementação recomendados

### Estado do workflow (campos mínimos)
- `goal`
- `constraints`
- `toolkits_involved`
- `connections_status`
- `artifacts` (ids/links): `file_id`, `rev`, `message_id`, `event_id`…
- `checkpoints` (passo atual + outputs)
- `confirmations` (overwrites, deletions, bulk sends)

---

## Quando usar `COMPOSIO_REMOTE_WORKBENCH`
Use apenas quando:
- houver **100+ itens** (operações em massa)
- precisar processar respostas grandes
- precisar orquestrar loops/paginação complexa com paralelismo

Regras:
- checkpoints
- paralelismo com limites (rate limit)
- não chamar meta-tools do Composio dentro de loops que causem ciclos; use `run_composio_tool` (app tools) na workbench

---

## Playbooks (exemplos de sequência)

### A) Editar arquivo no Dropbox e enviar por email (anexo)
1. `COMPOSIO_SEARCH_TOOLS`: “find file in dropbox”, “download/export from dropbox”, “upload file to dropbox”, “send email with attachment (gmail/outlook)”
2. `COMPOSIO_MANAGE_CONNECTIONS`: dropbox + gmail/outlook (se necessário)
3. Executar: localizar → baixar/exportar → editar → upload (nova versão ou cópia) → baixar final (se necessário) → enviar email com anexo
4. Verificar: revisão do arquivo + `message_id`

### B) Criar issue no GitHub e avisar no Slack
1. descobrir tools GitHub (create issue) e Slack (send message)
2. criar issue → capturar URL/number → postar no Slack com link

## Playbook C) Consolidar dados de múltiplas fontes e gerar um relatório (Sheets/Drive + Slack/Email)

**Exemplo de pedido:** “Pegue as vendas do mês no Stripe, os leads no HubSpot e gere um relatório em Google Sheets; depois envie o link no Slack.”

### Sequência (DAG)
1. **Descobrir ferramentas**
   - `COMPOSIO_SEARCH_TOOLS` (queries separadas):
     - “fetch monthly sales from Stripe”
     - “fetch leads from HubSpot”
     - “create/update spreadsheet in Google Sheets”
     - “upload file to Google Drive” (se for arquivo)
     - “send message to Slack with link”
2. **Conexões**
   - `COMPOSIO_MANAGE_CONNECTIONS`: `stripe`, `hubspot`, `googlesheets`, `google_drive`, `slack` (conforme retornado pelo search)
3. **Coleta**
   - Buscar vendas do mês (com paginação se necessário)
   - Buscar leads do mês (com paginação)
4. **Transformação**
   - Normalizar campos (datas, moeda, colunas)
   - Deduplicar / agregar (ex.: total por dia, canal, vendedor)
   - Se dataset for grande (100+ linhas ou múltiplas páginas), usar `COMPOSIO_REMOTE_WORKBENCH`
5. **Publicação**
   - Criar planilha e preencher abas/tabelas
   - Opcional: criar aba “Resumo” (KPIs)
6. **Distribuição**
   - Postar link no Slack (e/ou enviar email com link)
7. **Verificação**
   - Confirmar URL da planilha + confirmação de mensagem enviada (ts/message_id)

### Perguntas mínimas (se faltarem)
- Qual período exato? (mês atual ou mês fechado)
- Qual canal do Slack?
- Estrutura desejada do relatório (KPIs e colunas)

### Riscos/pitfalls
- Paginação e rate limits em CRMs/Payments
- Timezone para recorte mensal
- Colunas obrigatórias no Sheets e limites de escrita em batch

---

## Playbook D) Triagem de emails + criação de tarefas/bugs (Gmail/Outlook → Jira/Linear/Trello) com regras

**Exemplo de pedido:** “Leia emails não lidos com assunto ‘Bug’, crie issues no Jira e responda confirmando o recebimento.”

### Sequência (DAG)
1. **Descobrir ferramentas**
   - `COMPOSIO_SEARCH_TOOLS`:
     - “search unread emails in Gmail/Outlook with query”
     - “get email details”
     - “create issue in Jira/Linear”
     - “reply to email”
     - “add label / mark as read”
2. **Conexões**
   - `COMPOSIO_MANAGE_CONNECTIONS`: email toolkit + issue tracker toolkit
3. **Buscar emails**
   - Search com query (paginando até cobrir o escopo pedido)
4. **Extrair campos por email**
   - Para cada email: assunto, remetente, corpo, anexos, prioridade (heurística)
   - Se muitos emails: `COMPOSIO_REMOTE_WORKBENCH` para paralelizar e evitar timeout
5. **Criar issue**
   - Mapear: título, descrição, labels, prioridade, componente/projeto, anexos (se suportado)
6. **Responder email**
   - Resposta curta com número/link da issue
7. **Pós-processamento**
   - Marcar como lido
   - Aplicar label “triaged/created-issue”
8. **Verificação**
   - Confirmar issues criadas (keys/URLs)
   - Confirmar replies enviadas (message_id/thread_id)

### Confirmação obrigatória (antes de executar em lote)
- “Posso criar issues para **N emails** e responder todos automaticamente?”

### Riscos/pitfalls
- Duplicatas (mesmo bug em threads diferentes) → estratégia: dedupe por assunto + hash do corpo
- Limites de anexos
- Regras do Jira (campos obrigatórios, projeto, issue type)

---

## Playbook E) Gerar e publicar release notes (GitHub → Notion/Confluence → Slack)

**Exemplo de pedido:** “Crie release notes da versão v1.8.0 a partir dos PRs merged desde a v1.7.0, publique no Notion e anuncie no Slack.”

### Sequência (DAG)
1. **Descobrir ferramentas**
   - `COMPOSIO_SEARCH_TOOLS`:
     - “get GitHub releases/tags”
     - “list merged pull requests between two refs”
     - “list commits/issues with labels”
     - “create/update page in Notion/Confluence”
     - “send Slack message”
2. **Conexões**
   - `COMPOSIO_MANAGE_CONNECTIONS`: `github`, `notion`/`confluence`, `slack`
3. **Definir intervalo**
   - Resolver refs: tag anterior e tag atual (ou datas)
4. **Coletar mudanças**
   - PRs merged no intervalo + labels + autores + links
   - Se necessário, buscar issues relacionadas (closing keywords)
   - Paginar até completar
5. **Classificar e redigir**
   - Agrupar por:
     - Breaking changes
     - Features
     - Fixes
     - Performance
     - Docs/Chore
   - Gerar texto com links para PRs/issues
6. **Publicar**
   - Criar/atualizar página no Notion/Confluence
   - Capturar URL
7. **Anunciar**
   - Mensagem no Slack com:
     - versão
     - highlights
     - link das release notes
8. **Verificação**
   - URL da página + confirmação do post no Slack

### Perguntas mínimas (se faltarem)
- Qual repositório (owner/repo)?
- Onde publicar (workspace/page/database no Notion ou space no Confluence)?
- Qual canal do Slack?

### Riscos/pitfalls
- PRs sem labels → fallback: classificar por prefixo do título (feat/fix/chore)
- Intervalo por tag vs data (tags ausentes)
- Formatação (Markdown vs blocos do Notion/Confluence) — usar tool apropriado/compatível

## Playbook F) Provisionar onboarding de funcionário (Google Workspace/Microsoft + Slack + Notion/Jira)

**Exemplo de pedido:** “Onboard da Maria: criar conta, adicionar aos grupos, convidar para canais do Slack, criar página no Notion e abrir tarefas no Jira.”

### Sequência (DAG)
1. **Descobrir ferramentas**
   - `COMPOSIO_SEARCH_TOOLS`:
     - “create user in Google Workspace / Microsoft 365”
     - “add user to group / distribution list”
     - “invite user to Slack workspace / channels”
     - “create Notion page from template”
     - “create Jira issues in project”
2. **Conexões**
   - `COMPOSIO_MANAGE_CONNECTIONS`: admin toolkit (Workspace/M365), `slack`, `notion`, `jira`
3. **Resolver inputs críticos**
   - nome completo, email corporativo desejado, time/departamento, manager, data de início, grupos/canais padrão
4. **Criar conta**
   - criar usuário e capturar `user_id`
5. **Atribuir acessos**
   - adicionar em grupos/listas
   - atribuir licenças (se aplicável/necessário)
6. **Slack**
   - convidar para workspace
   - adicionar aos canais (lista definida)
7. **Notion**
   - criar página de onboarding baseada em template (capturar URL)
8. **Jira**
   - criar conjunto de issues (IT setup, acessos, equipamentos, treinamento) e atribuir responsáveis
9. **Verificação**
   - confirmar usuário criado + grupos + convites + links + keys do Jira

### Confirmação obrigatória (alto impacto)
- “Confirma criar conta e conceder acessos para: X (grupos/canais/licenças)?”

### Riscos/pitfalls
- Ações administrativas irreversíveis
- Nomes de grupos/canais vs IDs (resolver IDs primeiro)
- Licenças/planos insuficientes (erro comum)

---

## Playbook G) Reunião “auto-agendada” com convidados + pauta e materiais (Calendar + Drive/Dropbox + Email/Slack)

**Exemplo de pedido:** “Marque uma reunião de 45 min com João e Ana na próxima semana, crie um doc de pauta e envie o convite com o link.”

### Sequência (DAG)
1. **Descobrir ferramentas**
   - `COMPOSIO_SEARCH_TOOLS`:
     - “find availability / free busy in Google Calendar / Outlook Calendar”
     - “create calendar event with attendees”
     - “create doc in Google Drive / Dropbox Paper”
     - “send email / Slack message with agenda link”
2. **Conexões**
   - `COMPOSIO_MANAGE_CONNECTIONS`: calendar toolkit + drive/dropbox + email/slack
3. **Coletar preferências**
   - janela de horários, timezone, plataforma (Meet/Teams/Zoom), local, título, participantes
4. **Encontrar horários**
   - consultar disponibilidade (se suportado) ou sugerir 3 slots
5. **Criar doc de pauta**
   - criar documento a partir de template e capturar URL
6. **Criar evento**
   - criar evento com link de conferência e incluir URL da pauta na descrição
7. **Notificar**
   - enviar email ou Slack com:
     - horário confirmado
     - link do evento
     - link da pauta
8. **Verificação**
   - confirmar `event_id` + links + confirmações de envio

### Perguntas mínimas (se faltarem)
- Quem são os convidados (emails)?
- Qual janela de horário e dias preferidos?
- Preferência de plataforma (Meet/Teams/Zoom)?

### Riscos/pitfalls
- Timezone (normalizar sempre)
- Convidados externos e políticas de convite
- Permissões de compartilhamento do doc (garantir acesso)

---

## Playbook H) Migração/organização de arquivos com logs e validação (Drive/Dropbox/OneDrive)

**Exemplo de pedido:** “Mova todas as pastas de 2024 do Dropbox para o Google Drive, mantendo a estrutura, e gere um log com o que foi movido.”

### Sequência (DAG)
1. **Descobrir ferramentas**
   - `COMPOSIO_SEARCH_TOOLS`:
     - “list folders in Dropbox with pagination”
     - “download file from Dropbox”
     - “create folder in Google Drive”
     - “upload file to Google Drive”
     - “search file in Google Drive by name/path”
2. **Conexões**
   - `COMPOSIO_MANAGE_CONNECTIONS`: `dropbox`, `google_drive`
3. **Planejar estratégia**
   - modo: **copy** (recomendado) vs **move** (destrutivo)
   - regra de naming para conflitos (ex.: “(1)”, timestamp)
4. **Inventariar origem**
   - listar árvore de diretórios (paginando)
   - filtrar “2024”
5. **Criar estrutura destino**
   - criar pastas equivalentes no Drive
6. **Transferir arquivos**
   - download (origem) → upload (destino)
   - validar por tamanho/hash quando possível
7. **Gerar log**
   - tabela: `source_path`, `dest_path`, `status`, `error`, `file_size`, `timestamp`
   - se volume grande: `COMPOSIO_REMOTE_WORKBENCH` para paralelizar e persistir checkpoints
8. **(Opcional) Destrutivo: remover origem**
   - somente após validação completa + confirmação explícita do usuário
9. **Verificação**
   - amostragem/contagem: total de arquivos e pastas, falhas, links do destino
   - entregar log (arquivo ou link)

### Confirmação obrigatória
- “Você quer **copiar** (seguro) ou **mover** (destrutivo)?”
- “Confirma a pasta origem e a pasta destino?”

### Riscos/pitfalls
- Rate limits e timeouts (batch + paralelismo controlado)
- Itens com nomes duplicados/paths longos
- Permissões/compartilhamentos não migram automaticamente (depende do toolkit)

---

## Erros comuns e como evitar

- **Confundir nome com ID**: sempre use ferramentas de “search/list/get” para resolver ID antes de update/delete.
- **Ignorar paginação**: não assuma que a primeira página contém o item.
- **Executar sem schema completo**: resulta em chamadas inválidas e retrabalho.
- **Pular validação pós-execução**: sempre checar outputs críticos.
- **Fazer overwrite sem confirmação**: sempre pedir confirmação quando irreversível.

---

## Definição de “feito”
A tarefa está concluída quando:
- o efeito externo está confirmado (ID/status/link)
- os artefatos foram retornados ao usuário
- riscos foram tratados (confirmações registradas)
- o agente consegue explicar “onde ver” o resultado no app