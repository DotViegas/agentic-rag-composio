# Dicas de Análise de Relatórios de Debug

## Comandos Úteis com `jq`

### Estatísticas Gerais

```bash
# Ver todas as estatísticas
cat .debug/debug_trace_*.json | jq '.statistics'

# Ver apenas duração
cat .debug/debug_trace_*.json | jq '.statistics.duration_seconds'

# Ver total de tokens
cat .debug/debug_trace_*.json | jq '.statistics.total_tokens'
```

### Análise de LLM Calls

```bash
# Listar todas as LLM calls
cat .debug/debug_trace_*.json | jq '.llm_calls'

# Ver apenas fases das LLM calls
cat .debug/debug_trace_*.json | jq '.llm_calls[].phase'

# Ver tokens por LLM call
cat .debug/debug_trace_*.json | jq '.llm_calls[] | {phase: .phase, tokens: .tokens.total}'

# Ver duração de cada LLM call
cat .debug/debug_trace_*.json | jq '.llm_calls[] | {phase: .phase, duration_ms: .duration_ms}'

# Ver prompt da fase de planejamento
cat .debug/debug_trace_*.json | jq '.llm_calls[] | select(.phase == "planning") | .messages[1].content'

# Ver resposta da fase de planejamento
cat .debug/debug_trace_*.json | jq '.llm_calls[] | select(.phase == "planning") | .response.choices[0].message.content'
```

### Análise de Tool Calls

```bash
# Listar todas as tool calls
cat .debug/debug_trace_*.json | jq '.tool_calls'

# Ver apenas nomes das ferramentas
cat .debug/debug_trace_*.json | jq '.tool_calls[].tool_name'

# Ver duração de cada tool call
cat .debug/debug_trace_*.json | jq '.tool_calls[] | {tool: .tool_name, duration_ms: .duration_ms}'

# Ver argumentos de uma ferramenta específica
cat .debug/debug_trace_*.json | jq '.tool_calls[] | select(.tool_name == "COMPOSIO_SEARCH_TOOLS") | .arguments'

# Ver resultado de uma ferramenta específica
cat .debug/debug_trace_*.json | jq '.tool_calls[] | select(.tool_name == "COMPOSIO_EXECUTE_TOOL") | .result'

# Ver erros em tool calls
cat .debug/debug_trace_*.json | jq '.tool_calls[] | select(.error != null) | {tool: .tool_name, error: .error}'
```

### Análise de Checkpoints

```bash
# Listar todos os checkpoints
cat .debug/debug_trace_*.json | jq '.checkpoints'

# Ver status de cada checkpoint
cat .debug/debug_trace_*.json | jq '.checkpoints[] | {subtask: .subtask_id, status: .data.status}'

# Ver artefatos de cada checkpoint
cat .debug/debug_trace_*.json | jq '.checkpoints[] | {subtask: .subtask_id, artifacts: .data.artifacts}'

# Ver duração de cada subtarefa
cat .debug/debug_trace_*.json | jq '.checkpoints[] | {subtask: .subtask_id, duration_ms: .data.duration_ms}'
```

### Análise de Erros

```bash
# Listar todos os erros
cat .debug/debug_trace_*.json | jq '.errors'

# Ver mensagens de erro
cat .debug/debug_trace_*.json | jq '.errors[].message'

# Ver stack traces
cat .debug/debug_trace_*.json | jq '.errors[].stack'

# Ver fase onde ocorreu o erro
cat .debug/debug_trace_*.json | jq '.errors[] | {phase: .phase, message: .message}'
```

### Análise de Planejamento

```bash
# Ver plano completo
cat .debug/debug_trace_*.json | jq '.phases.planning'

# Ver objetivo
cat .debug/debug_trace_*.json | jq '.phases.planning.goal'

# Ver subtarefas
cat .debug/debug_trace_*.json | jq '.phases.planning.subtasks'

# Ver apenas títulos das subtarefas
cat .debug/debug_trace_*.json | jq '.phases.planning.subtasks[].title'

# Ver toolkits candidatos por subtarefa
cat .debug/debug_trace_*.json | jq '.phases.planning.subtasks[] | {title: .title, toolkits: .toolkit_candidates}'

# Ver riscos por subtarefa
cat .debug/debug_trace_*.json | jq '.phases.planning.subtasks[] | {title: .title, risks: .risk_flags}'
```

### Análise de Performance

