import { claimGatewayJob } from './blackstar-gateway';
import { trackConversionEvent } from './conversion-analytics';
import { logErrorCategory } from './error-logging';
import { isCoalitionActionRouterEnabled, isCoalitionBazaarEnabled } from './feature-flags';

export type EcosystemActionType = 'SHOP_ITEM' | 'POST_OFFERING' | 'APPLY_JOB' | 'JOIN_ROOM' | 'OPEN_PROPOSAL' | 'REQUEST_AID' | 'BROWSE_BAZAAR';

export type BazaarKind = 'plugin' | 'emoji_pack' | 'meme_pack' | 'stego' | 'software' | 'other';

export type EcosystemAction =
    | { type: 'SHOP_ITEM'; payload?: { itemId?: string } }
    | { type: 'POST_OFFERING'; payload?: { category?: string } }
    | { type: 'APPLY_JOB'; payload: { jobId: string; providerId: string } }
    | { type: 'JOIN_ROOM'; payload: { roomId: string } }
    | { type: 'OPEN_PROPOSAL'; payload?: { proposalId?: string } }
    | { type: 'REQUEST_AID'; payload?: { aidType?: string } }
    | { type: 'BROWSE_BAZAAR'; payload?: { kind?: BazaarKind; itemId?: string } };

export interface ActionRouterContext {
    navigate: (routeName: string, params?: Record<string, any>) => void;
    joinRoom?: (roomIdOrAlias: string) => Promise<void>;
    onUnhandled?: (action: EcosystemAction, reason: string) => void;
    trackRecentBehavior?: (entry: string) => void;
}


function executeLegacyFallback(action: EcosystemAction, context: ActionRouterContext) {
    if (action.type === 'SHOP_ITEM' || action.type === 'POST_OFFERING' || action.type === 'BROWSE_BAZAAR') {
        context.navigate('Feed', { screen: 'PostTab' });
        return { ok: true, module: 'legacy-fallback' };
    }

    context.onUnhandled?.(action, 'Action router disabled by feature flag');
    return { ok: false, reason: 'ACTION_ROUTER_DISABLED' };
}

export async function executeEcosystemAction(action: EcosystemAction, context: ActionRouterContext) {
    if (!isCoalitionActionRouterEnabled()) {
        return executeLegacyFallback(action, context);
    }

    try {
        switch (action.type) {
            case 'SHOP_ITEM':
                context.navigate('Feed', { screen: 'PostTab', params: { action: 'shop', itemId: action.payload?.itemId } });
                context.trackRecentBehavior?.('SHOP_ITEM');
                trackConversionEvent('action_routed', { action: action.type, module: 'free-black-market' });
                return { ok: true, module: 'free-black-market' };
            case 'POST_OFFERING':
                context.navigate('Feed', { screen: 'PostTab', params: { action: 'post-offering', category: action.payload?.category } });
                context.trackRecentBehavior?.('POST_OFFERING');
                trackConversionEvent('action_routed', { action: action.type, module: 'free-black-market' });
                return { ok: true, module: 'free-black-market' };
            case 'APPLY_JOB':
                await claimGatewayJob(action.payload.jobId, action.payload.providerId);
                context.navigate('Home', { screen: 'DriverOrderManagement' });
                context.trackRecentBehavior?.('APPLY_JOB');
                trackConversionEvent('action_routed', { action: action.type, module: 'Blackstar' });
                return { ok: true, module: 'Blackstar' };
            case 'JOIN_ROOM':
                if (!context.joinRoom) {
                    context.onUnhandled?.(action, 'Matrix join adapter unavailable');
                    trackConversionEvent('action_failed', { action: action.type, reason: 'MATRIX_UNAVAILABLE' });
                    return { ok: false, reason: 'MATRIX_UNAVAILABLE' };
                }
                await context.joinRoom(action.payload.roomId);
                context.navigate('Messages', { screen: 'ChatHome' });
                context.trackRecentBehavior?.('JOIN_ROOM');
                trackConversionEvent('action_routed', { action: action.type, module: 'Blackout Matrix rooms' });
                return { ok: true, module: 'Blackout Matrix rooms' };
            case 'OPEN_PROPOSAL':
                context.navigate('Explore', { screen: 'Test', params: { proposalId: action.payload?.proposalId } });
                context.trackRecentBehavior?.('OPEN_PROPOSAL');
                trackConversionEvent('action_routed', { action: action.type, module: 'Governance' });
                return { ok: true, module: 'Governance' };
            case 'REQUEST_AID':
                context.navigate('Explore', { screen: 'Test', params: { aidRequest: true, aidType: action.payload?.aidType } });
                context.trackRecentBehavior?.('REQUEST_AID');
                trackConversionEvent('action_routed', { action: action.type, module: 'Aid' });
                return { ok: true, module: 'Aid' };
            case 'BROWSE_BAZAAR':
                if (!isCoalitionBazaarEnabled()) {
                    context.navigate('Feed', { screen: 'PostTab', params: { action: 'shop' } });
                    trackConversionEvent('action_routed', { action: action.type, module: 'legacy-fallback' });
                    return { ok: true, module: 'legacy-fallback' };
                }
                context.navigate('Feed', { screen: 'BazaarHome', params: { kind: action.payload?.kind, itemId: action.payload?.itemId } });
                context.trackRecentBehavior?.('BROWSE_BAZAAR');
                trackConversionEvent('action_routed', { action: action.type, module: 'bazaar' });
                return { ok: true, module: 'bazaar' };
            default:
                context.onUnhandled?.(action, 'Unknown action type');
                trackConversionEvent('action_failed', { action: action.type, reason: 'UNRESOLVED_ACTION' });
                return { ok: false, reason: 'UNRESOLVED_ACTION' };
        }
    } catch (error) {
        const reason = error instanceof Error ? error.message : 'Action execution failed';
        context.onUnhandled?.(action, reason);
        logErrorCategory('action_router_error', reason, { action: action.type });
        trackConversionEvent('action_failed', { action: action.type, reason });
        return { ok: false, reason: 'ACTION_EXECUTION_FAILED' };
    }
}
