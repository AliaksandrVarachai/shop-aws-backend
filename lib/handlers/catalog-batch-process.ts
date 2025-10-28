import type { SQSEvent } from 'aws-lambda';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import * as sns from '@aws-sdk/client-sns';
import { randomUUID } from 'node:crypto';
import { ProductWithStock } from '../types/index';
import { tableNames } from '/opt/nodejs/constants';
import { PublishCommand } from '@aws-sdk/client-sns';
import { getEnvVariable } from '/opt/nodejs/get-env-variable';

const shopDBClient = new dynamodb.DynamoDBClient();
const snsClient = new sns.SNSClient();

const isFulfilledPromise = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> =>
    result.status === 'fulfilled';

// polls data from SQS and saves it to DB + SNS
export async function main(event: SQSEvent): Promise<void> {
    try {
        const products: ProductWithStock[] = event.Records.map(record => JSON.parse(record.body));
        const allSettledResults = await Promise.allSettled(products.map(product => {
            const productUUID = randomUUID();
            const now = Date.now();
            const { title, description, price, count } = product;
            const transactWriteItemsCommandInput: dynamodb.TransactWriteItemsCommandInput = {
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
                ]
            };
            const transactWriteCommand = new dynamodb.TransactWriteItemsCommand(transactWriteItemsCommandInput);
            return shopDBClient.send(transactWriteCommand);
        }));

        for (let i = 0; i < products.length; ++i) {
            const product = products[i];
            const allSettledResult = allSettledResults[i];
            if (isFulfilledPromise(allSettledResult)) {
                const publishCommand = new PublishCommand({
                    Subject: 'Product is created',
                    Message: `Product "${product.title}" is added to DB successfully`,
                    TopicArn: getEnvVariable('CREATE_PRODUCT_TOPIC_ARN'),
                    MessageAttributes: {
                        category: {
                            DataType: 'String',
                            StringValue: 'info',
                        }
                    }
                });
                snsClient.send(publishCommand);
            } else {
                const { reason } = allSettledResult;
                const publishCommand = new PublishCommand({
                    Subject: 'Product creation failed',
                    Message: `Product failed to be added to DB:\n${JSON.stringify(product, null, 4)}\nReason: ${reason}`,
                    TopicArn: getEnvVariable('CREATE_PRODUCT_TOPIC_ARN'),
                    MessageAttributes: {
                        category: {
                            DataType: 'String',
                            StringValue: 'warn',
                        }
                    },
                });
                snsClient.send(publishCommand);
            }
        }
    } catch (error) {
        console.error('Error with processing of batch products', error);
    }
}
