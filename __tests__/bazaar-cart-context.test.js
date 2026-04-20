jest.mock('react-native-mmkv-storage', () => {
    const React = require('react');
    return {
        MMKVLoader: class {
            initialize() {
                return {};
            }
        },
        useMMKVStorage: (_key, _storage, defaultValue) => {
            const [value, setValue] = React.useState(defaultValue);
            return [value, setValue];
        },
    };
});

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { CartProvider, useCartContext } from '../packages/core/src/contexts/CartContext';

let latestContext = null;

const Probe = () => {
    latestContext = useCartContext();
    return <Text testID='probe'>cart</Text>;
};

const renderWithProvider = async () => {
    let root;
    await act(() => {
        root = ReactTestRenderer.create(
            <CartProvider>
                <Probe />
            </CartProvider>
        );
    });
    return root;
};

const makeItem = (overrides = {}) => ({
    product_id: 'prod_plugin_01',
    title: 'Golden Shader Plugin',
    quantity: 1,
    unit_price_cents: 500,
    currency_code: 'USD',
    seller_id: 'seller_ox',
    kind: 'digital',
    pricing_mode: 'one_off',
    ...overrides,
});

describe('CartContext', () => {
    beforeEach(() => {
        latestContext = null;
    });

    test('addItem merges quantity for the same product/variant/mode key', async () => {
        await renderWithProvider();

        await act(async () => {
            latestContext.addItem(makeItem({ quantity: 2 }));
        });
        await act(async () => {
            latestContext.addItem(makeItem({ quantity: 3 }));
        });

        expect(latestContext.cart.items).toHaveLength(1);
        expect(latestContext.cart.items[0].quantity).toBe(5);
        expect(latestContext.subtotalCents).toBe(500 * 5);
        expect(latestContext.hasDigital).toBe(true);
        expect(latestContext.hasPhysical).toBe(false);
    });

    test('distinguishes line items by pricing_mode so a tip does not collapse into the purchase', async () => {
        await renderWithProvider();

        await act(async () => {
            latestContext.addItem(makeItem({ pricing_mode: 'one_off', unit_price_cents: 500 }));
        });
        await act(async () => {
            latestContext.addItem(makeItem({ pricing_mode: 'tip', unit_price_cents: 0, tip_amount_cents: 300 }));
        });

        expect(latestContext.cart.items).toHaveLength(2);
        expect(latestContext.tipTotalCents).toBe(300);
        expect(latestContext.subtotalCents).toBe(500);
    });

    test('setQuantity to zero removes the line', async () => {
        await renderWithProvider();

        await act(async () => {
            latestContext.addItem(makeItem({ quantity: 2 }));
        });
        await act(async () => {
            latestContext.setQuantity({ product_id: 'prod_plugin_01', pricing_mode: 'one_off' }, 0);
        });

        expect(latestContext.cart.items).toHaveLength(0);
    });

    test('flags mixed currencies', async () => {
        await renderWithProvider();

        await act(async () => {
            latestContext.addItem(makeItem({ product_id: 'a', currency_code: 'USD' }));
        });
        await act(async () => {
            latestContext.addItem(makeItem({ product_id: 'b', currency_code: 'EUR' }));
        });

        expect(latestContext.mixedCurrencies).toBe(true);
    });

    test('clear empties the cart', async () => {
        await renderWithProvider();

        await act(async () => {
            latestContext.addItem(makeItem());
        });
        await act(async () => {
            latestContext.clear();
        });

        expect(latestContext.cart.items).toHaveLength(0);
    });
});
