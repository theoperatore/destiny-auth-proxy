test('can log at least info from the logger', () => {
  const logger = require('./logger');
  expect(logger.info).toBeDefined();
});

test('can enable console logging', () => {
  const logger = require('./logger');
  logger.enableConsoleLogging();
  expect(logger.isConsoleLoggingEnabled()).toBe(true);
});

test('can enable production logging', () => {
  const logger = require('./logger');
  logger.enableProductionLogging();
  expect(logger.isProductionLoggingEnabled()).toBe(true);
});
