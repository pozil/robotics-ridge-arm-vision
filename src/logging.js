module.exports = class Log {
  static info(message) {
    log('INFO', message);
  }

  static error(message, cause=null) {
    log('ERROR', message, cause);
  }
}

function log(level, message, otherData=null) {
  if (otherData === null) {
    console.log(new Date().toISOString(), level, message);
  } else {
    console.log(new Date().toISOString(), level, message, otherData);
  }
}
