import assert from "node:assert/strict";
import test from "node:test";

import {
    CjsFileIndex,
    CjsFileIndexEntry,
    CjsFileIndexLibrary,
    CjsFileIndexOverlay,
    CjsFileIndexSource
} from "@carbonenginejs/tools-browser/fileindex";
import { encodeUtf8 } from "@carbonenginejs/runtime-utils/text";

const fullRow = "res:/Graphics/Foo.red,AA/source,0123456789abcdef0123456789abcdef,42,21,1";
const provider = Object.freeze({
    game: "Eve",
    id: "test",
    defaultBuildRef: "latest",
    remote: Object.freeze({
        metadataBaseURL: "https://metadata.test",
        indexBaseURL: "https://indexes.test",
        appBaseURL: "https://app.test",
        resBaseURL: "https://resources.test"
    }),
    clients: Object.freeze({
        live: Object.freeze({ metadataToken: "LIVE", aliases: Object.freeze([ "tq" ]) }),
        preview: Object.freeze({ metadataToken: "PREVIEW", aliases: Object.freeze([]) })
    })
});

test("parses immutable entries with Carbon naming", () =>
{
    const entry = CjsFileIndexEntry.parse(fullRow, 7);

    assert.equal(entry instanceof CjsFileIndexEntry, true);
    assert.equal(entry.logicalPath, "res:/graphics/foo.red");
    assert.equal(entry.sourceLogicalPath, "res:/Graphics/Foo.red");
    assert.equal(entry.relativePath, "graphics/foo.red");
    assert.equal(entry.location, "AA/source");
    assert.equal(entry.checksum, "0123456789abcdef0123456789abcdef");
    assert.equal(entry.uncompressedSize, 42);
    assert.equal(entry.compressedSize, 21);
    assert.equal(entry.binaryOperation, 1);
    assert.equal(entry.lineNumber, 7);
    assert.equal(Object.isFrozen(entry), true);
});

test("preserves order and provides deterministic lookup", () =>
{
    const index = CjsFileIndex.parseResFileIndex("res:/z.red,aa/z\nGraphics/A.red,bb/a", {
        name: "main",
        sourceURL: "https://index.test/resfileindex.txt"
    });

    assert.equal(index instanceof CjsFileIndex, true);
    assert.deepEqual(index.entries.map(entry => entry.logicalPath), [ "res:/z.red", "res:/graphics/a.red" ]);
    assert.equal(index.Find("GRAPHICS\\A.RED").location, "bb/a");
    assert.equal(index.Has("missing.red"), false);
    assert.deepEqual([ ...index ], index.entries);
});

test("decodes caller-supplied bytes and loads through injected fetch", async () =>
{
    const decoded = CjsFileIndex.decodeResFileIndex(encodeUtf8("res:/offline.red,aa/offline"));
    const loaded = await CjsFileIndex.loadResFileIndex("https://origin.test/index", {
        name: "remote",
        fetch: async () => ({
            ok: true,
            status: 200,
            url: "https://cdn.test/resfileindex.txt",
            async arrayBuffer() { return encodeUtf8("res:/remote.red,bb/remote").buffer; }
        })
    });

    assert.equal(decoded.Find("offline.red").location, "aa/offline");
    assert.equal(loaded.sourceURL, "https://cdn.test/resfileindex.txt");
    assert.equal(loaded.Find("remote.red").location, "bb/remote");
});

test("rejects unsafe, duplicate, malformed, and failed loads", async () =>
{
    assert.throws(() => CjsFileIndexEntry.normalizeLogicalPath("app:/other.txt"), /root/u);
    assert.throws(() => CjsFileIndexEntry.normalizeLogicalPath("res:/../other.txt"), /Unsafe/u);
    assert.throws(() => CjsFileIndexEntry.normalizeLocation("../payload"), /Unsafe/u);
    assert.throws(() => CjsFileIndexEntry.normalizeLocation("%2e%2e/escape.bin"), /Unsafe/u);
    assert.throws(() => CjsFileIndexEntry.normalizeLocation("javascript:alert(1)"), /Unsafe/u);
    assert.throws(() => CjsFileIndex.parseResFileIndex("res:/a.red,aa/a\nres:/A.red,bb/a"), /Duplicate/u);
    assert.throws(() => CjsFileIndexEntry.parse("res:/only-path"), /2 to 6/u);

    await assert.rejects(
        CjsFileIndex.loadResFileIndex("https://index.test/missing", {
            fetch: async () => ({
                ok: false,
                status: 404,
                url: "https://index.test/missing",
                async arrayBuffer() { return new ArrayBuffer(0); }
            })
        }),
        error => error.code === "CJS_FILEINDEX_HTTP_ERROR" && error.status === 404
    );
});

