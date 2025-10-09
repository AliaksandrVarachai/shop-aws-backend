import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { DynamoDBClient, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { getErrorAPIGatewayResult, getSuccessAPIGatewayResult } from '/opt/nodejs/response-utils';
import { tableNames } from '/opt/nodejs/constants';

const shopDBClient = new DynamoDBClient();

type CreateProductEvent = APIGatewayProxyEvent & {
    title: string;
    description: string;
    price: number;
    count: number;
};

export async function main(event: CreateProductEvent): Promise<APIGatewayProxyResult> {
    const productUUID = randomUUID();
    const now = Date.now();
    const { title, description, price, count } = event;

    const transactions = {
        TransactItems: [
            {
                Put: {
                    TableName: tableNames.products,
                    Item: marshall({
                        product_id: productUUID,
                        title,
                        description,
                        price,
                        createdAt: now,
                        updatedAt: now,
                    })
                },
            },
            {
                Put: {
                    TableName: tableNames.stock,
                    Item: marshall({
                        product_id: productUUID,
                        count,
                        createdAt: now,
                        updatedAt: now,
                    })
                }
            },
        ],
    };

    try {
        // Stupid TS restriction: throws an error when 2 different "Put" are used in transaction => cast to any
        const command = new TransactWriteItemsCommand(transactions as any);
        const responseData = await shopDBClient.send(command);

        return getSuccessAPIGatewayResult(responseData, 200);
    } catch (error) {
        const tagErrorMessage =
            `Error when creating product { title: ${title}, description: ${description}, price: ${price}, count: ${count} }`;
        console.error(tagErrorMessage, error);

        return getErrorAPIGatewayResult(tagErrorMessage, 500);
    }
}
