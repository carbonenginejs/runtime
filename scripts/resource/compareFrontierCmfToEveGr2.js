// Compares Frontier-published CMF with EVE GR2 at the same logical paths.
//
// A path match creates a candidate pair; it does not assert that the two
// builds contain byte-identical source art. The comparison normalizes known
// publishing differences and classifies the remaining semantic evidence.
// Frontier's four GR2 files are never considered.
//
// Bytes come from tools-core. Start its local service, then run from runtime/:
//
//   node scripts/resource/compareFrontierCmfToEveGr2.js --limit 100
//   node scripts/resource/compareFrontierCmfToEveGr2.js --prefix res:/graphics/generic/
//
// Defaults are pinned to Frontier 3474408 and EVE 3487903.
import { CjsCmfFormat } from "../../src/resource/formats/cmf/index.js";
import { CjsGr2Format } from "../../src/resource/formats/gr2/index.js";
import { buildCmfFromRaw } from "../../src/resource/formats/gr2/core/targets.js";
import {
    fetchGeometryCorpusBytes,
    fetchGeometryCorpusJson,
    isRetryableGeometryCorpusFetch,
    runGeometryCorpusWorkers
} from "./geometryCorpus.js";
import {
    compareFrontierCmfToEveGr2,
    countGr2RigidBindingMeshes,
    countGr2VectorTracks,
    isFrontierCmfGr2CameraPair,
    parseFrontierCmfGr2Options,
    sampleFrontierCmfEveGr2Pairs,
    selectFrontierCmfEveGr2Pairs,
    summarizeCmfGraph
} from "./frontierCmfGr2Parity.js";

const options = parseFrontierCmfGr2Options(process.argv.slice(2));
const host = options.host.replace(/\/$/u, "");
const frontierBase = `${host}/frontier/${options.frontierBuild}`;
const eveBase = `${host}/eve/${options.eveBuild}`;

const [ frontierManifest, eveManifest ] = await Promise.all([
    fetchGeometryCorpusJson(`${frontierBase}/resfiles`, fetch, options.timeout),
    fetchGeometryCorpusJson(`${eveBase}/resfiles`, fetch, options.timeout)
]);
const allPairs = selectFrontierCmfEveGr2Pairs(frontierManifest, eveManifest, {
    prefix: options.prefix
});
const cameraPairs = allPairs.filter(isFrontierCmfGr2CameraPair);
const inScopePairs = allPairs.filter(pair => !isFrontierCmfGr2CameraPair(pair));
const pairs = sampleFrontierCmfEveGr2Pairs(inScopePairs, options.limit);
const frontierCmfTotal = frontierManifest.filter(path => path.toLowerCase().endsWith(".cmf")).length;
const frontierCmfInPrefix = frontierManifest.filter(path =>
    path.toLowerCase().startsWith(options.prefix.toLowerCase()) && path.toLowerCase().endsWith(".cmf")).length;
const frontierGr2Ignored = frontierManifest.filter(path => path.toLowerCase().endsWith(".gr2")).length;

const totals = {
    candidatePairs: allPairs.length,
    cameraPairsOutOfScope: cameraPairs.length,
    inScopePairs: inScopePairs.length,
    selected: pairs.length,
    completed: 0,
    "normalized-match": 0,
    "near-match": 0,
    different: 0,
    fetchFailed: 0,
    cmfReadFailed: 0,
    gr2ReadFailed: 0,
    gr2BuildFailed: 0,
    gr2VectorTracks: 0,
    gr2RigidBindingMeshes: 0
};
const differenceCounts = new Map();
const observationCounts = new Map();
const examples = { "normalized-match": [], "near-match": [], different: [], failed: [] };

function bump(map, key)
{
    map.set(key, (map.get(key) ?? 0) + 1);
}

function keepExample(kind, value)
{
    if (examples[kind].length < options.examples) examples[kind].push(value);
}

function resourceUrl(base, path)
{
    return `${base}/resources/${path.replace(/^res:\//iu, "")}`;
}

