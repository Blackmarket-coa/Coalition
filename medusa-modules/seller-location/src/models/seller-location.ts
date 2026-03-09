import { model } from '@medusajs/framework/utils';

export const LOCATION_TYPES = ['storefront', 'farm', 'kitchen', 'garden', 'mobile', 'online_only'] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];

/**
 * Coordinates are persisted in PostGIS `geometry(Point,4326)` through migration,
 * while app layer uses lng/lat primitives.
 */
export const SellerLocation = model.define('seller_location', {
    id: model.id({ prefix: 'sloc' }).primaryKey(),
    seller_id: model.text().unique().index(),
    latitude: model.number(),
    longitude: model.number(),
    address_line: model.text(),
    city: model.text(),
    state: model.text(),
    zip: model.text(),
    country: model.text(),
    display_radius: model.number().default(250),
    is_visible: model.boolean().default(true),
    location_type: model.enum(LOCATION_TYPES).default('storefront'),
});

export default SellerLocation;
