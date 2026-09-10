// Bundles the audio demo for the browser.
//
// Same reason as the WebGPU demo: the demo reaches the runtime through `npm/dist`,
// whose modules import each other by `#` subpath specifiers that a browser cannot
// resolve. The harness config's resolver and warning policy are reused so both
// demos fail on the same things.
import path from "node:path";
import { fileURLToPath } from "node:url";

import harness from "./rollup.webgpu-harness.config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const [ shared ] = harness;

export default [ {
    onwarn: shared.onwarn,
    plugins: shared.plugins,
    input: path.join(root, "test/audio/demo/demo.js"),
    output: {
        file: path.join(root, "test/audio/demo/demo.bundle.js"),
        format: "esm",
        inlineDynamicImports: true
    }
} ];
