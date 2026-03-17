/**
 * Extrator eficiente de COMPOSIO_SEARCH_TOOLS
 * Reduz JSON de 50KB-200KB para 2KB-5KB (redução de 95-98%)
 * 
 * Baseado nas orientações oficiais da equipe Composio
 */

export class SearchToolsExtractor {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Etapa 2: Extrair resumo operacional do SEARCH_TOOLS
   * Identifica: tools disponíveis, schemas carregados/faltantes, conexões necessárias
   */
  extractOperationalSummary(searchToolsResult) {
    if (!searchToolsResult) return null;

    const summary = {
      session_id: searchToolsResult.session_id,
      candidate_tools: [
        ...(searchToolsResult.primary_tool_slugs || []),
        ...(searchToolsResult.related_tool_slugs || [])
      ],
      schemas_loaded: [],
      schemas_missing: [],
      connections_needed: [],
      recommended_plan: searchToolsResult.recommended_plan || null,
      pitfalls: searchToolsResult.pitfalls || []
    };

    // Identificar schemas carregados vs faltantes
    if (searchToolsResult.tool_schemas) {
      for (const [slug, schema] of Object.entries(searchToolsResult.tool_schemas)) {
        if (schema.hasFullSchema === true) {
          summary.schemas_loaded.push(slug);
        } else if (schema.schemaRef) {
          summary.schemas_missing.push(slug);
        }
      }
    }

    // Identificar conexões necessárias
    if (searchToolsResult.connection_status) {
      for (const [toolkit, status] of Object.entries(searchToolsResult.connection_status)) {
        if (status.has_active_connection === false) {
          summary.connections_needed.push(toolkit);
        }
      }
    }

    return summary;
  }

  /**
   * Etapa 3: Filtrar tools por objetivo e toolkit permitido
   * Remove tools irrelevantes para o objetivo específico
   */
  filterToolsByObjective(candidateTools, objective, allowedToolkits = []) {
    const filtered = [];

    for (const toolSlug of candidateTools) {
      // Extrair toolkit do slug (ex: GOOGLEDRIVE_FIND_FILE → googledrive)
      const toolkit = this.extractToolkitFromSlug(toolSlug);

      // Se há lista de toolkits permitidos, verificar
      if (allowedToolkits.length > 0 && !allowedToolkits.includes(toolkit)) {
        continue;
      }

      // Filtrar por objetivo (palavras-chave)
      const relevantForObjective = this.isRelevantForObjective(toolSlug, objective);
      if (relevantForObjective) {
        filtered.push(toolSlug);
      }
    }

    return filtered;
  }

  /**
   * Extrair toolkit do tool_slug
   */
  extractToolkitFromSlug(toolSlug) {
    // Ex: GOOGLEDRIVE_FIND_FILE → googledrive
    const parts = toolSlug.split('_');
    return parts[0].toLowerCase();
  }

  /**
   * Verificar se tool é relevante para o objetivo
   */
  isRelevantForObjective(toolSlug, objective) {
    const lowerObjective = objective.toLowerCase();
    const lowerSlug = toolSlug.toLowerCase();

    // Mapeamento de palavras-chave para ações
    const keywordMap = {
      buscar: ['find', 'search', 'list', 'get'],
      baixar: ['download', 'export', 'get'],
      editar: ['edit', 'update', 'modify', 'patch'],
      criar: ['create', 'upload', 'add', 'insert'],
      deletar: ['delete', 'remove', 'trash'],
      copiar: ['copy', 'duplicate'],
      mover: ['move', 'rename'],
      compartilhar: ['share', 'permission'],
      enviar: ['send', 'post', 'publish']
    };

    // Verificar se objetivo contém palavras-chave
    for (const [keyword, actions] of Object.entries(keywordMap)) {
      if (lowerObjective.includes(keyword)) {
        // Verificar se tool slug contém alguma das ações
        const matches = actions.some(action => lowerSlug.includes(action));
        if (matches) return true;
      }
    }

    // Se não houver filtro específico, incluir (mas com prioridade baixa)
    return true;
  }

