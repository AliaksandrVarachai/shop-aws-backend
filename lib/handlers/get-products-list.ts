import mockedProductsList from "/opt/products-list.json";

export async function main() {
    return {
        data: mockedProductsList,
    }
}