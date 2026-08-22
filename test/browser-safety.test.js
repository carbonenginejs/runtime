import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("published source has no Node-only imports or globals", async () =>
{
    const sourceRoot = path.join(packageRoot, "src");
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
        // runtime-trinity is permitted for its narrow `/perobject` subpath only,
        // which is a single leaf module with no imports of its own - the Carbon
        // per-object layouts. The package root would drag in the whole runtime,
        // so it stays outside the boundary.
        assert.doesNotMatch(
            source,
            /(?:from|import\s*\()\s*["']@carbonenginejs\/(?!runtime-(?:audio|resource|utils)(?:\/|["'])|runtime-trinity\/perobject["'])/u,
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

            const wire = await import("@carbonenginejs/tools-browser/realtime/wire");

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

test("the published manifest has no Node host contract", async () =>
{
    const manifest = JSON.parse(await fs.readFile(path.join(packageRoot, "package.json"), "utf8"));

    assert.equal(manifest.engines?.node, undefined);
    assert.equal(manifest.dependencies?.["@carbonenginejs/tools-core"], undefined);
    assert.equal(
        manifest.exports["./market/ui.css"],
        "./src/market/ui/market-window.css"
    );
    assert.equal(
        manifest.exports["./ship-show-info/ui.css"],
        "./src/ship-show-info/ui/ship-show-info.css"
    );
    assert.equal(manifest.exports["./diagrams"], "./src/diagrams/index.js");
    assert.equal(manifest.exports["./ship-tree"], "./src/ship-tree/index.js");
    assert.equal(manifest.exports["./ship-tree/ui"], "./src/ship-tree/ui/index.js");
    assert.equal(manifest.exports["./ship-tree/ui.css"], "./src/ship-tree/ui/ship-tree.css");
    assert.equal(manifest.exports["./theme/eve.css"], "./src/theme/eve.css");
});

test("the public theme is scoped and carries no external assets", async () =>
{
    const source = await fs.readFile(path.join(packageRoot, "src", "theme", "eve.css"), "utf8");

    assert.match(source, /^\.cjs-eve-theme\s*\{/u);
    assert.doesNotMatch(source, /@font-face|\burl\s*\(|(?:^|[},]\s*)(?:html|body)\b/imu);
    assert.match(source, /prefers-reduced-motion/u);
});

test("logic families have no presentation dependency", async () =>
{
    for (const family of [ "demos", "diagrams", "market", "ship-show-info", "ship-tree" ])
    {
        const sourceRoot = path.join(packageRoot, "src", family);
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
        const module = await import(`@carbonenginejs/tools-browser/${name}`);

        assert.ok(Object.keys(module).length > 0, name);
    }

    const root = await import("@carbonenginejs/tools-browser");

    assert.ok(Object.keys(root).length > 0, "root");
    assert.equal(root.TnyMarketWindow, undefined);
    assert.equal(root.TnyMarketDetailsDemo, undefined);
    assert.equal(root.TnyShipShowInfoWindow, undefined);
    assert.equal(root.TnyShipShowInfoDemo, undefined);
    assert.equal(root.TnyShipTreeWindow, undefined);
});

test("optional Ship Tree presentation consumes the controller boundary", async () =>
{
    const source = await fs.readFile(path.join(
        packageRoot,
        "src",
        "ship-tree",
        "ui",
        "TnyShipTreeWindow.js"
    ), "utf8");
    const css = await fs.readFile(path.join(
        packageRoot,
        "src",
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
    const presentation = await import("@carbonenginejs/tools-browser/ship-show-info/ui");

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
        "ship-show-info",
        "ui",
        "TnyShipShowInfoWindow.js"
    ), "utf8");
    const css = await fs.readFile(path.join(
        packageRoot,
        "src",
        "ship-show-info",
        "ui",
        "ship-show-info.css"
    ), "utf8");

    assert.match(source, /from "\.\.\/CjsShipShowInfoController\.js"/u);
    assert.doesNotMatch(source, /this\.shipSource|PANEL_METHODS|\.FetchShip\s*\(/u);
    assert.match(css, /^\.ship-show-info-host\s*\{/u);
    assert.doesNotMatch(css, /@font-face|\burl\s*\(/u);
});

test("optional Market presentation consumes the controller boundary", async () =>
{
    const source = await fs.readFile(path.join(
        packageRoot,
        "src",
        "market",
        "ui",
        "TnyMarketWindow.js"
    ), "utf8");
    const css = await fs.readFile(path.join(
        packageRoot,
        "src",
        "market",
        "ui",
        "market-window.css"
    ), "utf8");

    assert.match(source, /from "\.\.\/CjsMarketController\.js"/u);
    assert.doesNotMatch(source, /this\.source|\.GetRegions\s*\(|\.GetOrders\s*\(|\.GetHistory\s*\(/u);
    assert.match(css, /^\.market-window-host\s*\{/u);
    assert.doesNotMatch(css, /@font-face|\burl\s*\(/u);
});
