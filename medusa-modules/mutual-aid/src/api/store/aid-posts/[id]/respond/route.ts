import { z } from 'zod';
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import type MutualAidModuleService from '../../../../../services/mutual-aid';

const schema = z.object({
    responder_id: z.string().min(1),
    message: z.string().min(1),
});

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const service = req.scope.resolve<MutualAidModuleService>('mutualAid');
    const { id } = req.params;
    const parsed = schema.parse(req.body);

    const aid_response = await service.respondToPost({
        aid_post_id: id,
        responder_id: parsed.responder_id,
        message: parsed.message,
    });

    return res.status(201).json({ aid_response });
}
