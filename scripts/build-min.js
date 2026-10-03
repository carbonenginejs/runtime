// The per-file Rollup build remains the package's default. This second entry
// bundles that already-transformed ESM graph, including its dependency code.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { minifyOptions } from "./minify-options.js";
import { transformAsync } from "@babel/core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "npm/dist");
const outfile = path.join(dist, "carbonenginejs.min.js");
await build({
    ...minifyOptions,
    absWorkingDir: root,
    entryPoints: [path.join(dist, "index.js")],
    outfile,
    bundle: true,
    external: ["node:*"],
    plugins: [{
        name: "worker-entry-relative-to-bundle",
        setup(build)
        {
            // The worker is an independent entry already shipped in dist.
            // Its URL must be relative to the bundle, not this former module.
            // Format readers remain opt-in per-file entries, so retain their
            // original module URLs when a reader is bundled internally.
            build.onLoad({ filter: /Cjs(?:ResManWorkerLoader|BlackFormat|DdsFormat|WemFormat|BnkFormat|Gr2Format)\.js$/ }, async ({ path: file }) =>
            {
                const code = await fs.readFile(file, "utf8");
                const inputSourceMap = JSON.parse(await fs.readFile(`${file}.map`, "utf8"));
                const result = await transformAsync(code, {
                    filename: file, babelrc: false, configFile: false,
                    inputSourceMap, sourceMaps: "inline",
                    plugins: [({ types: t }) => ({ visitor: {
                        ObjectProperty(p)
                        {
                            if (p.node.key.name === "module" && p.node.value.type === "MemberExpression"
                                && p.node.value.object.type === "MetaProperty" && p.node.value.property.name === "url")
                            {
                                const relative = "./" + path.relative(dist, file).replaceAll("\\", "/");
                                p.get("value").replaceWith(t.memberExpression(
                                    t.newExpression(t.identifier("URL"), [t.stringLiteral(relative), p.node.value]), t.identifier("href")));
                            }
                        },
                        NewExpression(p)
                        {
                            if (p.node.callee.name === "URL" && p.node.arguments[0]?.value === "./CjsResManWorker.js")
                                p.node.arguments[0].value = "./global/blue/worker/CjsResManWorker.js";
                        }
                    } })]
                });
                return { contents: result.code, loader: "js", resolveDir: path.dirname(file) };
            });
        }
    }]
});
const bytes = await fs.readFile(outfile);
console.log(`carbonenginejs.min.js: ${bytes.length} bytes raw; ${gzipSync(bytes).length} bytes gzip`);
