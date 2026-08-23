import { babel } from "@rollup/plugin-babel";

const external = id => id.startsWith("@carbonenginejs/") || id.startsWith("node:");

export default {
  input: [
    "src/index.js",
    // Explicit entry so the graph-only ./trinity facade survives
    // preserveModules (pure re-export barrels are elided otherwise).
    "src/trinity/index.js",
    "src/library/index.js",
    // Optional library construction stays out of the root module graph.
    "src/library-builder/index.js"
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
