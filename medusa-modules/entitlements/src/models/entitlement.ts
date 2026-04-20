import { model } from '@medusajs/framework/utils';

export const ENTITLEMENT_STATUSES = ['active', 'expired', 'revoked'] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export const ENTITLEMENT_SOURCES = ['one_off', 'subscription', 'tip', 'free'] as const;
export type EntitlementSource = (typeof ENTITLEMENT_SOURCES)[number];

export const Entitlement = model.define('entitlement', {
    id: model.id({ prefix: 'ent' }).primaryKey(),
    user_id: model.text().index(),
    product_id: model.text().index(),
    seller_id: model.text().nullable(),
    source: model.enum(ENTITLEMENT_SOURCES).default('one_off'),
    source_payment_id: model.text().nullable(),
    stripe_subscription_id: model.text().nullable().index(),
    status: model.enum(ENTITLEMENT_STATUSES).default('active'),
    granted_at: model.dateTime(),
    expires_at: model.dateTime().nullable(),
    revoked_at: model.dateTime().nullable(),
    currency_code: model.text().nullable(),
    amount_cents: model.number().nullable(),
});

export default Entitlement;
