// The page and format-worker entries all consume the same built runtime.
import path from "node:path";
import { fileURLToPath } from "node:url";
import harness from "./rollup.webgpu-harness.config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const [ shared ] = harness;
const destination = path.join(root, "test/trinityal/webgpu/demo");

// In a bundle, a format's import.meta.url would otherwise name the page
// bundle, which does not export that format. Keep an explicit importable
// facade per format; shared runtime instances never cross this boundary.
const workerFormatUrls = {
    name: "resource-worker-format-urls",
    resolveImportMeta(property, { moduleId })
    {
        if (property !== "url") return null;
        const id = moduleId.replaceAll("\\", "/");
        for (const format of [ "Gr2", "Dds" ])
        {
            if (id.endsWith("/Cjs" + format + "Format.js"))
            {
                return 'new URL("./' + format.toLowerCase() + '.worker.bundle.js", import.meta.url).href';
            }
        }
        return null;
    }
};

export default [
    [ "test/trinityal/webgpu/demo/demo.js", "demo.bundle.js" ],
    [ "test/trinityal/webgpu/demo/clouds.js", "clouds.bundle.js" ],
    [ "npm/dist/global/blue/worker/CjsResManWorker.js", "resource.worker.bundle.js" ],
    [ "npm/dist/resource/formats/gr2/CjsGr2Format.js", "gr2.worker.bundle.js" ],
    [ "npm/dist/resource/formats/dds/CjsDdsFormat.js", "dds.worker.bundle.js" ],
    [ "npm/dist/resource/formats/dds/compressionWorker.js", "dds-compression.worker.bundle.js" ]
].map(([ input, output ]) => ({
    onwarn: shared.onwarn,
    plugins: [ ...shared.plugins, workerFormatUrls ],
    input: path.join(root, input),
    output: { file: path.join(destination, output), format: "esm", inlineDynamicImports: true }
}));
