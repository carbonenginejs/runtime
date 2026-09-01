// Runs the geometry binding path over real client .gr2 files.
//
// Every vertex layout in this repository was a hand-authored fixture until
// 2026-09-02, and three separate defects survived a green suite because of it.
// Synthetic geometry cannot tell you which element types real hulls actually
// use, which spelling their areas carry, or whether a stride a device will
// accept ever comes out of the packer. This asks the corpus instead.
//
// Bytes come from tools-core, which holds the client resources; nothing is
// committed and no cache directory is read directly. Start the service first:
//
//   cd tools-core && node bin/cjs-tools-service.js --host 127.0.0.1 --port 5510 \
//     --cache <cache> --data <data> --no-audio-auto-prepare --no-sde-auto-prepare
//
// Then, from runtime/ (npm/dist must be built - the model classes carry
// decorators and cannot be imported from src):
//
//   node scripts/resource/verifyGeometryCorpus.js --limit 900
//   node scripts/resource/verifyGeometryCorpus.js --prefix res:/dx9/model/structure
//
// The build is PINNED rather than "latest", so a rerun is comparable and the
// service never has to consult remote metadata.
import { CjsGr2Format } from "../../npm/dist/resource/formats/index.js";
import { CarbonVertexElements, Tr2VertexDefinition } from "../../npm/dist/trinity/core/index.js";
import { WebgpuVertexFormat } from "../../npm/dist/engine/webgpu/index.js";
import { PackLodGeometry, TriGeometryRes } from "../../npm/dist/resource/geometry/index.js";
// The CMF emit hydrates into model classes, which this does not need; the
// runtime builds the plain graph first and hydrates after, so stop at the graph.
import { buildCmfFromShared } from "../../src/resource/formats/cmf/core/shared.js";

const options = { build: "3487903", host: "http://127.0.0.1:5510", target: "eve", prefix: "res:/dx9/model/ship", limit: 0, concurrency: 8 };

for (let i = 2; i < process.argv.length; i += 2)
{
  const name = process.argv[i].replace(/^--/, "");
  if (!(name in options)) throw new Error(`unknown option --${name}`);
  const value = process.argv[i + 1];
  options[name] = typeof options[name] === "number" ? Number(value) : value;
}

const base = `${options.host}/${options.target}/${options.build}`;

const counters = new Map();
const bump = (name, key) =>
{
  const map = counters.get(name) ?? counters.set(name, new Map()).get(name);
  map.set(key, (map.get(key) ?? 0) + 1);
};
const table = (name, n = 15) => [ ...(counters.get(name) ?? []) ].sort((a, b) => b[1] - a[1]).slice(0, n);

const totals = { files: 0, decoded: 0, fetchFailed: 0, decodeFailed: 0, meshes: 0, areas: 0, noDeclaration: 0, unalignedStride: 0 };

async function fetchBytes(path)
{
  const url = `${base}/resources/${path.replace(/^res:\//, "")}`;

  // A few requests fail transiently with a bare "fetch failed"; retry rather
  // than recording a resource as missing.
  for (let attempt = 0; ; attempt++)
  {
    try
    {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }
    catch (error)
    {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
}

function inspectMesh(mesh)
{
  totals.meshes++;

  const declaration = mesh?.decl;

  if (!declaration?.length)
  {
    totals.noDeclaration++;
    return;
  }

  bump("declarations", declaration.map(e => `${e.usage}${e.usageIndex}:${e.type}x${e.elementCount}`).join(","));

  for (const element of declaration)
  {
    bump("elementTypes", `${element.type}x${element.elementCount}`);

    try { WebgpuVertexFormat(element); }
    catch { bump("noWebgpuFormat", `${element.type}x${element.elementCount}`); }
  }

  // What the usage translation cannot carry into Carbon's vocabulary.
  const elements = CarbonVertexElements(declaration);
  if (elements.length !== declaration.length) bump("droppedUsages", declaration.length - elements.length);

  // Identity, not equality: the intern memo depends on it.
  if (CarbonVertexElements(declaration) !== elements) bump("problems", "translation identity is unstable");

  Tr2VertexDefinition.getHandle(elements);

  for (const lod of mesh.lods ?? [])
  {
    for (const area of lod.areas ?? [])
    {
      totals.areas++;
      bump("areaFields", Object.keys(area).sort().join(","));
    }
  }

  try
  {
    const packed = PackLodGeometry(mesh, 0);

    bump("strides", packed.vertex.stride);
    if (packed.vertex.stride % 4 !== 0) totals.unalignedStride++;
    if (packed.index) bump("indexFormats", packed.index.format);
  }
  catch (error)
  {
    bump("packFailures", String(error.message).slice(0, 90));
  }
}

const listing = await fetch(`${base}/resfiles`);
const paths = (await listing.json()).filter(path => path.startsWith(options.prefix) && path.toLowerCase().endsWith(".gr2"));

// Stratified rather than the first N alphabetically: hull, lowdetail and
// effects geometry carry noticeably different layouts, and taking a prefix of a
// sorted list would sample one race's ships and call it the corpus.
const bucketOf = path => (/\/effects\//i.test(path) ? "effects" : /_lowdetail\.gr2$/i.test(path) ? "lowdetail" : "hull");
const queue = [];

if (options.limit > 0 && options.limit < paths.length)
{
  const buckets = new Map();
  for (const path of paths) (buckets.get(bucketOf(path)) ?? buckets.set(bucketOf(path), []).get(bucketOf(path))).push(path);

  const share = Math.ceil(options.limit / buckets.size);
  for (const list of buckets.values())
  {
    const step = Math.max(1, Math.floor(list.length / share));
    for (let i = 0; i < list.length && queue.length < options.limit; i += step) queue.push(list[i]);
  }
}
else queue.push(...paths);

const total = queue.length;

await Promise.all(Array.from({ length: options.concurrency }, async () =>
{
  while (queue.length)
  {
    const path = queue.shift();
    totals.files++;

    let bytes = null;
    try { bytes = await fetchBytes(path); }
    catch { totals.fetchFailed++; continue; }

    try
    {
      const graph = buildCmfFromShared(CjsGr2Format.read(CjsGr2Format.readRaw(bytes), { emit: "json" }));
      for (const mesh of graph?.meshes ?? []) inspectMesh(mesh);
      totals.decoded++;
    }
    catch (error)
    {
      totals.decodeFailed++;
      bump("decodeFailures", String(error.message).slice(0, 90));
    }
  }
}));

const problems = table("problems").concat(table("noWebgpuFormat")).concat(table("packFailures"));

console.log(JSON.stringify({
  target: options.target,
  build: options.build,
  prefix: options.prefix,
  selected: total,
  ...totals,
  distinctDeclarations: (counters.get("declarations")?.size ?? 0),
  declarations: table("declarations", 20),
  elementTypes: table("elementTypes"),
  strides: table("strides"),
  indexFormats: table("indexFormats"),
  areaFields: table("areaFields"),
  droppedUsages: table("droppedUsages"),
  noWebgpuFormat: table("noWebgpuFormat"),
  packFailures: table("packFailures"),
  decodeFailures: table("decodeFailures", 20)
}, null, 1));

// A binding-path problem is a failure; a reader problem is reported and does
// not fail the run, because the reader is a separate contract.
if (problems.length || totals.unalignedStride) process.exitCode = 1;
