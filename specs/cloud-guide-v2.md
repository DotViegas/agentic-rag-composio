# Guia de Operações Multi-Nuvem (Atualizado com Suporte Composio)

Este guia complementa as instruções gerais do `agent.md` com regras específicas para operações em serviços de nuvem, baseado nas respostas oficiais do suporte da Composio.

---

## 🚀 Otimização de Performance

### ⚠️ COMPOSIO_SEARCH_TOOLS Retorna JSON Grande - Isso é NORMAL!

O JSON pode ter 50KB-200KB porque inclui:
- Schemas completos de múltiplas tools
- Plano recomendado com pitfalls
- Status de todas as conexões
- Metadados de sessão

**Isso é esperado pela arquitetura do Composio!**

### 🎯 Como Otimizar

1. **Chame apenas UMA VEZ** por workflow
   - O sistema cacheia automaticamente
   - Reutilize o `session_id`

2. **Não repita o JSON completo no output:**
   - ❌ NÃO copie schemas completos
   - ✅ Retorne apenas IDs e status

3. **Use GET_TOOL_SCHEMAS** se souber qual tool precisa

### Exemplo Otimizado no Workbench

```python
# Chamar SEARCH_TOOLS uma vez
search = run_composio_tool("COMPOSIO_SEARCH_TOOLS", {
    "use_case": "buscar arquivo relatorio-vendas.txt no Google Drive e baixar conteúdo"
})

# Extrair apenas o necessário
session_id = search["session_id"]
find_tool = search["primary_tool_slugs"][0]  # GOOGLEDRIVE_FIND_FILE
download_tool = search["primary_tool_slugs"][1]  # GOOGLEDRIVE_DOWNLOAD_FILE

# Usar as tools (reutilizar session_id)
file = run_composio_tool(find_tool, {
    "q": "name contains 'relatorio-vendas' and trashed = false",
    "session_id": session_id
})

content = run_composio_tool(download_tool, {
    "file_id": file["files"][0]["id"],
    "session_id": session_id
})

# ✅ Retornar apenas o essencial (não o JSON completo!)
{"file_id": file["files"][0]["id"], "status": "success"}
```

---

## ⚠️ Informações Críticas do Suporte Composio

### 1. Ferramenta de Busca Correta
- ❌ `GOOGLEDRIVE_SEARCH_FILES` (NÃO EXISTE)
- ✅ `GOOGLEDRIVE_FIND_FILE` (ferramenta correta)

### 2. Download Retorna URL, Não Conteúdo
- `GOOGLEDRIVE_DOWNLOAD_FILE` retorna `downloaded_file_content.s3url`
- Você DEVE fazer HTTP GET para baixar o conteúdo
- Estrutura pode ser aninhada: `response.data.data.downloaded_file_content.s3url`

### 3. Ferramentas de Upload/Edição
- **Sobrescrever arquivo existente:** `GOOGLEDRIVE_EDIT_FILE`
- **Criar cópia versionada:** `GOOGLEDRIVE_UPLOAD_FILE` ou `GOOGLEDRIVE_COPY_FILE`

---

## 🔄 Fluxo Obrigatório para Edição de Arquivos

### 1) Descoberta de Ferramentas e Autenticação

Ao receber um pedido envolvendo qualquer serviço externo:

1. **Chame `COMPOSIO_SEARCH_TOOLS`** com o caso de uso
2. **Verifique conexão ativa** para o toolkit necessário
3. **Se não houver conexão ACTIVE**, chame `COMPOSIO_MANAGE_CONNECTIONS`
4. **NÃO execute ferramentas sem conexão ACTIVE**

```json
{
  "tool": "COMPOSIO_SEARCH_TOOLS",
  "arguments": {
    "use_case": "buscar e baixar arquivo do Google Drive",
    "toolkit": "googledrive"
  }
}
```

---

### 2) Coleta de Contexto Mínimo (somente se faltar)

Antes de agir, garanta que você tem:

**A) Provedor** (ou inferir pelo link):
- Google Drive, OneDrive, Dropbox, Box, SharePoint, S3, Azure Blob

**B) Identificador do arquivo:**
- Link compartilhado, caminho completo, nome + pasta, ou ID do arquivo

