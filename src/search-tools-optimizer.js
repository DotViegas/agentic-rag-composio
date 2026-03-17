/**
 * Otimizador de COMPOSIO_SEARCH_TOOLS
 * Reduz ~7k tokens para ~500-800 tokens mantendo funcionalidade completa
 */

export class SearchToolsOptimizer {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Extrai apenas o essencial do COMPOSIO_SEARCH_TOOLS
   * Redução: 7,769 tokens → ~500-800 tokens (90% de economia)
   */
  extractEssentials(searchResult) {
    if (!searchResult?.data?.results?.[0]) {
      this.logger.warning('SEARCH_TOOLS retornou formato inválido');
      return null;
    }

    const result = searchResult.data.results[0];
    const toolSchemas = searchResult.data.tool_schemas || {};
    const connections = searchResult.data.toolkit_connection_statuses || [];

    // 1. SESSION_ID (CRÍTICO - para continuidade)
    const sessionId = searchResult.data.session?.id;

    // 2. TOOLS SELECIONADAS (apenas primary, top 3-5)
    const primaryTools = (result.primary_tool_slugs || []).slice(0, 5);
    const relatedTools = (result.related_tool_slugs || []).slice(0, 3);

    // 3. TOOL MANIFEST (mínimo necessário)
    const toolManifest = {};
    
    for (const toolSlug of primaryTools) {
      const schema = toolSchemas[toolSlug];
      if (!schema) continue;

      toolManifest[toolSlug] = {
        slug: toolSlug,
        toolkit: schema.toolkit,
        description: this.truncateDescription(schema.description, 100),
        
        // Schema: apenas campos required e seus tipos
        required_fields: this.extractRequiredFields(schema.input_schema),
        optional_fields: this.extractOptionalFields(schema.input_schema),
        
        // Se não tem schema completo, precisa buscar depois
        hasFullSchema: schema.hasFullSchema || false,
        schemaRef: schema.schemaRef || null
      };
    }

    // 4. RELATED TOOLS (apenas referência, sem schema)
    const relatedManifest = relatedTools.map(slug => ({
      slug,
      toolkit: toolSchemas[slug]?.toolkit,
      needsSchema: true // Buscar depois se necessário
    }));

    // 5. CONNECTION STATUS (resumido)
    const connectionStatus = {};
    for (const conn of connections) {
      connectionStatus[conn.toolkit] = {
        active: conn.has_active_connection,
        needsAuth: !conn.has_active_connection
      };
    }

    // 6. PLANO RESUMIDO (3-8 bullets principais)
    const planSummary = this.summarizePlan(
      result.recommended_plan_steps || [],
      result.known_pitfalls || []
    );

    // 7. CONTEXTO TEMPORAL
    const timeContext = {
      utc: searchResult.data.time_info?.current_time_utc,
      epoch: searchResult.data.time_info?.current_time_utc_epoch_seconds
    };

    // RESULTADO OTIMIZADO
    const optimized = {
      session_id: sessionId,
      use_case: result.use_case,
      toolkits: result.toolkits || [],
      
      // Tools principais (com info mínima)
      primary_tools: toolManifest,
      
      // Tools relacionadas (apenas referência)
      related_tools: relatedManifest,
      
      // Status de conexão
      connections: connectionStatus,
      
      // Plano resumido
      plan: planSummary,
      
      // Contexto temporal
      time: timeContext,
      
      // Próximos passos
      next_steps: searchResult.data.next_steps_guidance || []
    };

    // Log de economia
    const originalSize = JSON.stringify(searchResult).length;
    const optimizedSize = JSON.stringify(optimized).length;
    const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    this.logger.success(`✅ SEARCH_TOOLS otimizado`);
    this.logger.field('  Original', `${originalSize} chars (~${Math.ceil(originalSize / 4)} tokens)`);
    this.logger.field('  Otimizado', `${optimizedSize} chars (~${Math.ceil(optimizedSize / 4)} tokens)`);
    this.logger.field('  Redução', `${reduction}%`);

    return optimized;
  }

  /**
   * Trunca descrição mantendo apenas o essencial
   */
  truncateDescription(desc, maxLength = 100) {
    if (!desc || desc.length <= maxLength) return desc;
    
    // Pegar primeira sentença ou até maxLength
    const firstSentence = desc.split(/[.!?]/)[0];
    if (firstSentence.length <= maxLength) {
      return firstSentence + '.';
    }
    
    return desc.substring(0, maxLength) + '...';
  }

  /**
   * Extrai apenas campos required e seus tipos
   */
  extractRequiredFields(inputSchema) {
    if (!inputSchema?.properties) return [];
    
    const required = inputSchema.required || [];
    const fields = [];

    for (const fieldName of required) {
      const field = inputSchema.properties[fieldName];
      if (!field) continue;

      fields.push({
        name: fieldName,
        type: field.type || 'string',
        description: this.truncateDescription(field.description, 60)
      });
    }

    return fields;
  }

