import { model } from '@medusajs/framework/utils';

export const AID_POST_TYPES = ['need', 'offer'] as const;
export const AID_POST_CATEGORIES = ['food', 'transport', 'labor', 'materials', 'care', 'housing', 'childcare', 'eldercare', 'tech_support', 'other'] as const;
export const AID_POST_URGENCY = ['low', 'medium', 'high', 'critical'] as const;
export const AID_POST_STATUS = ['open', 'in_progress', 'fulfilled', 'expired', 'cancelled'] as const;

export type AidPostType = (typeof AID_POST_TYPES)[number];
export type AidPostCategory = (typeof AID_POST_CATEGORIES)[number];
export type AidPostUrgency = (typeof AID_POST_URGENCY)[number];
export type AidPostStatus = (typeof AID_POST_STATUS)[number];

export const AidPost = model.define('aid_post', {
    id: model.id({ prefix: 'aidp' }).primaryKey(),
    customer_id: model.text().index(),
    type: model.enum(AID_POST_TYPES),
    category: model.enum(AID_POST_CATEGORIES),
    title: model.text(),
    description: model.text(),
    location: model.json(),
    display_radius: model.number().default(400),
    urgency: model.enum(AID_POST_URGENCY).default('medium'),
    expires_at: model.dateTime().nullable(),
    status: model.enum(AID_POST_STATUS).default('open'),
    fulfiller_id: model.text().nullable(),
    fulfilled_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
});

export default AidPost;