test("retains named declarations including windows_prefetch", () =>
{
    const appIndex = CjsFileIndex.parseAppFileIndex([
        "app:/resfileindex.txt,aa/main",
        "app:/resfileindex_windows.txt,bb/windows",
        "app:/resfileindex_windows_prefetch.txt,cc/windows-prefetch",
        "app:/resfileindex_linux.txt,dd/linux",
        "app:/other.txt,ee/other"
    ].join("\n"));
    const declarations = CjsFileIndex.discoverResFileIndexes(appIndex);

    assert.deepEqual(declarations.map(item => item.name), [ "main", "windows", "windows_prefetch", "linux" ]);
    assert.equal(declarations[2].entry.location, "cc/windows-prefetch");
});

test("loads declared indexes without filesystem caching", async () =>
{
    const appIndex = CjsFileIndex.parseAppFileIndex([
        "app:/resfileindex.txt,aa/main",
        "app:/resfileindex_windows_prefetch.txt,cc/windows-prefetch"
    ].join("\n"));
    const requested = [];
    const loaded = await CjsFileIndex.loadDeclaredResFileIndexes(appIndex, {
        baseURL: "https://cdn.test/app",
        fetch: async source =>
        {
            requested.push(source);
            const name = source.includes("windows-prefetch") ? "shader.sm_hi" : "main.red";
            return {
                ok: true,
                status: 200,
                url: source,
                async arrayBuffer() { return encodeUtf8(`res:/${name},payload/${name}`).buffer; }
            };
        }
    });

    assert.deepEqual(requested, [
        "https://cdn.test/app/aa/main",
        "https://cdn.test/app/cc/windows-prefetch"
    ]);
    assert.deepEqual(loaded.map(item => item.name), [ "main", "windows_prefetch" ]);
});

test("resolves compact source-prefixed locations without merging indexes", () =>
{
    const source = new CjsFileIndexSource({ id: "001", baseURL: "https://mirror.test/resources" });
    const library = createLibrary({
        sources: [ source ],
        resFileIndexes: [ {
            name: "windows_prefetch",
            sourceID: "default",
            index: CjsFileIndex.parseResFileIndex("res:/shader.sm_hi,001:/20_230230203_230230230", {
                name: "windows_prefetch"
            })
        } ]
    });
    const result = library.Resolve("shader.sm_hi");

    assert.equal(result.indexName, "windows_prefetch");
    assert.equal(result.sourceID, "001");
    assert.equal(result.sourceURL, "https://mirror.test/resources/20_230230203_230230230");
    assert.equal(Object.isFrozen(result), true);
    assert.throws(
        () => new CjsFileIndexSource({ id: "local", baseURL: "file:///tmp/resources" }),
        /HTTP/u
    );
    assert.throws(() => source.Resolve("%2e%2e/escape.bin"), /Unsafe|escapes/u);
    assert.throws(() => source.Resolve("javascript:alert(1)"), /Unsafe/u);
});

