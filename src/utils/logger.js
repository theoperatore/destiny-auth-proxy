const split = require('split');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
  exitOnError: false,
});

if (process.env.NODE_ENV === 'production') {
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
}

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      level: 'debug',
      handleExceptions: true,
    }),
  );
}

module.exports = logger;

module.exports.enableConsoleLogging = () => {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      level: 'debug',
      handleExceptions: true,
    }),
  );
};

module.exports.stream = split().on('data', msg => logger.info(msg));
