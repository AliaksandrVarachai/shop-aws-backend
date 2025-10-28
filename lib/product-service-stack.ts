import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import { tableNames } from '../lib/layers/shared/nodejs/constants';
import { getEnvVariable } from '../lib/layers/shared/nodejs/get-env-variable';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export class ProductsServiceStack extends cdk.Stack {
    public readonly catalogItemsQueue: sqs.Queue;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const api = new apigateway.RestApi(this, 'ProductsServiceApi', {
            restApiName: 'Products Service API',
            description: 'Products Service REST API',
            defaultCorsPreflightOptions: {
                allowOrigins: ['*'],
                allowHeaders: ['*'],
                allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            }
        });

        const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            code: lambda.Code.fromAsset('lib/layers/shared'),
            description: 'Shared code between services',
        });

        const getProductsListLambda = new lambda.Function(this, 'GetProductsListLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            handler: 'get-products-list.main',
            code: lambda.Code.fromAsset('lib/handlers/'),
            layers: [sharedLayer],
        });

        const getProductByIdLambda = new lambda.Function(this, 'GetProductByIdLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            handler: 'get-product-by-id.main',
            code: lambda.Code.fromAsset(path.join('lib/handlers/')),
            layers: [sharedLayer],
        });

        const createProductLambda = new lambda.Function(this, 'CreateProductLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            handler: 'create-product.main',
            code: lambda.Code.fromAsset(path.join('lib/handlers/')),
            layers: [sharedLayer],
        });

        const catalogBatchProcessLambda = new lambda.Function(this, 'CatalogBatchProcessLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            handler: 'catalog-batch-process.main',
            code: lambda.Code.fromAsset(path.join('lib/handlers/')),
            layers: [sharedLayer],
        });

        const getProductsListIntegration = new apigateway.LambdaIntegration(getProductsListLambda, {
            proxy: true,
        });

        const getProductByIdIntegration = new apigateway.LambdaIntegration(getProductByIdLambda, {
            proxy: true,
        });

        const createProductIntegration = new apigateway.LambdaIntegration(createProductLambda, {
            proxy: true,
        });

        const getProductsListResource = api.root.addResource('products');
        const getProductByIdResource = getProductsListResource.addResource('{productId}');
        const createProductResource = getProductsListResource.addResource('create');


        getProductsListResource.addMethod('GET', getProductsListIntegration);

        getProductByIdResource.addMethod('GET', getProductByIdIntegration);

        createProductResource.addMethod('POST', createProductIntegration);

        const productsTable = new dynamodb.Table(this, tableNames.products, {
            tableName: tableNames.products,
            partitionKey: {
                name: 'product_id',
                type: dynamodb.AttributeType.STRING
            },
        });

        const stockTable = new dynamodb.Table(this, tableNames.stock, {
            tableName: tableNames.stock,
            partitionKey: {
                name: 'stock_product_id',
                type: dynamodb.AttributeType.STRING
            },
        });

        productsTable.grantReadData(getProductsListLambda);
        productsTable.grantReadData(getProductByIdLambda);
        productsTable.grantWriteData(createProductLambda);
        productsTable.grantWriteData(catalogBatchProcessLambda);

        stockTable.grantReadData(getProductsListLambda);
        stockTable.grantReadData(getProductByIdLambda)
        stockTable.grantWriteData(createProductLambda);
        stockTable.grantWriteData(catalogBatchProcessLambda);

        this.catalogItemsQueue = new sqs.Queue(this, getEnvVariable('SQS_NAME'), {});
        const catalogBatchProcessEventSource = new SqsEventSource(this.catalogItemsQueue, {
            batchSize: 5,
        });
        catalogBatchProcessLambda.addEventSource(catalogBatchProcessEventSource);

        const createProductTopic = new sns.Topic(this, getEnvVariable('SNS_NAME'), {});
        const emailSubscription = new snsSubscriptions.EmailSubscription(getEnvVariable('EMAIL_SUBSCRIPTION'));
        createProductTopic.addSubscription(emailSubscription);
        catalogBatchProcessLambda.addEnvironment('CREATE_PRODUCT_TOPIC_ARN', createProductTopic.topicArn);
        createProductTopic.grantPublish(catalogBatchProcessLambda);
    }
}
