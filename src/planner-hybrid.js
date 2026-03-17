/**
 * Planner Híbrido - Usa Execution Plans do Composio + Regras Customizadas
 * 
 * Estratégia:
 * 1. Chama COMPOSIO_SEARCH_TOOLS para obter execution plan recomendado
 * 2. Se múltiplas ferramentas, busca plano para cada uma
 * 3. Usa planos do Composio como BASE (prioridade máxima)
 * 4. Adiciona subtarefas extras quando necessário (validação, confirmação)
 * 5. Mantém regras de segurança (operações destrutivas)
 */

import { ExecutionPlan, Subtask } from './types.js';
import { Composio } from '@composio/core';
import { PersistentCache } from './persistent-cache.js';

export class HybridTaskPlanner {
  constructor(llmClient, debugManager = null, composioApiKey = null, logger = null) {
    this.llm = llmClient;
    this.debugManager = debugManager;
    this.composio = new Composio({ apiKey: composioApiKey || process.env.COMPOSIO_API_KEY });
    
    // 🚀 NOVO: Cache persistente em disco
    this.persistentCache = logger ? new PersistentCache(logger, {
      searchToolsTTL: 24 * 60 * 60 * 1000, // 24 horas
      toolSchemasTTL: 7 * 24 * 60 * 60 * 1000, // 7 dias
      connectionsTTL: 5 * 60 * 1000, // 5 minutos
    }) : null;
  }

  /**
   * Extrai toolkits da tarefa do usuário usando regras hardcoded
   */
  extractToolkitsFromTask(task) {
    const taskLower = task.toLowerCase();
    const toolkits = [];

    // Google Drive
    if (taskLower.match(/arquivo.*(drive|google)|drive.*arquivo|\.xlsx|\.pdf|\.docx|\.txt|\.csv|\.pptx|buscar.*arquivo|baixar.*arquivo/)) {
      toolkits.push('googledrive');
    }

    // Google Sheets
    if (taskLower.match(/célula|range|A1:B10|atualizar.*valores.*planilha|ler.*célula/)) {
      toolkits.push('googlesheets');
    }

    // Gmail
    if (taskLower.match(/email|enviar.*mensagem|caixa.*entrada|destinatário|remetente/)) {
      toolkits.push('gmail');
    }

    // Dropbox
    if (taskLower.match(/dropbox|arquivo.*dropbox/)) {
      toolkits.push('dropbox');
    }

    // OneDrive
    if (taskLower.match(/onedrive|microsoft.*drive|arquivo.*onedrive/)) {
      toolkits.push('onedrive');
    }

    // Workbench (para edição/processamento)
    if (taskLower.match(/editar|modificar|processar|transformar|analisar/)) {
      toolkits.push('workbench');
    }

    return toolkits.length > 0 ? toolkits : ['googledrive']; // Default
  }

