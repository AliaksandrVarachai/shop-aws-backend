# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Task 3: Serverless

**Links:** 
  - FE part: https://github.com/AliaksandrVarachai/shop-react-redux-cloudfront
  - FE infrastructure: https://github.com/AliaksandrVarachai/infra
  - BE part: https://github.com/AliaksandrVarachai/shop-aws-backend

### Product Service Lambda Functions and API

1. **[Implemented]** Lambda function `getProductsList` was created, triggered by HTTP GET `/products`, and returned a full array 
of products using mock data. Link: GET https://q4hmgcpqei.execute-api.us-east-1.amazonaws.com/prod/products
2. **[Implemented]** Lambda function `getProductsById` was created, triggered by HTTP GET `/products/{productId}`, 
and returned a specific product from mock data. Links: 
  - Successful response: GET https://q4hmgcpqei.execute-api.us-east-1.amazonaws.com/prod/products/1
  - Error response: GET https://q4hmgcpqei.execute-api.us-east-1.amazonaws.com/prod/products/not-used
3. **[Implemented]** Frontend was integrated with the Product Service, displaying products on the Product List Page (PLP).
Link: https://dn633dlm50lmu.cloudfront.net

### Enhancements

1. **[Implemented]** Async/await was used in lambda functions
2. **[Implemented]** ES6 modules were used in the Product Service implementation
3. **[Implemented]** Custom bundler configuration (Webpack/ESBuild) was manually set up for the Product Service
4. **[NOT Implemented]** SWAGGER documentation for the Product Service was created
5. **[NOT Implemented]** Lambda handlers were covered by basic unit tests
6. **[Implemented]** Lambda handler code was separated into multiple modules
7. **[Implemented]** Main error scenarios were handled by the API (e.g., "Product not found" error)
