import * as lambda from 'aws-lambda';
import { getEnvVariable } from '/opt/nodejs/get-env-variable';

const generatePolicy = (principalId: string, resource: string, effect: lambda.StatementEffect = 'Deny'): lambda.APIGatewayAuthorizerResult => ({
    principalId,
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource
            }
        ]
    }
});

export const main = async (event: lambda.APIGatewayTokenAuthorizerEvent): Promise<lambda.APIGatewayAuthorizerResult> => {
    console.log('Called with event', event);
    const { type, methodArn, authorizationToken } = event;
    if (type !== 'TOKEN') {
        throw Error(`Unexpected token type: ${type}`);
    }
    const encodedCredentials = authorizationToken.split(' ')[1];
    const [userName, password] =  atob(encodedCredentials).split(':');
    if (!userName || !password) {
        console.log(`User name and password are required. Token must be in format "username:password"`);
        return generatePolicy(userName, methodArn, 'Deny');
    }
    if (userName === getEnvVariable('USER_NAME') && password === getEnvVariable('USER_PASSWORD')) {
        console.log(`User ${userName} is authorized successfully`);
        return generatePolicy(userName, methodArn, 'Allow');
    } else {
        console.log(`User ${userName} fails authorization`);
        return generatePolicy(userName, methodArn, 'Deny');
    }
};
