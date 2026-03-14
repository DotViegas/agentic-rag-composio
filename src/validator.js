/**
 * Validação determinística de schemas
 * Melhoria #1: Validar argumentos antes de executar ferramentas
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export class SchemaValidator {
  constructor(logger) {
    this.logger = logger;
    this.ajv = new Ajv({ 
      allErrors: true, 
      strict: false,
      coerceTypes: true // Tenta converter tipos automaticamente
    });
    addFormats(this.ajv);
    this.compiledSchemas = new Map(); // Cache de schemas compilados
  }

  /**
   * Compila e cacheia schema de uma ferramenta
   */
  compileSchema(toolSlug, schema) {
    if (this.compiledSchemas.has(toolSlug)) {
      return this.compiledSchemas.get(toolSlug);
    }

    try {
      const validate = this.ajv.compile(schema);
      this.compiledSchemas.set(toolSlug, validate);
      return validate;
    } catch (error) {
      this.logger.error(`Falha ao compilar schema para ${toolSlug}: ${error.message}`);
      throw new Error(`Schema inválido para ${toolSlug}`);
    }
  }

  /**
   * Valida argumentos contra schema da ferramenta
   */
  validateToolArguments(toolSlug, args, schema) {
    const validate = this.compileSchema(toolSlug, schema);
    
    const valid = validate(args);
    
    if (!valid) {
      const errors = this.formatValidationErrors(validate.errors);
      this.logger.error(`Validação falhou para ${toolSlug}`);
      this.logger.list(errors, 2);
      
      return {
        valid: false,
        errors: errors,
        details: validate.errors
      };
    }

    this.logger.success(`Argumentos validados para ${toolSlug}`);
    return {
      valid: true,
      errors: [],
      details: []
    };
  }

  /**
   * Formata erros de validação de forma legível
   */
  formatValidationErrors(errors) {
    return errors.map(err => {
      const path = err.instancePath || 'root';
      const message = err.message;
      
      switch (err.keyword) {
        case 'required':
          return `Campo obrigatório ausente: ${err.params.missingProperty}`;
        case 'type':
          return `${path}: tipo inválido (esperado ${err.params.type}, recebido ${typeof err.data})`;
        case 'enum':
          return `${path}: valor deve ser um de: ${err.params.allowedValues.join(', ')}`;
        case 'format':
          return `${path}: formato inválido (esperado ${err.params.format})`;
        case 'minLength':
          return `${path}: tamanho mínimo ${err.params.limit} caracteres`;
        case 'maxLength':
          return `${path}: tamanho máximo ${err.params.limit} caracteres`;
        case 'minimum':
          return `${path}: valor mínimo ${err.params.limit}`;
        case 'maximum':
          return `${path}: valor máximo ${err.params.limit}`;
        case 'pattern':
          return `${path}: não corresponde ao padrão esperado`;
        default:
          return `${path}: ${message}`;
      }
    });
  }

  /**
   * Tenta corrigir argumentos automaticamente baseado no schema
   */
  autoFixArguments(args, schema) {
    const fixed = JSON.parse(JSON.stringify(args));
    
    // Adicionar campos obrigatórios com valores padrão se ausentes
    if (schema.required && schema.properties) {
      for (const field of schema.required) {
        if (!(field in fixed)) {
          const propSchema = schema.properties[field];
          
          // Tentar inferir valor padrão baseado no tipo
          if (propSchema.default !== undefined) {
            fixed[field] = propSchema.default;
          } else if (propSchema.type === 'string') {
            fixed[field] = '';
          } else if (propSchema.type === 'array') {
            fixed[field] = [];
          } else if (propSchema.type === 'object') {
            fixed[field] = {};
          } else if (propSchema.type === 'boolean') {
            fixed[field] = false;
          } else if (propSchema.type === 'number' || propSchema.type === 'integer') {
            fixed[field] = 0;
          }
        }
      }
    }

    return fixed;
  }

  /**
   * Valida com tentativa de correção automática
   */
  validateWithAutoFix(toolSlug, args, schema) {
    // Primeira tentativa: validar como está
    let result = this.validateToolArguments(toolSlug, args, schema);
    
    if (result.valid) {
      return { valid: true, args: args, fixed: false };
    }

    // Segunda tentativa: tentar corrigir automaticamente
    this.logger.warning('Tentando correção automática de argumentos...');
    const fixedArgs = this.autoFixArguments(args, schema);
    
    result = this.validateToolArguments(toolSlug, fixedArgs, schema);
    
    if (result.valid) {
      this.logger.success('Argumentos corrigidos automaticamente');
      return { valid: true, args: fixedArgs, fixed: true };
    }

    // Falhou mesmo após correção
    return { 
      valid: false, 
      args: args, 
      fixed: false,
      errors: result.errors 
    };
  }
}
