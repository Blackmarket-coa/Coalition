const webpack = require('webpack');
const path = require('path');

module.exports = {
    mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
    entry: path.resolve(__dirname, 'apps/web/index.web.tsx'),
    resolve: {
        mainFields: ['react-native', 'browser', 'module', 'main'],
        extensions: ['.web.js', '.js', '.jsx', '.tsx', '.ts', '.mjs'],
        alias: {
            'react-native$': 'react-native-web',
            '@gorhom/bottom-sheet': path.resolve(__dirname, 'apps/web/shims/bottom-sheet.tsx'),
            '@maplibre/maplibre-react-native': path.resolve(__dirname, 'apps/web/shims/maplibre-react-native.tsx'),
            '@react-native-async-storage/async-storage': path.resolve(__dirname, 'apps/web/shims/async-storage.ts'),
            '@backpackapp-io/react-native-toast': path.resolve(__dirname, 'apps/web/shims/react-native-toast.tsx'),
            'react-native-vision-camera': path.resolve(__dirname, 'apps/web/shims/react-native-vision-camera.tsx'),
            'react-native-launch-navigator': path.resolve(__dirname, 'apps/web/shims/react-native-launch-navigator.ts'),
        },
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.(js|ts|tsx)$/,
                exclude: (modulePath) => {
                    if (!/node_modules/.test(modulePath)) {
                        return false;
                    }

                    return !/(react-native-video|react-native-svg|react-native-super-grid|@gorhom\/portal|@bam\.tech\/react-native-image-resizer)/.test(modulePath);
                },
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', { targets: 'defaults' }],
                            '@babel/preset-react',
                            ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
                        ],
                        plugins: [],
                    },
                },
            },
            {
                test: /\.m?js$/,
                resolve: {
                    fullySpecified: false,
                },
            },
            {
                test: /\.(png|jpe?g|gif|webp|svg|ttf|woff2?)$/i,
                type: 'asset/resource',
            },
        ],
    },
    optimization: {
        concatenateModules: false,
    },
    devServer: {
        static: {
            directory: path.resolve(__dirname, 'dist'),
        },
        compress: true,
        host: '0.0.0.0',
        port: Number(process.env.PORT) || 8080,
        hot: true,
    },
    plugins: [
        new webpack.DefinePlugin({
            __DEV__: JSON.stringify(true),
        }),
    ],
};
