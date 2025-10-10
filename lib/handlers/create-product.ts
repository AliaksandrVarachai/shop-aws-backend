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
    if (!event.body) {
        return getErrorAPIGatewayResult('Request body is empty', 400);
    }
    const { title, description, price, count } = JSON.parse(event.body);
    if (!title || !description || !(Number.isInteger(price) && price >= 0) || !(Number.isInteger(count) && count >= 0)) {
        return getErrorAPIGatewayResult(
            `Incorrect fields for product creation ${event.body}`,
            400
        );
    }
    const productUUID = randomUUID();
    const now = Date.now();

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
                        stock_product_id: productUUID,
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
        await shopDBClient.send(command);
        const responseBody = {
            id: productUUID,
            title,
            description,
            price,
            count,
        };

        return getSuccessAPIGatewayResult(responseBody, 201);
    } catch (error) {
        const tagErrorMessage =
            `Error when creating product. Body=${event.body}`;
        console.error(tagErrorMessage, error);

        return getErrorAPIGatewayResult(tagErrorMessage, 500);
    }
}
