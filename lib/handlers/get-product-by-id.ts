import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    DynamoDBClient,
    GetItemCommand,
    GetItemCommandInput,
    GetItemCommandOutput,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { tableNames } from '/opt/nodejs/constants';
import { getErrorAPIGatewayResult, getSuccessAPIGatewayResult } from '/opt/nodejs/response-utils';

const shopDBClient = new DynamoDBClient();

export async function main(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const productId = event.pathParameters?.productId;
        if (!productId) {
            return getErrorAPIGatewayResult('ProductID parameter is required', 400)
        }

        const getItemProductInput: GetItemCommandInput = {
            TableName: tableNames.products,
            Key: marshall({ product_id: productId }),
            ProjectionExpression: 'product_id, title, description, price',
        };
        const getItemStockInput: GetItemCommandInput = {
            TableName: tableNames.stock,
            Key: marshall({ stock_product_id: productId }),
            ProjectionExpression: 'stock_product_id, #count',
            ExpressionAttributeNames: {
                '#count': 'count',
            },
        };
        const getItemProductCommand = new GetItemCommand(getItemProductInput);
        const getItemStockCommand = new GetItemCommand(getItemStockInput);
        const [getItemProductResponse, getItemStockResponse] = await Promise.all([
            shopDBClient.send<GetItemCommandInput, GetItemCommandOutput>(getItemProductCommand),
            shopDBClient.send<GetItemCommandInput, GetItemCommandOutput>(getItemStockCommand),
        ]);
        if (!getItemProductResponse.Item || !getItemStockResponse.Item) {
            return getErrorAPIGatewayResult(
                `Product with ID=${productId} is absent in tables "${tableNames.products}" or "${tableNames.stock}"`,
                404
            );
        }
        const { product_id, ...restProductAttrs } = {
            ...unmarshall(getItemProductResponse.Item),
            ...unmarshall({ count: getItemStockResponse.Item.count }),
        };
        const responseProductItem = {
            ...restProductAttrs,
            id: product_id,
        };

        return getSuccessAPIGatewayResult(responseProductItem, 200);
    } catch (error) {
        const tagErrorMessage = 'Error while fetching product by ID from DynamoDB';
        console.error(tagErrorMessage, error);

        return getErrorAPIGatewayResult(tagErrorMessage, 500);
    }
}
