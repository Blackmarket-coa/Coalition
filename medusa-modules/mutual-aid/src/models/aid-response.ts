import { model } from '@medusajs/framework/utils';

export const AID_RESPONSE_STATUS = ['pending', 'accepted', 'declined'] as const;
export type AidResponseStatus = (typeof AID_RESPONSE_STATUS)[number];

export const AidResponse = model.define('aid_response', {
    id: model.id({ prefix: 'aidr' }).primaryKey(),
    aid_post_id: model.text().index(),
    responder_id: model.text().index(),
    message: model.text(),
    status: model.enum(AID_RESPONSE_STATUS).default('pending'),
    matrix_room_id: model.text().nullable(),
});

export default AidResponse;
