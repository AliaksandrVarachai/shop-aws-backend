export const getEnvVariable = (varName: string): string => {
    const value = process.env[varName];
    if (!value) {
        throw Error(`Environment variable ${varName} is not defined`);
    }
    return value;
};
