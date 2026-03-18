import React from 'react';

export const ToastPosition = {
    TOP: 'top',
    BOTTOM: 'bottom',
} as const;

export type ToastOptions = {
    message?: string;
    title?: string;
    position?: (typeof ToastPosition)[keyof typeof ToastPosition];
};

export const toast = (_options: ToastOptions = {}) => {};

export const Toasts = () => null;