async function fetchWithRetries(url)
{
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++)
    {
        try
        {
            return await fetchGeometryCorpusBytes(url, fetch, options.timeout);
        }
        catch (error)
        {
            lastError = error;
            if (!isRetryableGeometryCorpusFetch(error) || attempt === 2) throw error;
        }
    }
    throw lastError;
}

function complete()
{
    totals.completed++;
    if (totals.completed === totals.selected || totals.completed % options.progress === 0)
    {
        console.error(
            `processed ${totals.completed}/${totals.selected}; ` +
            `normalized/near/different ${totals["normalized-match"]}/${totals["near-match"]}/${totals.different}; ` +
            `failed ${totals.fetchFailed + totals.cmfReadFailed + totals.gr2ReadFailed + totals.gr2BuildFailed}`
        );
    }
}

async function processPair(pair)
{
    let cmfBytes;
    let gr2Bytes;
    try
    {
        [ cmfBytes, gr2Bytes ] = await Promise.all([
            fetchWithRetries(resourceUrl(frontierBase, pair.frontierPath)),
            fetchWithRetries(resourceUrl(eveBase, pair.evePath))
        ]);
    }
    catch (error)
    {
        totals.fetchFailed++;
        keepExample("failed", { ...pair, phase: "fetch", error: String(error.message).slice(0, 300) });
        complete();
        return;
    }

    let frontier;
    try
    {
        frontier = await CjsCmfFormat.readRawAsync(cmfBytes, { decodeBuffers: true });
    }
    catch (error)
    {
        totals.cmfReadFailed++;
        keepExample("failed", { ...pair, phase: "cmf-read", error: String(error.message).slice(0, 300) });
        complete();
        return;
    }

    let gr2Raw;
    try
    {
        gr2Raw = CjsGr2Format.readRaw(gr2Bytes);
    }
    catch (error)
    {
        totals.gr2ReadFailed++;
        keepExample("failed", { ...pair, phase: "gr2-read", error: String(error.message).slice(0, 300) });
        complete();
        return;
    }

    let eve;
    try
    {
        eve = buildCmfFromRaw(gr2Raw);
    }
    catch (error)
    {
        totals.gr2BuildFailed++;
        keepExample("failed", { ...pair, phase: "gr2-cmf-build", error: String(error.message).slice(0, 300) });
        complete();
        return;
    }

    const vectorTracks = countGr2VectorTracks(gr2Raw);
    const rigidBindingMeshes = countGr2RigidBindingMeshes(gr2Raw);
    const result = compareFrontierCmfToEveGr2(
        summarizeCmfGraph(frontier),
        summarizeCmfGraph(eve),
        { gr2VectorTracks: vectorTracks, gr2RigidBindingMeshes: rigidBindingMeshes }
    );
    totals[result.classification]++;
    totals.gr2VectorTracks += vectorTracks;
    totals.gr2RigidBindingMeshes += rigidBindingMeshes;
    result.differences.forEach(value => bump(differenceCounts, value));
    result.observations.forEach(value => bump(observationCounts, value));
    keepExample(result.classification, { ...pair, ...result });
    complete();
}

console.error(
    `selected ${pairs.length}/${inScopePairs.length} in-scope pairs from ${allPairs.length} exact logical stems; ` +
    `Frontier ${options.frontierBuild}, EVE ${options.eveBuild}; concurrency ${options.concurrency}`
);
await runGeometryCorpusWorkers(pairs, options.concurrency, processPair);

function ranked(map)
{
    return [ ...map ].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

const report = {
    frontierBuild: options.frontierBuild,
    eveBuild: options.eveBuild,
    prefix: options.prefix,
    frontierCmfTotal,
    frontierCmfInPrefix,
    unmatchedFrontierCmfInPrefix: frontierCmfInPrefix - allPairs.length,
    frontierGr2Ignored,
    ...totals,
    differences: ranked(differenceCounts),
    observations: ranked(observationCounts),
    examples
};
console.log(JSON.stringify(report, null, 1));

if (!pairs.length || totals.completed !== pairs.length || totals.fetchFailed || totals.cmfReadFailed ||
    totals.gr2ReadFailed || totals.gr2BuildFailed || totals.different)
{
    process.exitCode = 1;
}
