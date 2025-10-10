import { APIGatewayProxyResult } from "aws-lambda";
import { ScanCommandInput, ScanCommandOutput } from '@aws-sdk/lib-dynamodb';
import {
    BatchGetItemCommand,
    BatchGetItemCommandInput,
    BatchGetItemCommandOutput,
    DynamoDBClient,
    KeysAndAttributes,
    ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { tableNames } from '/opt/nodejs/constants';
import { getErrorAPIGatewayResult, getSuccessAPIGatewayResult } from '/opt/nodejs/response-utils';

const shopDBClient = new DynamoDBClient();

export async function main(): Promise<APIGatewayProxyResult> {
    const scanInput: ScanCommandInput = {
        TableName: tableNames.products,
        ProjectionExpression: 'product_id, title, description, price',
        // if response contains LastEvaluatedKey, add input.ExclusiveStartKey = lastEvaluatedKey for pagination
        Limit: 30,
    };

    try {
        const scanCommand = new ScanCommand(scanInput);
        const scanResponse = await shopDBClient.send<ScanCommandInput, ScanCommandOutput>(scanCommand);
        if (!scanResponse.Items) {
            throw Error('No products found in products table');
        }
        const productItems = scanResponse.Items.map(item => unmarshall(item));
        const stockKeys = productItems.map(item => marshall({ stock_product_id: item.product_id }));

        const batchGetItemInput: BatchGetItemCommandInput = {
            RequestItems: {
                [tableNames.stock]: {
                    Keys: stockKeys,
                    ProjectionExpression: 'stock_product_id, #count',
                    ExpressionAttributeNames: {
                        '#count': 'count',
                    },
                }
            } as Record<string, KeysAndAttributes>
        };
        const batchCommand = new BatchGetItemCommand(batchGetItemInput);
        const batchResponse = await shopDBClient.send<BatchGetItemCommandInput, BatchGetItemCommandOutput>(batchCommand);
        const batchResponses = batchResponse.Responses;
        if (!batchResponses || !batchResponses[tableNames.stock]) {
            throw Error('No stock information found in stock table');
        }
        const stockCountMap = batchResponses[tableNames.stock].map(item => unmarshall(item));
        const mapCountById = stockCountMap.reduce((acc, { stock_product_id, count }) => {
            acc[stock_product_id] = count;
            return acc;
        }, {})
        const productsWithCount = productItems.map(productItem => ({
            ...productItem,
            count: mapCountById[productItem.product_id] ?? 0,
        }));

        return getSuccessAPIGatewayResult(productsWithCount, 200);
    } catch (error) {
        const tagErrorMessage = 'Error while fetching products list from DynamoDB';
        console.error(tagErrorMessage, error);

        return getErrorAPIGatewayResult(tagErrorMessage, 500);
    }
}