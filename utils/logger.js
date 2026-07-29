const COLORS = {
  RESET: '\x1b[0m',
  BRIGHT: '\x1b[1m',
  DIM: '\x1b[2m',
  UNDERSCORE: '\x1b[4m',
  BLINK: '\x1b[5m',
  REVERSE: '\x1b[7m',
  HIDDEN: '\x1b[8m',

  FG_BLACK: '\x1b[30m',
  FG_RED: '\x1b[31m',
  FG_GREEN: '\x1b[32m',
  FG_YELLOW: '\x1b[33m',
  FG_BLUE: '\x1b[34m',
  FG_MAGENTA: '\x1b[35m',
  FG_CYAN: '\x1b[36m',
  FG_WHITE: '\x1b[37m',

  BG_BLACK: '\x1b[40m',
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
  BG_MAGENTA: '\x1b[45m',
  BG_CYAN: '\x1b[46m',
  BG_WHITE: '\x1b[47m'
};

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  SUCCESS: 4,
  LOAD: 5
};

let currentLogLevel = LOG_LEVELS.LOAD;

function setLogLevel(level) {
  if (Object.values(LOG_LEVELS).includes(level)) {
    currentLogLevel = level;
  } else {
    console.error(
      `${COLORS.FG_RED}Invalid log level: ${level}${COLORS.RESET}`
    );
  }
}

function getTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString();
}

function error(message, error = null) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    console.error(
      `${COLORS.FG_RED}${COLORS.BRIGHT}[ERROR]${COLORS.RESET} ` +
      `${COLORS.FG_RED}${message}${COLORS.RESET}`
    );

    if (error && error.stack) {
      console.error(
        `${COLORS.FG_RED}${error.stack}${COLORS.RESET}`
      );
    }
  }
}

function warn(message) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    console.warn(
      `${COLORS.FG_YELLOW}${COLORS.BRIGHT}[WARN]${COLORS.RESET} ` +
      `${COLORS.FG_YELLOW}${message}${COLORS.RESET}`
    );
  }
}

function info(message) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    console.log(
      `${COLORS.FG_BLUE}${COLORS.BRIGHT}[INFO]${COLORS.RESET} ` +
      `${COLORS.FG_WHITE}${message}${COLORS.RESET}`
    );
  }
}

function debug(message) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    console.log(
      `${COLORS.FG_MAGENTA}${COLORS.BRIGHT}[DEBUG]${COLORS.RESET} ` +
      `${COLORS.FG_WHITE}${message}${COLORS.RESET}`
    );
  }
}

function success(message) {
  if (currentLogLevel >= LOG_LEVELS.SUCCESS) {
    console.log(
      `${COLORS.FG_GREEN}${COLORS.BRIGHT}[SUCCESS]${COLORS.RESET} ` +
      `${COLORS.FG_GREEN}${message}${COLORS.RESET}`
    );
  }
}

function load(message, type = '', count = '') {
  if (currentLogLevel >= LOG_LEVELS.LOAD) {
    console.log(
      `${COLORS.FG_CYAN}${COLORS.BRIGHT}[LOADED]${COLORS.RESET} ` +
      `${COLORS.FG_WHITE}${message}${COLORS.RESET}` +
      `${type
        ? ` ${COLORS.FG_YELLOW}${type}${COLORS.RESET}`
        : ''
      }` +
      `${count
        ? ` ${COLORS.FG_GREEN}${count}${COLORS.RESET}`
        : ''
      }`
    );
  }
}

function startupTable(data) {
  if (currentLogLevel < LOG_LEVELS.INFO) {
    return;
  }

  const tableWidth = 60;
  const title = 'Fusion Manager - Startup Summary';

  const entries = Object.entries(data);

  const maxKeyLength = Math.max(
    0,
    ...entries.map(([key]) => String(key).length)
  );

  console.log('');

  // Top border
  console.log(
    `${COLORS.FG_CYAN}${COLORS.BRIGHT}` +
    `╔${'═'.repeat(tableWidth)}╗` +
    `${COLORS.RESET}`
  );

  // Title
  const titleContent = ` ${title}`;

  console.log(
    `${COLORS.FG_CYAN}${COLORS.BRIGHT}║${COLORS.RESET}` +
    `${COLORS.FG_WHITE}${COLORS.BRIGHT}` +
    titleContent +
    `${COLORS.RESET}` +
    ' '.repeat(
      Math.max(0, tableWidth - titleContent.length)
    ) +
    `${COLORS.FG_CYAN}${COLORS.BRIGHT}║${COLORS.RESET}`
  );

  // Separator
  console.log(
    `${COLORS.FG_CYAN}${COLORS.BRIGHT}` +
    `╠${'═'.repeat(tableWidth)}╣` +
    `${COLORS.RESET}`
  );

  // Table rows
  for (const [key, value] of entries) {
    const keyStr = String(key);
    const valueStr = String(value);

    /*
     * Visible row structure:
     *
     * " KEY : VALUE"
     *
     * 1                     -> leading space
     * maxKeyLength          -> key
     * 3                     -> " : "
     * valueStr.length       -> value
     */
    const visibleLength =
      1 +
      maxKeyLength +
      3 +
      valueStr.length;

    const padding = Math.max(
      0,
      tableWidth - visibleLength
    );

    console.log(
      `${COLORS.FG_CYAN}${COLORS.BRIGHT}║${COLORS.RESET}` +
      ` ` +
      `${COLORS.FG_YELLOW}${keyStr.padEnd(maxKeyLength)}${COLORS.RESET}` +
      ` : ` +
      `${COLORS.FG_WHITE}${valueStr}${COLORS.RESET}` +
      ' '.repeat(padding) +
      `${COLORS.FG_CYAN}${COLORS.BRIGHT}║${COLORS.RESET}`
    );
  }

  // Bottom border
  console.log(
    `${COLORS.FG_CYAN}${COLORS.BRIGHT}` +
    `╚${'═'.repeat(tableWidth)}╝` +
    `${COLORS.RESET}`
  );

  console.log('');
}

export {
  COLORS,
  LOG_LEVELS,
  setLogLevel,
  error,
  warn,
  info,
  debug,
  success,
  load,
  startupTable
};