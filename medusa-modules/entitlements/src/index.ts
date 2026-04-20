import { Module } from '@medusajs/framework/utils';
import Entitlement from './models/entitlement';
import EntitlementModuleService from './services/entitlement';

export const ENTITLEMENT_MODULE = 'entitlement';

export default Module(ENTITLEMENT_MODULE, {
    service: EntitlementModuleService,
    models: [Entitlement],
});

export { Entitlement, EntitlementModuleService };
