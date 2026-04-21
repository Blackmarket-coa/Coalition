export interface PlatformFeeInput {
    subtotal_cents: number;
    tip_cents?: number;
    platform_fee_bps?: number;
}

export interface PlatformFeeResult {
    subtotal_cents: number;
    tip_cents: number;
    total_cents: number;
    platform_fee_cents: number;
    seller_payout_cents: number;
}

export const DEFAULT_PLATFORM_FEE_BPS = 1000;

const readBpsFromEnv = (): number => {
    const raw = process.env.COALITION_PLATFORM_FEE_BPS;
    if (!raw) return DEFAULT_PLATFORM_FEE_BPS;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000) {
        return DEFAULT_PLATFORM_FEE_BPS;
    }
    return parsed;
};

export const computePlatformFee = ({ subtotal_cents, tip_cents = 0, platform_fee_bps }: PlatformFeeInput): PlatformFeeResult => {
    if (!Number.isFinite(subtotal_cents) || subtotal_cents < 0) {
        throw new Error('subtotal_cents must be a non-negative number');
    }
    if (!Number.isFinite(tip_cents) || tip_cents < 0) {
        throw new Error('tip_cents must be a non-negative number');
    }

    const bps = platform_fee_bps ?? readBpsFromEnv();
    const feeOnSubtotal = Math.floor((subtotal_cents * bps) / 10_000);
    const total = subtotal_cents + tip_cents;
    const sellerPayout = total - feeOnSubtotal;

    return {
        subtotal_cents,
        tip_cents,
        total_cents: total,
        platform_fee_cents: feeOnSubtotal,
        seller_payout_cents: sellerPayout,
    };
};
