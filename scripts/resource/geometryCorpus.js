export const DEFAULT_GEOMETRY_CORPUS_OPTIONS = Object.freeze({
    build: "3487903",
    host: "http://127.0.0.1:5510",
    target: "eve",
    prefix: "res:/dx9/model/ship/",
    limit: 0,
    concurrency: 8,
    progress: 100,
    timeout: 30000
});

const NUMERIC_OPTIONS = new Set([ "limit", "concurrency", "progress", "timeout" ]);

/** Parse and validate the geometry-corpus command line. */
export function parseGeometryCorpusOptions(args, defaults = DEFAULT_GEOMETRY_CORPUS_OPTIONS)
{
    const options = { ...defaults };
    if (args.length % 2 !== 0) throw new Error(`missing value for ${args.at(-1)}`);

    for (let index = 0; index < args.length; index += 2)
    {
        const token = args[index];
        if (!token.startsWith("--")) throw new Error(`expected an option, got ${token}`);

        const name = token.slice(2);
        if (!(name in options)) throw new Error(`unknown option --${name}`);
        options[name] = NUMERIC_OPTIONS.has(name) ? Number(args[index + 1]) : args[index + 1];
    }

    if (!Number.isSafeInteger(options.limit) || options.limit < 0)
    {
        throw new Error("--limit must be a non-negative integer");
    }
    for (const name of [ "concurrency", "progress", "timeout" ])
    {
        if (!Number.isSafeInteger(options[name]) || options[name] < 1)
        {
            throw new Error(`--${name} must be a positive integer`);
        }
    }
    for (const name of [ "build", "host", "target", "prefix" ])
    {
        if (!String(options[name]).length) throw new Error(`--${name} must not be empty`);
    }
    return options;
}

function evenlySample(values, count)
{
    if (count >= values.length) return values.slice();
    if (count === 1) return [ values[0] ];
    return Array.from({ length: count }, (_, index) =>
        values[Math.floor(index * (values.length - 1) / (count - 1))]);
}

/** Select an exact or stratified set of GR2 paths from a resource manifest. */
export function selectGeometryPaths(manifest, options)
{
    const prefix = options.prefix.toLowerCase();
    const paths = manifest.filter(path =>
        path.toLowerCase().startsWith(prefix) && path.toLowerCase().endsWith(".gr2"));
    if (!options.limit || options.limit >= paths.length) return paths;

    const bucketNames = [ "hull", "lowdetail", "effects" ];
    const buckets = new Map(bucketNames.map(name => [ name, [] ]));
    for (const path of paths)
    {
        const bucket = /\/effects\//i.test(path)
            ? "effects"
            : /_lowdetail\.gr2$/i.test(path) ? "lowdetail" : "hull";
        buckets.get(bucket).push(path);
    }

    const nonEmpty = bucketNames.filter(name => buckets.get(name).length);
    const counts = new Map(nonEmpty.map((name, index) => [
        name,
        Math.min(buckets.get(name).length, Math.floor(options.limit / nonEmpty.length) +
            (index < options.limit % nonEmpty.length ? 1 : 0))
    ]));
    let remaining = options.limit - [ ...counts.values() ].reduce((sum, count) => sum + count, 0);
    while (remaining)
    {
        const name = nonEmpty.find(candidate => counts.get(candidate) < buckets.get(candidate).length);
        if (!name) break;
        counts.set(name, counts.get(name) + 1);
        remaining--;
    }

    const sampled = new Map(nonEmpty.map(name => [ name, evenlySample(buckets.get(name), counts.get(name)) ]));
    const selected = [];
    for (let index = 0; selected.length < options.limit; index++)
    {
        for (const name of nonEmpty)
        {
            const path = sampled.get(name)[index];
            if (path !== undefined) selected.push(path);
        }
    }
    return selected;
}

/** Error carrying the response information needed for retry classification. */
export class GeometryCorpusFetchError extends Error
{
    constructor(status, body)
    {
        super(`HTTP ${status}${body ? `: ${body.slice(0, 120)}` : ""}`);
        this.status = status;
        this.body = body;
    }
}

/** Fetch one resource without retrying it. */
async function fetchGeometryCorpusValue(url, read, fetchImpl, timeout)
{
    const controller = new AbortController();
    let timeoutId;
    const expired = new Promise((_, reject) =>
    {
        timeoutId = setTimeout(() =>
        {
            controller.abort();
            reject(new Error(`fetch timed out after ${timeout} ms`));
        }, timeout);
    });

    try
    {
        return await Promise.race([
            Promise.resolve().then(async () =>
            {
                const response = await requireGeometryCorpusResponse(
                    await fetchImpl(url, { signal: controller.signal })
                );
                return read(response);
            }),
            expired
        ]);
    }
    finally
    {
        clearTimeout(timeoutId);
    }
}

