import { z } from 'zod';
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import type SellerLocationModuleService from '../../../services/seller-location';

const querySchema = z.object({
    bbox: z.string().min(1),
});

const parseBbox = (bbox: string) => {
    const [west, south, east, north] = bbox.split(',').map((v) => Number(v.trim()));

    if ([west, south, east, north].some((v) => Number.isNaN(v))) {
        throw new Error('bbox must be west,south,east,north');
    }

    if (west >= east || south >= north) {
        throw new Error('bbox bounds are invalid');
    }

    return { west, south, east, north };
};

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = req.scope.resolve<SellerLocationModuleService>('sellerLocation');
    const parsed = querySchema.parse(req.query);

    const locations = await service.listPublicByBBox(parseBbox(parsed.bbox));

    return res.status(200).json({
        seller_locations: locations,
        meta: {
            precision: 'fuzzed',
            note: 'Exact coordinates are never returned. Coordinates are randomized within display_radius.',
        },
    });
}
