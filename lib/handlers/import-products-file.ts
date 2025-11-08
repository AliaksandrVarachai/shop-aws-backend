import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'node:path';
import { log } from '/opt/nodejs/log-utils';
import { getErrorAPIGatewayResult } from '/opt/nodejs/response-utils';
import { getEnvVariable } from '/opt/nodejs/get-env-variable';

const s3Client = new S3Client();

// returns a signed URL from the bucket
export async function main(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    log(`Called with pathParameters.filename = "${event.queryStringParameters?.filename}"`);
    try {
        const { filename } = event.queryStringParameters ?? {};
        if (!filename) {
            return getErrorAPIGatewayResult('Filename parameter is required', 400);
        }
        const { ext, name } = path.parse(filename);
        const uniqueFilename = `${name}-${Date.now()}${ext}`;

        const putObjectCommand = new PutObjectCommand({
            Bucket: getEnvVariable('S3_NAME'),
            Key: path.join(getEnvVariable('S3_UPLOADED_PATH'), uniqueFilename),
            ContentType: 'text/csv',
        });

        const signedUrl = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 300 });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': getEnvVariable('FRONTEND_URL'),
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Authorization'
            },
            body: signedUrl,
        };
    } catch (error) {
        const tagErrorMessage = 'Server error during getting pre-signed URL from S3';
        console.error(tagErrorMessage, error)
        return getErrorAPIGatewayResult(tagErrorMessage, 500);
    }
}
