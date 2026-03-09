import { z } from 'zod';
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import type MutualAidModuleService from '../../../../../services/mutual-aid';

const schema = z.object({
    fulfiller_id: z.string().min(1),
});

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
    const service = req.scope.resolve<MutualAidModuleService>('mutualAid');
    const { id } = req.params;
    const parsed = schema.parse(req.body);

    const aid_post = await service.fulfillPost(id, parsed.fulfiller_id);
    return res.status(200).json({ aid_post });
}
