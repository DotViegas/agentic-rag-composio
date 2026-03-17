# Exemplos de Código Python Gerado pelo Agente

Este documento mostra exemplos reais de código Python que o agente gera para executar no Workbench.

---

## 📝 Estrutura do Código

Todo código Python gerado pelo agente segue este padrão:

```python
# 1. Importar bibliotecas (se necessário)
import pandas as pd
import json

# 2. Executar operações usando helpers
result = run_composio_tool("TOOL_NAME", {
    "param": "value"
})

# 3. Processar dados
processed_data = process(result)

# 4. Retornar artefatos estruturados
{
    "artifact_key": "value",
    "status": "success"
}
```

---

## 🎯 Exemplos por Caso de Uso

### 1. Edição Simples de Arquivo

**Tarefa:** "Edite o arquivo notas.txt no Dropbox adicionando 'Concluído'"

**Código gerado pelo agente:**

```python
# Baixar arquivo do Dropbox
file_data = run_composio_tool("DROPBOX_DOWNLOAD_FILE", {
    "path": "/notas.txt"
})

# Extrair conteúdo atual
current_content = file_data.get("content", "")

# Adicionar nova linha
new_content = current_content + "\nConcluído"

# Fazer upload da versão atualizada
upload_result = run_composio_tool("DROPBOX_UPLOAD_FILE", {
    "path": "/notas.txt",
    "content": new_content,
    "mode": "overwrite"
})

# Retornar artefatos
{
    "file_id": upload_result.get("id"),
    "file_path": "/notas.txt",
    "status": "updated",
    "success": True
}
```

---

### 2. Edição com Busca e Substituição

**Tarefa:** "No arquivo config.json do Google Drive, altere 'version': '1.0' para 'version': '2.0'"

**Código gerado pelo agente:**

```python
import json

# Baixar arquivo
file_data = run_composio_tool("GOOGLEDRIVE_DOWNLOAD_FILE", {
    "file_id": "1LWpgOp-VtDvPRZ8DmuQFta5_rxkuKabw"
})

# Parsear JSON
config = json.loads(file_data["content"])

# Modificar versão
old_version = config.get("version", "unknown")
config["version"] = "2.0"

# Converter de volta para string
new_content = json.dumps(config, indent=2)

# Upload
upload_result = run_composio_tool("GOOGLEDRIVE_UPLOAD_FILE", {
    "file_id": "1LWpgOp-VtDvPRZ8DmuQFta5_rxkuKabw",
    "content": new_content
})

# Retornar
{
    "file_id": upload_result["id"],
    "old_version": old_version,
    "new_version": "2.0",
    "status": "updated",
    "success": True
}
```

---

### 3. Processamento de CSV

**Tarefa:** "Baixe vendas.csv do Dropbox, calcule total e média, envie relatório por email"

**Código gerado pelo agente:**

```python
import pandas as pd
from io import StringIO

# 1. Baixar CSV
file_data = run_composio_tool("DROPBOX_DOWNLOAD_FILE", {
    "path": "/vendas.csv"
})

# 2. Carregar com pandas
df = pd.read_csv(StringIO(file_data["content"]))

# 3. Calcular estatísticas
total_vendas = df["valor"].sum()
media_vendas = df["valor"].mean()
num_registros = len(df)
maior_venda = df["valor"].max()
menor_venda = df["valor"].min()

# 4. Gerar relatório formatado
relatorio = f"""
📊 Relatório de Vendas
=====================

Total de Vendas: R$ {total_vendas:,.2f}
Média por Venda: R$ {media_vendas:,.2f}
Número de Registros: {num_registros}
Maior Venda: R$ {maior_venda:,.2f}
Menor Venda: R$ {menor_venda:,.2f}

Gerado automaticamente em {pd.Timestamp.now().strftime('%d/%m/%Y %H:%M')}
"""

# 5. Enviar por email
email_result = run_composio_tool("GMAIL_SEND_EMAIL", {
    "to": "gerente@empresa.com",
    "subject": "Relatório de Vendas - Automático",
    "body": relatorio
})

# 6. Retornar artefatos
{
    "total": float(total_vendas),
    "media": float(media_vendas),
    "registros": num_registros,
    "email_id": email_result["message_id"],
    "status": "success",
    "success": True
}
```

---

### 4. Operação Bulk - Classificar Emails

**Tarefa:** "Classifique os 30 primeiros emails não lidos e aplique labels"

**Código gerado pelo agente:**