  /**
   * Extrai campos opcionais mais importantes (top 5)
   */
  extractOptionalFields(inputSchema) {
    if (!inputSchema?.properties) return [];
    
    const required = inputSchema.required || [];
    const fields = [];

    for (const fieldName in inputSchema.properties) {
      if (required.includes(fieldName)) continue;
      
      const field = inputSchema.properties[fieldName];
      
      // Priorizar campos com default ou enum (mais importantes)
      const priority = (field.default !== undefined || field.enum) ? 1 : 0;
      
      fields.push({
        name: fieldName,
        type: field.type || 'string',
        priority
      });
    }

    // Retornar top 5 opcionais mais importantes
    return fields
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)
      .map(f => ({ name: f.name, type: f.type }));
  }

  /**
   * Resume plano em 3-8 bullets principais
   */
  summarizePlan(steps, pitfalls) {
    const summary = {
      key_steps: [],
      critical_pitfalls: []
    };

    // Extrair apenas steps REQUIRED e principais
    for (const step of steps) {
      const stepText = typeof step === 'string' ? step : step.description || '';
      
      // Priorizar Required e Step (não Optional)
      if (stepText.match(/\[Required\]|\[Step \d+\]/i)) {
        // Limpar marcadores e truncar
        const clean = stepText
          .replace(/\[Required\]|\[Step \d+\]|\[Next Step\]/gi, '')
          .trim()
          .substring(0, 120);
        
        summary.key_steps.push(clean);
        
        // Limitar a 5 steps principais
        if (summary.key_steps.length >= 5) break;
      }
    }

    // Extrair apenas pitfalls críticos (top 3)
    summary.critical_pitfalls = pitfalls
      .slice(0, 3)
      .map(p => {
        // Extrair apenas a parte principal (antes do ponto e vírgula)
        const main = p.split(';')[0].substring(0, 100);
        return main;
      });

    return summary;
  }

  /**
   * Busca schema completo apenas quando necessário
   */
  async loadSchemaIfNeeded(toolSlug, composio, userId) {
    this.logger.info(`📥 Carregando schema completo: ${toolSlug}`);
    
    try {
      const result = await composio.tools.execute('COMPOSIO_GET_TOOL_SCHEMAS', {
        user_id: userId,
        arguments: { tool_slugs: [toolSlug] },
        dangerouslySkipVersionCheck: true
      });

      const schema = result.data?.tool_schemas?.[toolSlug];
      
      if (schema) {
        this.logger.success(`✅ Schema carregado: ${toolSlug}`);
        return schema;
      }
      
      this.logger.warning(`⚠️  Schema não encontrado: ${toolSlug}`);
      return null;
      
    } catch (error) {
      this.logger.error(`❌ Erro ao carregar schema: ${error.message}`);
      return null;
    }
  }

  /**
   * Cria um "tool manifest" para passar ao agente
   * Formato ultra-compacto para o prompt
   */
  createAgentManifest(optimized) {
    const manifest = {
      session_id: optimized.session_id,
      
      // Lista simples de tools disponíveis
      available_tools: Object.keys(optimized.primary_tools),
      
      // Toolkits que precisam de autenticação
      needs_auth: Object.entries(optimized.connections)
        .filter(([_, status]) => status.needsAuth)
        .map(([toolkit, _]) => toolkit),
      
      // Resumo do plano (apenas bullets)
      plan_steps: optimized.plan.key_steps,
      
      // Pitfalls críticos
      warnings: optimized.plan.critical_pitfalls,
      
      // Timestamp para queries temporais
      current_time: optimized.time.utc
    };

    return manifest;
  }

  /**
   * Formata manifest para incluir no prompt do agente
   * Versão ultra-compacta em texto (~200-300 tokens)
   */
  formatForPrompt(manifest) {
    const lines = [];
    
    // Session ID (crítico para continuidade)
    lines.push(`SESSION_ID: ${manifest.session_id}`);
    
    // Tools disponíveis (apenas slugs)
    lines.push(`\nAVAILABLE_TOOLS: ${manifest.available_tools.join(', ')}`);
    
    // Status de autenticação
    if (manifest.needs_auth.length > 0) {
      lines.push(`AUTH_REQUIRED: ${manifest.needs_auth.join(', ')}`);
      lines.push('ACTION: Call COMPOSIO_MANAGE_CONNECTIONS first');
    } else {
      lines.push('AUTH_STATUS: All connections active');
    }
    
    // Plano operacional (3-5 steps)
    if (manifest.plan_steps.length > 0) {
      lines.push('\nKEY_STEPS:');
      manifest.plan_steps.forEach((step, i) => {
        lines.push(`${i + 1}. ${step}`);
      });
    }
    
    // Warnings críticos (top 3)
    if (manifest.warnings.length > 0) {
      lines.push('\nWARNINGS:');
      manifest.warnings.forEach(w => {
        lines.push(`⚠️  ${w}`);
      });
    }
    
    // Timestamp para queries temporais
    lines.push(`\nCURRENT_TIME_UTC: ${manifest.current_time}`);
    
    return lines.join('\n');
  }

  /**
   * Cria um "compact plan" ainda mais enxuto
   * Para casos onde você já sabe qual tool vai usar
   */
  createMinimalPlan(optimized, targetToolSlug) {
    const tool = optimized.primary_tools[targetToolSlug];
    
    if (!tool) {
      return null;
    }

    return {
      session_id: optimized.session_id,
      tool_slug: targetToolSlug,
      toolkit: tool.toolkit,
      required_fields: tool.required_fields,
      optional_fields: tool.optional_fields,
      needs_schema: !tool.hasFullSchema,
      needs_auth: optimized.connections[tool.toolkit]?.needsAuth || false
    };
  }
}
