export const coalitionTabOrder = ['Home', 'Feed', 'Explore', 'Messages', 'You'] as const;
export const coalitionPrimaryTab = 'Feed';

export function isDriverRole(driver) {
    const explicitRole = driver?.getAttribute?.('role') ?? driver?.role;
    const organizations = driver?.getAttribute?.('organizations') ?? [];
    const roles = [
        explicitRole,
        ...(Array.isArray(organizations) ? organizations.map((organization) => organization?.role) : []),
    ]
        .filter(Boolean)
        .map((role) => String(role).toLowerCase());

    return roles.includes('driver');
}

// Backward compatibility: a false flag always restores the legacy DriverNavigator.
export function resolveAuthenticatedNavigator({ coalitionNavEnabled = true, isDriver = false }) {
    if (!coalitionNavEnabled) {
        return 'DriverNavigator';
    }

    return isDriver ? 'DriverNavigator' : 'CoalitionNavigator';
}