```bash
# Ver uso de memória
cat .debug/debug_trace_*.json | jq '.metadata.memory_usage'

# Ver duração total
cat .debug/debug_trace_*.json | jq '.duration_ms'

# Ver tempo gasto em cada fase
cat .debug/debug_trace_*.json | jq '{
  planning: (.llm_calls[] | select(.phase == "planning") | .duration_ms),
  execution: (.phases.execution.timestamp),
  verification: (.phases.verification.timestamp)
}'

# Calcular tempo médio por tool call
cat .debug/debug_trace_*.json | jq '[.tool_calls[].duration_ms] | add / length'

# Calcular tempo médio por LLM call
cat .debug/debug_trace_*.json | jq '[.llm_calls[].duration_ms] | add / length'
```

### Análise de Custos

```bash
# Ver total de tokens
cat .debug/debug_trace_*.json | jq '.statistics.total_tokens'

# Ver tokens por fase
cat .debug/debug_trace_*.json | jq '.llm_calls[] | {phase: .phase, tokens: .tokens.total}'

# Calcular custo estimado (gpt-4o-mini: $0.15/1M input, $0.60/1M output)
cat .debug/debug_trace_*.json | jq '
  (.llm_calls | map(.tokens.prompt) | add) as $input |
  (.llm_calls | map(.tokens.completion) | add) as $output |
  {
    input_tokens: $input,
    output_tokens: $output,
    input_cost: ($input / 1000000 * 0.15),
    output_cost: ($output / 1000000 * 0.60),
    total_cost: (($input / 1000000 * 0.15) + ($output / 1000000 * 0.60))
  }
'
```

### Comparação Entre Execuções

```bash
# Comparar duração de múltiplas execuções
for file in .debug/debug_trace_*.json; do
  echo "$(basename $file): $(cat $file | jq -r '.statistics.duration_seconds')s"
done

# Comparar tokens de múltiplas execuções
for file in .debug/debug_trace_*.json; do
  echo "$(basename $file): $(cat $file | jq -r '.statistics.total_tokens') tokens"
done

# Comparar número de tool calls
for file in .debug/debug_trace_*.json; do
  echo "$(basename $file): $(cat $file | jq -r '.statistics.total_tool_calls') tool calls"
done
```

## Análise Visual com Python

### Script de Análise Básica

```python
import json
import sys
from datetime import datetime

def analyze_debug_report(filepath):
    with open(filepath, 'r') as f:
        data = json.load(f)
    
    print("=" * 80)
    print("ANÁLISE DE RELATÓRIO DE DEBUG")
    print("=" * 80)
    
    # Informações básicas
    print(f"\nTrace ID: {data['trace_id']}")
    print(f"Duração: {data['statistics']['duration_seconds']}s")
    print(f"Status: {'✅ Sucesso' if data['phases']['verification']['success'] else '❌ Falha'}")
    
    # Estatísticas
    stats = data['statistics']
    print(f"\n📊 ESTATÍSTICAS:")
    print(f"  LLM Calls: {stats['total_llm_calls']}")
    print(f"  Tool Calls: {stats['total_tool_calls']}")
    print(f"  Checkpoints: {stats['total_checkpoints']}")
    print(f"  Erros: {stats['total_errors']}")
    print(f"  Warnings: {stats['total_warnings']}")
    print(f"  Tokens: {stats['total_tokens']}")
    
    # LLM Calls
    print(f"\n🤖 LLM CALLS:")
    for call in data['llm_calls']:
        print(f"  {call['phase']}: {call['duration_ms']}ms, {call['tokens']['total']} tokens")
    
    # Tool Calls
    print(f"\n🔧 TOOL CALLS:")
    for call in data['tool_calls']:
        status = "✅" if call['error'] is None else "❌"
        print(f"  {status} {call['tool_name']}: {call['duration_ms']}ms")
    
    # Erros
    if data['errors']:
        print(f"\n❌ ERROS:")
        for error in data['errors']:
            print(f"  {error['phase']}: {error['message']}")
    
    # Uso de memória
    mem = data['metadata']['memory_usage']
    print(f"\n💾 MEMÓRIA:")
    print(f"  RSS: {mem['rss']}")
    print(f"  Heap Used: {mem['heap_used']}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python analyze.py <caminho-do-relatorio.json>")
        sys.exit(1)
    
    analyze_debug_report(sys.argv[1])
```

### Uso

```bash
python analyze.py .debug/debug_trace_*.json
```

## Análise de Gargalos

### Identificar Tool Calls Lentas

