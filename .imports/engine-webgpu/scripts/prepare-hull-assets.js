/**
 * Prepare the binary inputs the harness hull draw needs.
 *
 * The hull draw needs a real ship: its geometry interleaved to the packed
 * `quadv5` vertex declaration, and its material maps as the client ships them.
 * Those are CCP game assets, so they are NOT carried in this repository — this
 * package publishes to npm, and shipping someone else's ship with it is not a
 * thing a renderer gets to do. They are fetched into a directory the caller
 * names and handed to `run-webgpu-harness.js --hull-assets <dir>`.
 *
 *   node scripts/prepare-hull-assets.js --out <dir> [--service http://127.0.0.1:5510]
 *
 * The tools-core service is the only permitted source. It owns index
 * resolution, caching and CDN fallback, so nothing here reads a cache
 * directory, and a live game install is never a source.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// The default is 5510. A service answering on 3000 is most likely an older
// instance that still serves cached files while failing live fetches with a
// bare "fetch failed", which reads as a missing resource rather than as the
// wrong service.
const DEFAULT_SERVICE = "http://127.0.0.1:5510";

const HULL_DIRECTORY = "res:/dx9/model/ship/amarr/frigate/af1";
const HULL_STEM = "af1_t1";

// Keyed by the local suffix the harness serves them under. The DIRT map is
// absent on purpose: the SOF DNA names one, but the PPT-enabled Main pass has
// no dirt binding, so fetching it would only produce a file nothing can bind.
const TEXTURE_SUFFIXES = Object.freeze({
    a: "AlbedoMap",
    n: "NormalMap",
    r: "RoughnessMap",
    m: "MaterialMap",
    p3: "PaintMaskMap",
    g: "GlowMap"
});

/** Stride 48: 12 + 4 + 8 + 16 + 8. See `harness/webgpu/hullFixture.js`. */
const STRIDE = 48;

function argument(name, fallback = null)
{
    const index = process.argv.indexOf(name);
    if (index < 0) return fallback;
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
    return value;
}

