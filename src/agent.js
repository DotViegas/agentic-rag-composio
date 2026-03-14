/**
 * Orquestrador Híbrido Composio
 * Opção 3: Planejamento Controlado + Execução ReAct + Verificação
 */

import { Composio } from '@composio/core';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { Logger } from './logger.js';
import { TaskPlanner } from './planner.js';
import { EnhancedTaskExecutor } from './executor-enhanced.js';
import { TaskVerifier } from './verifier.js';
import { ExecutionState, ExecutionMode } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar instruções do agente
const agentInstructions = fs.readFileSync(
  path.join(__dirname, '..', 'agent.md'),
  'utf-8'
);

export class ComposioOrchestrator {
  constructor(composioApiKey, openaiApiKey) {
    this.composio = new Composio({ apiKey: composioApiKey });
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.sessions = new Map();
  }

  async getOrCreateSession(userId) {
    if (this.sessions.has(userId)) {
      return this.sessions.get(userId);
    }

    const session = await this.composio.create(userId);
    this.sessions.set(userId, session);
    return session;
  }

  async executeTask(userId, task, context = {}) {
    const state = new ExecutionState();
    const logger = new Logger(state.trace_id);
    let executionMode = ExecutionMode.NORMAL; // Declarar aqui para estar disponível no catch

    try {
      logger.userMessage(task);
      logger.trace(`Iniciando execução - Trace ID: ${state.trace_id}`);

      // ============================================================
      // FASE 1: PLANEJAMENTO CONTROLADO
      // ============================================================
      logger.phase('FASE 1: PLANEJAMENTO');
      state.status = 'planning';

      const session = await this.getOrCreateSession(userId);
      logger.success('Sessão criada/recuperada');
      logger.field('User ID', userId);

      const planner = new TaskPlanner(this.openai);
      const plan = await planner.planTask(task, context, agentInstructions);

      logger.success('Plano gerado');
      logger.field('Objetivo', plan.goal);
      logger.field('Subtarefas', plan.subtasks.length);
      logger.field('Critério Global de Sucesso', plan.global_success_criteria);

      // Mostrar decomposição
      logger.separator('🔧 Decompor em subtarefas atômicas (DAG)');
      plan.subtasks.forEach((st, idx) => {
        logger.field(`${idx + 1}. ${st.title}`, '');
        logger.field('  Intent', st.intent, 2);
        logger.field('  Toolkits', st.toolkit_candidates.join(', '), 2);
        logger.field('  Inputs', st.inputs_required.join(', '), 2);
        logger.field('  Outputs', st.outputs_expected.join(', '), 2);
        logger.field('  Sucesso', st.success_criteria, 2);
        if (st.deps.length > 0) {
          logger.field('  Dependências', st.deps.join(', '), 2);
        }
        if (st.hasRisks()) {
          const risks = Object.entries(st.risk_flags)
            .filter(([_, v]) => v)
            .map(([k, _]) => k);
          logger.field('  ⚠️  Riscos', risks.join(', '), 2);
        }
      });

      // Verificar se há perguntas clarificadoras
      if (plan.clarifying_questions.length > 0) {
        logger.warning('Perguntas clarificadoras necessárias');
        logger.list(plan.clarifying_questions, 2);
        
        const questionsText = plan.clarifying_questions
          .map((q, i) => `${i + 1}. ${q}`)
          .join('\n');
        
        return {
          status: 200,
          'response-ai': 'Preciso de mais informações para continuar',
          message: `Para continuar com a tarefa, preciso que você responda:\n\n${questionsText}`
        };
      }

      // Determinar modo de execução
      executionMode = context.execution_mode || 
        (planner.shouldUseStrictMode(plan) ? ExecutionMode.STRICT : ExecutionMode.NORMAL);
      
      logger.info(`Modo de execução: ${executionMode.toUpperCase()}`);
      
      if (executionMode === ExecutionMode.STRICT) {
        logger.warning('Modo STRICT ativado: validação rigorosa habilitada');
      }

      // ============================================================
      // VERIFICAR RISCOS E SOLICITAR CONFIRMAÇÃO ANTECIPADA
      // ============================================================
      
      // Verificar se há confirmação prévia do usuário
      const hasUserConfirmation = context.confirmed === true;
      
      // Coletar todas as subtarefas com riscos críticos
      const riskySubtasks = plan.subtasks.filter(st => st.isCriticalRisk());
      
      if (riskySubtasks.length > 0 && !hasUserConfirmation && executionMode === ExecutionMode.STRICT) {
        logger.warning('⚠️  Operações de risco detectadas no plano');
        logger.separator('🔔 CONFIRMAÇÃO NECESSÁRIA ANTES DA EXECUÇÃO');
        
        // Construir mensagem de confirmação
        const confirmationMessage = this.buildRiskConfirmationMessage(plan, riskySubtasks);
        
        logger.info('Aguardando confirmação do usuário para prosseguir');
        
        return {
          status: 200,
          'response-ai': 'Confirmação necessária para operações de risco',
          message: confirmationMessage
        };
      }
      
      // Se chegou aqui, ou não há riscos, ou usuário já confirmou
      if (hasUserConfirmation) {
        logger.success('✅ Confirmação do usuário recebida - prosseguindo com execução');
      }

      // ============================================================
      // FASE 2: EXECUÇÃO COM GUARDRAILS
      // ============================================================
      logger.phase('FASE 2: EXECUÇÃO COM PLANO');
      state.status = 'executing';

      const executor = new EnhancedTaskExecutor(session, logger, executionMode, userId);
      await executor.executeWithPlan(plan, state, agentInstructions, hasUserConfirmation);

      logger.success('Execução concluída');

      // ============================================================
      // FASE 3: VERIFICAÇÃO FINAL
      // ============================================================
      state.status = 'verifying';
      
      const verifier = new TaskVerifier(logger, this.openai);
      const verification = await verifier.verifyAndRespond(state, plan, task);

      // ============================================================
      // RESPOSTA FINAL
      // ============================================================
      state.status = verification.success ? 'completed' : 'failed';

      logger.separator('✅ EXECUÇÃO FINALIZADA');
      logger.field('Status', state.status.toUpperCase());
      logger.field('Trace ID', state.trace_id);
      logger.field('Subtarefas Executadas', `${state.checkpoints.length}/${plan.subtasks.length}`);
      logger.field('Chamadas de Ferramentas', state.tool_calls.length);
      logger.field('Erros', state.errors.length);
      logger.field('Confirmações', state.confirmations.length);

      return {
        status: 200,
        'response-ai': verification.success ? 
          'Tarefa concluída com sucesso' : 
          'Tarefa concluída com avisos',
        message: verification.response
      };

    } catch (error) {
      logger.separator(error.errorType === 'AUTH' && error.needsUserAction ? 
        '🔐 AUTENTICAÇÃO NECESSÁRIA' : 
        '❌ ERRO NA EXECUÇÃO'
      );
      
      if (error.errorType === 'AUTH' && error.needsUserAction) {
        logger.warning('A execução foi pausada porque é necessário autenticar uma conta');
        logger.field('Link de autenticação', error.authUrl);
        
        return {
          status: 200,
          'response-ai': 'O usuário deve se conectar para que eu continue com a tarefa',
          message: error.message
        };
      }
      
      // Erro real
      logger.error(error.message);
      if (error.stack) {
        logger.trace(error.stack);
      }

      state.status = 'failed';
      state.addError('orchestrator', error);

      return {
        status: 500,
        'response-ai': 'Ocorreu um erro durante a execução da tarefa',
        message: error.message
      };
    }
  }