```bash
# Top 5 tool calls mais lentas
cat .debug/debug_trace_*.json | jq '.tool_calls | sort_by(.duration_ms) | reverse | .[0:5] | .[] | {tool: .tool_name, duration_ms: .duration_ms}'
```

### Identificar LLM Calls Lentas

```bash
# Top LLM calls mais lentas
cat .debug/debug_trace_*.json | jq '.llm_calls | sort_by(.duration_ms) | reverse | .[] | {phase: .phase, duration_ms: .duration_ms}'
```

### Identificar Subtarefas Lentas

```bash
# Top subtarefas mais lentas
cat .debug/debug_trace_*.json | jq '.checkpoints | sort_by(.data.duration_ms) | reverse | .[] | {subtask: .subtask_id, duration_ms: .data.duration_ms}'
```

## Análise de Falhas

### Identificar Padrões de Erro

```bash
# Agrupar erros por tipo
cat .debug/debug_trace_*.json | jq '.errors | group_by(.error_type) | .[] | {type: .[0].error_type, count: length}'

# Ver contexto dos erros
cat .debug/debug_trace_*.json | jq '.errors[] | {phase: .phase, message: .message, context: .context}'
```

### Identificar Tool Calls com Erro

```bash
# Listar tool calls que falharam
cat .debug/debug_trace_*.json | jq '.tool_calls[] | select(.error != null) | {tool: .tool_name, error: .error, arguments: .arguments}'
```

## Exportação para CSV

### Exportar Tool Calls

```bash
cat .debug/debug_trace_*.json | jq -r '.tool_calls[] | [.timestamp, .tool_name, .duration_ms, (.error // "null")] | @csv' > tool_calls.csv
```

### Exportar LLM Calls

```bash
cat .debug/debug_trace_*.json | jq -r '.llm_calls[] | [.timestamp, .phase, .model, .duration_ms, .tokens.total] | @csv' > llm_calls.csv
```

### Exportar Checkpoints

```bash
cat .debug/debug_trace_*.json | jq -r '.checkpoints[] | [.timestamp, .subtask_id, .data.status, .data.duration_ms] | @csv' > checkpoints.csv
```

## Dicas Gerais

1. **Use `jq` para filtrar**: Não tente ler o JSON inteiro, use `jq` para extrair apenas o que precisa
2. **Combine com `grep`**: Para buscar strings específicas nos resultados
3. **Use `less`**: Para navegar em outputs grandes: `cat file.json | jq '.tool_calls' | less`
4. **Salve queries úteis**: Crie aliases no seu `.bashrc` para queries frequentes
5. **Compare execuções**: Use `diff` para comparar dois relatórios
6. **Automatize análises**: Crie scripts Python/Node.js para análises recorrentes

## Exemplos de Aliases Úteis

Adicione ao seu `.bashrc` ou `.zshrc`:

```bash
# Análise rápida de debug
alias debug-stats='cat .debug/debug_trace_*.json | jq ".statistics"'
alias debug-errors='cat .debug/debug_trace_*.json | jq ".errors"'
alias debug-tools='cat .debug/debug_trace_*.json | jq ".tool_calls[] | {tool: .tool_name, duration: .duration_ms}"'
alias debug-llm='cat .debug/debug_trace_*.json | jq ".llm_calls[] | {phase: .phase, tokens: .tokens.total}"'
alias debug-cost='cat .debug/debug_trace_*.json | jq "(.llm_calls | map(.tokens.prompt) | add) as \$input | (.llm_calls | map(.tokens.completion) | add) as \$output | {input_tokens: \$input, output_tokens: \$output, total_cost: ((\$input / 1000000 * 0.15) + (\$output / 1000000 * 0.60))}"'
```

## Troubleshooting

### Relatório muito grande para abrir

```bash
# Ver apenas estatísticas
cat .debug/debug_trace_*.json | jq '.statistics'

# Ver apenas erros
cat .debug/debug_trace_*.json | jq '.errors'

# Comprimir relatório
gzip .debug/debug_trace_*.json

# Ler relatório comprimido
zcat .debug/debug_trace_*.json.gz | jq '.statistics'
```

### Buscar em múltiplos relatórios

```bash
# Buscar por trace_id específico
grep -l "trace_1234567890" .debug/*.json

# Buscar por erro específico
grep -l "Authentication failed" .debug/*.json

# Buscar por tool específica
grep -l "GMAIL_SEND_EMAIL" .debug/*.json
```
