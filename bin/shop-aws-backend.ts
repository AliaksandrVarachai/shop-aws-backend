#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProductsServiceStack } from '../lib/product-service-stack';
import { ImportServiceStack } from '../lib/import-service-stack';

const app = new cdk.App();
const productServiceStack = new ProductsServiceStack(app, 'ShopProductServiceStack', {});
new ImportServiceStack(app, 'ShopImportServiceStack', {
    catalogItemsQueue: productServiceStack.catalogItemsQueue
});
