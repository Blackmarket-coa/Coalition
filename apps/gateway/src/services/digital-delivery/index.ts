import type { DigitalDeliveryType } from '../../lib/types';
import { issueFileDelivery, type FileDeliveryResult } from './file-delivery';
import { applyMatrixUnlock, type MatrixUnlockResult } from './matrix-unlock-delivery';
import { signManifest, type PluginManifestInput, type SignedManifest } from './manifest-delivery';

export interface DeliveryContext {
    entitlementId: string;
    userId: string;
    productId: string;
    deliveryType: DigitalDeliveryType;
    assetRef?: string;
    matrixUserId?: string;
    packId?: string;
    shortcodes?: Record<string, string>;
    displayName?: string;
    manifest?: PluginManifestInput;
}

export type DeliveryResult =
    | FileDeliveryResult
    | MatrixUnlockResult
    | { type: 'manifest'; manifest: SignedManifest };

export const dispatchDelivery = async (ctx: DeliveryContext, fetchImpl: typeof fetch = fetch): Promise<DeliveryResult> => {
    switch (ctx.deliveryType) {
        case 'file': {
            if (!ctx.assetRef) {
                throw new Error('file delivery requires asset_ref on the product metadata');
            }
            return issueFileDelivery({ entitlementId: ctx.entitlementId, assetRef: ctx.assetRef });
        }
        case 'unlock': {
            if (!ctx.matrixUserId || !ctx.packId || !ctx.shortcodes) {
                throw new Error('unlock delivery requires matrixUserId, packId, and shortcodes');
            }
            return applyMatrixUnlock(
                { userId: ctx.matrixUserId, packId: ctx.packId, shortcodes: ctx.shortcodes, displayName: ctx.displayName },
                fetchImpl
            );
        }
        case 'manifest': {
            if (!ctx.manifest) {
                throw new Error('manifest delivery requires a manifest on the product metadata');
            }
            return { type: 'manifest', manifest: signManifest(ctx.manifest) };
        }
        default: {
            throw new Error(`Unsupported delivery type: ${String(ctx.deliveryType)}`);
        }
    }
};

export { issueFileDelivery, verifyFileDelivery } from './file-delivery';
export { applyMatrixUnlock } from './matrix-unlock-delivery';
export { signManifest, verifyManifest } from './manifest-delivery';
