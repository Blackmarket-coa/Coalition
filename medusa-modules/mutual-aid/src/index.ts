import { Module } from '@medusajs/framework/utils';
import AidPost from './models/aid-post';
import AidResponse from './models/aid-response';
import MutualAidModuleService from './services/mutual-aid';

export const MUTUAL_AID_MODULE = 'mutualAid';

export default Module(MUTUAL_AID_MODULE, {
    service: MutualAidModuleService,
    models: [AidPost, AidResponse],
});

export { AidPost, AidResponse, MutualAidModuleService };
