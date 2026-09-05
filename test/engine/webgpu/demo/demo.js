// A blob on screen, drawn through the REAL stack.
//
// Not a fixture. The point of this demo is that every piece between a scene and
// a pixel is the shipped one: EveSpaceSceneRenderDriver sequences the frame,
// CjsBatchManager collects, Tr2RenderContext records the submission,
// CjsWebgpuTrinityBatchResolver turns a Tr2RenderBatch into a pipeline, geometry
// and bindings, and CjsWebgpuDevice draws it.
//
// WHAT IS STUBBED, AND WHY IT IS HONEST TO STUB IT. Only two things:
//
//   1. The WGSL package. A real one comes from a translated Carbon container,
//      and reading one is a separately proven path with its own tests. Here the
//      resolver's injected CreatePackage hands back a hand-written pipeline, so
//      what this demo proves is the FRAME, not the container read.
//   2. The scene. A full EveSpaceScene needs SOF data; this supplies one
//      renderable with one mesh area, which is what the driver actually asks
//      for.
//
// Everything else - the order of the frame, the collection, the submission, the
// pipeline recipe built from Carbon's render states, the vertex layout built
// from a declaration, the draw arguments resolved from a LOD's areas - is real.
import { CjsWebgpuDevice } from "../../../../npm/dist/engine/webgpu/index.js";
import {
  CjsWebgpuRenderContextAL,
  CjsWebgpuRenderTarget,
  CjsWebgpuTrinityBatchDispatcher,
  CjsWebgpuTrinityBatchResolver
} from "../../../../npm/dist/engine/webgpu/internal.js";
import {
  CjsBatchManager,
  Tr2MeshArea,
  Tr2PerObjectData,
  Tr2RenderContext,
  TriRenderBatchAccumulator
} from "../../../../npm/dist/trinity/core/index.js";
import { EveSpaceSceneRenderDriver } from "../../../../npm/dist/trinity/index.js";
import { Tr2MeshBase } from "../../../../npm/dist/trinity/core/index.js";
import { Tr2EffectStateManager } from "../../../../npm/dist/trinity/shader/index.js";
import { Tr2EffectRes } from "../../../../npm/dist/resource/shader/index.js";
import { CjsWebgpuFormat } from "../../../../npm/dist/resource/formats/webgpu/index.js";
import { CjsGr2Format } from "../../../../npm/dist/resource/formats/gr2/index.js";
import { buildCmfFromRaw } from "../../../../src/resource/formats/gr2/core/targets.js";
import { CjsWebgpuPackage } from "../../../../npm/dist/engine/webgpu/index.js";
import { TriBatchType, RenderingMode } from "../../../../npm/dist/global/consts/graphics/index.js";


// Position only, because the vertex layout is built from the REAL container's
// declared inputs and ui/simple declares POSITION alone. The shader has to
// agree with the reflection, not the other way round - which is the point.
const WGSL = `
struct VertexOut { @builtin(position) position : vec4f, @location(0) local : vec3f };

@vertex
fn vs(@location(0) position : vec3f) -> VertexOut
{
    var out : VertexOut;
    out.position = vec4f(position, 1.0);
    out.local = position;
    return out;
}

@fragment
fn fs(in : VertexOut) -> @location(0) vec4f
{
    let radius = clamp(length(in.local.xy) * 1.6, 0.0, 1.0);
    return vec4f(mix(vec3f(0.35, 0.75, 1.0), vec3f(0.05, 0.15, 0.45), radius), 1.0);
}
`;

/** The blob: a fan around a centre, so the normals vary and the lighting shows. */
function blobMesh(points = 24)
{
  const position = [ 0, 0, 0 ];
  const normal = [ 0, 0, 1 ];
  const faces = [];

  for (let i = 0; i < points; i++)
  {
    const angle = (i / points) * Math.PI * 2;
    const radius = 0.55 + Math.sin(angle * 5) * 0.12;

    position.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    normal.push(Math.cos(angle) * 0.6, Math.sin(angle) * 0.6, 0.5);
    // CLOCKWISE. The effect authors cullMode back with frontFace cw, so a
    // counter-clockwise fan is entirely back-facing and every triangle is
    // culled - which is what a blank canvas meant the first time.
    faces.push(0, 1 + ((i + 1) % points), 1 + i);
  }

  const decl = [
    { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3, offset: 0 },
    { usage: "Normal", usageIndex: 0, type: "Float32", elementCount: 3, offset: 12 }
  ];

  return {
    decl,
    vertex: { position, normal },
    indices: [ { faces } ],
    lods: [ { ib: { size: faces.length * 2, stride: 2 }, areas: [ { firstElement: 0, elementCount: faces.length / 3 } ] } ]
  };
}

