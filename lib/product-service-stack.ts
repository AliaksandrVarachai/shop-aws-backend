import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';
import { tableNames } from '../lib/layers/shared/nodejs/constants';

export class ProductsServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const api = new apigateway.RestApi(this, 'ProductsServiceApi', {
            restApiName: 'Products Service API',
            description: 'Products Service REST API',
        });

        const sharedConstantsLayer = new lambda.LayerVersion(this, 'shared-layer', {
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            code: lambda.Code.fromAsset('lib/layers/shared'),
            description: 'Shared code between services',
        });

        const getProductsListLambda = new lambda.Function(this, 'get-products-list', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            handler: 'get-products-list.main',
            code: lambda.Code.fromAsset('lib/handlers/'),
            layers: [sharedConstantsLayer],
        });

        const getProductByIdLambda = new lambda.Function(this, 'get-product-by-id', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            handler: 'get-product-by-id.main',
            code: lambda.Code.fromAsset(path.join('lib/handlers/')),
            layers: [sharedConstantsLayer],
        });

        const createProductLambda = new lambda.Function(this, 'create-product', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.seconds(5),
            handler: 'create-product.main',
            code: lambda.Code.fromAsset(path.join('lib/handlers/')),
            layers: [sharedConstantsLayer],
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
            sortKey: {
                name: 'title',
                type: dynamodb.AttributeType.STRING
            }
        });

        const stockTable = new dynamodb.Table(this, tableNames.stock, {
            tableName: tableNames.stock,
            partitionKey: {
                name: 'product_id',
                type: dynamodb.AttributeType.STRING
            },
        });

        productsTable.grantReadData(getProductsListLambda);
        productsTable.grantReadData(getProductByIdLambda);
        productsTable.grantWriteData(createProductLambda);

        stockTable.grantReadData(getProductsListLambda);
        stockTable.grantReadData(getProductByIdLambda)
        stockTable.grantWriteData(createProductLambda);
    }
}