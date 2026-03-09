import { z } from 'zod';
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import type MutualAidModuleService from '../../../services/mutual-aid';

const createSchema = z.object({
    customer_id: z.string().min(1),
    type: z.enum(['need', 'offer']),
    category: z.enum(['food', 'transport', 'labor', 'materials', 'care', 'housing', 'childcare', 'eldercare', 'tech_support', 'other']),
    title: z.string().min(1),
    description: z.string().min(1),
    location: z.object({ latitude: z.number(), longitude: z.number() }),
    display_radius: z.number().positive().optional(),
    urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    expires_at: z.union([z.string(), z.date()]).nullable().optional(),
    metadata: z.record(z.any()).nullable().optional(),
});

const listSchema = z.object({
    bbox: z.string().min(1),
    type: z.enum(['need', 'offer']).optional(),
    category: z.enum(['food', 'transport', 'labor', 'materials', 'care', 'housing', 'childcare', 'eldercare', 'tech_support', 'other']).optional(),
    urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['open', 'in_progress', 'fulfilled', 'expired', 'cancelled']).optional(),
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

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const service = req.scope.resolve<MutualAidModuleService>('mutualAid');
    const input = createSchema.parse(req.body);

    const aid_post = await service.createPost(input);
    return res.status(201).json({ aid_post });
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = req.scope.resolve<MutualAidModuleService>('mutualAid');
    const parsed = listSchema.parse(req.query);

    const aid_posts = await service.listByBBox(parseBbox(parsed.bbox), {
        type: parsed.type,
        category: parsed.category,
        urgency: parsed.urgency,
        status: parsed.status,
    });

    return res.status(200).json({
        aid_posts,
        meta: {
            precision: 'fuzzed',
            note: 'Exact coordinates are never returned. Coordinates are randomized within display_radius.',
        },
    });
}