async function requireGeometryCorpusResponse(response)
{
    if (!response.ok)
    {
        let body = "";
        try { body = await response.text(); }
        catch { /* The status alone is still enough for classification. */ }
        throw new GeometryCorpusFetchError(response.status, body);
    }
    return response;
}

/** Fetch one resource without retrying it. */
export async function fetchGeometryCorpusBytes(url, fetchImpl = fetch, timeout = 30000)
{
    return fetchGeometryCorpusValue(
        url,
        async response => new Uint8Array(await response.arrayBuffer()),
        fetchImpl,
        timeout
    );
}

/** Fetch the resource manifest with the same finite wait as resource bytes. */
export async function fetchGeometryCorpusJson(url, fetchImpl = fetch, timeout = 30000)
{
    return fetchGeometryCorpusValue(url, response => response.json(), fetchImpl, timeout);
}

/** Whether a resource fetch may be retried at reduced concurrency. */
export function isRetryableGeometryCorpusFetch(error)
{
    if (!(error instanceof GeometryCorpusFetchError)) return true;
    return error.status === 408 || error.status === 429 || error.status >= 500 ||
        error.status === 400 && /fetch failed/i.test(error.body);
}

/** Run a mutable work queue with bounded concurrency. */
export async function runGeometryCorpusWorkers(items, concurrency, handler)
{
    const queue = items.slice();
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () =>
    {
        while (queue.length) await handler(queue.shift());
    }));
}

/** Build a progress callback which writes interval and terminal reports. */
export function createGeometryCorpusProgress(total, interval, write, now = () => Date.now())
{
    const start = now();
    let last = 0;
    return (completed, report) =>
    {
        if (completed !== total && completed - last < interval) return;
        last = completed;
        const seconds = Math.max((now() - start) / 1000, 0.001);
        write(
            `processed ${completed}/${total}; passed ${report.passed}; ` +
            `fetch/read/cmf/binding failed ${report.fetchFailed}/${report.decodeFailed}/` +
            `${report.cmfFailed}/${report.bindingFailed}; ${(completed / seconds).toFixed(1)}/s`
        );
    };
}

/** Count CMF mesh containers after exact Granny in-file LOD reassembly. */
export function geometryCorpusExpectedMeshCount(raw)
{
    const meshes = (raw?.fileInfo?.Meshes ?? []).filter(Boolean);
    const baseCounts = new Map();
    for (const mesh of meshes)
    {
        const name = mesh.Name ?? "";
        if (/^(.*?) LOD (\d+)$/u.test(name)) continue;
        baseCounts.set(name, (baseCounts.get(name) ?? 0) + 1);
    }
    const siblingThresholds = new Map();
    for (const mesh of meshes)
    {
        const match = /^(.*?) LOD (\d+)$/u.exec(mesh.Name ?? "");
        if (!match || baseCounts.get(match[1]) !== 1) continue;
        const values = siblingThresholds.get(match[1]) ?? [];
        values.push(Number(match[2]));
        siblingThresholds.set(match[1], values);
    }
    const combinable = new Set([ ...siblingThresholds ].filter(([, values ]) =>
        new Set(values).size === values.length).map(([ name ]) => name));
    const attached = meshes.filter(mesh =>
    {
        const match = /^(.*?) LOD (\d+)$/u.exec(mesh.Name ?? "");
        return match && combinable.has(match[1]);
    }).length;
    return meshes.length - attached;
}

/** Whether a CMF projection retained every conceptual GR2 mesh/LOD family. */
export function geometryCorpusMeshCountMatches(raw, graph)
{
    return Array.isArray(graph?.meshes) && graph.meshes.length === geometryCorpusExpectedMeshCount(raw);
}

/** Whether a completed report invalidates the geometry corpus gate. */
export function geometryCorpusFailed(report)
{
    const accounted = report.passed + report.fetchFailed + report.decodeFailed +
        report.cmfFailed + report.bindingFailed;
    return report.selected === 0 || report.files !== report.selected ||
        report.completed !== report.selected || accounted !== report.selected ||
        report.fetched + report.fetchFailed !== report.selected ||
        report.decoded + report.decodeFailed !== report.fetched ||
        report.cmfBuilt + report.cmfFailed !== report.decoded ||
        report.passed + report.bindingFailed !== report.cmfBuilt ||
        report.fetchFailed > 0 || report.decodeFailed > 0 || report.cmfFailed > 0 ||
        report.bindingFailed > 0 || report.noDeclaration > 0 || report.unalignedStride > 0 ||
        report.droppedUsages > 0 || report.noWebgpuFormat > 0 || report.packFailures > 0 ||
        report.problems > 0;
}
