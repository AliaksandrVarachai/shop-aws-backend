import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { getEnvVariable } from '../lib/layers/shared/nodejs/get-env-variable';

export class ImportServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const bucketCorsRule: s3.CorsRule = {
            allowedMethods: [s3.HttpMethods.GET], // TODO:others methods to upload?
            allowedOrigins: ['*'], // https://my-frontent.com
        };

        const bucket = new s3.Bucket(this, getEnvVariable('S3_NAME'), {
            versioned: false,
            // blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            cors: [bucketCorsRule],
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const api = new apigateway.RestApi(this, 'UploadProductsApi', {
            restApiName: 'Upload Products Service API',
            description: 'Upload Products Service REST API',
        });

        const sharedLayer = new lambda.LayerVersion(this, 'shared-layer', {
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            code: lambda.Code.fromAsset('lib/layers/shared'),
            description: 'Shared code between services',
        });

        const importProductsFileLambda = new lambda.Function(this, 'import-products-file', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            handler: 'import-products-file.main',
            code: lambda.Code.fromAsset('lib/handlers/'),
            layers: [sharedLayer],
            environment: {
                S3_NAME: bucket.bucketName,
            }
        });

        const importFileParserLambda = new lambda.Function(this, 'import-file-parser', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            handler: 'import-file-parser.main',
            code: lambda.Code.fromAsset('lib/handlers/'),
            layers: [sharedLayer],
            environment: {
                S3_NAME: getEnvVariable('S3_NAME'),
                S3_REGION: getEnvVariable('S3_REGION'),
                S3_UPLOADED_PATH: getEnvVariable('S3_UPLOADED_PATH'),
                S3_PARSED_PATH: getEnvVariable('S3_PARSED_PATH'),
            }
        })

        const importProductsFileIntegration = new apigateway.LambdaIntegration(importProductsFileLambda, {
            proxy: true,
        });

        const getImportProductsFileResource = api.root.addResource('uploaded');

        getImportProductsFileResource.addMethod('GET', importProductsFileIntegration);

        bucket.grantReadWrite(importProductsFileLambda);

        const importFileParserDestination = new LambdaDestination(importFileParserLambda);

        // bucket.addEventNotification(s3.EventType.OBJECT_CREATED, importFileParserDestination);

        bucket.addObjectCreatedNotification(importFileParserDestination);

        // bucket.grantRead(importFileParserLambda);
    }
}