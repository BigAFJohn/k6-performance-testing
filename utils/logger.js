export function logSuccess(message, details = '') {
  console.log(`SUCCESS: ${message} ${details}`);
}

export function logError(message, error = '') {
  console.error(`ERROR: ${message}`, error);
}

export function logInfo(message) {
  console.log(`INFO: ${message}`);
}
