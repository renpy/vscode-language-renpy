import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import { Configuration, DefinePlugin } from "webpack";
import { basePlugins, baseConfig } from "./webpack.config";

export const browserConfig: Configuration = {
    target: "webworker", // extensions run in a webworker context
    resolve: {
        mainFields: ["browser", "module", "main"],
        extensions: [".ts", ".js"], // support ts-files and js-files
    },
    performance: {
        hints: false,
    },
    plugins: [
        new NodePolyfillPlugin(),
        new DefinePlugin({
            "process.platform": JSON.stringify("web"),
            "process.env": JSON.stringify({}),
            "process.env.BROWSER_ENV": JSON.stringify("true"),
        }),
        ...basePlugins,
    ],
    ...baseConfig,
};

export default browserConfig;