test("manual overrides precede official indexes and fallbacks follow them", () =>
{
    const official = CjsFileIndex.parseResFileIndex("res:/broken.red,official/broken", { name: "main" });
    const override = CjsFileIndexOverlay.parse("res:/broken.red,repaired/broken", {
        name: "repair",
        mode: "override",
        sourceID: "repair"
    });
    const fallback = CjsFileIndexOverlay.parse("res:/extra.red,extra/item", {
        name: "extras",
        mode: "fallback",
        sourceID: "repair"
    });
    const library = createLibrary({
        resFileIndexes: [ { name: "main", index: official } ],
        overlays: [ override, fallback ],
        sources: [ { id: "repair", baseURL: "https://repair.test" } ]
    });

    assert.equal(library.Resolve("broken.red").sourceURL, "https://repair.test/repaired/broken");
    assert.equal(library.Resolve("extra.red").mode, "fallback");
    assert.equal(library.Resolve("broken.red", { indexName: "main" }).sourceURL, "https://resources.test/official/broken");
    assert.equal(library.Resolve("missing.red"), null);
});

test("the last declared official resfileindex clobbers earlier records", () =>
{
    const first = CjsFileIndex.parseResFileIndex("res:/same.red,first/location", { name: "main" });
    const second = CjsFileIndex.parseResFileIndex("res:/same.red,second/location", { name: "prefetch" });
    const library = createLibrary({
        resFileIndexes: [
            { name: "main", index: first },
            { name: "prefetch", index: second }
        ]
    });
    const resolved = library.Resolve("same.red");

    assert.equal(resolved.indexName, "prefetch");
    assert.equal(resolved.sourceURL, "https://resources.test/second/location");
    assert.equal(
        library.Resolve("same.red", { indexName: "main" }).sourceURL,
        "https://resources.test/first/location"
    );
});

test("rejects ambiguous same-level overlays", () =>
{
    const first = CjsFileIndexOverlay.parse("res:/same.red,one", {
        name: "first",
        mode: "override"
    });
    const second = CjsFileIndexOverlay.parse("res:/same.red,two", {
        name: "second",
        mode: "override"
    });
    const library = createLibrary({ resFileIndexes: [], overlays: [ first, second ] });

    assert.throws(() => library.Resolve("same.red"), /Ambiguous/u);
});

test("discovers the latest build from caller-supplied provider data", async () =>
{
    const requested = [];
    const payloads = new Map([
        [ "https://metadata.test/eveclient_LIVE.json", { json: { build: 42 } } ],
        [ "https://metadata.test/eveclient_PREVIEW.json", { json: { buildNumber: "43" } } ],
        [ "https://indexes.test/eveonline_43.txt", { text: "app:/resfileindex_windows_prefetch.txt,bb/prefetch" } ],
        [ "https://app.test/bb/prefetch", { text: "res:/shader.sm_hi,payload/shader" } ]
    ]);
    const library = await CjsFileIndexLibrary.load(provider, {
        fetch: async source =>
        {
            requested.push(source);
            const payload = payloads.get(source);
            return {
                ok: true,
                status: 200,
                url: source,
                async json() { return payload.json; },
                async arrayBuffer() { return encodeUtf8(payload.text).buffer; }
            };
        }
    });

    assert.equal(library instanceof CjsFileIndexLibrary, true);
    assert.equal(library.build, "43");
    assert.equal(library.GetResFileIndex("windows_prefetch").Has("shader.sm_hi"), true);
    assert.deepEqual(requested, [
        "https://metadata.test/eveclient_LIVE.json",
        "https://metadata.test/eveclient_PREVIEW.json",
        "https://indexes.test/eveonline_43.txt",
        "https://app.test/bb/prefetch"
    ]);
});

test("supports exact builds and requires all four endpoints", async () =>
{
    const exact = await CjsFileIndexLibrary.resolveBuild(provider, {
        build: 77,
        fetch: async () => { throw new Error("exact builds must not fetch metadata"); }
    });
    const { resBaseURL: _resBaseURL, ...incompleteRemote } = provider.remote;

    assert.equal(exact.build, "77");
    await assert.rejects(
        CjsFileIndexLibrary.resolveBuild({ ...provider, remote: incompleteRemote }, { build: 77 }),
        /resBaseURL/u
    );
});

function createLibrary({ resFileIndexes, overlays = [], sources = [] })
{
    return new CjsFileIndexLibrary({
        provider,
        buildReference: { build: "1" },
        appIndex: CjsFileIndex.parseAppFileIndex("app:/resfileindex.txt,index/main"),
        resFileIndexes,
        overlays,
        sources
    });
}
