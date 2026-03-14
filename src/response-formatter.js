/**
 * Formatador de Respostas com LLM
 * Analisa e formata a resposta do agente para o usuário final
 */

export class ResponseFormatter {
  constructor(openai, logger) {
    this.openai = openai;
    this.logger = logger;
  }

  async formatResponse(userTask, goal, agentOutput, artifacts) {
    this.logger.info('🎨 Formatando resposta com LLM analisadora...');
    
    const prompt = `Você é um formatador de respostas para usuários.

SOLICITAÇÃO DO USUÁRIO:
"${userTask}"

OBJETIVO DA TAREFA:
${goal}

RESPOSTA DO AGENTE:
${agentOutput}

ARTEFATOS COLETADOS:
${JSON.stringify(artifacts, null, 2)}

INSTRUÇÕES:
1. Analise se o objetivo foi alcançado
2. Extraia APENAS as informações relevantes para o usuário
3. Formate de forma clara e natural
4. Para listagens: mostre os itens de forma estruturada
5. Para envios: confirme o que foi enviado e para quem
6. Use Markdown para formatação
7. Seja conciso mas informativo
8. Use emojis quando apropriado (✅, 📧, 📄, 🔗, etc)

EXEMPLOS:

Para "enviar email":
✅ Email enviado com sucesso!

**Destinatário:** teste@example.com
**Assunto:** Teste de Validação
**Corpo:** (vazio)

Para "listar emails":
📧 Encontrei 5 emails não lidos:

**Email 1**
**Assunto:** Aviso de crédito
**De:** banco@example.com
**Prévia:** Seu cartão foi creditado...

**Email 2**
**Assunto:** Você ganhou uma Ferrari
**De:** spam@example.com
**Prévia:** Clique aqui para...

Para "criar arquivo":
📄 Arquivo criado com sucesso!

**Nome:** relatorio-vendas.xlsx
**Local:** Google Drive > Pasta Relatórios
**Link:** https://drive.google.com/file/d/...

Retorne APENAS a resposta formatada, sem explicações adicionais.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um formatador de respostas. Retorne apenas a resposta formatada para o usuário final.' 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const formattedResponse = response.choices[0].message.content;
      
      this.logger.success('Resposta formatada com sucesso');
      this.logger.field('Tokens usados', response.usage.total_tokens);
      
      return formattedResponse;
      
    } catch (error) {
      this.logger.error('Erro ao formatar resposta com LLM');
      this.logger.warning('Usando resposta original como fallback');
      
      // Fallback: retornar resposta simples
      return `${goal} foi concluído! ✅\n\n${agentOutput}`;
    }
  }
}
