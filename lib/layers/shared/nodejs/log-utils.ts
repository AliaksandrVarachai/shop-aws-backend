export const logLevels = {
    error: 'error',
    warn: 'warn',
    info: 'info',
};

type LogLevels = keyof typeof logLevels;

export const log = (message: string, logLevel: LogLevels = logLevels.info): void => {
    switch (logLevel) {
        case logLevels.error:
            console.log(message);
            break;
        case logLevels.warn:
            console.warn(message);
            break;
        default:
            console.log(message);
    }
};
