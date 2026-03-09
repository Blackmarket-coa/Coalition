import { defineLink } from '@medusajs/framework/utils';

/**
 * Link seller-location records to MercurJS sellers.
 * Replace `seller` module key if your MercurJS seller module registers differently.
 */
export default defineLink(
    {
        linkable: 'seller',
        isList: false,
        field: 'seller_id',
    },
    {
        linkable: 'seller_location',
        isList: false,
        field: 'seller_id',
    }
);
