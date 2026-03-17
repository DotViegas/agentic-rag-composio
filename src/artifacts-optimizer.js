/**
 * Otimizador de Artifacts
 * Remove base64 e dados grandes, mantém apenas referências e metadados
 * Redução: ~10k-50k tokens → ~200-400 tokens
 */

export class ArtifactsOptimizer {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Trunca strings longas
   */
  truncate(value, maxLength = 160) {
    if (typeof value !== 'string') return value;
    return value.length > maxLength ? value.slice(0, maxLength) + '…' : value;
  }

  /**
   * Detecta se parece base64 (heurística)
   */
  looksLikeBase64(str) {
    if (typeof str !== 'string') return false;
    if (str.length < 500) return false; // base64 costuma ser grande
    
    // Heurística: muitos chars base64 + pode terminar com =
    return /^[A-Za-z0-9+/=\s]+$/.test(str.slice(0, 800));
  }

  /**
   * Detecta se é URL S3 temporária do Composio
   */
  isS3Url(value) {
    if (typeof value !== 'string') return false;
    return value.includes('s3.amazonaws.com') || 
           value.includes('composio') ||
           value.startsWith('https://') && value.includes('X-Amz-');
  }

  /**
   * Normaliza download_ref (handle para conteúdo de arquivo)
   */
  normalizeDownloadRef(artifact) {
    // Caso 1: downloaded_file_content com s3url/s3_url
    if (artifact.downloaded_file_content) {
      const content = artifact.downloaded_file_content;
      
      if (typeof content === 'object') {
        return {
          type: 's3_url',
          url: content.s3url || content.s3_url,
          expires_in: 3600, // ~1 hora
          mime_type: content.mimetype || artifact.mime_type
        };
      }
      
      // Se for string base64, não incluir no manifest
      if (this.looksLikeBase64(content)) {
        return {
          type: 'base64_stored',
          size: content.length,
          note: 'Content stored in checkpoint, not in prompt'
        };
      }
    }

    // Caso 2: file_content direto
    if (artifact.file_content) {
      if (this.looksLikeBase64(artifact.file_content)) {
        return {
          type: 'base64_stored',
          size: artifact.file_content.length,
          note: 'Content stored in checkpoint, not in prompt'
        };
      }
    }

    // Caso 3: modified_content
    if (artifact.modified_content) {
      if (this.looksLikeBase64(artifact.modified_content)) {
        return {
          type: 'base64_stored',
          size: artifact.modified_content.length,
          note: 'Modified content stored in checkpoint, not in prompt'
        };
      }
    }

    return null;
  }

  /**
   * Chaves que NUNCA devem ir para o prompt (DROP_KEYS)
   */
  static DROP_KEYS = new Set([
    'file_content',
    'modified_content',
    'downloaded_file_content',
    'content',
    'body_raw',
    'raw',
    'html',
    'html_body',
    'text_body',
    'raw_response',
    'full_response',
    'binary_content',
    'data_bytes'
  ]);

  /**
   * Chaves permitidas no manifest (ALLOW_KEYS)
   */
  static ALLOW_KEYS = new Set([
    // Drive
    'file_id',
    'new_file_id',
    'source_file_id',
    'updated_file_id',
    'file_name',
    'file_path',
    'mime_type',
    'web_view_link',
    'upload_status',
    'version',
    'updated_at',
    'original_rows',
    'new_rows',
    'final_row_count',
    'downloaded_at',
    'file_size',
    'row_added',
    
    // Gmail
    'message_id',
    'thread_id',
    'recipient',
    'to',
    'cc',
    'bcc',
    'subject',
    'sent_at',
    'status',
    'attachment_name',
    
    // Dropbox
    'path_display',
    'path_lower',
    'id',
    'name',
    'size',
    'server_modified',
    
    // Generic
    'url',
    'auth_url',
    'connection_url',
    'verification_status',
    'verification_timestamp',
    'success',
    'error',
    'position'
  ]);

