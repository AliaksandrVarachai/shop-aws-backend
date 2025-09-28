import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductsServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const api = new apigateway.RestApi(this, 'ProductsServiceApi', {
            restApiName: 'Products Service API',
            description: 'Products Service REST API',
        });

        const productsListLayer = new lambda.LayerVersion(this, 'product-list-layer', {
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            code: lambda.Code.fromAsset('lib/layers'),
            description: 'Shared mocked data',
        });

        const getProductsListLambda = new lambda.Function(this, 'get-products-list', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'get-products-list.main',
            code: lambda.Code.fromAsset('lib/handlers/'),
            layers: [productsListLayer],
        });

        const getProductByIdLambda = new lambda.Function(this, 'get-product-by-id', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'get-product-by-id.main',
            code: lambda.Code.fromAsset(path.join('lib/handlers/')),
            layers: [productsListLayer],
        });

        const getProductsListIntegration = new apigateway.LambdaIntegration(getProductsListLambda, {
            integrationResponses: [{ statusCode: '200' }],
            proxy: false,
        });

        const getProductByIdIntegration = new apigateway.LambdaIntegration(getProductByIdLambda, {
            proxy: true,
        });

        const getProductsListResource = api.root.addResource('products');
        const getProductByIdResource = getProductsListResource.addResource('{productId}');


        getProductsListResource.addMethod('GET', getProductsListIntegration, {
            methodResponses: [{ statusCode: '200' }],
        });
        getProductsListResource.addCorsPreflight({
            allowOrigins: ['*'], // 'https://your-frontend-url.com'
            allowMethods: ['GET'],
        });

        getProductByIdResource.addMethod('GET', getProductByIdIntegration, {
            methodResponses: [{ statusCode: '200' }],
        });
        getProductByIdResource.addCorsPreflight({
            allowOrigins: ['*'], // 'https://your-frontend-url.com'
            allowMethods: ['GET'],
        });
    }
}