**C) Intenção de gravação:**
- **Opção A:** Sobrescrever o original (mesmo ID) ⚠️ DESTRUTIVO
- **Opção B:** Criar cópia versionada (novo arquivo) ✅ SEGURO (PADRÃO)

**D) Regras de edição:**
- O que alterar, critérios, e o que NÃO pode mudar

**Se faltar informação crítica, pergunte ao usuário de forma objetiva.**

---

### 3) Localizar e Identificar o Arquivo Corretamente

**IMPORTANTE:** Use `GOOGLEDRIVE_FIND_FILE` (não `GOOGLEDRIVE_SEARCH_FILES`).

```python
# CORRETO: Use GOOGLEDRIVE_FIND_FILE
search_result = run_composio_tool("GOOGLEDRIVE_FIND_FILE", {
    "q": "name contains 'relatorio-vendas' and trashed = false"
})

# Busca exata (precisa incluir extensão):
search_result = run_composio_tool("GOOGLEDRIVE_FIND_FILE", {
    "q": "name = 'relatorio-vendas.txt' and trashed = false"
})

# Para Shared Drives:
search_result = run_composio_tool("GOOGLEDRIVE_FIND_FILE", {
    "q": "name contains 'relatorio' and trashed = false",
    "corpora": "allDrives",
    "includeItemsFromAllDrives": True,
    "supportsAllDrives": True
})
```

**Sintaxe do parâmetro `q` (Google Drive API v3):**
- **Substring:** `name contains 'relatorio'` (recomendado)
- **Exato:** `name = 'arquivo.txt'` (precisa extensão)
- **SEMPRE adicione:** `and trashed = false`
- **Wildcards (`*`) NÃO suportados** - use `contains`
- **Case:** Geralmente não é case-sensitive

**Tratamento de resultados:**
```python
if not search_result or len(search_result.get("files", [])) == 0:
    raise Exception("Arquivo não encontrado. Verifique:\n- Nome correto?\n- Está na lixeira?\n- Tem permissão?\n- Está em Shared Drive?")

if len(search_result["files"]) > 1:
    files_list = "\n".join([
        f"- {f['name']} (ID: {f['id']})"
        for f in search_result["files"]
    ])
    return {
        "needs_clarification": True,
        "message": f"Múltiplos arquivos:\n{files_list}\n\nQual editar?"
    }

file_info = search_result["files"][0]
file_id = file_info["id"]
```

---

### 4) Baixar para o Workbench (sandbox)

**CRÍTICO:** Download retorna URL, não conteúdo direto!

```python
import requests

# 1) Baixar (retorna URL assinada)
resp = run_composio_tool("GOOGLEDRIVE_DOWNLOAD_FILE", {
    "file_id": file_id
})

# 2) Extrair s3url defensivamente (pode estar aninhado)
d = resp.get("data") or {}
if isinstance(d, dict) and "data" in d and isinstance(d["data"], dict):
    d = d["data"]

s3url = (d.get("downloaded_file_content") or {}).get("s3url")

if not s3url:
    raise RuntimeError(f"Sem s3url em resp: {resp}")

# 3) Baixar conteúdo via HTTP
content_bytes = requests.get(s3url, timeout=60).content
content_text = content_bytes.decode("utf-8", errors="replace")

# 4) Validar
if not content_text or len(content_text) == 0:
    raise Exception("Arquivo vazio")
```

**IMPORTANTE:**
- ✅ Sempre use `requests.get(s3url)` para baixar o conteúdo
- ✅ Extraia `s3url` defensivamente (pode estar aninhado)
- ❌ NÃO espere `content` direto na resposta

---

### 5) Editar/Transformar no Workbench (estratégia por tipo)

## 🚨 REGRAS CRÍTICAS - LEIA COM ATENÇÃO!

### ❌ ERROS FATAIS QUE VOCÊ DEVE EVITAR:

**1. NUNCA substitua o conteúdo original por um placeholder ou texto literal!**