```python
# 1. Buscar emails não lidos
emails_response = run_composio_tool("GMAIL_LIST_MESSAGES", {
    "query": "is:unread",
    "max_results": 30
})

emails = emails_response.get("messages", [])

# 2. Processar cada email
processed_count = 0
urgente_count = 0
importante_count = 0
newsletter_count = 0

for email in emails:
    try:
        # Obter detalhes do email
        details = run_composio_tool("GMAIL_GET_MESSAGE", {
            "message_id": email["id"]
        })
        
        # Classificar com LLM
        classification_prompt = f"""
Classifique este email em UMA das categorias: urgente, importante, newsletter, spam

Assunto: {details.get('subject', 'Sem assunto')}
De: {details.get('from', 'Desconhecido')}
Prévia: {details.get('snippet', '')[:200]}

Responda apenas com a categoria.
"""
        
        category = invoke_llm(classification_prompt, model="gpt-4o-mini").lower().strip()
        
        # Aplicar label baseado na categoria
        if "urgente" in category:
            run_composio_tool("GMAIL_ADD_LABEL", {
                "message_id": email["id"],
                "label_name": "URGENTE"
            })
            urgente_count += 1
            
        elif "importante" in category:
            run_composio_tool("GMAIL_ADD_LABEL", {
                "message_id": email["id"],
                "label_name": "IMPORTANTE"
            })
            importante_count += 1
            
        elif "newsletter" in category:
            run_composio_tool("GMAIL_ADD_LABEL", {
                "message_id": email["id"],
                "label_name": "NEWSLETTER"
            })
            newsletter_count += 1
        
        processed_count += 1
        
    except Exception as e:
        # Continuar mesmo se um email falhar
        continue

# 3. Retornar estatísticas
{
    "processed": processed_count,
    "total": len(emails),
    "urgente": urgente_count,
    "importante": importante_count,
    "newsletter": newsletter_count,
    "status": "success",
    "success": True
}
```

---

### 5. Transformação de Dados

**Tarefa:** "Baixe clientes.json do Dropbox, transforme array em objeto indexado por ID, salve como clientes-indexed.json"

**Código gerado pelo agente:**

```python
import json

# 1. Baixar JSON original
file_data = run_composio_tool("DROPBOX_DOWNLOAD_FILE", {
    "path": "/clientes.json"
})

# 2. Parsear JSON
clientes_array = json.loads(file_data["content"])

# 3. Transformar array em objeto indexado
clientes_indexed = {}
for cliente in clientes_array:
    cliente_id = cliente.get("id")
    if cliente_id:
        clientes_indexed[str(cliente_id)] = cliente

# 4. Converter para JSON formatado
new_content = json.dumps(clientes_indexed, indent=2, ensure_ascii=False)

# 5. Upload do arquivo transformado
upload_result = run_composio_tool("DROPBOX_UPLOAD_FILE", {
    "path": "/clientes-indexed.json",
    "content": new_content,
    "mode": "add"
})

# 6. Retornar
{
    "file_id": upload_result["id"],
    "original_count": len(clientes_array),
    "indexed_count": len(clientes_indexed),
    "file_path": "/clientes-indexed.json",
    "status": "success",
    "success": True
}
```

---

### 6. Análise com Visualização

**Tarefa:** "Analise commits do GitHub dos últimos 30 dias, crie gráfico e envie no Slack"

**Código gerado pelo agente:**

