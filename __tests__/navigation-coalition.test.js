import { coalitionTabOrder, coalitionPrimaryTab } from '../src/navigation/coalition-config';

describe('Coalition navigator tab layout', () => {
    test('matches the expected general-user-first tab order', () => {
        expect(coalitionTabOrder).toEqual(['Home', 'Feed', 'Explore', 'Messages', 'You']);
    });

    test('marks Feed as the primary highlighted action', () => {
        expect(coalitionPrimaryTab).toBe('Feed');
    });

    test('tab order snapshot', () => {
        expect(coalitionTabOrder).toMatchSnapshot();
    });
});
