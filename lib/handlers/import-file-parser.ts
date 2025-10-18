import * as lambda from 'aws-lambda';
import { S3 } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { default as csvParser } from 'csv-parser';
import { log, logLevels } from '/opt/nodejs/log-utils';
import { getEnvVariable } from '/opt/nodejs/get-env-variable';

const s3 = new S3();
const [s3Name, s3UploadedPath, s3ParsedPath] = ['S3_NAME', 'S3_UPLOADED_PATH', 'S3_PARSED_PATH'].map(getEnvVariable);

export async function main(event: lambda.S3Event): Promise<void> {
    log(`Called with event = ${JSON.stringify(event, null, 2)}`);

    const errorHandler = (message: string, error: Error) => {
        log(message, logLevels.error);
        console.error(message, error);
    };

    for (const record of event.Records) {
        const s3ObjectKey = record.s3.object.key;
        const params = {
            Bucket: s3Name,
            Key: s3ObjectKey,
        };
        const s3Stream = (await s3.getObject(params)).Body as Readable;
        if (!s3Stream) {
            log(`Stream for ${s3Name}/${s3ObjectKey} is undefined`, logLevels.error);
            return;
        }
        s3Stream
            .pipe(csvParser())
            .on('error', (error) => {
                errorHandler(`Error during parsing ${s3ObjectKey}`, error);
            })
            .on('data', (data) => {
                const parsedData = Object.entries(data).map(([key, value]) => `${key}:${value}`).join(';');
                log(`Parsed ${parsedData}`);
            })
            .on('end', async () => {
                log(`${s3ObjectKey} is parsed successfully`);
                await s3.copyObject({
                    Bucket: s3Name,
                    CopySource: `${s3Name}/${s3ObjectKey}`,
                    Key: s3ObjectKey.replace(s3UploadedPath, s3ParsedPath),
                });
                log(`${s3ObjectKey} is successfully copied to ${s3ParsedPath}`);
                await s3.deleteObject({
                    Bucket: s3Name,
                    Key: s3ObjectKey,
                });
                log(`${s3ObjectKey} is successfully deleted from ${s3ParsedPath}`);
            })
            .on('error', (error) => {
                errorHandler(`Error during copying/deleting of ${s3ObjectKey}`, error);
            });

    }
}
