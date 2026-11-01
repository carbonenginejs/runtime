// The browser worker bundles, built from the built runtime into
// npm/dist/workers/ by `npm run build:npm` and published as
// `@carbonenginejs/runtime/workers/*`. A page serves them beside its own bundle:
// the resource worker loads the GR2 and DDS format bundles from its own folder,
// and composition passes the others to CjsLibrary (resMan.workerLoader,
// callbackMan.workerModule, callbackModules). Consumers copy them rather than
// bundling the entries again, so there is one build of each.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shared } from "./rollup.browser-shared.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const destination = path.join(root, "npm/dist/workers");

/** The worker bundles, by output file name, and the built module each is bundled from. */
export const WORKER_BUNDLES = Object.freeze({
    "resource.worker.bundle.js": "npm/dist/blue/blue/worker/CjsResManWorker.js",
    "gr2.worker.bundle.js": "npm/dist/resource/formats/gr2/CjsGr2Format.js",
    "dds.worker.bundle.js": "npm/dist/resource/formats/dds/CjsDdsFormat.js",
    "dds-compression.worker.bundle.js": "npm/dist/resource/codecs/bcn/compressionWorker.js",
    "image-decode.worker.bundle.js": "npm/dist/resource/imageio/imageDecodeCallbacks.js",
    "callback-man.worker.bundle.js": "npm/dist/blue/blue/worker/blueCallbackManWorkerEntry.js"
});

/**
 * In a bundle, a format's import.meta.url would otherwise name the bundle that
 * contains it, which does not export that format. This points CjsGr2Format and
 * CjsDdsFormat at their worker bundle in the same folder; a page bundle that
 * includes those formats uses it too, so it must be served beside the workers.
 */
export const workerFormatUrls = {
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

export default Object.entries(WORKER_BUNDLES).map(([ output, input ]) => ({
    onwarn: shared.onwarn,
    plugins: [ ...shared.plugins, workerFormatUrls ],
    input: path.join(root, input),
    output: { file: path.join(destination, output), format: "esm", inlineDynamicImports: true }
}));
