/**
 * Sistema de logging estruturado
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

export class Logger {
  constructor(traceId) {
    this.traceId = traceId;
  }

  separator(title = '') {
    console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    if (title) {
      console.log(`${colors.cyan}${colors.bright}${title}${colors.reset}`);
      console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    }
  }

  field(label, value, indent = 0) {
    const indentation = ' '.repeat(indent);
    console.log(`${indentation}${colors.bright}${label}:${colors.reset} ${value}`);
  }

  list(items, indent = 0) {
    const indentation = ' '.repeat(indent);
    items.forEach(item => {
      console.log(`${indentation}${colors.gray}• ${item}${colors.reset}`);
    });
  }

  json(obj, indent = 0) {
    const indentation = ' '.repeat(indent);
    const jsonStr = JSON.stringify(obj, null, 2);
    jsonStr.split('\n').forEach(line => {
      console.log(`${indentation}${colors.gray}${line}${colors.reset}`);
    });
  }

  success(message) {
    console.log(`${colors.green}${colors.bright}✅ ${message}${colors.reset}`);
  }

  error(message) {
    console.log(`${colors.red}${colors.bright}❌ ${message}${colors.reset}`);
  }

  warning(message) {
    console.log(`${colors.yellow}${colors.bright}⚠️  ${message}${colors.reset}`);
  }

  info(message) {
    console.log(`${colors.blue}${colors.bright}ℹ️  ${message}${colors.reset}`);
  }

  checkpoint(subtaskId, message) {
    console.log(`${colors.magenta}${colors.bright}📍 [Checkpoint ${subtaskId}] ${message}${colors.reset}`);
  }

  tool(toolName, iteration) {
    console.log(`\n${colors.magenta}${colors.bright}[Iteração ${iteration}] 🔧 Ferramenta:${colors.reset} ${toolName}`);
  }

  phase(phaseName) {
    this.separator(`🔧 ${phaseName}`);
  }

  userMessage(message) {
    console.log(`\n${colors.bright}User:${colors.reset} "${message}"`);
  }

  subtask(index, total, title) {
    console.log(`\n${colors.blue}${colors.bright}[Subtarefa ${index}/${total}]${colors.reset} ${title}`);
  }

  risk(riskType) {
    console.log(`${colors.red}${colors.bright}⚠️  RISCO DETECTADO: ${riskType}${colors.reset}`);
  }

  confirmation(message) {
    console.log(`${colors.yellow}${colors.bright}🔔 CONFIRMAÇÃO NECESSÁRIA:${colors.reset} ${message}`);
  }

  trace(message) {
    console.log(`${colors.gray}[${this.traceId}] ${message}${colors.reset}`);
  }
}
