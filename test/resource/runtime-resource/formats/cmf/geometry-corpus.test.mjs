import assert from "node:assert/strict";
import test from "node:test";

import {
    GeometryCorpusFetchError,
    createGeometryCorpusProgress,
    fetchGeometryCorpusBytes,
    fetchGeometryCorpusJson,
    geometryCorpusFailed,
    geometryCorpusMeshCountMatches,
    isRetryableGeometryCorpusFetch,
    parseGeometryCorpusOptions,
    runGeometryCorpusWorkers,
    selectGeometryPaths
} from "../../../../../scripts/resource/geometryCorpus.js";
import { Tr2VertexDefinition } from "../../../../../src/trinity/core/vertex/Tr2VertexDefinition.js";
import { CarbonUsageFromCmf } from "../../../../../src/trinity/core/vertex/vertexUsage.js";

test("geometry corpus options reject incomplete and non-working gates", () =>
{
    assert.throws(() => parseGeometryCorpusOptions([ "--limit" ]), /missing value/);
    assert.throws(() => parseGeometryCorpusOptions([ "--concurrency", "0" ]), /positive integer/);
    assert.throws(() => parseGeometryCorpusOptions([ "--concurrency", "NaN" ]), /positive integer/);
    assert.throws(() => parseGeometryCorpusOptions([ "--progress", "0" ]), /positive integer/);
    assert.throws(() => parseGeometryCorpusOptions([ "--timeout", "0" ]), /positive integer/);
    assert.throws(() => parseGeometryCorpusOptions([ "--limit", "-1" ]), /non-negative integer/);
});

test("geometry corpus selection distinguishes the exact ship and full GR2 scopes", () =>
{
    const manifest = [
        ...Array.from({ length: 5073 }, (_, index) => `res:/dx9/model/ship/r${index}.gr2`),
        ...Array.from({ length: 9330 }, (_, index) => `res:/animation/a${index}.gr2`),
        "res:/dx9/model/ship/not-gr2.red"
    ];
    const ship = parseGeometryCorpusOptions([]);
    const all = parseGeometryCorpusOptions([ "--prefix", "res:/" ]);

    assert.equal(selectGeometryPaths(manifest, ship).length, 5073);
    assert.equal(selectGeometryPaths(manifest, all).length, 14403);
});

test("limited geometry corpus selection remains stratified", () =>
{
    const options = parseGeometryCorpusOptions([ "--limit", "3" ]);
    const selected = selectGeometryPaths([
        "res:/dx9/model/ship/a.gr2",
        "res:/dx9/model/ship/b_lowdetail.gr2",
        "res:/dx9/model/ship/effects/c.gr2",
        "res:/dx9/model/ship/d.gr2"
    ], options);

    assert.equal(selected.length, 3);
    assert.equal(selected.some(path => /_lowdetail\.gr2$/.test(path)), true);
    assert.equal(selected.some(path => /\/effects\//.test(path)), true);
});

test("geometry corpus fetches classify transient and terminal failures", async () =>
{
    await assert.rejects(
        () => fetchGeometryCorpusBytes("resource", async () => ({
            ok: false,
            status: 400,
            text: async () => JSON.stringify({ error: "fetch failed" })
        })),
        error => isRetryableGeometryCorpusFetch(error)
    );

    assert.equal(isRetryableGeometryCorpusFetch(new GeometryCorpusFetchError(404, "missing")), false);
    assert.equal(isRetryableGeometryCorpusFetch(new GeometryCorpusFetchError(408, "timeout")), true);
    assert.equal(isRetryableGeometryCorpusFetch(new GeometryCorpusFetchError(429, "busy")), true);
    assert.equal(isRetryableGeometryCorpusFetch(new GeometryCorpusFetchError(503, "offline")), true);
    assert.equal(isRetryableGeometryCorpusFetch(new TypeError("fetch failed")), true);

    await assert.rejects(
        () => fetchGeometryCorpusBytes("resource", () => new Promise(() => {}), 5),
        /fetch timed out after 5 ms/u
    );
    assert.deepEqual(
        await fetchGeometryCorpusJson("manifest", async () => ({
            ok: true,
            json: async () => [ "res:/mesh.gr2" ]
        })),
        [ "res:/mesh.gr2" ]
    );
});

test("geometry corpus workers process every item once", async () =>
{
    const seen = [];
    await runGeometryCorpusWorkers([ 1, 2, 3, 4 ], 2, async value => seen.push(value));
    assert.deepEqual(seen.sort(), [ 1, 2, 3, 4 ]);
});

test("geometry corpus source binding helpers load without decorated class modules", () =>
{
    assert.equal(CarbonUsageFromCmf("Position"), Tr2VertexDefinition.UsageCode.POSITION);
});

test("geometry corpus mesh coverage rejects absent and dropped CMF meshes", () =>
{
    const raw = { fileInfo: { Meshes: [ {}, null, {} ] } };
    assert.equal(geometryCorpusMeshCountMatches(raw, { meshes: [ {}, {} ] }), true);
    assert.equal(geometryCorpusMeshCountMatches(raw, { meshes: [ {} ] }), false);
    assert.equal(geometryCorpusMeshCountMatches(raw, null), false);
});

test("geometry corpus progress reports intervals and the final result", () =>
{
    let time = 0;
    const lines = [];
    const progress = createGeometryCorpusProgress(3, 2, line => lines.push(line), () => time);
    const report = { passed: 0, fetchFailed: 0, decodeFailed: 0, cmfFailed: 0, bindingFailed: 0 };

    time = 1000;
    progress(1, report);
    progress(2, report);
    progress(3, report);
    assert.equal(lines.length, 2);
    assert.match(lines[0], /processed 2\/3/);
    assert.match(lines[1], /processed 3\/3/);
});

test("geometry corpus failure status rejects missing coverage and every terminal phase", () =>
{
    const clean = {
        selected: 1,
        files: 1,
        completed: 1,
        passed: 1,
        fetched: 1,
        fetchFailed: 0,
        decoded: 1,
        decodeFailed: 0,
        cmfBuilt: 1,
        cmfFailed: 0,
        bindingFailed: 0,
        noDeclaration: 0,
        unalignedStride: 0,
        droppedUsages: 0,
        noWebgpuFormat: 0,
        packFailures: 0,
        problems: 0
    };
    assert.equal(geometryCorpusFailed(clean), false);
    assert.equal(geometryCorpusFailed({ ...clean, selected: 0, completed: 0, passed: 0 }), true);

    for (const field of [ "files", "fetched", "decoded", "cmfBuilt" ])
    {
        assert.equal(geometryCorpusFailed({ ...clean, [field]: 0 }), true, field);
    }

    for (const field of [
        "fetchFailed", "decodeFailed", "cmfFailed", "bindingFailed", "noDeclaration",
        "unalignedStride", "droppedUsages", "noWebgpuFormat", "packFailures", "problems"
    ])
    {
        const failed = { ...clean, passed: field.endsWith("Failed") ? 0 : 1, [field]: 1 };
        assert.equal(geometryCorpusFailed(failed), true, field);
    }
});
