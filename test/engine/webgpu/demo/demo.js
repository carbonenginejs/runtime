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
import { Tr2Shader } from "../../../../npm/dist/resource/shader/index.js";
import { TriBatchType, RenderingMode } from "../../../../npm/dist/global/consts/graphics/index.js";


const WGSL = `
struct VertexOut { @builtin(position) position : vec4f, @location(0) normal : vec3f };

@vertex
fn vs(@location(0) position : vec3f, @location(1) normal : vec3f) -> VertexOut
{
    var out : VertexOut;
    out.position = vec4f(position, 1.0);
    out.normal = normal;
    return out;
}

@fragment
fn fs(in : VertexOut) -> @location(0) vec4f
{
    let lit = clamp(dot(normalize(in.normal), normalize(vec3f(0.3, 0.5, 1.0))), 0.15, 1.0);
    return vec4f(vec3f(0.15, 0.45, 0.9) * lit, 1.0);
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
    faces.push(0, 1 + i, 1 + ((i + 1) % points));
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
function geometryResource(mesh)
{
  const lod = mesh.lods[0];

  return {
    GetPath: () => "res:/demo/blob.cmf",
    IsGood: () => true,
    GetPayload: () => ({ meshes: [ mesh ] }),
    GetMeshVertexElements: () => mesh.decl,
    GetMeshLod: () => lod
  };
}

/** The shader inputs this WGSL declares, in Carbon usage codes. */
const INPUTS = [
  { usage: 0, usageIndex: 0, registerIndex: 0 },
  { usage: 2, usageIndex: 0, registerIndex: 1 }
];

/** A material with one technique of one pass, carrying real registered render states. */
function blobMaterial()
{
  const shader = new Tr2Shader();

  shader.effect.techniques = [ {
    name: "Main",
    passes: [ {
      // Registered, so the handle is a real setup rather than a reserved mode
      // slot, and the recipe is RM_OPAQUE's states with these overlaid.
      renderStates: Tr2EffectStateManager.registerRenderStateSetup({
        renderStateValues: [ { state: 22, value: 1 } ]   // RS_CULLMODE = CULLMODE_NONE
      }),
      stageInputs: [
        { exists: true, pipelineInputs: INPUTS, resources: new Map(), constants: [] },
        { exists: false, pipelineInputs: [], resources: new Map(), constants: [] }
      ]
    } ]
  } ];

  return {
    id: "blob",
    GetEffectRes: () => ({ GetContainerBytes: () => new Uint8Array([ 15, 0, 0, 0 ]) }),
    GetValues: () => ({}),
    GetShaderStateInterface: () => shader
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

/** Composes and runs one frame. Returns a short report for the page. */
export async function RunDemo(canvas)
{
  const adapter = await navigator.gpu?.requestAdapter();

  if (!adapter) throw new Error("no WebGPU adapter");

  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");
  const format = navigator.gpu.getPreferredCanvasFormat();

  context.configure({ device, format, alphaMode: "opaque" });

  const webgpu = new CjsWebgpuDevice({ device, shaderStage: GPUShaderStage });
  const mesh = blobMesh();
  const geometry = geometryResource(mesh);
  const material = blobMaterial();

  // The package the resolver would read from a container; hand-written here so
  // this demo proves the frame rather than the container read.
  const pipeline = {
    label: "blob",
    shaderModules: [
      { stageName: "vertex", wgsl: WGSL, entryPoint: "vs" },
      { stageName: "fragment", wgsl: WGSL, entryPoint: "fs" }
    ],
    bindGroups: []
  };

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
    CreatePackage: () => ({ GetPipeline: () => pipeline }),
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

  driver.scene = {
    GetRenderables: out => { out.push(blobRenderable(material, geometry)); return out; }
  };
  // The WGSL emits clip-space positions directly, so identity is honest here:
  // the driver needs real matrices, and inventing a perspective one would imply
  // a projection this shader does not apply.
  const IDENTITY = [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];

  driver.view = IDENTITY;
  driver.projection = IDENTITY;

  // THE FRAME. Everything from here is the shipped sequence.
  driver.Execute([ context.getCurrentTexture() ], null, 0, 0, null, renderContext);

  const intents = renderContext.TakeIntents();
  const submissions = intents.filter(intent => intent.type === "render-batches");

  let drawn = 0;

  for (const submission of submissions)
  {
    const prepared = await dispatcher.PrepareAccumulator(submission.batches, { batchType: 0 });

    if (!prepared?.batches?.length) continue;

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [ {
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0.02, g: 0.02, b: 0.05, a: 1 },
        loadOp: "clear",
        storeOp: "store"
      } ],
      depthStencilAttachment: {
        view: depth.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store"
      }
    });

    dispatcher.EncodeAccumulator(pass, prepared);
    pass.end();
    device.queue.submit([ encoder.finish() ]);

    drawn += prepared.batches.length;
  }

  return {
    intents: intents.map(intent => intent.type),
    submissions: submissions.length,
    drawn,
    triangles: mesh.lods[0].areas[0].elementCount
  };
}
