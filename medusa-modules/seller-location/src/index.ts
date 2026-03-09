import { Module } from '@medusajs/framework/utils';
import SellerLocation from './models/seller-location';
import SellerLocationModuleService from './services/seller-location';
import sellerLocationSellerLink from './links/seller-location-seller';

export const SELLER_LOCATION_MODULE = 'sellerLocation';

export default Module(SELLER_LOCATION_MODULE, {
    service: SellerLocationModuleService,
    models: [SellerLocation],
    links: [sellerLocationSellerLink],
});

export { SellerLocation, SellerLocationModuleService, sellerLocationSellerLink };
