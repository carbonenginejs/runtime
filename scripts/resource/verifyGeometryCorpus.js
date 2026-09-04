// Runs the geometry binding path over real client .gr2 files.
//
// Every vertex layout in this repository was a hand-authored fixture until
// 2026-09-02, and three separate defects survived a green suite because of it.
// Synthetic geometry cannot tell us which element types, area spellings and
// device strides the real corpus carries.
//
// Bytes come from tools-core; no cache directory is read directly. Start the
// service first:
//
//   cd tools-core
//   node bin/cjs-tools-service.js --host 127.0.0.1 --port 5510 \
//     --cache <cache> --data <data> --no-audio-auto-prepare --no-sde-auto-prepare
//
// Then run from runtime/. The gate deliberately imports the narrow,
// undecorated GR2, CMF, packing and binding modules from source so it exercises
// the worktree without requiring a package build:
//
//   node scripts/resource/verifyGeometryCorpus.js
//   node scripts/resource/verifyGeometryCorpus.js --limit 900
//   node scripts/resource/verifyGeometryCorpus.js --prefix res:/dx9/model/structure/
//   node scripts/resource/verifyGeometryCorpus.js --prefix res:/ --progress 500
//
// The build is pinned rather than "latest", so reruns remain comparable.
import { CjsGr2Format } from "../../src/resource/formats/gr2/index.js";
import { buildCmfFromRaw } from "../../src/resource/formats/gr2/core/targets.js";
import { CarbonVertexElements } from "../../src/trinity/core/vertex/vertexUsage.js";
import { Tr2VertexDefinition } from "../../src/trinity/core/vertex/Tr2VertexDefinition.js";
import { WebgpuVertexFormat } from "../../src/engine/webgpu/core/vertexFormat.js";
import { PackLodGeometry } from "../../src/resource/geometry/packGeometry.js";
import {
    createGeometryCorpusProgress,
    fetchGeometryCorpusBytes,
    fetchGeometryCorpusJson,
    geometryCorpusFailed,
    geometryCorpusMeshCountMatches,
    isRetryableGeometryCorpusFetch,
    parseGeometryCorpusOptions,
    runGeometryCorpusWorkers,
    selectGeometryPaths
} from "./geometryCorpus.js";

const options = parseGeometryCorpusOptions(process.argv.slice(2));
const base = `${options.host.replace(/\/$/, "")}/${options.target}/${options.build}`;
const counters = new Map();

function bump(name, key)
{
    const map = counters.get(name) ?? counters.set(name, new Map()).get(name);
    map.set(key, (map.get(key) ?? 0) + 1);
}

function table(name, count = 15)
{
    return [ ...(counters.get(name) ?? []) ].sort((a, b) => b[1] - a[1]).slice(0, count);
}

const totals = {
    files: 0,
    completed: 0,
    passed: 0,
    fetched: 0,
    fetchRetried: 0,
    fetchRecovered: 0,
    fetchFailed: 0,
    decoded: 0,
    decodeFailed: 0,
    cmfBuilt: 0,
    cmfFailed: 0,
    bindingFailed: 0,
    meshes: 0,
    areas: 0,
    noDeclaration: 0,
    droppedUsages: 0,
    noWebgpuFormat: 0,
    unalignedStride: 0,
    packFailures: 0,
    problems: 0
};

function inspectMesh(mesh, path)
{
    totals.meshes++;
    let valid = true;
    const declaration = mesh?.decl;

    if (!declaration?.length)
    {
        totals.noDeclaration++;
        bump("noDeclarations", path);
        return false;
    }

    bump("declarations", declaration.map(element =>
        `${element.usage}${element.usageIndex}:${element.type}x${element.elementCount}`).join(","));

    for (const element of declaration)
    {
        bump("elementTypes", `${element.type}x${element.elementCount}`);
        try { WebgpuVertexFormat(element); }
        catch
        {
            totals.noWebgpuFormat++;
            valid = false;
            bump("noWebgpuFormat", `${path}: ${element.type}x${element.elementCount}`);
        }
    }

    const elements = CarbonVertexElements(declaration);
    if (elements.length !== declaration.length)
    {
        const dropped = declaration.length - elements.length;
        totals.droppedUsages += dropped;
        valid = false;
        bump("droppedUsages", `${path}: ${dropped}`);
    }

    if (CarbonVertexElements(declaration) !== elements)
    {
        totals.problems++;
        valid = false;
        bump("problems", `${path}: translation identity is unstable`);
    }

    try { Tr2VertexDefinition.getHandle(elements); }
    catch (error)
    {
        totals.problems++;
        valid = false;
        bump("problems", `${path}: ${String(error.message).slice(0, 300)}`);
    }

    const lods = mesh.lods?.length ? mesh.lods : [ null ];
    for (const lod of lods)
    {
        for (const area of lod.areas ?? [])
        {
            totals.areas++;
            bump("areaFields", Object.keys(area).sort().join(","));
        }
    }

    for (let lodIndex = 0; lodIndex < lods.length; lodIndex++)
    {
        try
        {
            const
                lod = lods[lodIndex],
                packed = PackLodGeometry(mesh, lodIndex),
                source = lod?.vertex ?? mesh.vertex ?? {},
                positionCount = Math.floor((source.position ?? []).length / 3),
                descriptor = lod?.vb,
                expectedCount = descriptor?.stride
                    ? descriptor.size / descriptor.stride
                    : positionCount;

            if (!Number.isSafeInteger(expectedCount) || packed.vertex.count !== expectedCount)
            {
                throw new Error(
                    `LOD ${lodIndex} packed ${packed.vertex.count} vertices; descriptor expects ${expectedCount}`
                );
            }
            if (packed.vertex.bytes.byteLength !== packed.vertex.count * packed.vertex.stride)
            {
                throw new Error(`LOD ${lodIndex} vertex byte length does not match its count and stride`);
            }

            const indexDescriptor = lod?.ib;
            if (indexDescriptor?.stride)
            {
                const expectedIndices = indexDescriptor.size / indexDescriptor.stride;
                if (!Number.isSafeInteger(expectedIndices) || (packed.index?.count ?? 0) !== expectedIndices)
                {
                    throw new Error(
                        `LOD ${lodIndex} packed ${packed.index?.count ?? 0} indices; ` +
                        `descriptor expects ${expectedIndices}`
                    );
                }
            }

            bump("strides", packed.vertex.stride);
            if (packed.vertex.stride % 4 !== 0)
            {
                totals.unalignedStride++;
                valid = false;
                bump("unalignedStrides", `${path}: ${packed.vertex.stride}`);
            }
            if (packed.index) bump("indexFormats", packed.index.format);
        }
        catch (error)
        {
            totals.packFailures++;
            valid = false;
            bump("packFailures", `${path}: ${String(error.message).slice(0, 300)}`);
        }
    }

    return valid;
}

