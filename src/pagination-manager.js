/**
 * Gerenciamento inteligente de paginação
 * Melhoria #5: Limites e critérios de parada
 */

export class PaginationManager {
  constructor(logger) {
    this.logger = logger;
    this.defaultMaxPages = 10;
    this.defaultMaxItems = 100;
    this.defaultTimeBudgetMs = 60000; // 1 minuto
  }

  /**
   * Extrai configuração de paginação da subtarefa
   */
  extractPaginationConfig(subtask) {
    const config = {
      max_pages: this.defaultMaxPages,
      max_items: this.defaultMaxItems,
      time_budget_ms: this.defaultTimeBudgetMs,
      stop_condition: null
    };

    // Extrair do intent ou success_criteria
    const text = `${subtask.intent} ${subtask.success_criteria}`.toLowerCase();

    // Detectar "todos" ou "completo"
    if (text.includes('todos') || text.includes('all') || text.includes('completo')) {
      config.max_pages = 50; // Aumentar limite
      config.max_items = 1000;
    }

    // Detectar "primeiro" ou "um"
    if (text.includes('primeiro') || text.includes('first') || text.includes('um ')) {
      config.max_pages = 1;
      config.max_items = 1;
      config.stop_condition = 'first_match';
    }

    // Detectar números específicos
    const numberMatch = text.match(/(\d+)\s*(item|arquivo|email|resultado)/);
    if (numberMatch) {
      config.max_items = parseInt(numberMatch[1]);
      config.max_pages = Math.ceil(config.max_items / 20); // Assumir ~20 itens por página
    }

    return config;
  }

  /**
   * Executa paginação com limites e critérios de parada
   */
  async executePagination(executeFn, config, stopConditionFn = null) {
    const results = [];
    let currentPage = 0;
    let nextPageToken = null;
    let totalItems = 0;
    const startTime = Date.now();

    this.logger.info('Iniciando paginação');
    this.logger.field('  Max páginas', config.max_pages);
    this.logger.field('  Max itens', config.max_items);
    this.logger.field('  Time budget', `${config.time_budget_ms}ms`);

    while (currentPage < config.max_pages) {
      currentPage++;

      // Verificar time budget
      const elapsed = Date.now() - startTime;
      if (elapsed > config.time_budget_ms) {
        this.logger.warning(`Time budget excedido (${elapsed}ms)`);
        break;
      }

      this.logger.trace(`Página ${currentPage}/${config.max_pages}`);

      try {
        // Executar chamada com token de paginação
        const response = await executeFn(nextPageToken);
        
        // Extrair itens da resposta
        const items = this.extractItems(response);
        results.push(...items);
        totalItems += items.length;

        this.logger.info(`  Coletados: ${items.length} itens (total: ${totalItems})`);

        // Verificar critério de parada customizado
        if (stopConditionFn && stopConditionFn(results, response)) {
          this.logger.success('Critério de parada atingido');
          break;
        }

        // Verificar limite de itens
        if (totalItems >= config.max_items) {
          this.logger.success(`Limite de itens atingido (${config.max_items})`);
          break;
        }

        // Extrair próximo token
        nextPageToken = this.extractNextPageToken(response);
        
        if (!nextPageToken) {
          this.logger.success('Última página alcançada');
          break;
        }

      } catch (error) {
        this.logger.error(`Erro na página ${currentPage}: ${error.message}`);
        throw error;
      }
    }

    const duration = Date.now() - startTime;
    this.logger.success(`Paginação concluída: ${totalItems} itens em ${currentPage} páginas (${duration}ms)`);

    return {
      items: results.slice(0, config.max_items), // Garantir limite
      total_items: totalItems,
      pages_fetched: currentPage,
      duration_ms: duration,
      truncated: totalItems > config.max_items || currentPage >= config.max_pages
    };
  }

  /**
   * Extrai itens da resposta (suporta vários formatos)
   */
  extractItems(response) {
    if (!response) return [];

    // Array direto
    if (Array.isArray(response)) {
      return response;
    }

    // Objeto com campo comum de itens
    const itemFields = ['items', 'data', 'results', 'entries', 'records', 'messages', 'files'];
    
    for (const field of itemFields) {
      if (response[field] && Array.isArray(response[field])) {
        return response[field];
      }
    }

    // Se não encontrou array, retornar resposta como item único
    return [response];
  }

  /**
   * Extrai token de próxima página (suporta vários formatos)
   */
  extractNextPageToken(response) {
    if (!response) return null;

    // Campos comuns de paginação
    const tokenFields = [
      'next_page_token',
      'nextPageToken',
      'next_token',
      'nextToken',
      'cursor',
      'next_cursor',
      'nextCursor',
      'continuation_token',
      'page_token'
    ];

    for (const field of tokenFields) {
      if (response[field]) {
        return response[field];
      }
    }

    // Verificar paginação baseada em offset
    if (response.offset !== undefined && response.total !== undefined) {
      const nextOffset = response.offset + (response.limit || 20);
      if (nextOffset < response.total) {
        return { offset: nextOffset };
      }
    }

    // Verificar paginação baseada em página
    if (response.page !== undefined && response.total_pages !== undefined) {
      if (response.page < response.total_pages) {
        return { page: response.page + 1 };
      }
    }

    return null;
  }

  /**
   * Cria função de critério de parada para busca
   */
  createSearchStopCondition(searchTerm, exactMatch = false) {
    return (results, response) => {
      if (results.length === 0) return false;

      const lastItem = results[results.length - 1];
      const itemStr = JSON.stringify(lastItem).toLowerCase();
      const term = searchTerm.toLowerCase();

      if (exactMatch) {
        // Busca exata: parar se encontrou match perfeito
        return itemStr.includes(term);
      } else {
        // Busca fuzzy: parar se encontrou pelo menos um resultado relevante
        return results.length > 0;
      }
    };
  }

  /**
   * Solicita confirmação do usuário quando há múltiplos resultados
   */
  async requestUserChoice(items, context) {
    if (items.length === 0) {
      return null;
    }

    if (items.length === 1) {
      return items[0];
    }

    // Em produção, aqui você pausaria e pediria escolha do usuário
    this.logger.warning(`Múltiplos resultados encontrados (${items.length})`);
    this.logger.info('Contexto: ' + context);
    
    // Por enquanto, retornar o primeiro
    this.logger.info('Selecionando primeiro resultado automaticamente');
    return items[0];
  }
}
