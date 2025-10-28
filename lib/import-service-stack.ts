import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { getEnvVariable } from '../lib/layers/shared/nodejs/get-env-variable';

export class ImportServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: ImportServiceStackProps) {
        super(scope, id, props);

        if (!props || !props.catalogItemsQueue) {
            throw Error('catalogItemQueue is not defined');
        }

        const bucketCorsRule: s3.CorsRule = {
            allowedMethods: [
                s3.HttpMethods.GET,
                s3.HttpMethods.PUT,
            ],
            allowedOrigins: ['*'], // https://my-frontent.com
            allowedHeaders: ["*"],
        };

        const bucket = new s3.Bucket(this, getEnvVariable('S3_NAME'), {
            versioned: false,
            cors: [bucketCorsRule],
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const api = new apigateway.RestApi(this, 'UploadProductsApi', {
            restApiName: 'Upload Products Service API',
            description: 'Upload Products Service REST API',
        });

        const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            code: lambda.Code.fromAsset('lib/layers/shared'),
            description: 'Shared code between services',
        });

        const importUtilsLayer = new lambda.LayerVersion(this, 'ImportUtilsLayer', {
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            code: lambda.Code.fromAsset('lib/layers/import-utils'),
            description: 'Utils for import products',
        });

        const importProductsFileLambda = new lambda.Function(this, 'ImportProductsFile', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            handler: 'import-products-file.main',
            code: lambda.Code.fromAsset('lib/handlers/'),
            layers: [sharedLayer],
            environment: {
                S3_NAME: bucket.bucketName,
                S3_UPLOADED_PATH: getEnvVariable('S3_UPLOADED_PATH'),
            }
        });

        const importFileParserLambda = new lambda.Function(this, 'ImportFileParser', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            handler: 'import-file-parser.main',
            code: lambda.Code.fromAsset('lib/handlers/'),
            layers: [sharedLayer, importUtilsLayer],
            environment: {
                S3_NAME: getEnvVariable('S3_NAME'),
                S3_UPLOADED_PATH: getEnvVariable('S3_UPLOADED_PATH'),
                S3_PARSED_PATH: getEnvVariable('S3_PARSED_PATH'),
                CATALOG_ITEMS_QUEUE_URL: props.catalogItemsQueue.queueUrl,
            }
        });

        const importProductsFileIntegration = new apigateway.LambdaIntegration(importProductsFileLambda, {
            proxy: true,
        });

        const getImportProductsFileResource = api.root.addResource('import');

        getImportProductsFileResource.addMethod('GET', importProductsFileIntegration);

        bucket.grantWrite(importProductsFileLambda);

        const importFileParserDestination = new LambdaDestination(importFileParserLambda);

        bucket.addObjectCreatedNotification(importFileParserDestination);

        bucket.grantRead(importFileParserLambda);
        bucket.grantPut(importFileParserLambda);
        bucket.grantDelete(importFileParserLambda);
    }
}

interface ImportServiceStackProps extends cdk.StackProps {
    catalogItemsQueue: Queue;
}