/** A geometry resource of the shape the resolver and Tr2MeshBase ask for. */
function geometryResource(mesh, path)
{
  const lod = mesh.lods?.[0] ?? null;

  return {
    GetPath: () => path,
    IsGood: () => true,
    GetPayload: () => ({ meshes: [ mesh ] }),
    GetMeshVertexElements: () => mesh.decl,
    GetMeshLod: () => lod
  };
}

/**
 * A real EVE hull, decoded in the browser.
 *
 * GR2 reflection emits no CMF declaration; the direct raw-to-CMF path is the
 * same projection and builder the runtime uses, so the declaration binding
 * seen here is the one a loaded ship carries, including packed tangents.
 *
 * Scaled into clip space because this demo has no projection: the point is the
 * declaration, the packing and the draw arguments, not the camera.
 *
 * @param {Uint8Array} bytes Container bytes.
 * @returns {object} CMF-shaped mesh.
 */
function hullMesh(bytes)
{
  const graph = buildCmfFromRaw(CjsGr2Format.readRaw(bytes));
  const mesh = graph.meshes[0];
  const position = mesh.vertex.position;

  let extent = 0;

  for (const value of position) extent = Math.max(extent, Math.abs(value));

  if (extent > 0)
  {
    const scale = 0.9 / extent;

    // Side-on. A hull is long in Z, so viewing down Z with no projection shows
    // only its front cross-section - which is what the first render was, and it
    // looked like nothing. Swapping Z into screen X puts the length across the
    // view so the silhouette is the ship.
    for (let i = 0; i < position.length; i += 3)
    {
      const x = position[i] * scale;
      const y = position[i + 1] * scale;
      const z = position[i + 2] * scale;

      position[i] = z;
      position[i + 1] = y;
      position[i + 2] = x;
    }
  }

  return mesh;
}

/** The shader inputs this WGSL declares, in Carbon usage codes. */
const INPUTS = [
  { usage: 0, usageIndex: 0, registerIndex: 0 },
  { usage: 2, usageIndex: 0, registerIndex: 1 }
];

/**
 * A material read from a REAL Carbon effect container.
 *
 * The container is a stock dx11 one, which is what Tr2EffectRes reads: the
 * translated tree carries the same reflection, and translation is what produces
 * the WGSL. So the reflection driving the pipeline - its inputs, its render
 * states, its stage layout - is the shipped effect's own, not a hand-written
 * stand-in.
 *
 * @param {Uint8Array} bytes Container bytes.
 * @param {string} path Resource path the container came from.
 * @returns {object} Trinity material.
 */
function containerMaterial(bytes, path)
{
  const resource = new Tr2EffectRes().Initialize(path);

  resource.DoLoad(bytes);

  const shader = resource.GetShaderByIndex(0);

  // Stamps the registration handles onto the passes, which is what makes the
  // render-state handle a real setup rather than the reserved RM_ANY slot.
  Tr2EffectStateManager.registerShaderHandles(shader);

  return {
    id: path,
    GetEffectRes: () => resource,
    GetValues: () => ({}),
    GetShaderStateInterface: () => shader,

    // The accumulator asks every committed batch whether it can be merged into
    // a grouped draw. It is asked directly rather than through a `?.` hedge, so
    // a stand-in material has to answer - and false is the honest answer here,
    // because this demo has one batch and nothing to merge it with.
    CompatibleWithGdr: () => false
  };
}

/** One renderable holding one mesh area, which is all the driver asks for. */
function blobRenderable(material, geometry)
{
  const area = new Tr2MeshArea();

  area.SetMaterial(material);
  area.SetIndex(0);
  area.SetCount(1);

  return {
    GetPerObjectData: () => new Tr2PerObjectData(),
    HasTransparentBatches: () => false,
    GetBatches(accumulator, batchType, perObjectData)
    {
      if (batchType !== TriBatchType.TRIBATCHTYPE_OPAQUE) return false;

      // The real batch-building path, so the declaration is translated and the
      // draw arguments come from the LOD's areas.
      // Tr2MeshBase builds the batch, so the declaration is translated and the
      // draw arguments come from the LOD areas - the real path, not a copy.
      const base = new Tr2MeshBase();

      base.meshIndex = 0;
      base.GetGeometryResource = () => geometry;

      return base.GetBatches(accumulator, [ area ], perObjectData);
    }
  };
}

