import React from 'react';
import { createRoot } from 'react-dom/client';
import { WebApp } from './web-app';

const rootElement = document.getElementById('root');

if (rootElement) {
    createRoot(rootElement).render(<WebApp />);
}
