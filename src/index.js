import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ComposioOrchestrator } from './agent.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Controle de concorrência por usuário
const activeExecutions = new Map(); // userId -> Promise

// Inicializar orquestrador
const orchestrator = new ComposioOrchestrator(
  process.env.COMPOSIO_API_KEY,
  process.env.OPENAI_API_KEY
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint principal para executar tarefas
app.post('/execute', async (req, res) => {
  try {
    const { userId, task, context } = req.body;

    if (!userId || !task) {
      return res.status(400).json({
        status: 400,
        'response-ai': 'Requisição inválida',
        message: 'Os campos userId e task são obrigatórios'
      });
    }

    // Verificar se já há uma execução ativa para este usuário
    if (activeExecutions.has(userId)) {
      console.log(`⚠️  Requisição duplicada de ${userId} - execução já em andamento`);
      return res.status(429).json({
        status: 429,
        'response-ai': 'Execução já em andamento',
        message: `Já existe uma tarefa sendo executada para o usuário ${userId}. Aguarde a conclusão antes de enviar nova requisição.`
      });
    }

    console.log(`📥 Nova requisição de ${userId}: ${task}`);

    // Marcar execução como ativa
    const executionPromise = orchestrator.executeTask(userId, task, context)
      .finally(() => {
        // Remover da lista de execuções ativas quando concluir
        activeExecutions.delete(userId);
        console.log(`✅ Execução concluída para ${userId}`);
      });
    
    activeExecutions.set(userId, executionPromise);

    const result = await executionPromise;

    res.json(result);
  } catch (error) {
    console.error('❌ Erro no endpoint /execute:', error);
    res.status(500).json({
      status: 500,
      'response-ai': 'Erro interno do servidor',
      message: error.message
    });
  }
});

// Endpoint para limpar sessão de um usuário
app.delete('/session/:userId', (req, res) => {
  const { userId } = req.params;
  orchestrator.clearSession(userId);
  res.json({ 
    status: 200,
    'response-ai': 'Sessão removida com sucesso',
    message: `Sessão do usuário ${userId} foi removida` 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Execute task: POST http://localhost:${PORT}/execute`);
});