async function fetchResource(service, logicalPath)
{
    const url = `${service}/ccp/latest/resources/${logicalPath.replace(/^res:\//, "")}`;
    let response;
    try
    {
        response = await fetch(url);
    }
    catch (error)
    {
        // A bare "fetch failed" here almost always means the service is not
        // running or is the wrong instance, not that the resource is missing.
        throw new Error(
            `${logicalPath} could not be fetched from ${service}: ${error.message}. ` +
            "Check the tools-core service is running on this port."
        );
    }
    if (!response.ok) throw new Error(`${logicalPath} returned HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
}

/**
 * Interleave the mesh to the packed declaration and concatenate its areas.
 *
 * The two zero-filled inputs are not padding to be optimized away: a declared
 * vertex input must be supplied even when the shader never reads it.
 * BLENDINDICES0 carries `usedMask 0` and exists only because the declaration is
 * shared with the skinned variant, and TEXCOORD1 is read only when
 * `GeneralData` selects the second UV set, which this hull does not.
 */
function buildGeometry(mesh)
{
    const vertex = mesh.vertex;
    for (const field of [ "position", "texcoord0", "tangent" ])
    {
        if (!vertex?.[field]) throw new Error(`mesh ${mesh.name} has no ${field}`);
    }
    const count = vertex.position.length / 3;
    if (!Number.isInteger(count)) throw new Error("position stream is not a whole number of vertices");

    const buffer = new ArrayBuffer(count * STRIDE);
    const view = new DataView(buffer);
    for (let index = 0; index < count; index += 1)
    {
        const base = index * STRIDE;
        view.setFloat32(base + 0, vertex.position[index * 3 + 0], true);
        view.setFloat32(base + 4, vertex.position[index * 3 + 1], true);
        view.setFloat32(base + 8, vertex.position[index * 3 + 2], true);
        // 12..15 stay zero: BLENDINDICES0, read as uint8x4.
        view.setFloat32(base + 16, vertex.texcoord0[index * 2 + 0], true);
        view.setFloat32(base + 20, vertex.texcoord0[index * 2 + 1], true);
        // The angle-packed tangent frame, copied through unchanged. The shader
        // unpacks it; decoding it here would be decoding it twice.
        view.setFloat32(base + 24, vertex.tangent[index * 4 + 0], true);
        view.setFloat32(base + 28, vertex.tangent[index * 4 + 1], true);
        view.setFloat32(base + 32, vertex.tangent[index * 4 + 2], true);
        view.setFloat32(base + 36, vertex.tangent[index * 4 + 3], true);
        // 40..47 stay zero: TEXCOORD1.
    }

    const total = mesh.indices.reduce((sum, area) => sum + area.faces.length, 0);
    const indices = new Uint16Array(total);
    const areas = [];
    let cursor = 0;
    for (const area of mesh.indices)
    {
        areas.push({ name: area.name, start: cursor, count: area.faces.length });
        indices.set(area.faces, cursor);
        cursor += area.faces.length;
    }
    const highest = indices.reduce((maximum, value) => value > maximum ? value : maximum, 0);
    if (highest >= count)
    {
        throw new Error(`index ${highest} addresses past the ${count} vertices present`);
    }

    return { vertices: new Uint8Array(buffer), indices, count, total, areas };
}

async function Main()
{
    const outputDirectory = argument("--out");
    if (!outputDirectory) throw new Error("--out <dir> is required");
    const service = argument("--service", DEFAULT_SERVICE).replace(/\/+$/, "");
    const output = resolve(outputDirectory);
    await mkdir(output, { recursive: true });

    const { CjsGr2Format } = await import("@carbonenginejs/runtime-resource/formats/gr2");
    const meshBytes = await fetchResource(service, `${HULL_DIRECTORY}/${HULL_STEM}.gr2`);
    const document = CjsGr2Format.read(CjsGr2Format.readRaw(meshBytes), { emit: "json" });
    if (!document.meshes?.length) throw new Error(`${HULL_STEM}.gr2 carries no meshes`);

    const geometry = buildGeometry(document.meshes[0]);
    await writeFile(resolve(output, "af1_vertices.bin"), geometry.vertices);
    await writeFile(resolve(output, "af1_indices.bin"), new Uint8Array(geometry.indices.buffer));
    await writeFile(resolve(output, "af1_geometry.json"), JSON.stringify({
        count: geometry.count,
        stride: STRIDE,
        indexCount: geometry.total,
        areas: geometry.areas
    }, null, 1));
    console.log(
        `geometry: ${geometry.count} vertices at stride ${STRIDE}, ` +
        `${geometry.total} indices across ${geometry.areas.length} areas`
    );

    // Six small fetches, run together. The bulk-scan guidance about limiting
    // concurrency and retrying transient failures starts to matter in the
    // thousands of requests, not here.
    const suffixes = Object.keys(TEXTURE_SUFFIXES);
    const maps = await Promise.all(suffixes.map(
        (suffix) => fetchResource(service, `${HULL_DIRECTORY}/${HULL_STEM}_${suffix}.dds`)
    ));
    for (let index = 0; index < suffixes.length; index += 1)
    {
        const suffix = suffixes[index];
        await writeFile(resolve(output, `af1_${suffix}.dds`), maps[index]);
        console.log(`${TEXTURE_SUFFIXES[suffix]}: af1_${suffix}.dds, ${maps[index].byteLength} bytes`);
    }

    console.log(`\nPrepared ${suffixes.length + 3} files in ${output}`);
    console.log("Draw with:");
    console.log(
        `  node scripts/run-webgpu-harness.js --required \\\n` +
        `    --draw-hull <quadv5.carbonwebgpu> --hull-assets ${output} --capture-hull hull.png`
    );
    console.log(
        "\nBuild that package with this repository's own runtime-resource, not the\n" +
        "sibling source: the two disagree on the container and a mismatch reports\n" +
        "as \"Invalid Carbon WebGPU magic\", which looks like a corrupt file and is not one."
    );
}

await Main();
