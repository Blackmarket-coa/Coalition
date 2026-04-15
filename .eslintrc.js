module.exports = {
    root: true,
    extends: '@react-native',
    overrides: [
        {
            files: ['src/**/*.{js,jsx,ts,tsx}', 'apps/**/*.{js,jsx,ts,tsx}', 'packages/**/*.{js,jsx,ts,tsx}'],
            excludedFiles: ['src/adapters/legacy-runtime/**/*.{js,jsx,ts,tsx}', 'legacy/**/*.{js,jsx,ts,tsx}'],
            rules: {
                'no-restricted-imports': [
                    'error',
                    {
                        patterns: [
                            {
                                group: ['src/legacy/**', '**/src/legacy/**', 'legacy/runtime/**', '**/legacy/runtime/**'],
                                message:
                                    'Import legacy runtime code through src/adapters/legacy-runtime only. Do not import legacy modules directly.',
                            },
                        ],
                    },
                ],
            },
        },
    ],
    rules: {
        'react/prop-types': 'off',
    },
};
