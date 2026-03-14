/**
 * Módulo de planejamento - Fase 1
 */

import { ExecutionPlan, Subtask } from './types.js';

export class TaskPlanner {
  constructor(llmClient) {
    this.llm = llmClient;
  }

  async planTask(task, context, agentInstructions) {
    const planningPrompt = `${agentInstructions}

CONTEXTO ADICIONAL:
${context.additionalContext || 'Nenhum contexto adicional fornecido.'}

TAREFA DO USUÁRIO:
"${task}"

INSTRUÇÕES DE PLANEJAMENTO:
Você DEVE produzir um plano estruturado em JSON seguindo EXATAMENTE este formato:

{
  "goal": "descrição clara do objetivo final",
  "subtasks": [
    {
      "id": "subtask_1",
      "title": "título descritivo",
      "toolkit_candidates": ["gmail", "outlook"],
      "intent": "o que essa subtarefa faz",
      "deps": [],
      "inputs_required": ["email_destinatario", "assunto"],
      "outputs_expected": ["message_id"],
      "success_criteria": "message_id presente na resposta",
      "risk_flags": {
        "destrutivo": false,
        "publico": false,
        "bulk": false,
        "admin": false,
        "financeiro": false
      }
    }
  ],
  "clarifying_questions": [],
  "global_success_criteria": "critério geral de sucesso",
  "stop_conditions": ["condições que impedem execução"]
}

REGRAS OBRIGATÓRIAS:
1. Decomponha em subtarefas ATÔMICAS (uma chamada de tool cada)
2. Identifique TODOS os apps/toolkits envolvidos
3. NO TÍTULO E INTENT da subtarefa, INCLUA TODOS OS DADOS da tarefa do usuário
   Exemplo: Se usuário disse "envie email para teste@example.com com assunto X"
   Título: "Enviar email para teste@example.com com assunto X"
   Intent: "Enviar email para teste@example.com com assunto 'X' e corpo vazio"
4. Marque risk_flags corretamente:
   - destrutivo: delete, overwrite, move, revoke
   - publico: post em canal público, envio para muitos
   - bulk: operações em massa (>10 itens)
   - admin: mudanças de permissões, configurações
   - financeiro: custos, compras, ads
5. Liste perguntas clarificadoras APENAS se informação crítica estiver faltando
6. Defina critérios de sucesso VERIFICÁVEIS (IDs, status, links)

Retorne APENAS o JSON, sem texto adicional.`;

    try {
      const response = await this.llm.chat.completions.create({
        model: 'gpt-4o-mini', // Mudado para mini
        messages: [
          { role: 'system', content: 'Você é um planejador de tarefas especializado. Retorne apenas JSON válido.' },
          { role: 'user', content: planningPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const planData = JSON.parse(response.choices[0].message.content);
      
      // Validar e construir plano
      const plan = new ExecutionPlan({
        goal: planData.goal,
        subtasks: planData.subtasks.map(st => new Subtask(st)),
        clarifying_questions: planData.clarifying_questions || [],
        global_success_criteria: planData.global_success_criteria,
        stop_conditions: planData.stop_conditions || []
      });

      return plan;
    } catch (error) {
      throw new Error(`Falha no planejamento: ${error.message}`);
    }
  }

  shouldUseStrictMode(plan) {
    // Critérios para ativação automática do strict mode
    const hasCriticalRisks = plan.subtasks.some(st => st.isCriticalRisk());
    const tooManySubtasks = plan.subtasks.length > 6;
    const multipleToolkits = new Set(
      plan.subtasks.flatMap(st => st.toolkit_candidates)
    ).size > 2;

    return hasCriticalRisks || tooManySubtasks || multipleToolkits;
  }
}