  /**
   * Extrair apenas campos essenciais do schema
   * Mantém apenas: required fields + 3-8 opcionais mais prováveis
   */
  extractMinimalSchema(toolSchema) {
    if (!toolSchema || !toolSchema.input_schema) return null;

    const inputSchema = toolSchema.input_schema;
    const required = inputSchema.required || [];
    const properties = inputSchema.properties || {};

    // Extrair apenas campos obrigatórios + opcionais comuns
    const essentialFields = {};

    // Campos obrigatórios
    for (const field of required) {
      if (properties[field]) {
        essentialFields[field] = {
          type: properties[field].type,
          description: properties[field].description || '',
          required: true
        };
      }
    }

    // Campos opcionais comuns (paginação, filtros, etc)
    const commonOptionalFields = [
      'pageToken', 'pageSize', 'maxResults', 'limit', 'offset',
      'fields', 'filter', 'query', 'q',
      'orderBy', 'sortBy', 'sort',
      'includeItemsFromAllDrives', 'supportsAllDrives', 'corpora',
      'mimeType', 'mime_type',
      'trashed', 'includeDeleted'
    ];

    let optionalCount = 0;
    for (const field of commonOptionalFields) {
      if (properties[field] && !essentialFields[field] && optionalCount < 8) {
        essentialFields[field] = {
          type: properties[field].type,
          description: properties[field].description || '',
          required: false
        };
        optionalCount++;
      }
    }

    return {
      tool_slug: toolSchema.tool_slug || '',
      description: toolSchema.description || '',
      fields: essentialFields
    };
  }

  /**
   * Criar "Tool Plan" compacto (máximo 5 linhas)
   * Formato: tool_slug + campos obrigatórios + por quê
   */
  createCompactToolPlan(filteredTools, toolSchemas, objective) {
    const plan = [];

    for (const toolSlug of filteredTools.slice(0, 5)) { // Máximo 5 tools
      const schema = toolSchemas[toolSlug];
      if (!schema) continue;

      const minimalSchema = this.extractMinimalSchema(schema);
      if (!minimalSchema) continue;

      const requiredFields = Object.entries(minimalSchema.fields)
        .filter(([_, info]) => info.required)
        .map(([name, _]) => name);

      plan.push({
        tool_slug: toolSlug,
        required_fields: requiredFields,
        optional_fields: Object.entries(minimalSchema.fields)
          .filter(([_, info]) => !info.required)
          .map(([name, _]) => name)
          .slice(0, 3), // Máximo 3 opcionais
        why: this.explainWhy(toolSlug, objective),
        description: minimalSchema.description
      });
    }

    return plan;
  }

  /**
   * Explicar por que a tool é necessária
   */
  explainWhy(toolSlug, objective) {
    const lowerSlug = toolSlug.toLowerCase();

    if (lowerSlug.includes('find') || lowerSlug.includes('search') || lowerSlug.includes('list')) {
      return 'Localizar arquivo/recurso';
    }
    if (lowerSlug.includes('download') || lowerSlug.includes('export')) {
      return 'Baixar conteúdo';
    }
    if (lowerSlug.includes('upload') || lowerSlug.includes('create')) {
      return 'Fazer upload/criar';
    }
    if (lowerSlug.includes('edit') || lowerSlug.includes('update') || lowerSlug.includes('modify')) {
      return 'Editar/atualizar';
    }
    if (lowerSlug.includes('delete') || lowerSlug.includes('trash') || lowerSlug.includes('remove')) {
      return 'Deletar/mover para lixeira';
    }
    if (lowerSlug.includes('copy') || lowerSlug.includes('duplicate')) {
      return 'Copiar/duplicar';
    }
    if (lowerSlug.includes('move') || lowerSlug.includes('rename')) {
      return 'Mover/renomear';
    }
    if (lowerSlug.includes('share') || lowerSlug.includes('permission')) {
      return 'Compartilhar/gerenciar permissões';
    }
    if (lowerSlug.includes('send') || lowerSlug.includes('post')) {
      return 'Enviar/publicar';
    }

    return 'Executar operação';
  }

