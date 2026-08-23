import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const npmRoot = path.join(packageRoot, "npm");

test("published source has no Node-only imports or globals", async () =>
{
    const sourceRoot = path.join(packageRoot, "src", "tools");
    const pending = [ sourceRoot ];
    const files = [];

    while (pending.length)
    {
        const directory = pending.pop();

        for (const entry of await fs.readdir(directory, { withFileTypes: true }))
        {
            const target = path.join(directory, entry.name);

            if (entry.isDirectory()) pending.push(target);
            if (entry.isFile() && entry.name.endsWith(".js")) files.push(target);
        }
    }

    for (const file of files)
    {
        // Documentation is scanned out first: a sentence about buffered events
        // or a process is prose, not a Node global, and a comment cannot import
        // anything.
        const source = withoutComments(await fs.readFile(file, "utf8"));

        assert.doesNotMatch(source, /(?:from|import\s*\()\s*["']node:/u, file);
        assert.doesNotMatch(source, /\bBuffer\b|\bprocess\b|\brequire\s*\(/u, file);
        // Combined-runtime source uses checked internal aliases. Reintroducing
        // donor package imports would bypass the executable layer graph.
        assert.doesNotMatch(
            source,
            /(?:from|import\s*\()\s*["']@carbonenginejs\//u,
            `${file} imports outside the allowed browser runtime boundary.`
        );
    }
});

test("the comment scan still sees violations in code", () =>
{
    const source = [
        "/** Buffer ceiling during snapshot recovery, and a process of resync. */",
        "// require( something ) in a line comment",
        "import fs from \"node:fs\";",
        "const url = \"https://example.test/a//b\";",
    ].join("\n");

    const scanned = withoutComments(source);

    assert.doesNotMatch(scanned, /ceiling|resync|line comment/u, "comments are removed");
    assert.match(scanned, /(?:from|import\s*\()\s*["']node:/u, "a real import still matches");
    assert.match(scanned, /example\.test\/a\/\/b/u, "a URL inside a string survives");
});

/**
 * Removes block comments and whole-line comments, leaving code and string
 * literals intact. A trailing comment after code is left alone rather than
 * risking a `//` inside a string literal, which would swallow real code.
 *
 * @param {string} source Module source text.
 * @returns {string} Source with documentation removed.
 */
function withoutComments(source)
{
    return source
        .replace(/\/\*[\s\S]*?\*\//gu, " ")
        .split(/\r?\n/u)
        .filter(line => !line.trim().startsWith("//"))
        .join("\n");
}

test("the wire-only subpath does not read WebSocket or Fetch while importing", () =>
{
    const probe = spawnSync(process.execPath, [
        "--input-type=module",
        "--eval",
        `
            for (const name of [ "WebSocket", "fetch" ])
            {
                Object.defineProperty(globalThis, name, {
                    configurable: true,
                    get()
                    {
                        throw new Error(\`Wire import touched \${name}\`);
                    }
                });
            }

            const wire = await import("@carbonenginejs/runtime/tools/realtime/wire");

            if (wire.REALTIME_SUBPROTOCOL !== "carbon.tools.realtime.v1")
            {
                throw new Error("Unexpected realtime subprotocol");
            }

            if (typeof wire.CjsRealtimeProtocol.parseText !== "function")
            {
                throw new Error("Missing realtime protocol");
            }
        `
    ], {
        cwd: packageRoot,
        encoding: "utf8"
    });

    assert.equal(probe.status, 0, probe.stderr || probe.stdout);
});

test("the combined manifest exposes focused tools without a tools-core dependency", async () =>
{
    const manifest = JSON.parse(await fs.readFile(path.join(packageRoot, "package.json"), "utf8"));

    assert.equal(manifest.dependencies?.["@carbonenginejs/tools-core"], undefined);
    assert.equal(
        manifest.exports["./tools/market/ui.css"],
        "./src/tools/market/ui/market-window.css"
    );
    assert.equal(
        manifest.exports["./tools/ship-show-info/ui.css"],
        "./src/tools/ship-show-info/ui/ship-show-info.css"
    );
    assert.equal(manifest.exports["./tools/diagrams"], "./src/tools/diagrams/index.js");
    assert.equal(manifest.exports["./tools/ship-tree"], "./src/tools/ship-tree/index.js");
    assert.equal(manifest.exports["./tools/ship-tree/ui"], "./src/tools/ship-tree/ui/index.js");
    assert.equal(manifest.exports["./tools/ship-tree/ui.css"], "./src/tools/ship-tree/ui/ship-tree.css");
    assert.equal(manifest.exports["./tools/theme/eve.css"], "./src/tools/theme/eve.css");
    assert.equal(Object.hasOwn(manifest, "sideEffects"), false);
});

test("generated tools CSS exports are exact copies and stay conservatively side-effectful", async () =>
{
    const sourceManifest = JSON.parse(await fs.readFile(path.join(packageRoot, "package.json"), "utf8"));
    const npmManifest = JSON.parse(await fs.readFile(path.join(npmRoot, "package.json"), "utf8"));
    const styles = {
        "./tools/market/ui.css": "tools/market/ui/market-window.css",
        "./tools/ship-show-info/ui.css": "tools/ship-show-info/ui/ship-show-info.css",
        "./tools/ship-tree/ui.css": "tools/ship-tree/ui/ship-tree.css",
        "./tools/theme/eve.css": "tools/theme/eve.css"
    };

    assert.equal(Object.hasOwn(sourceManifest, "sideEffects"), false);
    assert.equal(Object.hasOwn(npmManifest, "sideEffects"), false);
    for (const [ subpath, relative ] of Object.entries(styles))
    {
        assert.equal(sourceManifest.exports[subpath], `./src/${relative}`);
        assert.equal(npmManifest.exports[subpath], `./dist/${relative}`);
        assert.deepEqual(
            await fs.readFile(path.join(packageRoot, "src", relative)),
            await fs.readFile(path.join(npmRoot, "dist", relative)),
            subpath
        );
    }
});

test("the public theme is scoped and carries no external assets", async () =>
{
    const source = await fs.readFile(path.join(packageRoot, "src", "tools", "theme", "eve.css"), "utf8");

    assert.match(source, /^\.cjs-eve-theme\s*\{/u);
    assert.doesNotMatch(source, /@font-face|\burl\s*\(|(?:^|[},]\s*)(?:html|body)\b/imu);
    assert.match(source, /prefers-reduced-motion/u);
});

test("logic families have no presentation dependency", async () =>
{
    for (const family of [ "demos", "diagrams", "market", "ship-show-info", "ship-tree" ])
    {
        const sourceRoot = path.join(packageRoot, "src", "tools", family);
        const files = await fs.readdir(sourceRoot);

        for (const name of files.filter(item => item.endsWith(".js")))
        {
            const source = withoutComments(await fs.readFile(path.join(sourceRoot, name), "utf8"));

            assert.doesNotMatch(
                source,
                /(?:from|import\s*\()\s*["'][^"']*\.css["']|\b(?:document|window|HTMLElement|customElements)\b|\.innerHTML\b|\.classList\b|\.createElement\s*\(/u,
                `${family}/${name} crosses the logic/UI boundary.`
            );
        }
    }
});

test("every JavaScript public subpath imports independently", async () =>
{
    for (const name of [
        "audio",
        "chat",
        "demo-apps",
        "demos",
        "diagrams",
        "fileindex",
        "market",
        "market/ui",
        "realtime",
        "realtime/wire",
        "ship-show-info",
        "ship-show-info/ui",
        "ship-tree",
        "ship-tree/ui"
    ])
    {
        const module = await import(`@carbonenginejs/runtime/tools/${name}`);

        assert.ok(Object.keys(module).length > 0, name);
    }

    const root = await import("../../../npm/dist/tools/index.js");
    const perobject = await import("../../../npm/dist/tools/perobject/index.js");
    const aggregate = await import("../../../npm/dist/index.js");

    assert.ok(Object.keys(root).length > 0, "root");
    assert.ok(Object.keys(perobject).length > 0, "perobject");
    assert.equal(root.TnyMarketWindow, undefined);
    assert.equal(root.TnyMarketDetailsDemo, undefined);
    assert.equal(root.TnyShipShowInfoWindow, undefined);
    assert.equal(root.TnyShipShowInfoDemo, undefined);
    assert.equal(root.TnyShipTreeWindow, undefined);
    assert.equal(aggregate.CjsDiagramModel, undefined);
    assert.equal(aggregate.CjsFileIndex, undefined);
    assert.equal(aggregate.CjsRealtimeClient, undefined);
});

test("optional Ship Tree presentation consumes the controller boundary", async () =>
{
    const source = await fs.readFile(path.join(
        packageRoot,
        "src",
        "tools",
        "ship-tree",
        "ui",
        "TnyShipTreeWindow.js"
    ), "utf8");
    const css = await fs.readFile(path.join(
        packageRoot,
        "src",
        "tools",
        "ship-tree",
        "ui",
        "ship-tree.css"
    ), "utf8");

    assert.match(source, /from "\.\.\/CjsShipTreeController\.js"/u);
    assert.doesNotMatch(source, /this\.source|\/sde\//u);
    assert.match(css, /^\.ship-tree-host\s*\{/u);
    assert.doesNotMatch(css, /@font-face|url\(\s*["']?(?:https?:|\/|res:)/u);
});

test("published Show Info presentation aliases resolve to the canonical Tny window", async () =>
{
    const presentation = await import("@carbonenginejs/runtime/tools/ship-show-info/ui");

    assert.equal(presentation.TnyShipShowInfoWindow.name, "TnyShipShowInfoWindow");
    assert.equal(
        presentation.CjsESIShipShowInfoUIWindow,
        presentation.TnyShipShowInfoWindow
    );
});

test("optional Show Info presentation consumes the controller boundary", async () =>
{
    const source = await fs.readFile(path.join(
        packageRoot,
        "src",
        "tools",
        "ship-show-info",
        "ui",
        "TnyShipShowInfoWindow.js"
    ), "utf8");
    const css = await fs.readFile(path.join(
        packageRoot,
        "src",
        "tools",
        "ship-show-info",
        "ui",
        "ship-show-info.css"
    ), "utf8");

    assert.match(source, /from "\.\.\/CjsShipShowInfoController\.js"/u);
    assert.match(source, /controller instanceof CjsShipShowInfoController/u);
    assert.doesNotMatch(source, /this\.shipSource|PANEL_METHODS|\.FetchShip\s*\(/u);
    assert.match(css, /^\.ship-show-info-host\s*\{/u);
    assert.doesNotMatch(css, /@font-face|\burl\s*\(/u);
});

test("optional Market presentation consumes the controller boundary", async () =>
{
    const source = await fs.readFile(path.join(
        packageRoot,
        "src",
        "tools",
        "market",
        "ui",
        "TnyMarketWindow.js"
    ), "utf8");
    const css = await fs.readFile(path.join(
        packageRoot,
        "src",
        "tools",
        "market",
        "ui",
        "market-window.css"
    ), "utf8");

    assert.match(source, /from "\.\.\/CjsMarketController\.js"/u);
    assert.match(source, /controller instanceof CjsMarketController/u);
    assert.doesNotMatch(source, /this\.source|\.GetRegions\s*\(|\.GetOrders\s*\(|\.GetHistory\s*\(/u);
    assert.match(css, /^\.market-window-host\s*\{/u);
    assert.doesNotMatch(css, /@font-face|\burl\s*\(/u);
});