```python
# ❌ ERRO FATAL #1: Substituir conteúdo por placeholder
new_content = "<conteúdo do arquivo original com 'teste de correção'>"
# Isso cria um arquivo com LITERALMENTE esse texto, apagando tudo!

# ❌ ERRO FATAL #2: Substituir conteúdo por apenas a linha nova
new_content = "teste de correção pipipi popopo"
# Isso APAGA todo o conteúdo original!

# ✅ CORRETO: Adicionar ao final do conteúdo REAL
new_content = original_content + "\nteste de correção pipipi popopo"
# Isso PRESERVA o conteúdo original e adiciona a linha nova
```

**2. SEMPRE use o conteúdo REAL baixado, não placeholders!**

```python
# Você tem o conteúdo real em 'original_content'
# Use-o diretamente, não invente texto!

# ✅ CORRETO:
new_content = original_content + "\n" + nova_linha

# ❌ ERRADO:
new_content = f"<conteúdo original>\n{nova_linha}"  # Placeholder!
```

**3. Entenda o que significa "adicionar linha":**

- "Adicionar linha X" = Preservar conteúdo original + adicionar X no final
- NÃO significa "substituir tudo por X"
- NÃO significa "criar arquivo com apenas X"

### Exemplos Corretos por Tipo de Edição:

#### Texto Simples (TXT, MD, etc.)
```python
# Baixar conteúdo real
original_content = content_text  # Já baixado via requests.get(s3url)

# ADICIONAR linha (preserva original)
if "adicionar linha" in tarefa.lower():
    new_content = original_content + "\n" + linha_nova

# SUBSTITUIR palavra específica
elif "substituir" in tarefa.lower():
    new_content = original_content.replace(palavra_antiga, palavra_nova)

# INSERIR no início
elif "inserir no início" in tarefa.lower():
    new_content = linha_nova + "\n" + original_content

# NUNCA faça:
# new_content = linha_nova  # ❌ Apaga tudo!
# new_content = "<conteúdo original com linha>"  # ❌ Placeholder literal!
```

---

### 5) Editar/Transformar no Workbench (estratégia por tipo)

#### Texto Simples (TXT, MD, etc.)
```python
original_content = content_text
new_content = original_content + "\nNova linha adicionada"
```

#### CSV/XLSX/TSV
```python
import pandas as pd
from io import StringIO

df = pd.read_csv(StringIO(content_text))
df["nova_coluna"] = df["existente"] * 2
new_content = df.to_csv(index=False)
```

#### JSON/YAML
```python
import json

data = json.loads(content_text)
data["version"] = "2.0"
new_content = json.dumps(data, indent=2)
```

**Preserve sempre:**
- Encoding (UTF-8 etc.), separadores, quebras de linha
- Metadados importantes

---

### 6) Validação Antes de Reenviar

```python
# Validar edição
if len(new_content) <= len(original_content):
    raise Exception("Edição não adicionou conteúdo")

# Resumo de diff
diff_summary = {
    "original_size": len(original_content),
    "new_size": len(new_content),
    "lines_added": new_content.count("\n") - original_content.count("\n")
}
```

---

### 7) Regra de Segurança para Ações Destrutivas (OBRIGATÓRIO)

**Ações destrutivas:**
- ⚠️ Sobrescrever arquivo original (`GOOGLEDRIVE_EDIT_FILE`)
- ⚠️ Apagar versões anteriores
- ⚠️ Mover para fora da pasta
- ⚠️ Alterar permissões

**Antes de qualquer ação destrutiva:**
1. Apresente o que será feito
2. Ofereça alternativa segura (cópia versionada)
3. Peça confirmação explícita

---

### 8) Upload e Atualização na Nuvem

**Opção A: Sobrescrever (DESTRUTIVO - após confirmação):**
```python
resp = run_composio_tool("GOOGLEDRIVE_EDIT_FILE", {
    "file_id": file_id,
    "content": new_content,
    "mime_type": "text/plain"
})
```

**Opção B: Criar cópia versionada (SEGURO - padrão):**
```python
from datetime import datetime

timestamp = datetime.now().strftime("%Y%m%d-%H%M")
new_name = f"{original_name.rsplit('.', 1)[0]}__editado__{timestamp}.txt"

# Use GOOGLEDRIVE_UPLOAD_FILE ou GOOGLEDRIVE_COPY_FILE
# (verificar disponibilidade com COMPOSIO_SEARCH_TOOLS)
```

---

### 9) Confirmação Final