```python
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

# 1. Buscar commits
commits_response = run_composio_tool("GITHUB_LIST_COMMITS", {
    "owner": "myorg",
    "repo": "myrepo",
    "since": (datetime.now() - timedelta(days=30)).isoformat(),
    "per_page": 100
})

commits = commits_response.get("commits", [])

# 2. Processar com pandas
df = pd.DataFrame([{
    "date": commit["commit"]["author"]["date"],
    "author": commit["commit"]["author"]["name"],
    "message": commit["commit"]["message"]
} for commit in commits])

df["date"] = pd.to_datetime(df["date"])
df["date_only"] = df["date"].dt.date

# 3. Análise
commits_por_dia = df.groupby("date_only").size()
commits_por_autor = df.groupby("author").size().sort_values(ascending=False)

# 4. Criar gráfico
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Gráfico 1: Commits por dia
commits_por_dia.plot(kind="bar", ax=ax1, color="steelblue")
ax1.set_title("Commits por Dia (Últimos 30 dias)")
ax1.set_xlabel("Data")
ax1.set_ylabel("Número de Commits")
ax1.tick_params(axis='x', rotation=45)

# Gráfico 2: Commits por autor
commits_por_autor.head(10).plot(kind="barh", ax=ax2, color="coral")
ax2.set_title("Top 10 Autores")
ax2.set_xlabel("Número de Commits")

plt.tight_layout()
plt.savefig("commits_analysis.png", dpi=150, bbox_inches='tight')

# 5. Upload do gráfico
chart_url = upload_local_file("commits_analysis.png")

# 6. Gerar resumo
resumo = f"""
📊 Análise de Commits - {datetime.now().strftime('%d/%m/%Y')}

Total de commits: {len(commits)}
Período: Últimos 30 dias
Autores únicos: {df['author'].nunique()}
Média por dia: {len(commits) / 30:.1f}

Top 3 autores:
{chr(10).join([f"  {i+1}. {autor}: {count} commits" for i, (autor, count) in enumerate(commits_por_autor.head(3).items())])}

Gráfico completo: {chart_url}
"""

# 7. Enviar no Slack
slack_result = run_composio_tool("SLACK_SEND_MESSAGE", {
    "channel": "#dev",
    "text": resumo
})

# 8. Retornar
{
    "chart_url": chart_url,
    "total_commits": len(commits),
    "unique_authors": int(df['author'].nunique()),
    "slack_message_id": slack_result.get("ts"),
    "status": "success",
    "success": True
}
```

---

### 7. Workflow Multi-Step Complexo

**Tarefa:** "Baixe pedidos.csv do Google Drive, filtre pedidos pendentes, calcule total, gere PDF e envie por email"

**Código gerado pelo agente:**

```python
import pandas as pd
from io import StringIO
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from datetime import datetime

# 1. Baixar CSV
file_data = run_composio_tool("GOOGLEDRIVE_DOWNLOAD_FILE", {
    "file_id": "1LWpgOp-VtDvPRZ8DmuQFta5_rxkuKabw"
})

# 2. Processar com pandas
df = pd.read_csv(StringIO(file_data["content"]))

# 3. Filtrar apenas pendentes
df_pendentes = df[df["status"] == "pendente"]

# 4. Calcular estatísticas
total_pendentes = len(df_pendentes)
valor_total = df_pendentes["valor"].sum()
valor_medio = df_pendentes["valor"].mean()

# 5. Gerar PDF
pdf_filename = f"relatorio_pedidos_{datetime.now().strftime('%Y%m%d')}.pdf"
c = canvas.Canvas(pdf_filename, pagesize=letter)
width, height = letter

# Título
c.setFont("Helvetica-Bold", 16)
c.drawString(50, height - 50, "Relatório de Pedidos Pendentes")

# Data
c.setFont("Helvetica", 10)
c.drawString(50, height - 70, f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}")

# Estatísticas
c.setFont("Helvetica-Bold", 12)
c.drawString(50, height - 100, "Resumo:")
c.setFont("Helvetica", 11)
c.drawString(70, height - 120, f"Total de pedidos pendentes: {total_pendentes}")
c.drawString(70, height - 140, f"Valor total: R$ {valor_total:,.2f}")
c.drawString(70, height - 160, f"Valor médio: R$ {valor_medio:,.2f}")

# Lista de pedidos (primeiros 20)
c.setFont("Helvetica-Bold", 12)
c.drawString(50, height - 190, "Pedidos:")
c.setFont("Helvetica", 9)
y_position = height - 210
for idx, row in df_pendentes.head(20).iterrows():
    c.drawString(70, y_position, f"#{row['id']} - {row['cliente']} - R$ {row['valor']:.2f}")
    y_position -= 15
    if y_position < 50:
        break

c.save()

# 6. Upload do PDF
pdf_url = upload_local_file(pdf_filename)

# 7. Enviar por email
email_result = run_composio_tool("GMAIL_SEND_EMAIL", {
    "to": "diretoria@empresa.com",
    "subject": f"Relatório de Pedidos Pendentes - {datetime.now().strftime('%d/%m/%Y')}",
    "body": f"""
Segue relatório de pedidos pendentes.

Resumo:
- Total de pedidos: {total_pendentes}
- Valor total: R$ {valor_total:,.2f}
- Valor médio: R$ {valor_medio:,.2f}

PDF completo: {pdf_url}

Relatório gerado automaticamente.
"""
})

# 8. Retornar
{
    "total_pendentes": total_pendentes,
    "valor_total": float(valor_total),
    "valor_medio": float(valor_medio),
    "pdf_url": pdf_url,
    "email_id": email_result["message_id"],
    "status": "success",
    "success": True
}
```

---

