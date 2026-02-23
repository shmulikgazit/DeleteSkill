import chalk from 'chalk';

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor(level = 'INFO') {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  }

  debug(message, ...args) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  info(message, ...args) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  }

  success(message, ...args) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
    }
  }

  warn(message, ...args) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.log(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  error(message, ...args) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error(chalk.red(`[ERROR] ${message}`), ...args);
    }
  }

  setLevel(level) {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
  }
}

export const logger = new Logger();
