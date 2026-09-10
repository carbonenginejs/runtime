// Bundles the WebGPU demo for the browser.
//
// The same resolver the harness config uses, for the same reason: the demo
// imports the runtime by its `#` subpath specifiers, which a browser cannot
// resolve, and `node:` anything in this graph is a layering mistake worth
// failing on rather than shimming.
import path from "node:path";
import { fileURLToPath } from "node:url";

import harness from "./rollup.webgpu-harness.config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const [ shared ] = harness;

export default [ {
    onwarn: shared.onwarn,
    plugins: shared.plugins,
    input: path.join(root, "test/trinityal/webgpu/demo/demo.js"),
    output: {
        file: path.join(root, "test/trinityal/webgpu/demo/demo.bundle.js"),
        format: "esm",
        inlineDynamicImports: true
    }
} ];
