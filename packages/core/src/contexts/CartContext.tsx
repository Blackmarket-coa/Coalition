import React, { createContext, useCallback, useContext, useMemo } from 'react';
import useStorage from '../hooks/use-storage';

export type CartItemKind = 'physical' | 'digital';

export type CartPricingMode = 'one_off' | 'subscription' | 'tip';

export interface CartLineItem {
    product_id: string;
    variant_id?: string;
    title: string;
    quantity: number;
    unit_price_cents: number;
    currency_code: string;
    seller_id: string;
    seller_connect_account_id?: string;
    kind: CartItemKind;
    pricing_mode: CartPricingMode;
    stripe_price_id?: string;
    tip_amount_cents?: number;
    thumbnail?: string;
}

export interface CartState {
    items: CartLineItem[];
    currency_code: string | null;
    updated_at: string | null;
}

const EMPTY_CART: CartState = { items: [], currency_code: null, updated_at: null };

const lineKey = (item: Pick<CartLineItem, 'product_id' | 'variant_id' | 'pricing_mode'>) => `${item.product_id}::${item.variant_id ?? 'default'}::${item.pricing_mode}`;

const touch = (state: CartState): CartState => ({ ...state, updated_at: new Date().toISOString() });

export interface CartContextValue {
    cart: CartState;
    isLoading: boolean;
    addItem: (item: CartLineItem) => void;
    removeItem: (item: Pick<CartLineItem, 'product_id' | 'variant_id' | 'pricing_mode'>) => void;
    setQuantity: (item: Pick<CartLineItem, 'product_id' | 'variant_id' | 'pricing_mode'>, quantity: number) => void;
    setTip: (item: Pick<CartLineItem, 'product_id' | 'variant_id' | 'pricing_mode'>, tipCents: number) => void;
    clear: () => void;
    updateCart: (next: CartState) => void;
    subtotalCents: number;
    tipTotalCents: number;
    hasDigital: boolean;
    hasPhysical: boolean;
    hasSubscription: boolean;
    mixedCurrencies: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ storageKey?: string; children: React.ReactNode }> = ({ storageKey = 'coalition.cart.v1', children }) => {
    const [cart, setCart] = useStorage<CartState>(storageKey, EMPTY_CART);
    const current = cart ?? EMPTY_CART;

    const addItem = useCallback(
        (item: CartLineItem) => {
            const key = lineKey(item);
            const existing = current.items.find((line) => lineKey(line) === key);
            const items = existing
                ? current.items.map((line) => (lineKey(line) === key ? { ...line, quantity: line.quantity + item.quantity } : line))
                : [...current.items, item];
            setCart(touch({ ...current, items, currency_code: current.currency_code ?? item.currency_code }));
        },
        [current, setCart]
    );

    const removeItem = useCallback(
        (item: Pick<CartLineItem, 'product_id' | 'variant_id' | 'pricing_mode'>) => {
            setCart(touch({ ...current, items: current.items.filter((line) => lineKey(line) !== lineKey(item)) }));
        },
        [current, setCart]
    );

    const setQuantity = useCallback(
        (item: Pick<CartLineItem, 'product_id' | 'variant_id' | 'pricing_mode'>, quantity: number) => {
            if (quantity <= 0) {
                setCart(touch({ ...current, items: current.items.filter((line) => lineKey(line) !== lineKey(item)) }));
                return;
            }
            setCart(touch({ ...current, items: current.items.map((line) => (lineKey(line) === lineKey(item) ? { ...line, quantity } : line)) }));
        },
        [current, setCart]
    );

    const setTip = useCallback(
        (item: Pick<CartLineItem, 'product_id' | 'variant_id' | 'pricing_mode'>, tipCents: number) => {
            setCart(touch({ ...current, items: current.items.map((line) => (lineKey(line) === lineKey(item) ? { ...line, tip_amount_cents: Math.max(0, tipCents) } : line)) }));
        },
        [current, setCart]
    );

    const clear = useCallback(() => setCart(touch(EMPTY_CART)), [setCart]);

    const updateCart = useCallback((next: CartState) => setCart(touch(next)), [setCart]);

    const value = useMemo<CartContextValue>(() => {
        const items = current.items;
        const subtotalCents = items.reduce((sum, line) => sum + line.unit_price_cents * line.quantity, 0);
        const tipTotalCents = items.reduce((sum, line) => sum + (line.tip_amount_cents ?? 0), 0);
        const hasDigital = items.some((line) => line.kind === 'digital');
        const hasPhysical = items.some((line) => line.kind === 'physical');
        const hasSubscription = items.some((line) => line.pricing_mode === 'subscription');
        const currencies = new Set(items.map((line) => line.currency_code));
        const mixedCurrencies = currencies.size > 1;

        return {
            cart: current,
            isLoading: false,
            addItem,
            removeItem,
            setQuantity,
            setTip,
            clear,
            updateCart,
            subtotalCents,
            tipTotalCents,
            hasDigital,
            hasPhysical,
            hasSubscription,
            mixedCurrencies,
        };
    }, [current, addItem, removeItem, setQuantity, setTip, clear, updateCart]);

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCartContext = (): CartContextValue => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCartContext must be used within a CartProvider');
    }
    return context;
};

export { EMPTY_CART, lineKey };
