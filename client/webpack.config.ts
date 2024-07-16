import * as path from "path";
import { Configuration } from "webpack";
import { nodeConfig } from "../shared.webpack.config";

const PATHS = {
    src: path.join(__dirname, "src"),
    dist: path.join(__dirname, "../dist"),
    cache: path.join(__dirname, "node_modules/.cache/webpack"),
    node: path.join(__dirname, "node_modules"),
};

export const clientConfig: Configuration = {
    entry: {
        extension: path.join(PATHS.src, "extension.ts"),
    },

    output: {
        // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        filename: "[name].js",
        path: PATHS.dist,
        library: {
            type: "commonjs2",
        },
        devtoolModuleFilenameTemplate: "../[resource-path]", // Removes the webpack:/// prefix from source maps
    },

    ...nodeConfig,
};

export default clientConfig;