  /**
   * Constrói manifest enxuto dos artifacts
   * Reduz ~10k-50k tokens para ~200-400 tokens
   */
  buildArtifactsManifest(stateArtifacts, options = {}) {
    const { maxSubtasks = 8 } = options;
    
    const manifest = {};
    const subtaskIds = Object.keys(stateArtifacts || {}).slice(-maxSubtasks);

    for (const subtaskId of subtaskIds) {
      const artifact = stateArtifacts[subtaskId];
      if (!artifact || typeof artifact !== 'object') continue;

      const clean = {};

      // Processar cada campo
      for (const [key, value] of Object.entries(artifact)) {
        // Skip: chaves proibidas
        if (ArtifactsOptimizer.DROP_KEYS.has(key)) {
          // Mas criar download_ref se for conteúdo de arquivo
          if (!clean.download_ref) {
            const ref = this.normalizeDownloadRef(artifact);
            if (ref) clean.download_ref = ref;
          }
          continue;
        }

        // Skip: chaves não permitidas
        if (!ArtifactsOptimizer.ALLOW_KEYS.has(key)) continue;

        // Skip: valores que parecem base64
        if (typeof value === 'string' && this.looksLikeBase64(value)) continue;

        // Truncar strings longas
        if (typeof value === 'string') {
          clean[key] = this.truncate(value);
        } else if (typeof value === 'object' && value !== null) {
          // Objetos pequenos: manter (ex: row_added)
          const jsonSize = JSON.stringify(value).length;
          if (jsonSize < 500) {
            clean[key] = value;
          } else {
            clean[key] = { _truncated: true, _size: jsonSize };
          }
        } else {
          clean[key] = value;
        }
      }

      // Só adicionar se sobrou algo útil
      if (Object.keys(clean).length > 0) {
        manifest[subtaskId] = clean;
      }
    }

    return manifest;
  }

  /**
   * Formata manifest para incluir no prompt (texto compacto)
   */
  formatForPrompt(manifest) {
    if (!manifest || Object.keys(manifest).length === 0) {
      return 'No artifacts available yet.';
    }

    const lines = ['ARTIFACTS FROM PREVIOUS SUBTASKS:'];

    for (const [subtaskId, data] of Object.entries(manifest)) {
      lines.push(`\n${subtaskId}:`);
      
      // Agrupar por tipo
      const drive = {};
      const gmail = {};
      const generic = {};

      for (const [key, value] of Object.entries(data)) {
        if (key.includes('file') || key.includes('row') || key === 'web_view_link') {
          drive[key] = value;
        } else if (key.includes('message') || key.includes('thread') || key === 'recipient' || key === 'subject') {
          gmail[key] = value;
        } else {
          generic[key] = value;
        }
      }

      // Drive
      if (Object.keys(drive).length > 0) {
        if (drive.file_id) lines.push(`  file_id: ${drive.file_id}`);
        if (drive.new_file_id) lines.push(`  new_file_id: ${drive.new_file_id}`);
        if (drive.file_name) lines.push(`  file_name: ${drive.file_name}`);
        if (drive.web_view_link) lines.push(`  link: ${drive.web_view_link}`);
        if (drive.final_row_count) lines.push(`  rows: ${drive.final_row_count}`);
      }

      // Gmail
      if (Object.keys(gmail).length > 0) {
        if (gmail.message_id) lines.push(`  message_id: ${gmail.message_id}`);
        if (gmail.recipient) lines.push(`  to: ${gmail.recipient}`);
        if (gmail.subject) lines.push(`  subject: ${gmail.subject}`);
        if (gmail.status) lines.push(`  status: ${gmail.status}`);
      }

      // Generic
      if (Object.keys(generic).length > 0) {
        for (const [key, value] of Object.entries(generic)) {
          if (key === 'download_ref') {
            lines.push(`  download_ref: ${value.type} (${value.note || 'available'})`);
          } else {
            const val = typeof value === 'object' ? JSON.stringify(value) : value;
            lines.push(`  ${key}: ${val}`);
          }
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Log de economia de tokens
   */
  logOptimization(original, optimized) {
    const originalSize = JSON.stringify(original).length;
    const optimizedSize = JSON.stringify(optimized).length;
    const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    this.logger.success('✅ Artifacts otimizados');
    this.logger.field('  Original', `${originalSize} chars (~${Math.ceil(originalSize / 4)} tokens)`);
    this.logger.field('  Otimizado', `${optimizedSize} chars (~${Math.ceil(optimizedSize / 4)} tokens)`);
    this.logger.field('  Redução', `${reduction}%`);
  }
}
