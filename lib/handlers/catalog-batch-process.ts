import type { SQSEvent } from 'aws-lambda';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import * as sns from '@aws-sdk/client-sns';
import { ProductWithStock } from '../types/index';
import { tableNames } from '/opt/nodejs/constants';
import { PublishCommand } from '@aws-sdk/client-sns';
import { getEnvVariable } from '/opt/nodejs/get-env-variable';
import { log } from '/opt/nodejs/log-utils';

const shopDBClient = new dynamodb.DynamoDBClient();
const snsClient = new sns.SNSClient();

const isFulfilledPromise = <T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> =>
    result.status === 'fulfilled';

// polls data from SQS and saves it to DB + SNS
export async function main(event: SQSEvent): Promise<void> {
    log(`called with event: ${JSON.stringify(event)}`);
    try {
        const products: ProductWithStock[] = event.Records.map(record => JSON.parse(record.body));
        const allSettledResults = await Promise.allSettled(products.map(async (product) => {
            const now = Date.now();
            const { product_id, title, description, price, count } = product;
            const transactWriteItemsCommandInput: dynamodb.TransactWriteItemsCommandInput = {
                TransactItems: [
                    {
                        Put: {
                            TableName: tableNames.products,
                            Item: marshall({
                                product_id,
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
                                stock_product_id: product_id,
                                count,
                                createdAt: now,
                                updatedAt: now,
                            })
                        }
                    },
                ]
            };
            const transactWriteCommand = new dynamodb.TransactWriteItemsCommand(transactWriteItemsCommandInput);
            await shopDBClient.send(transactWriteCommand);
            log(`Product id=${product_id} title=${title} is added to DB successfully`);
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
                await snsClient.send(publishCommand);
                log(`Notified about successful creation of product "${product.title}"`);
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
                await snsClient.send(publishCommand);
                log(`Notified that creation of product "${product.title}" failed`);
            }
        }
    } catch (error) {
        console.error('Error with processing of batch products', error);
    }
}
