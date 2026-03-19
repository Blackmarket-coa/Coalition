const assets = new Map<number, any>();
let id = 1;

export function registerAsset(asset: any) {
    const currentId = id++;
    assets.set(currentId, asset);
    return currentId;
}

export function getAssetByID(assetId: number) {
    return assets.get(assetId);
}
