import mockedProductsList from "/opt/products-list.json";
import { APIGatewayProxyResult } from "aws-lambda";

export async function main(): Promise<APIGatewayProxyResult> {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',

        },
        body: JSON.stringify(mockedProductsList),
    };
}