```json
{
  "artifacts": {
    "file_id": "abc123",
    "file_name": "relatorio__editado__20260316-1530.txt",
    "action": "created_new_version",
    "status": "success"
  },
  "outputs": {
    "raw_output": "Arquivo editado!\n\nResumo:\n- Linhas adicionadas: 3\n- Tamanho: 1.2 KB → 1.5 KB"
  },
  "success": true
}
```

---

### 10) Regras de Execução (OBRIGATÓRIAS)

**Sempre:**
1. Use `GOOGLEDRIVE_FIND_FILE` (não `GOOGLEDRIVE_SEARCH_FILES`)
2. Parâmetro é `q`, não `query`
3. Adicione `and trashed = false` na query
4. Download retorna URL - use `requests.get(s3url)`
5. Extraia `s3url` defensivamente (pode estar aninhado)
6. TODO dentro do Workbench: download + edição + upload

**Nunca:**
1. ❌ Use `GOOGLEDRIVE_SEARCH_FILES` (não existe)
2. ❌ Espere `content` direto no download
3. ❌ Use ferramentas não relacionadas à tarefa
4. ❌ Sobrescreva sem confirmação

---

## 📝 Exemplo Completo: Editar Arquivo no Google Drive

```python
# COMPOSIO_REMOTE_WORKBENCH - TODO DENTRO

import requests
from datetime import datetime

# PASSO 1: Buscar arquivo
search_result = run_composio_tool("GOOGLEDRIVE_FIND_FILE", {
    "q": "name = 'relatorio.txt' and trashed = false"
})

if not search_result or len(search_result.get("files", [])) == 0:
    raise Exception("Arquivo não encontrado")

file_info = search_result["files"][0]
file_id = file_info["id"]
file_name = file_info["name"]

# PASSO 2: Baixar arquivo (retorna URL)
resp = run_composio_tool("GOOGLEDRIVE_DOWNLOAD_FILE", {
    "file_id": file_id
})

# PASSO 3: Extrair s3url defensivamente
d = resp.get("data") or {}
if isinstance(d, dict) and "data" in d:
    d = d["data"]

s3url = (d.get("downloaded_file_content") or {}).get("s3url")
if not s3url:
    raise RuntimeError(f"Sem s3url: {resp}")

# PASSO 4: Baixar conteúdo via HTTP
content_bytes = requests.get(s3url, timeout=60).content
original_content = content_bytes.decode("utf-8", errors="replace")

# PASSO 5: Editar
new_content = original_content + "\n\nAtualizado em: 16/03/2026"

# PASSO 6: Validar
if len(new_content) <= len(original_content):
    raise Exception("Edição falhou")

# PASSO 7: Sobrescrever (após confirmação do usuário)
resp2 = run_composio_tool("GOOGLEDRIVE_EDIT_FILE", {
    "file_id": file_id,
    "content": new_content,
    "mime_type": "text/plain"
})

# PASSO 8: Retornar artefatos
{
    "file_id": file_id,
    "file_name": file_name,
    "action": "overwritten",
    "original_size": len(original_content),
    "new_size": len(new_content),
    "status": "success"
}
```

---

## 🎯 Resumo do Fluxo

```
1. COMPOSIO_SEARCH_TOOLS → Descobrir ferramentas
2. COMPOSIO_MANAGE_CONNECTIONS → Verificar autenticação (ACTIVE)
3. GOOGLEDRIVE_FIND_FILE → Buscar arquivo (q="name contains 'x' and trashed = false")
4. GOOGLEDRIVE_DOWNLOAD_FILE → Baixar (retorna s3url)
5. requests.get(s3url) → Baixar conteúdo via HTTP
6. Editar → Processar conteúdo
7. Validar → Verificar edição
8. Confirmar → Se destrutivo
9. GOOGLEDRIVE_EDIT_FILE → Sobrescrever (ou UPLOAD para cópia)
10. Retornar → Artefatos + resumo
```

---

## 📚 Referências

- Resposta oficial do Suporte Composio (16/03/2026)
- [agent.md](agent.md) - Instruções gerais do agente
- [WORKBENCH-GUIDE.md](WORKBENCH-GUIDE.md) - Guia do Workbench
