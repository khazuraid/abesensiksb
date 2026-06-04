const path = require("path");

module.exports = (options) => ({
	...options,
	externals: [
		// Exclude semua node_modules KECUALI @adms/* workspace packages
		({ request }, callback) => {
			if (request?.startsWith("@adms/")) {
				return callback(); // bundle it
			}
			if (request && !request.startsWith(".") && !path.isAbsolute(request)) {
				return callback(null, "commonjs " + request);
			}
			callback();
		},
	],
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: [{ loader: "ts-loader", options: { transpileOnly: true } }],
			},
		],
	},
	resolve: {
		...options.resolve,
		extensions: [".ts", ".js", ".json"],
	},
});
