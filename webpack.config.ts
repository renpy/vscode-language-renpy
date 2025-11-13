import CopyWebpackPlugin from "copy-webpack-plugin";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import * as path from "path";
import { Compiler, Configuration, WebpackPluginInstance } from "webpack";
import WebpackShellPlugin from "webpack-shell-plugin-next";

const PATHS = {
    src: path.join(__dirname, "src"),
    dist: path.join(__dirname, "dist"),
    cache: path.join(__dirname, "node_modules/.cache/webpack"),
    node: path.join(__dirname, "node_modules"),
    scripts: path.join(__dirname, "scripts"),
};

const webpackShellPlugin = new WebpackShellPlugin({
    onBeforeCompile: {
        scripts: [`uv run --directory ${PATHS.scripts} tmlanguage_yaml_to_json.py`],
        blocking: true,
        parallel: false,
    },
});

class WatchYamlFilesPlugin {
    apply(compiler: Compiler) {
        compiler.hooks.afterCompile.tap("WatchYamlFilesPlugin", (compilation) => {
            compilation.fileDependencies.add(path.join(__dirname, "syntaxes", "renpy.atl.tmLanguage.yaml"));
            compilation.fileDependencies.add(path.join(__dirname, "syntaxes", "renpy.screen.tmLanguage.yaml"));
            compilation.fileDependencies.add(path.join(__dirname, "syntaxes", "renpy.style.tmLanguage.yaml"));
            compilation.fileDependencies.add(path.join(__dirname, "syntaxes", "renpy.tmLanguage.yaml"));
        });
    }
}

export const basePlugins: (((this: Compiler, compiler: Compiler) => void) | WebpackPluginInstance)[] = [
    new WatchYamlFilesPlugin(),
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

    plugins: [webpackShellPlugin, ...basePlugins],

    watchOptions: {
        // for some systems, watching many files can result in a lot of CPU or memory usage
        // https://webpack.js.org/configuration/watch/#watchoptionsignored
        // don't use this pattern, if you have a monorepo with linked packages
        ignored: /node_modules/,
    },

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
        alias: {
            // Map the 'src' path to the actual src directory
            src: path.resolve(__dirname, "src"),
        },
    },
    ...baseConfig,
};

export default nodeConfig;
