import * as lambda from 'aws-lambda';
import { S3 } from '@aws-sdk/client-s3';
import * as sqs from '@aws-sdk/client-sqs';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { csvParser } from '/opt/nodejs/import-utils';
import { log, logLevels } from '/opt/nodejs/log-utils';
import { getEnvVariable } from '/opt/nodejs/get-env-variable';

const s3 = new S3();
const sqsClient = new sqs.SQSClient();
const [s3UploadedPath, s3ParsedPath, catalogItemsQueueUrl] =
    ['S3_UPLOADED_PATH', 'S3_PARSED_PATH', 'CATALOG_ITEMS_QUEUE_URL'].map(getEnvVariable);

// Polls data from S3, parses products by CSV lines then sends parsed products to SQS
export async function main(event: lambda.S3Event): Promise<void> {
    log(`Called with event = ${JSON.stringify(event, null, 2)}`);

    const errorHandler = (message: string, error: Error) => {
        log(message, logLevels.error);
        console.error(message, error);
    };

    for (const record of event.Records) {
        const s3BucketName = record.s3.bucket.name;
        const s3ObjectKey = record.s3.object.key;
        const params = {
            Bucket: s3BucketName,
            Key: s3ObjectKey,
        };
        const s3Stream = (await s3.getObject(params)).Body as Readable;
        if (!s3Stream) {
            log(`Stream for ${s3BucketName}/${s3ObjectKey} is undefined`, logLevels.error);
            return;
        }
        s3Stream
            .pipe(csvParser())
            .on('error', (error) => {
                errorHandler(`Error during parsing ${s3ObjectKey}`, error);
            })
            .on('data', async (productWithStock) => {
                log(`Parsed data ${JSON.stringify(productWithStock, null, 2)}`);
                const productUUID = randomUUID();
                const sendMessageInput: sqs.SendMessageCommandInput = {
                    QueueUrl: catalogItemsQueueUrl,
                    MessageBody: JSON.stringify({
                        ...productWithStock,
                        product_id: productUUID,
                    }),
                    MessageGroupId: 'ImportFileParserMessageGroupId',
                    MessageDeduplicationId: productUUID,
                };
                // TODO: replace with SendMessageBatchCommand (up to 10 messages)
                const sendMessageCommand = new sqs.SendMessageCommand(sendMessageInput);
                await sqsClient.send(sendMessageCommand);
                log(`Sent to SQS message: ${JSON.stringify(sendMessageInput, null, 2)}`);
            })
            .on('error', (error) => {
                errorHandler(`Error during sending data to SQS ${catalogItemsQueueUrl}`, error);
            })
            .on('end', async () => {
                log(`${s3ObjectKey} is parsed successfully`);
                await s3.copyObject({
                    Bucket: s3BucketName,
                    CopySource: `${s3BucketName}/${s3ObjectKey}`,
                    Key: s3ObjectKey.replace(s3UploadedPath, s3ParsedPath),
                });
                log(`${s3ObjectKey} is successfully copied to ${s3ParsedPath}`);
                await s3.deleteObject({
                    Bucket: s3BucketName,
                    Key: s3ObjectKey,
                });
                log(`${s3ObjectKey} is successfully deleted from ${s3UploadedPath}`);
            })
            .on('error', (error) => {
                errorHandler(`Error during copying/deleting of ${s3ObjectKey}`, error);
            });
    }
}
