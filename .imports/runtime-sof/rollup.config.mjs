import { babel } from "@rollup/plugin-babel";
import fs from "node:fs";
import path from "node:path";

const external = id => id.startsWith("@carbonenginejs/") || id.startsWith("node:");
const generatedDir = path.resolve("src/generated");
const generatedInputs = fs.readdirSync(generatedDir)
  .filter(file => file.endsWith(".js"))
  .map(file => path.join("src/generated", file));
const sofDir = path.resolve("src/sof");
const sofDomainInputs = fs.readdirSync(sofDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(path.join(sofDir, entry.name, "index.js")))
  .map(entry => path.join("src/sof", entry.name, "index.js"));

export default {
  input: [
    "src/index.js",
    "src/data/index.js",
    "src/sof/index.js",
    ...sofDomainInputs,
    ...generatedInputs
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
