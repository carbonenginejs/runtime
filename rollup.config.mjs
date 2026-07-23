import { babel } from "@rollup/plugin-babel";

const external = id => id.startsWith("@carbonenginejs/") || id.startsWith("node:");

export default {
  input: [
    "src/index.js"
  ],
  external,
  output: {
    dir: "npm/dist",
    format: "esm",
    preserveModules: true,
    preserveModulesRoot: "src",
    sourcemap: true
  },
  plugins: [
    babel({
      babelHelpers: "bundled",
      extensions: [".js"],
      babelrc: false,
      configFile: false,
      plugins: [
        ["@babel/plugin-proposal-decorators", { version: "2023-11" }]
      ]
    })
  ]
};
