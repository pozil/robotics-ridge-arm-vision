const winston = require('winston');
const { format, transports, loggers } = winston;

const myTemplate = format.printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}]\t${level}: ${message}`;
});

/**
 * Returns the logger with the given label. If it doesn't exist, a new one is created.
 * @param {string} loggerName
 */
function getLogger(loggerName) {
    if (!loggers.has(loggerName)) {
        const myFormat = format.combine(
            format.label({ label: loggerName }),
            format.timestamp(),
            myTemplate
        );
        const options = {
            level: 'info',
            format: myFormat,
            transports: [
                new transports.File({ filename: 'log.log' }),
                new transports.Console({
                    format: format.combine(format.colorize(), myFormat)
                })
            ]
        };
        loggers.add(loggerName, options);
    }
    return loggers.get(loggerName);
}

export default getLogger;
