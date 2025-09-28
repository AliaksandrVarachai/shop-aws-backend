import mockedProductsList from '/opt/products-list.json';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export async function main(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const productId = event.pathParameters?.productId;
    if (!productId) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: true,
                errorMessage: `ProductID parameter is required`,
            }),
        };
    }

    const product = mockedProductsList.find(({ id }) => id === productId);
    if (!product) {
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: true,
                errorMessage: `Product with ID '${productId}' not found`,
            }),
        };
    }

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            data: product,
        }),
    };
}