  clearSession(userId) {
    this.sessions.delete(userId);
  }

  buildRiskConfirmationMessage(plan, riskySubtasks) {
    const riskDetails = riskySubtasks.map((st, idx) => {
      const risks = Object.entries(st.risk_flags)
        .filter(([_, value]) => value === true)
        .map(([key, _]) => key);
      
      return `**${idx + 1}. ${st.title}**\n   Riscos: ${risks.join(', ')}`;
    }).join('\n\n');

    return `⚠️  **Confirmação Necessária**

A tarefa que você solicitou envolve operações de risco que requerem sua confirmação antes de prosseguir:

${riskDetails}

**O que será feito:**
${plan.goal}

**Para confirmar e prosseguir com a execução:**
Envie a mesma requisição novamente incluindo \`"confirmed": true\` no campo \`context\`.

**Exemplo:**
\`\`\`json
{
  "userId": "seu-user-id",
  "task": "sua tarefa aqui",
  "context": {
    "confirmed": true
  }
}
\`\`\`

**Importante:** Ao confirmar, todas as operações listadas acima serão executadas automaticamente sem interrupções.`;
  }

  // Método para retomar execução de um checkpoint
  async resumeFromCheckpoint(userId, traceId, checkpointIndex) {
    // TODO: Implementar retomada de execução
    // Carregar estado do checkpoint e continuar de onde parou
    throw new Error('Resume from checkpoint não implementado ainda');
  }
}
