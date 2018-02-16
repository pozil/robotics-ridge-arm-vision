module.exports = class Log {
  static info(message) {
    log('INFO', message, null);
  }

  static error(message, cause) {
    log('ERROR', message, cause);
  }
}

function log(level, message, otherData) {
  if (otherData === null) {
    console.log(new Date().toISOString(), level, message);
  } else {
    console.log(new Date().toISOString(), level, message, otherData);
  }
}
