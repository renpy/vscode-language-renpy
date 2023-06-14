import * as path from "path";
import { Compiler, Configuration, WebpackPluginInstance } from "webpack";
import CopyWebpackPlugin from "copy-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";

const PATHS = {
    src: path.join(__dirname, "src"),
    dist: path.join(__dirname, "dist"),
    cache: path.join(__dirname, "node_modules/.cache/webpack"),
    node: path.join(__dirname, "node_modules"),
};

export const basePlugins: (((this: Compiler, compiler: Compiler) => void) | WebpackPluginInstance)[] = [
    new CopyWebpackPlugin({
        patterns: [{ from: "src", to: ".", globOptions: { ignore: ["**/test/**", "**/*.ts"] }, noErrorOnMissing: true }],
    }),
    new ForkTsCheckerWebpackPlugin({
        typescript: {
            diagnosticOptions: {
                semantic: true,
                syntactic: true,
            },
            mode: "write-references",
        },
    }),
];

export const baseConfig: Configuration = {
    mode: "none", // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
    output: {
        // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        filename: "extension.js",
        path: PATHS.dist,
        library: {
            type: "commonjs2",
        },
        devtoolModuleFilenameTemplate: "../[resource-path]", // Removes the webpack:/// prefix from source maps
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                include: PATHS.src,
                use: [
                    {
                        // configure TypeScript loader:
                        // * enable sources maps for end-to-end source maps
                        loader: "ts-loader",
                        options: {
                            compilerOptions: {
                                sourceMap: true,
                            },
                        },
                    },
                ],
            },
        ],
    },
    externals: {
        vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    },
    entry: {
        extension: path.join(PATHS.src, "extension.ts"),
    },
    devtool: "source-map",

    cache: {
        type: "filesystem",
        buildDependencies: {
            // This makes all dependencies of this file - build dependencies
            config: [__filename],
            // By default webpack and loaders are build dependencies
        },
        cacheDirectory: PATHS.cache,
    },

    plugins: [...basePlugins],

    optimization: {
        splitChunks: {
            chunks: "async",
        },
    },

    stats: "normal",
};

export const nodeConfig: Configuration = {
    target: "node", // extensions run in a node context
    node: {
        __dirname: false, // leave the __dirname-behaviour intact
    },
    resolve: {
        // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        mainFields: ["module", "main"],
        extensions: [".ts", ".js"], // support ts-files and js-files
    },
    ...baseConfig,
};

export default nodeConfig;
