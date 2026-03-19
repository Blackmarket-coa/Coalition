const webpack = require('webpack');
const path = require('path');

module.exports = {
    mode: process.env.NODE_ENV === 'development' ? 'development' : 'production',
    entry: path.resolve(__dirname, 'index.web.tsx'),
    resolve: {
        mainFields: ['browser', 'module', 'main'],
        extensions: ['.web.tsx', '.web.ts', '.web.js', '.js', '.jsx', '.tsx', '.ts', '.mjs'],
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
            '@gorhom/portal': path.resolve(__dirname, 'apps/web/shims/gorhom-portal.tsx'),
            'react-native-share': path.resolve(__dirname, 'apps/web/shims/react-native-share.ts'),
            'react-native-video': path.resolve(__dirname, 'apps/web/shims/react-native-video.tsx'),
            'react-native-signature-canvas': path.resolve(__dirname, 'apps/web/shims/react-native-signature-canvas.tsx'),
            '@bam.tech/react-native-image-resizer': path.resolve(__dirname, 'apps/web/shims/react-native-image-resizer.ts'),
            'react-native-maps': path.resolve(__dirname, 'apps/web/shims/react-native-maps.tsx'),
            'react-native-linear-gradient': path.resolve(__dirname, 'apps/web/shims/react-native-linear-gradient.tsx'),
            'react-native-fs': path.resolve(__dirname, 'apps/web/shims/react-native-fs.ts'),
            'react-native-image-picker': path.resolve(__dirname, 'apps/web/shims/react-native-image-picker.ts'),
            'react-native-super-grid': path.resolve(__dirname, 'apps/web/shims/react-native-super-grid.tsx'),
            'react-native-calendar-strip': path.resolve(__dirname, 'apps/web/shims/react-native-calendar-strip.tsx'),
            'react-native-collapsible': path.resolve(__dirname, 'apps/web/shims/react-native-collapsible.tsx'),
            yjs: path.resolve(__dirname, 'apps/web/shims/yjs.ts'),
            'y-matrix': path.resolve(__dirname, 'apps/web/shims/y-matrix.ts'),
            '@op-engineering/op-sqlite': path.resolve(__dirname, 'apps/web/shims/op-sqlite.ts'),
            'maplibre-gl': path.resolve(__dirname, 'apps/web/shims/maplibre-gl.ts'),
            '@invertase/react-native-apple-authentication': path.resolve(__dirname, 'apps/web/shims/react-native-apple-authentication.ts'),
            '@react-native-community/blur': path.resolve(__dirname, 'apps/web/shims/react-native-community-blur.tsx'),
            '@react-native/assets-registry/registry': path.resolve(__dirname, 'apps/web/shims/react-native-assets-registry.ts'),
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
