export type Product = {
    product_id: string;
    title: string;
    description: string;
    price: number;
}

export type Stock = {
    product_id: string;
    count: number;
}

export type ProductWithStock = Product & Stock;
