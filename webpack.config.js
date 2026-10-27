const path = require("path");
function get_config(server) {
    return {
        target: "node",
        entry: `./${server}/server.ts`,
        output: {
            filename: `bundle.js`,
            path: path.resolve(__dirname, `./dist/${server}`),
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: [".ts", ".js"],
        },
    };
}
module.exports = (env) => {
    switch (env.project) {
        case "gateway":
        case "api":
            return get_config(env.project);
    }
};