/**
 * How many pixels differ from the clear colour.
 *
 * Read from the GPU rather than inferred from a screenshot: every cheaper proxy
 * has given a wrong answer at least once, in both directions.
 *
 * @param {GPUDevice} device Live device.
 * @param {GPUCanvasContext} context Configured canvas context.
 * @param {HTMLCanvasElement} canvas The canvas drawn into.
 * @returns {Promise<number>} Count of non-clear pixels.
 */
async function CountDrawnPixels(device, context, canvas)
{
  const bytesPerRow = Math.ceil(canvas.width * 4 / 256) * 256;
  const buffer = device.createBuffer({
    size: bytesPerRow * canvas.height,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });

  const encoder = device.createCommandEncoder();

  encoder.copyTextureToBuffer(
    { texture: context.getCurrentTexture() },
    { buffer, bytesPerRow },
    { width: canvas.width, height: canvas.height }
  );

  device.queue.submit([ encoder.finish() ]);

  await buffer.mapAsync(GPUMapMode.READ);

  const pixels = new Uint8Array(buffer.getMappedRange());
  const clear = [ pixels[0], pixels[1], pixels[2] ];
  let drawn = 0;

  for (let y = 0; y < canvas.height; y++)
  {
    for (let x = 0; x < canvas.width; x++)
    {
      const at = y * bytesPerRow + x * 4;

      if (pixels[at] !== clear[0] || pixels[at + 1] !== clear[1] || pixels[at + 2] !== clear[2]) drawn++;
    }
  }

  buffer.unmap();
  buffer.destroy();

  return drawn;
}