### 8. Atualização de Múltiplos Arquivos

**Tarefa:** "Atualize todos os arquivos .txt na pasta /docs do Dropbox adicionando cabeçalho com data"

**Código gerado pelo agente:**

```python
from datetime import datetime

# 1. Listar arquivos na pasta
files_response = run_composio_tool("DROPBOX_LIST_FOLDER", {
    "path": "/docs"
})

files = files_response.get("entries", [])

# 2. Filtrar apenas .txt
txt_files = [f for f in files if f.get("name", "").endswith(".txt")]

# 3. Processar cada arquivo
updated_count = 0
failed_count = 0
updated_files = []

header = f"# Atualizado em {datetime.now().strftime('%d/%m/%Y %H:%M')}\n\n"

for file in txt_files:
    try:
        file_path = file["path_display"]
        
        # Baixar arquivo
        file_data = run_composio_tool("DROPBOX_DOWNLOAD_FILE", {
            "path": file_path
        })
        
        # Adicionar cabeçalho
        current_content = file_data.get("content", "")
        new_content = header + current_content
        
        # Upload atualizado
        run_composio_tool("DROPBOX_UPLOAD_FILE", {
            "path": file_path,
            "content": new_content,
            "mode": "overwrite"
        })
        
        updated_count += 1
        updated_files.append(file["name"])
        
    except Exception as e:
        failed_count += 1
        continue

# 4. Retornar
{
    "total_files": len(txt_files),
    "updated": updated_count,
    "failed": failed_count,
    "updated_files": updated_files,
    "status": "success",
    "success": True
}
```

---

## 🎯 Padrões Comuns

### Padrão 1: Download → Processar → Upload

```python
# 1. Download
file = run_composio_tool("SERVICE_DOWNLOAD_FILE", {...})

# 2. Processar
processed = process(file["content"])

# 3. Upload
result = run_composio_tool("SERVICE_UPLOAD_FILE", {
    "content": processed
})
```

### Padrão 2: Buscar → Iterar → Executar

```python
# 1. Buscar itens
items = run_composio_tool("SERVICE_LIST_ITEMS", {...})

# 2. Processar cada um
for item in items:
    result = run_composio_tool("SERVICE_PROCESS_ITEM", {
        "item_id": item["id"]
    })
```

### Padrão 3: Analisar → Visualizar → Compartilhar

```python
# 1. Buscar dados
data = run_composio_tool("SERVICE_GET_DATA", {...})

# 2. Analisar
df = pd.DataFrame(data)
stats = df.describe()

# 3. Visualizar
plt.plot(df["x"], df["y"])
plt.savefig("chart.png")

# 4. Compartilhar
url = upload_local_file("chart.png")
run_composio_tool("SLACK_SEND_MESSAGE", {"text": url})
```

---

## 💡 Dicas para o Agente

### ✅ Boas Práticas

1. **Sempre retornar artefatos estruturados**
```python
{
    "file_id": "xyz",
    "status": "success",
    "success": True
}
```

2. **Usar try/except em loops**
```python
for item in items:
    try:
        process(item)
    except:
        continue
```

3. **Validar dados antes de processar**
```python
if file_data and "content" in file_data:
    process(file_data["content"])
```

4. **Usar helpers apropriados**
```python
# Para classificação
category = invoke_llm("Classifique...")

# Para upload
url = upload_local_file("file.pdf")
```

### ❌ Evitar

1. **Não inventar tool_slugs**
```python
# ❌ Errado
run_composio_tool("DROPBOX_EDIT_FILE", {...})  # Não existe!

# ✅ Correto
file = run_composio_tool("DROPBOX_DOWNLOAD_FILE", {...})
# editar localmente
run_composio_tool("DROPBOX_UPLOAD_FILE", {...})
```

2. **Não assumir estrutura de dados**
```python
# ❌ Errado
file_id = result["id"]  # Pode não existir!

# ✅ Correto
file_id = result.get("id", "unknown")
```

3. **Não processar dados grandes sem pandas**
```python
# ❌ Errado (lento)
for line in csv_content.split("\n"):
    process(line)

# ✅ Correto (rápido)
df = pd.read_csv(StringIO(csv_content))
df.apply(process)
```

---

## 📚 Referências

- [WORKBENCH-EXECUTION-FLOW.md](../WORKBENCH-EXECUTION-FLOW.md) - Fluxo completo
- [WORKBENCH-GUIDE.md](../WORKBENCH-GUIDE.md) - Guia de uso
- [agent.md](../agent.md) - Instruções para o agente