function inspectGeometry(graph, path)
{
    if (!Array.isArray(graph?.meshes)) return false;
    let valid = true;
    for (const mesh of graph.meshes)
    {
        if (!inspectMesh(mesh, path)) valid = false;
    }
    return valid;
}

const paths = selectGeometryPaths(
    await fetchGeometryCorpusJson(`${base}/resfiles`, fetch, options.timeout),
    options
);
totals.files = paths.length;

console.error(
    `selected ${paths.length} GR2 files for ${options.prefix} at build ${options.build}; ` +
    `concurrency ${options.concurrency}`
);

const progress = createGeometryCorpusProgress(paths.length, options.progress, message => console.error(message));
const complete = () =>
{
    totals.completed++;
    progress(totals.completed, totals);
};

async function processEntry(entry, retryQueue)
{
    entry.attempts++;
    let bytes;
    try
    {
        const resourcePath = entry.path.replace(/^res:\//i, "");
        bytes = await fetchGeometryCorpusBytes(`${base}/resources/${resourcePath}`, fetch, options.timeout);
    }
    catch (error)
    {
        if (entry.attempts < 3 && isRetryableGeometryCorpusFetch(error))
        {
            if (!entry.retried)
            {
                entry.retried = true;
                totals.fetchRetried++;
            }
            retryQueue.push(entry);
            return;
        }
        totals.fetchFailed++;
        bump("fetchFailures", `${entry.path}: ${String(error.message).slice(0, 300)}`);
        complete();
        return;
    }

    totals.fetched++;
    if (entry.retried) totals.fetchRecovered++;

    let raw;
    try
    {
        raw = CjsGr2Format.readRaw(bytes);
        totals.decoded++;
    }
    catch (error)
    {
        totals.decodeFailed++;
        bump("decodeFailures", `${entry.path}: ${String(error.message).slice(0, 300)}`);
        complete();
        return;
    }

    let graph;
    try
    {
        graph = buildCmfFromRaw(raw);
        if (!geometryCorpusMeshCountMatches(raw, graph))
        {
            const sourceMeshCount = (raw.fileInfo?.Meshes ?? []).filter(Boolean).length;
            throw new Error(
                `CMF mesh count ${graph?.meshes?.length ?? "missing"} does not match source ${sourceMeshCount}`
            );
        }
        totals.cmfBuilt++;
    }
    catch (error)
    {
        totals.cmfFailed++;
        bump("cmfFailures", `${entry.path}: ${String(error.message).slice(0, 300)}`);
        complete();
        return;
    }

    try
    {
        if (inspectGeometry(graph, entry.path)) totals.passed++;
        else totals.bindingFailed++;
    }
    catch (error)
    {
        totals.bindingFailed++;
        bump("bindingFailures", `${entry.path}: ${String(error.message).slice(0, 300)}`);
    }
    complete();
}

let pending = paths.map(path => ({ path, attempts: 0, retried: false }));
let retryRound = 0;
while (pending.length)
{
    if (retryRound)
    {
        await new Promise(resolve => setTimeout(resolve, retryRound * 300));
    }
    const retryQueue = [];
    const concurrency = retryRound ? Math.min(3, options.concurrency) : options.concurrency;
    await runGeometryCorpusWorkers(pending, concurrency, entry => processEntry(entry, retryQueue));
    pending = retryQueue;
    retryRound++;
}

const report = {
    target: options.target,
    build: options.build,
    prefix: options.prefix,
    selected: paths.length,
    ...totals,
    distinctDeclarations: counters.get("declarations")?.size ?? 0,
    declarations: table("declarations", 20),
    elementTypes: table("elementTypes"),
    strides: table("strides"),
    indexFormats: table("indexFormats"),
    areaFields: table("areaFields"),
    droppedUsageKinds: table("droppedUsages"),
    noDeclarations: table("noDeclarations", 20),
    noWebgpuFormats: table("noWebgpuFormat"),
    unalignedStrides: table("unalignedStrides", 20),
    packFailureKinds: table("packFailures"),
    fetchFailures: table("fetchFailures", 20),
    decodeFailures: table("decodeFailures", 20),
    cmfFailures: table("cmfFailures", 20),
    bindingFailures: table("bindingFailures", 20),
    problemKinds: table("problems", 20)
};

console.log(JSON.stringify(report, null, 1));
if (geometryCorpusFailed(report)) process.exitCode = 1;