  /**
   * Formato compacto para injetar no prompt do LLM
   * Reduz de 50KB para ~2KB
   */
  formatForPrompt(operationalSummary, compactPlan) {
    const lines = [];

    lines.push('## 🔧 Tools Disponíveis (Plano Compacto)');
    lines.push('');

    if (compactPlan.length === 0) {
      lines.push('⚠️  Nenhuma tool relevante encontrada');
    } else {
      for (const item of compactPlan) {
        const requiredStr = item.required_fields.length > 0 
          ? item.required_fields.join(', ') 
          : 'nenhum';
        const optionalStr = item.optional_fields.length > 0
          ? ` [opcional: ${item.optional_fields.join(', ')}]`
          : '';
        
        lines.push(`- **${item.tool_slug}**`);
        lines.push(`  - Campos obrigatórios: ${requiredStr}`);
        if (optionalStr) {
          lines.push(`  - Campos opcionais: ${item.optional_fields.join(', ')}`);
        }
        lines.push(`  - Propósito: ${item.why}`);
        lines.push('');
      }
    }

    lines.push('## 🔌 Status de Conexões');
    lines.push('');

    if (operationalSummary.connections_needed.length > 0) {
      lines.push(`⚠️  **Necessário autenticar:** ${operationalSummary.connections_needed.join(', ')}`);
      lines.push('   Use COMPOSIO_MANAGE_CONNECTIONS antes de executar');
    } else {
      lines.push('✅ Todas as conexões ativas');
    }

    lines.push('');
    lines.push('## 📋 Schemas');
    lines.push('');
    lines.push(`- Schemas carregados: ${operationalSummary.schemas_loaded.length}`);
    if (operationalSummary.schemas_missing.length > 0) {
      lines.push(`- ⚠️  Schemas faltantes: ${operationalSummary.schemas_missing.join(', ')}`);
      lines.push('   Use COMPOSIO_GET_TOOL_SCHEMAS para carregar');
    }

    lines.push('');
    lines.push(`**Session ID:** \`${operationalSummary.session_id}\``);

    return lines.join('\n');
  }

  /**
   * Extrair toolkits permitidos do objetivo
   */
  extractAllowedToolkits(objective) {
    const lower = objective.toLowerCase();
    const toolkits = [];
    
    // Serviços de nuvem
    if (lower.includes('drive') || lower.includes('google')) toolkits.push('googledrive');
    if (lower.includes('dropbox')) toolkits.push('dropbox');
    if (lower.includes('onedrive')) toolkits.push('onedrive');
    if (lower.includes('box')) toolkits.push('box');
    if (lower.includes('sharepoint')) toolkits.push('sharepoint');
    if (lower.includes('s3') || lower.includes('amazon')) toolkits.push('s3');
    if (lower.includes('azure')) toolkits.push('azureblob');
    
    // Comunicação
    if (lower.includes('gmail') || lower.includes('email')) toolkits.push('gmail');
    if (lower.includes('outlook')) toolkits.push('outlook');
    if (lower.includes('slack')) toolkits.push('slack');
    if (lower.includes('discord')) toolkits.push('discord');
    if (lower.includes('teams')) toolkits.push('microsoftteams');
    
    // Desenvolvimento
    if (lower.includes('github')) toolkits.push('github');
    if (lower.includes('gitlab')) toolkits.push('gitlab');
    if (lower.includes('jira')) toolkits.push('jira');
    if (lower.includes('linear')) toolkits.push('linear');
    
    // Produtividade
    if (lower.includes('notion')) toolkits.push('notion');
    if (lower.includes('trello')) toolkits.push('trello');
    if (lower.includes('asana')) toolkits.push('asana');
    if (lower.includes('calendar')) toolkits.push('googlecalendar');
    
    return toolkits;
  }
}
