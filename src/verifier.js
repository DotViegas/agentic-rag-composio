/**
 * Módulo de verificação - Fase 3
 * Verifica critérios de sucesso e produz resposta final
 */

import { ResponseFormatter } from './response-formatter.js';

export class TaskVerifier {
  constructor(logger, openai, debugManager = null) {
    this.logger = logger;
    this.openai = openai;
    this.debugManager = debugManager;
  }

  async verifyAndRespond(state, plan, userTask) {
    this.logger.phase('Verificação final e resposta');

    const verification = {
      success: true,
      failures: [],
      warnings: [],
      artifacts_collected: {},
      evidence: []
    };

    this.logger.info('Estado dos artefatos no verificador:');
    this.logger.json(state.artifacts, 2);

    // Verificar critérios de sucesso por subtarefa
    for (const subtask of plan.subtasks) {
      this.logger.info(`Verificando subtarefa: ${subtask.id}`);
      
      const checkpoint = state.checkpoints.find(cp => cp.subtask_id === subtask.id);
      
      if (!checkpoint) {
        verification.failures.push({
          subtask_id: subtask.id,
          reason: 'Subtarefa não foi executada'
        });
        verification.success = false;
        continue;
      }

      if (checkpoint.data.status !== 'completed') {
        verification.failures.push({
          subtask_id: subtask.id,
          reason: `Status: ${checkpoint.data.status}`
        });
        verification.success = false;
        continue;
      }

      // Verificar outputs esperados
      const artifacts = state.artifacts[subtask.id] || {};
      this.logger.info(`Artefatos da subtarefa ${subtask.id}:`);
      this.logger.json(artifacts, 2);
      this.logger.info(`Outputs esperados: ${subtask.outputs_expected.join(', ')}`);
      
      for (const expectedOutput of subtask.outputs_expected) {
        if (!artifacts[expectedOutput]) {
          this.logger.warning(`Output '${expectedOutput}' não encontrado nos artefatos`);
          verification.warnings.push({
            subtask_id: subtask.id,
            output: expectedOutput,
            reason: 'Output esperado não encontrado'
          });
        } else {
          this.logger.success(`Output '${expectedOutput}' encontrado: ${artifacts[expectedOutput]}`);
          verification.artifacts_collected[expectedOutput] = artifacts[expectedOutput];
          verification.evidence.push({
            subtask: subtask.title,
            artifact: expectedOutput,
            value: artifacts[expectedOutput]
          });
        }
      }
    }

    // Verificar critério global de sucesso
    this.logger.field('Critério Global', plan.global_success_criteria);
    
    if (verification.failures.length > 0) {
      this.logger.error('Verificação falhou');
      this.logger.field('Falhas', '');
      verification.failures.forEach(f => {
        this.logger.list([`${f.subtask_id}: ${f.reason}`], 2);
      });
      verification.success = false;
    } else {
      this.logger.success('Todos os critérios de sucesso foram atendidos');
    }

    if (verification.warnings.length > 0) {
      this.logger.warning('Avisos encontrados');
      verification.warnings.forEach(w => {
        this.logger.list([`${w.subtask_id} - ${w.output}: ${w.reason}`], 2);
      });
    }

    // Construir resposta final formatada com LLM
    this.logger.field('Artefatos Coletados', '');
    this.logger.json(verification.artifacts_collected, 2);
    
    const response = await this.buildFinalResponse(plan, state, verification, userTask);

    return {
      success: verification.success,
      response,
      verification,
      state
    };
  }

  async buildFinalResponse(plan, state, verification, userTask) {
    // Usar LLM para formatar resposta de forma inteligente
    this.logger.info('🔄 Construindo resposta final com LLM formatadora...');
    
    // Se teve falhas críticas, retornar erro simples
    if (!verification.success) {
      const failedTasks = verification.failures.map(f => f.subtask_id).join(', ');
      return `Não foi possível concluir completamente a tarefa. Algumas operações falharam: ${failedTasks}.\n\nPor favor, verifique e tente novamente.`;
    }
    
    // Coletar output do agente de TODAS as subtarefas executadas
    let agentOutput = '';
    
    // Coletar outputs de todas as subtarefas
    const allOutputs = [];
    for (const checkpoint of state.checkpoints) {
      const rawOutput = checkpoint.data?.outputs?.raw_output;
      if (rawOutput && rawOutput.trim()) {
        allOutputs.push(rawOutput);
      }
    }
    
    // Se houver múltiplas subtarefas, concatenar os outputs
    if (allOutputs.length > 0) {
      agentOutput = allOutputs.join('\n\n---\n\n');
      
      this.logger.field('Outputs coletados', allOutputs.length);
      this.logger.field('Output do agente (prévia)', agentOutput.substring(0, 300) + '...');
    }
    
    // Se não tiver output, usar resposta genérica
    if (!agentOutput) {
      this.logger.warning('Nenhum output do agente encontrado, usando resposta genérica');
      
      if (verification.warnings.length > 0) {
        return `${plan.goal} foi concluído! ✅\n\nObservação: Algumas informações adicionais não puderam ser coletadas, mas a operação principal foi realizada com sucesso.`;
      }
      
      return `${plan.goal} foi concluído com sucesso! ✅`;
    }
    
    // Usar LLM para formatar resposta
    try {
      const formatter = new ResponseFormatter(this.openai, this.logger, this.debugManager);
      const formattedResponse = await formatter.formatResponse(
        userTask,
        plan.goal,
        agentOutput,
        verification.artifacts_collected
      );
      
      return formattedResponse;
      
    } catch (error) {
      this.logger.error('Erro ao formatar resposta com LLM');
      this.logger.warning('Usando fallback simples');
      
      // Fallback: resposta simples
      if (verification.warnings.length > 0) {
        return `${plan.goal} foi concluído! ✅\n\nObservação: Algumas informações adicionais não puderam ser coletadas, mas a operação principal foi realizada com sucesso.`;
      }
      
      return `${plan.goal} foi concluído com sucesso! ✅`;
    }
  }
}