  /**
   * Busca execution plan do Composio chamando COMPOSIO_SEARCH_TOOLS via SDK
   */
  async getComposioExecutionPlan(userId, useCase, toolkit = null) {
    try {
      console.log(`   🔧 Executando COMPOSIO_SEARCH_TOOLS para: ${toolkit || 'geral'}`);
      
      // 🚀 CACHE PERSISTENTE: Verificar se já temos em disco
      if (this.persistentCache) {
        const cached = this.persistentCache.getSearchTools(useCase, toolkit, userId);
        
        if (cached) {
          console.log(`   ✅ SEARCH_TOOLS carregado do cache persistente`);
          console.log(`   📋 Plano com ${cached.recommended_steps?.length || 0} steps`);
          return cached;
        }
      }
      
      // Preparar argumentos para SEARCH_TOOLS
      const searchArgs = { use_case: useCase };
      if (toolkit) {
        searchArgs.toolkit = toolkit;
      }
      
      console.log(`   🔧 Argumentos:`, JSON.stringify(searchArgs));
      
      // Executar SEARCH_TOOLS via SDK
      // COMPOSIO_SEARCH_TOOLS é uma meta tool, não precisa de toolkit_versions
      // Mas precisa de dangerouslySkipVersionCheck para executar manualmente
      const result = await this.composio.tools.execute('COMPOSIO_SEARCH_TOOLS', {
        user_id: userId,
        arguments: searchArgs,
        dangerouslySkipVersionCheck: true // Meta tools não precisam de versão
      });
      
      console.log(`   ✅ SEARCH_TOOLS executado com sucesso`);
      
      // Extrair dados do resultado
      const data = result.data || result;
      
      // O formato correto tem results array
      if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
        console.warn(`   ⚠️  Formato inesperado: sem results array`);
        console.warn(`   🔧 Chaves disponíveis:`, Object.keys(data).join(', '));
        return null;
      }

      // Pegar o primeiro resultado
      const firstResult = data.results[0];

      // Extrair execution plan
      const plan = {
        recommended_steps: firstResult.recommended_plan_steps || [],
        primary_tools: firstResult.primary_tool_slugs || [],
        related_tools: firstResult.related_tool_slugs || [],
        toolkits_info: data.toolkit_connection_statuses || [],
        connections_needed: [],
        known_pitfalls: firstResult.known_pitfalls || [],
        difficulty: firstResult.difficulty || 'unknown',
        execution_guidance: firstResult.execution_guidance || '',
        reference_workbench_snippets: firstResult.reference_workbench_snippets || [],
        plan_id: firstResult.plan_id || null,
        use_case: firstResult.use_case || '',
        raw_data: data
      };

      console.log(`   ✅ Plano extraído: ${plan.recommended_steps.length} steps`);

      if (plan.recommended_steps.length > 0) {
        console.log(`   📋 Primeiros 3 steps:`);
        plan.recommended_steps.slice(0, 3).forEach((step, idx) => {
          console.log(`      ${idx + 1}. ${step.substring(0, 80)}...`);
        });
      }

      if (plan.known_pitfalls.length > 0) {
        console.log(`   ⚠️  ${plan.known_pitfalls.length} armadilhas conhecidas`);
      }

      if (plan.difficulty) {
        console.log(`   📊 Dificuldade: ${plan.difficulty}`);
      }
      
      // 🚀 CACHE PERSISTENTE: Salvar em disco
      if (this.persistentCache) {
        this.persistentCache.setSearchTools(useCase, toolkit, userId, plan);
        console.log(`   💾 Plano salvo no cache persistente`);
      }
      
      return plan;
      
    } catch (error) {
      console.warn(`   ⚠️  Erro ao buscar execution plan: ${error.message}`);
      return null;
    }
  }

  /**
   * Converte recommended steps do Composio em subtarefas
   */
  convertComposioStepsToSubtasks(composioPlans, task, toolkits) {
    const subtasks = [];
    let subtaskId = 1;

    // Se temos múltiplos planos (múltiplas ferramentas), mesclar
    const allSteps = [];
    const allTools = new Set();
    const allPitfalls = [];
    const planMetadata = {};

    for (const plan of composioPlans) {
      if (plan && plan.recommended_steps) {
        allSteps.push(...plan.recommended_steps);
      }
      if (plan && plan.primary_tools) {
        plan.primary_tools.forEach(t => allTools.add(t));
      }
      if (plan && plan.known_pitfalls) {
        allPitfalls.push(...plan.known_pitfalls);
      }
      // Guardar metadata do plano
      if (plan) {
        planMetadata.difficulty = plan.difficulty || 'unknown';
        planMetadata.plan_id = plan.plan_id || null;
        planMetadata.execution_guidance = plan.execution_guidance || '';
      }
    }

    // Converter steps em subtarefas
    for (const step of allSteps) {
      const stepText = typeof step === 'string' ? step : step.description || step.step || '';
      
      // Detectar tipo de step baseado nos marcadores do Composio
      let type = 'EXECUTE';
      if (stepText.match(/\[Optional/i)) {
        type = 'OPTIONAL';
      } else if (stepText.match(/\[Required\]/i)) {
        type = 'REQUIRED';
      } else if (stepText.match(/\[Prerequisite\]/i)) {
        type = 'PREREQUISITE';
      } else if (stepText.match(/\[Step \d+\]/i)) {
        type = 'STEP';
      } else if (stepText.match(/\[Next Step\]/i)) {
        type = 'NEXT_STEP';
      } else if (stepText.match(/\[Fallback\]/i)) {
        type = 'FALLBACK';
      }

      // Detectar categoria baseada no conteúdo
      let category = 'EXECUTE';
      if (stepText.match(/Confirm|Enumerate|List|Search|Find/i)) {
        category = 'DISCOVERY';
      } else if (stepText.match(/auth|connect|connection|authenticate/i)) {
        category = 'AUTH';
      } else if (stepText.match(/Search|Get|Retrieve|Download|Read|List/i)) {
        category = 'READ';
      } else if (stepText.match(/Create|Update|Delete|Upload|Write|Send|Modify/i)) {
        category = 'WRITE';
      } else if (stepText.match(/Disambiguate|Verify|Inspect|Check|Confirm/i)) {
        category = 'VERIFY';
      }

      // Extrair tool slugs mencionados no step
      const toolSlugsInStep = [];
      const toolSlugPattern = /[A-Z_]+_[A-Z_]+/g;
      const matches = stepText.match(toolSlugPattern);
      if (matches) {
        toolSlugsInStep.push(...matches);
      }

      // Detectar toolkit específico do step
      const stepToolkits = [];
      for (const toolkit of toolkits) {
        if (stepText.toLowerCase().includes(toolkit.toLowerCase())) {
          stepToolkits.push(toolkit);
        }
      }
      
      // Se não detectou, usar todos os toolkits
      const finalToolkits = stepToolkits.length > 0 ? stepToolkits : toolkits;

      // Encontrar pitfalls relacionados a este step
      const relatedPitfalls = allPitfalls.filter(pitfall => {
        return toolSlugsInStep.some(toolSlug => pitfall.includes(toolSlug));
      });

      // Criar título mais limpo (remover marcadores)
      const cleanTitle = stepText
        .replace(/\[Optional[^\]]*\]\s*/gi, '')
        .replace(/\[Required\]\s*/gi, '')
        .replace(/\[Prerequisite\]\s*/gi, '')
        .replace(/\[Step \d+\]\s*/gi, '')
        .replace(/\[Next Step\]\s*/gi, '')
        .replace(/\[Fallback\]\s*/gi, '')
        .substring(0, 120);

      subtasks.push({
        id: `subtask_${subtaskId}`,
        title: cleanTitle,
        toolkit_candidates: finalToolkits,
        intent: stepText,
        deps: subtaskId > 1 ? [`subtask_${subtaskId - 1}`] : [],
        inputs_required: [],
        outputs_expected: [],
        success_criteria: `Step completado: ${cleanTitle}`,
        risk_flags: {
          destrutivo: stepText.match(/delete|remove|overwrite|sobrescrever/i) ? true : false,
          publico: stepText.match(/public|share|publish/i) ? true : false,
          bulk: stepText.match(/bulk|batch|multiple|todos|paginate/i) ? true : false,
          admin: false,
          financeiro: false
        },
        metadata: {
          source: 'composio_execution_plan',
          type: type,
          category: category,
          difficulty: planMetadata.difficulty,
          plan_id: planMetadata.plan_id,
          has_pitfalls: relatedPitfalls.length > 0,
          pitfalls: relatedPitfalls,
          mentioned_tools: toolSlugsInStep,
          original_step: stepText
        }
      });

      subtaskId++;
    }

    console.log(`   📊 Estatísticas das subtarefas:`);
    console.log(`      OPTIONAL: ${subtasks.filter(st => st.metadata.type === 'OPTIONAL').length}`);
    console.log(`      REQUIRED: ${subtasks.filter(st => st.metadata.type === 'REQUIRED').length}`);
    console.log(`      DISCOVERY: ${subtasks.filter(st => st.metadata.category === 'DISCOVERY').length}`);
    console.log(`      READ: ${subtasks.filter(st => st.metadata.category === 'READ').length}`);
    console.log(`      WRITE: ${subtasks.filter(st => st.metadata.category === 'WRITE').length}`);
    console.log(`      VERIFY: ${subtasks.filter(st => st.metadata.category === 'VERIFY').length}`);
    console.log(`      Com pitfalls: ${subtasks.filter(st => st.metadata.has_pitfalls).length}`);

    return subtasks;
  }

  /**
   * Adiciona subtarefas extras baseadas em regras customizadas
   */
  addCustomSubtasks(subtasks, task, toolkits) {
    const customSubtasks = [];
    let nextId = subtasks.length + 1;

    // Regra 1: Se há operação destrutiva, adicionar confirmação ANTES
    const hasDestructive = subtasks.some(st => st.risk_flags.destrutivo);
    if (hasDestructive) {
      const destructiveIndex = subtasks.findIndex(st => st.risk_flags.destrutivo);
      customSubtasks.push({
        id: `subtask_${nextId}`,
        title: 'Confirmar operação destrutiva com usuário',
        toolkit_candidates: [],
        intent: 'Solicitar confirmação do usuário antes de executar operação que pode sobrescrever/deletar dados',
        deps: destructiveIndex > 0 ? [subtasks[destructiveIndex - 1].id] : [],
        inputs_required: [],
        outputs_expected: ['user_confirmed'],
        success_criteria: 'Usuário confirmou a operação',
        risk_flags: {
          destrutivo: false,
          publico: false,
          bulk: false,
          admin: false,
          financeiro: false
        },
        metadata: {
          source: 'custom_rule',
          type: 'CONFIRMATION',
          category: 'SAFETY',
          insert_before: subtasks[destructiveIndex].id
        }
      });
      nextId++;
    }

    // Regra 2: Se há edição de arquivo, garantir que há READ antes de WRITE
    const hasWrite = subtasks.some(st => st.category === 'WRITE' && st.toolkit_candidates.some(t => t.includes('drive') || t.includes('dropbox')));
    const hasRead = subtasks.some(st => st.category === 'READ');
    
    if (hasWrite && !hasRead) {
      const writeIndex = subtasks.findIndex(st => st.category === 'WRITE');
      customSubtasks.push({
        id: `subtask_${nextId}`,
        title: 'Ler estado atual do arquivo antes de modificar',
        toolkit_candidates: toolkits.filter(t => t !== 'workbench'),
        intent: 'Baixar e ler o conteúdo atual do arquivo para preservar dados existentes',
        deps: writeIndex > 0 ? [subtasks[writeIndex - 1].id] : [],
        inputs_required: ['file_id'],
        outputs_expected: ['original_content'],
        success_criteria: 'Conteúdo original do arquivo obtido com sucesso',
        risk_flags: {
          destrutivo: false,
          publico: false,
          bulk: false,
          admin: false,
          financeiro: false
        },
        metadata: {
          source: 'custom_rule',
          type: 'SAFETY',
          category: 'READ',
          insert_before: subtasks[writeIndex].id
        }
      });
      nextId++;
    }

    // Regra 3: Adicionar VERIFY após WRITE
    const writeSubtasks = subtasks.filter(st => st.category === 'WRITE');
    for (const writeSubtask of writeSubtasks) {
      const hasVerifyAfter = subtasks.some(st => 
        st.category === 'VERIFY' && st.deps.includes(writeSubtask.id)
      );
      
      if (!hasVerifyAfter) {
        customSubtasks.push({
          id: `subtask_${nextId}`,
          title: `Verificar resultado da operação: ${writeSubtask.title}`,
          toolkit_candidates: writeSubtask.toolkit_candidates,
          intent: `Confirmar que a operação "${writeSubtask.title}" foi executada corretamente`,
          deps: [writeSubtask.id],
          inputs_required: [],
          outputs_expected: ['verification_status'],
          success_criteria: 'Operação verificada e confirmada',
          risk_flags: {
            destrutivo: false,
            publico: false,
            bulk: false,
            admin: false,
            financeiro: false
          },
          metadata: {
            source: 'custom_rule',
            type: 'VERIFICATION',
            category: 'VERIFY',
            insert_after: writeSubtask.id
          }
        });
        nextId++;
      }
    }

    return customSubtasks;
  }

  /**
   * Mescla subtarefas do Composio com subtarefas customizadas
   */
  mergeSubtasks(composioSubtasks, customSubtasks) {
    const merged = [...composioSubtasks];

    // Inserir subtarefas customizadas nas posições corretas
    for (const customSt of customSubtasks) {
      if (customSt.metadata.insert_before) {
        const index = merged.findIndex(st => st.id === customSt.metadata.insert_before);
        if (index >= 0) {
          merged.splice(index, 0, customSt);
        } else {
          merged.push(customSt);
        }
      } else if (customSt.metadata.insert_after) {
        const index = merged.findIndex(st => st.id === customSt.metadata.insert_after);
        if (index >= 0) {
          merged.splice(index + 1, 0, customSt);
        } else {
          merged.push(customSt);
        }
      } else {
        merged.push(customSt);
      }
    }

    // Reindexar IDs e dependências
    const idMap = {};
    merged.forEach((st, index) => {
      const newId = `subtask_${index + 1}`;
      idMap[st.id] = newId;
      st.id = newId;
    });

    // Atualizar dependências
    merged.forEach(st => {
      st.deps = st.deps.map(depId => idMap[depId] || depId).filter(Boolean);
    });

    return merged;
  }

  /**
   * Planejar tarefa usando abordagem híbrida
   */
  async planTask(task, context, agentInstructions, userId = 'planner-user') {
    console.log('\n🔄 PLANEJAMENTO HÍBRIDO (Composio Execution Plans + Custom Rules)');
    console.log('━'.repeat(80));
    
    try {
      // Passo 1: Extrair toolkits da tarefa
      console.log('\n1️⃣ Extraindo toolkits da tarefa...');
      const toolkits = this.extractToolkitsFromTask(task);
      console.log(`   Toolkits identificados: ${toolkits.join(', ')}`);

      // Passo 2: Buscar execution plans do Composio para cada toolkit
      console.log('\n2️⃣ Buscando Execution Plans do Composio...');
      const composioPlans = [];
      
      if (toolkits.length >= 2) {
        // Múltiplos toolkits: buscar plano para cada um
        console.log(`   📋 Múltiplos toolkits detectados (${toolkits.length})`);
        console.log(`   🔍 Buscando plano individual para cada toolkit...\n`);
        
        for (const toolkit of toolkits) {
          console.log(`   🔎 Buscando plano para toolkit: ${toolkit}`);
          const plan = await this.getComposioExecutionPlan(userId, task, toolkit);
          
          if (plan && plan.recommended_steps && plan.recommended_steps.length > 0) {
            console.log(`   ✅ Plano encontrado para ${toolkit}:`);
            console.log(`      Steps: ${plan.recommended_steps.length}`);
            plan.recommended_steps.forEach((step, idx) => {
              const stepText = typeof step === 'string' ? step : step.description || step.step || '';
              console.log(`      ${idx + 1}. ${stepText.substring(0, 80)}...`);
            });
            composioPlans.push({ toolkit, plan });
          } else {
            console.log(`   ⚠️  Nenhum plano encontrado para ${toolkit}`);
          }
          console.log('');
        }
      } else {
        // Toolkit único: buscar plano geral
        console.log(`   📋 Toolkit único: ${toolkits[0]}`);
        console.log(`   🔍 Buscando plano geral...\n`);
        
        const plan = await this.getComposioExecutionPlan(userId, task, toolkits[0]);
        
        if (plan && plan.recommended_steps && plan.recommended_steps.length > 0) {
          console.log(`   ✅ Plano encontrado:`);
          console.log(`      Steps: ${plan.recommended_steps.length}`);
          plan.recommended_steps.forEach((step, idx) => {
            const stepText = typeof step === 'string' ? step : step.description || step.step || '';
            console.log(`      ${idx + 1}. ${stepText.substring(0, 80)}...`);
          });
          composioPlans.push({ toolkit: toolkits[0], plan });
        } else {
          console.log(`   ⚠️  Nenhum plano encontrado`);
        }
        console.log('');
      }

      // Passo 3: Converter planos do Composio em subtarefas
      console.log('\n3️⃣ Convertendo Execution Plans em subtarefas...');
      let composioSubtasks = [];
      
      if (composioPlans.length > 0) {
        composioSubtasks = this.convertComposioStepsToSubtasks(
          composioPlans.map(cp => cp.plan),
          task,
          toolkits
        );
        console.log(`   ✅ ${composioSubtasks.length} subtarefas criadas dos planos Composio`);
      } else {
        console.log(`   ⚠️  Nenhum plano Composio disponível, usando fallback LLM`);
        const llmPlan = await this.generateComposioInspiredPlan(task, toolkits, userId);
        composioSubtasks = llmPlan.subtasks;
        console.log(`   ✅ ${composioSubtasks.length} subtarefas criadas via LLM`);
      }

      // Passo 4: Adicionar subtarefas customizadas
      console.log('\n4️⃣ Adicionando subtarefas customizadas (segurança, validação)...');
      const customSubtasks = this.addCustomSubtasks(composioSubtasks, task, toolkits);
      console.log(`   ✅ ${customSubtasks.length} subtarefas customizadas adicionadas`);

      // Passo 5: Mesclar subtarefas
      console.log('\n5️⃣ Mesclando subtarefas...');
      const allSubtasks = this.mergeSubtasks(composioSubtasks, customSubtasks);
      console.log(`   ✅ Total: ${allSubtasks.length} subtarefas no plano final`);

      // Passo 6: Criar ExecutionPlan
      const plan = new ExecutionPlan({
        goal: task,
        subtasks: allSubtasks.map(st => new Subtask(st)),
        clarifying_questions: [],
        global_success_criteria: `Tarefa "${task}" completada com sucesso`,
        stop_conditions: []
      });

      console.log('\n✅ PLANEJAMENTO HÍBRIDO CONCLUÍDO');
      console.log('━'.repeat(80));
      console.log(`   Goal: ${plan.goal}`);
      console.log(`   Subtasks: ${plan.subtasks.length}`);
      console.log(`   Composio Plans: ${composioPlans.length}`);
      console.log(`   Toolkits: ${toolkits.join(', ')}`);
      console.log('━'.repeat(80) + '\n');

      return plan;

    } catch (error) {
      console.error('\n❌ Erro no planejamento híbrido:', error.message);
      throw error;
    }
  }

  /**
   * Gera plano inspirado nos padrões do Composio usando LLM
   */
  async generateComposioInspiredPlan(task, toolkits, userId) {
    const prompt = `Você é um planejador especializado que segue os padrões do Composio.

TAREFA: "${task}"
TOOLKITS IDENTIFICADOS: ${toolkits.join(', ')}

INSTRUÇÕES:
Crie um plano de execução seguindo o padrão do Composio SEARCH_TOOLS:

1. DISCOVERY - Descobrir ferramentas e IDs necessários
2. AUTH - Garantir autenticação ativa
3. READ - Ler estado atual (se aplicável)
4. TRANSFORM - Processar/transformar dados (se aplicável)
5. WRITE - Executar ação principal
6. VERIFY - Verificar resultado
7. REPORT - Entregar resultado ao usuário

Para cada toolkit, crie subtarefas específicas.
Se houver múltiplos toolkits, crie subtarefas para cada um.

FORMATO DE RESPOSTA (JSON):
{
  "subtasks": [
    {
      "id": "subtask_1",
      "title": "Descobrir ferramentas do Google Drive para buscar arquivo",
      "toolkit_candidates": ["googledrive"],
      "intent": "Usar COMPOSIO_SEARCH_TOOLS para descobrir ferramentas de busca de arquivo no Google Drive",
      "deps": [],
      "inputs_required": [],
      "outputs_expected": [],
      "success_criteria": "Ferramentas descobertas e schemas carregados",
      "risk_flags": {
        "destrutivo": false,
        "publico": false,
        "bulk": false,
        "admin": false,
        "financeiro": false
      },
      "metadata": {
        "source": "composio_inspired",
        "category": "DISCOVERY",
        "type": "REQUIRED"
      }
    }
  ]
}

REGRAS:
- Sempre incluir DISCOVERY como primeira subtarefa
- Sempre incluir AUTH como segunda subtarefa
- Para operações de arquivo: DISCOVERY → AUTH → READ → WRITE → VERIFY
- Para operações de email: DISCOVERY → AUTH → WRITE → VERIFY
- Para operações multi-toolkit: criar subtarefas para cada toolkit
- Marcar operações destrutivas (delete, overwrite) com risk_flags.destrutivo = true

Retorne APENAS o JSON, sem texto adicional.`;

    const response = await this.llm.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um planejador especializado. Retorne apenas JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const planData = JSON.parse(response.choices[0].message.content);
    return planData;
  }

  /**
   * Fallback: usar LLM para planejar (método original)
   */
  async fallbackToLLMPlanner(task, context, agentInstructions) {
    // Implementação simplificada - usar o planner original como fallback
    const planningPrompt = `Crie um plano de execução para a tarefa: "${task}"
    
Retorne JSON com:
{
  "goal": "objetivo",
  "subtasks": [
    {
      "id": "subtask_1",
      "title": "título",
      "toolkit_candidates": ["googledrive"],
      "intent": "descrição",
      "deps": [],
      "inputs_required": [],
      "outputs_expected": [],
      "success_criteria": "critério",
      "risk_flags": {
        "destrutivo": false,
        "publico": false,
        "bulk": false,
        "admin": false,
        "financeiro": false
      }
    }
  ]
}`;

    const response = await this.llm.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um planejador de tarefas. Retorne apenas JSON.' },
        { role: 'user', content: planningPrompt }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const planData = JSON.parse(response.choices[0].message.content);
    
    return new ExecutionPlan({
      goal: planData.goal,
      subtasks: planData.subtasks.map(st => new Subtask(st)),
      clarifying_questions: [],
      global_success_criteria: planData.goal,
      stop_conditions: []
    });
  }

  shouldUseStrictMode(plan) {
    const hasCriticalRisks = plan.subtasks.some(st => st.isCriticalRisk());
    const tooManySubtasks = plan.subtasks.length > 6;
    return hasCriticalRisks || tooManySubtasks;
  }
}
