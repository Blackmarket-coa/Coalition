import { computePlatformFee, DEFAULT_PLATFORM_FEE_BPS } from '../apps/gateway/src/services/platform-fee';

const originalBps = process.env.COALITION_PLATFORM_FEE_BPS;

afterEach(() => {
    if (originalBps === undefined) {
        delete process.env.COALITION_PLATFORM_FEE_BPS;
    } else {
        process.env.COALITION_PLATFORM_FEE_BPS = originalBps;
    }
});

describe('computePlatformFee', () => {
    test('default 10% fee on the subtotal only, tip passes through to seller', () => {
        delete process.env.COALITION_PLATFORM_FEE_BPS;
        const result = computePlatformFee({ subtotal_cents: 10_000, tip_cents: 500 });

        expect(result.platform_fee_cents).toBe(1000);
        expect(result.total_cents).toBe(10_500);
        expect(result.seller_payout_cents).toBe(9500);
    });

    test('honors COALITION_PLATFORM_FEE_BPS from env', () => {
        process.env.COALITION_PLATFORM_FEE_BPS = '750';
        const result = computePlatformFee({ subtotal_cents: 10_000 });
        expect(result.platform_fee_cents).toBe(750);
    });

    test('tip-only flow takes zero platform fee', () => {
        delete process.env.COALITION_PLATFORM_FEE_BPS;
        const result = computePlatformFee({ subtotal_cents: 0, tip_cents: 300 });

        expect(result.platform_fee_cents).toBe(0);
        expect(result.total_cents).toBe(300);
        expect(result.seller_payout_cents).toBe(300);
    });

    test('falls back to default when env value is invalid', () => {
        process.env.COALITION_PLATFORM_FEE_BPS = 'nonsense';
        const result = computePlatformFee({ subtotal_cents: 1000 });

        expect(DEFAULT_PLATFORM_FEE_BPS).toBe(1000);
        expect(result.platform_fee_cents).toBe(100);
    });

    test('rejects negative inputs', () => {
        expect(() => computePlatformFee({ subtotal_cents: -1 })).toThrow();
        expect(() => computePlatformFee({ subtotal_cents: 100, tip_cents: -1 })).toThrow();
    });
});
