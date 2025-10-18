import { APIGatewayProxyResult } from 'aws-lambda';

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
};

export const getSuccessAPIGatewayResult = (body: any, statusCode = 200): APIGatewayProxyResult => {
    return {
        statusCode,
        headers,
        body: JSON.stringify(body),
    }
};

export const getErrorAPIGatewayResult = (errorMessage: string, statusCode = 500): APIGatewayProxyResult => {
    return {
        statusCode,
        headers,
        body: JSON.stringify({
            error: true,
            errorMessage,
        }),
    };
};