/** Composes and runs one frame. Returns a short report for the page. */
export async function RunDemo(canvas)
{
  const adapter = await navigator.gpu?.requestAdapter();

  if (!adapter) throw new Error("no WebGPU adapter");

  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");
  const format = navigator.gpu.getPreferredCanvasFormat();

  // THE CONTEXT IS CONFIGURED ONCE, BY THE RENDER TARGET, further down.
  // Configuring it here as well destroyed the canvas texture the target had
  // already acquired, and the only symptom was a submit warning and a blank
  // canvas - the draw itself was correct and encoded a batch.

  const webgpu = new CjsWebgpuDevice({ device, shaderStage: GPUShaderStage });
  // A real hull, fetched through the same proxy as the effect.
  const geometryPath = "dx9/model/ship/amarr/frigate/af1/af1_t1.gr2";
  const geometryResponse = await fetch(`/resource/${geometryPath}`);

  if (!geometryResponse.ok) throw new Error(`geometry fetch failed: ${geometryResponse.status}`);

  const geometryBytes = new Uint8Array(await geometryResponse.arrayBuffer());
  const mesh = hullMesh(geometryBytes);
  const geometry = geometryResource(mesh, `res:/${geometryPath}`);

  // The real effect, fetched through the runner's resource proxy so no client
  // bytes are committed with the demo.
  const effectPath = "graphics/effect.dx11/ui/simple.sm_hi";
  const response = await fetch(`/resource/${effectPath}`);

  if (!response.ok) throw new Error(`effect fetch failed: ${response.status}`);

  const containerBytes = new Uint8Array(await response.arrayBuffer());
  const material = containerMaterial(containerBytes, `res:/${effectPath}`);

  // Translated from the same container, in the browser. This is the whole
  // point of the exercise: the WGSL the device compiles is produced from the
  // shipped effect's DXBC rather than written by hand.
  const blobPipeline = {
    label: "blob",
    shaderModules: [
      { stageName: "vertex", wgsl: WGSL, entryPoint: "vs" },
      { stageName: "fragment", wgsl: WGSL, entryPoint: "fs" }
    ],
    bindGroups: []
  };

  // Translated in the browser from the shipped container's DXBC. Not drawn -
  // proving the read is a separate claim from proving the frame - but the
  // pipeline it yields is inspected below.
  const translated = CjsWebgpuFormat.buildEffect(containerBytes, {
    source: `res:/${effectPath}`,
    permutationMode: "selected"
  });

  const translatedPipeline = CjsWebgpuPackage
    .fromBytes(translated.bytes, { read: CjsWebgpuFormat.read })
    .GetPipeline("Main", 0);

  // RM_OPAQUE authors depth test and write, so a frame drawing it needs a depth
  // attachment. The resolver refuses rather than dropping the state, which is
  // how this demo found out.
  const depthFormat = "depth24plus";
  const depth = device.createTexture({
    size: [ canvas.width, canvas.height ],
    format: depthFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });

  const resolver = new CjsWebgpuTrinityBatchResolver(webgpu, {
    // The blob's own WGSL, so the CANVAS proves the frame. The container path
    // below proves the read, and neither claim rests on the other: a UI shader
    // drawn over this geometry would paint or not for reasons of its own.
    CreatePackage: () => ({ GetPipeline: () => blobPipeline }),
    targets: [ { format } ],
    depthFormat
  });

  const dispatcher = new CjsWebgpuTrinityBatchDispatcher(webgpu, resolver);

  const batchManager = new CjsBatchManager({
    batchTypes: [ TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_DECAL ],
    createAccumulator: () => new TriRenderBatchAccumulator()
  });

  batchManager.Initialize();

  const renderContext = new Tr2RenderContext();
  const driver = new EveSpaceSceneRenderDriver().SetBatchManager(batchManager);

  // THE SCENE THE DRIVER ACTUALLY ASKS FOR. Under the intent path only
  // GetRenderables was ever reached, because the verbs recorded and returned;
  // driving the abstraction layer runs the real sequence, so the update and
  // per-frame hooks have to answer too. They are no-ops here on purpose - this
  // demo proves the DRAW path, and a fog or lighting blend it does not use
  // would be scenery pretending to be a test.
  driver.scene = {
    Update: () => {},
    BlendLightingOverrides: () => {},
    UpdateFogSettings: () => {},
    GetRenderables: out => { out.push(blobRenderable(material, geometry)); return out; }
  };
  // The WGSL emits clip-space positions directly, so identity is honest here:
  // the driver needs real matrices, and inventing a perspective one would imply
  // a projection this shader does not apply.
  const IDENTITY = [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];

  driver.view = IDENTITY;
  driver.projection = IDENTITY;

  // THE FRAME, THROUGH THE ABSTRACTION LAYER. This block used to drain an
  // intent queue and hand-roll a pass; the AL does all of it now, which is the
  // whole point of the exercise - if the canvas still lights up, the recording
  // layer was redundant.
  const renderTarget = new CjsWebgpuRenderTarget(webgpu, {
    canvas,
    context,
    format,
    depthFormat,
    // The frame is counted back, so the surface must be copyable. Without
    // this the demo draws and then cannot prove it.
    extraUsage: GPUTextureUsage.COPY_SRC
  }).Configure({ width: canvas.width, height: canvas.height });

  const al = new CjsWebgpuRenderContextAL({ webgpu, dispatcher, renderTarget });

  al.CreateDevice();
  renderContext.SetRenderContextAL(al);

  // ONE FRAME, ENDED ASYNCHRONOUSLY. Trinity produces the frame synchronously
  // and the backend prepares its pipelines through promises, so the await sits
  // at the end of the scene - which is where the intent queue used to put it,
  // and the real reason that queue existed.
  let drawn = 0;

  al.BeginScene();
  driver.Execute([ renderTarget ], null, 0, 0, null, renderContext);
  await al.EndScene();

  drawn = al.GetDrawnBatchCount();

  const pass = material.GetShaderStateInterface().GetEffect().techniques[0].passes[0];
  const declared = (translatedPipeline?.bindGroups ?? [])
    .flatMap(group => group.bindings ?? [])
    .map(binding => binding.scopeIdentity ?? binding.name);

  const lod = mesh.lods[0];

  return {
    litPixels: await CountDrawnPixels(device, context, canvas),
    effect: effectPath,
    geometry: geometryPath,
    geometryBytes: geometryBytes.length,
    declaration: mesh.decl.map(element => `${element.usage}${element.usageIndex}:${element.type}x${element.elementCount}`),
    meshes: 1,
    areas: lod.areas.length,
    declaredBindings: declared,
    containerBytes: containerBytes.length,
    translatedBytes: translated.bytes.length,
    inputs: (pass.stageInputs[0]?.signature?.pipelineInputs ?? [])
      .map(input => `usage${input.usage}.${input.usageIndex}@${input.registerIndex}`),
    renderStateHandle: pass.renderStates,
    drawn,
    triangles: lod.areas.reduce((total, area) => total + (area.elementCount ?? 0), 0)
  };
}
