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


## Task 4: Integration with NoSQL

**Links:**
- Integrated FE: https://d2bko0qy6pacnm.cloudfront.net
- Lambdas:
   - `/products` GET https://jkvn98vqib.execute-api.us-east-1.amazonaws.com/prod/products
   - `/products/{productId}` GET https://jkvn98vqib.execute-api.us-east-1.amazonaws.com/prod/products/b6d4c964-3c48-49c1-b10f-3d6a0480a57a
   - `/products/create` POST https://jkvn98vqib.execute-api.us-east-1.amazonaws.com/prod/products/create with body
     `{
       "title": "new-title",
       "description": "new-description",
       "price": 100,
       "count": 20
     }`
- FE Git repo: https://github.com/AliaksandrVarachai/shop-react-redux-cloudfront
- FE Git infrastructure: https://github.com/AliaksandrVarachai/infra
- BE Git part: https://github.com/AliaksandrVarachai/shop-aws-backend

### Mandatory tasks: Product Service Integration with NoSQL Database

1. **[Implemented]** DynamoDB tables for products and stock were created with the expected schema and filled 
with test data using a provided script
2. **[Implemented]** CDK configuration was extended with database details, and lambda functions getProductsList 
and getProductsById were integrated to return data from joined products and stock tables, with frontend integration 
for product listing
3. **[Implemented]** Lambda function createProduct was created, triggered by HTTP POST `/products`, 
and successfully created new items in the Products table

### Enhancements

1. **[Implemented]** `POST /products/create` lambda returns error 400 for invalid product data.
Error examples for `POST https://jkvn98vqib.execute-api.us-east-1.amazonaws.com/prod/products/create`:
   - returns 400 error when body is empty or contains incorrect data
   - returns 500 error if creation in DynamoDB is failed
2. **[Implemented]** All lambdas return error 500 on any error (e.g., DB connection issues):
   - `/products/{productId}` returns 404 error when product is not found, e.g. 
   GET https://jkvn98vqib.execute-api.us-east-1.amazonaws.com/prod/products/not-exist
   - `/products` and `/products/{productId}` return 500 error if any error is thrown
3. **[Implemented]** All lambdas log incoming requests and their arguments
   - `/products` and `/products/{productId}` log their arguments
4. **[NOT required]** An RDS instance was used instead of DynamoDB (with proper security practices), 
and environment variables were not committed to GitHub
5. **[Implemented]** Transaction-based creation of product was implemented to ensure consistency between 
product and stock creation:
  - `/products/create` creates product in two tables with `TransactWriteItemsCommand` function