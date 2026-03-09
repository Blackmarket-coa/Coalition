import { z } from 'zod';
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import type SellerLocationModuleService from '../../../services/seller-location';
import { LOCATION_TYPES } from '../../../models/seller-location';

const upsertSchema = z.object({
    coordinates: z.object({
        longitude: z.number().min(-180).max(180),
        latitude: z.number().min(-90).max(90),
    }),
    address_line: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    country: z.string().min(2).max(2),
    display_radius: z.number().int().min(0).max(25_000).default(250),
    is_visible: z.boolean().default(true),
    location_type: z.enum(LOCATION_TYPES).default('storefront'),
});

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const service = req.scope.resolve<SellerLocationModuleService>('sellerLocation');
    const sellerId = await service.assertSellerOwnershipOrThrow((req.auth_context as any)?.actor_id);
    const payload = upsertSchema.parse(req.body);

    const location = await service.upsertForSeller({
        seller_id: sellerId,
        coordinates: {
            latitude: payload.coordinates.latitude,
            longitude: payload.coordinates.longitude,
        },
        address_line: payload.address_line,
        city: payload.city,
        state: payload.state,
        zip: payload.zip,
        country: payload.country,
        display_radius: payload.display_radius,
        is_visible: payload.is_visible,
        location_type: payload.location_type,
    });

    return res.status(200).json({ seller_location: location });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
    const service = req.scope.resolve<SellerLocationModuleService>('sellerLocation');
    const sellerId = await service.assertSellerOwnershipOrThrow((req.auth_context as any)?.actor_id);

    const result = await service.deleteForSeller(sellerId);
    return res.status(200).json(result);
}
