export type ErrorCategory = 'feed_load_error' | 'action_router_error' | 'matrix_error' | 'onboarding_error' | 'location_error';

export interface ErrorDashboardPayload {
    dashboard: 'coalition_errors_v1';
    category: ErrorCategory;
    message: string;
    ts: string;
    context?: Record<string, any>;
}

export function logErrorCategory(category: ErrorCategory, message: string, context: Record<string, any> = {}) {
    const payload: ErrorDashboardPayload = {
        dashboard: 'coalition_errors_v1',
        category,
        message,
        ts: new Date().toISOString(),
        context,
    };

    console.warn('[coalition:error]', payload);
    return payload;
}
