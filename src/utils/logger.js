const split = require('split');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

let isProductionLoggingEnabled = false;
let isConsoleLoggingEnabled = false;

const logger = winston.createLogger({
  exitOnError: false,
  silent: true,
});

module.exports = logger;

module.exports.enableProductionLogging = () => {
  isProductionLoggingEnabled = true;
  logger.silent = false;
  logger.add(
    new DailyRotateFile({
      filename: 'combined-%DATE%.log',
      dirname: 'logs',
      level: 'info',
      handleExceptions: true,
      zippedArchive: true,
      maxSize: '20m',
    }),
  );
};

module.exports.enableConsoleLogging = () => {
  isConsoleLoggingEnabled = true;
  logger.silent = false;
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      level: 'debug',
      handleExceptions: true,
    }),
  );
};

module.exports.isProductionLoggingEnabled = () => isProductionLoggingEnabled;
module.exports.isConsoleLoggingEnabled = () => isConsoleLoggingEnabled;
module.exports.stream = split().on('data', msg => logger.info(msg));
