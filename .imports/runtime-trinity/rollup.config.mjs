import { babel } from "@rollup/plugin-babel";
import fs from "node:fs";
import path from "node:path";

const external = id => id.startsWith("@carbonenginejs/") || id.startsWith("node:");

function collectIndexInputs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectIndexInputs(fullPath);
    return entry.name === "index.js" ? [fullPath] : [];
  });
}

export default {
  input: [
    "src/index.js",
    "src/controllers/index.js",
    "src/curves/index.js",
    "src/eve/index.js",
    "src/particle/index.js",
    "src/postProcess/index.js",
    "src/renderJob/index.js",
    "src/shader/index.js",
    "src/core/index.js",
    "src/ui/index.js",
    "src/utilities/index.js",
    ...collectIndexInputs("src/generated")
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
