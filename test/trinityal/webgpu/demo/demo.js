// A real EVE hull drawn with its own shader, through the shipped path.
//
// IT DRAWS. The operator saw the af1 hull's silhouette in Chrome on 2026-09-10 -
// white and unshaded, because nothing fills the material's textures or constants
// yet, but the right shape in the right place. af1 has been loaded in a browser
// before; it had not been drawn THROUGH TRINITY, and that is what is new.
//
// IT DREW FOR A SPLIT SECOND, AND THAT WAS THIS FILE'S FAULT. The pixel count
// asked the canvas context for its current texture instead of the one the frame
// had rendered into, and after a submit that can be a different swap-chain
// image, so it read an empty one and reported zero. A zero then triggered the
// cull-inverted diagnostic frame, which drew nothing over the hull. Both halves
// are fixed: the count takes the presented texture, and the winding check is
// opt-in behind `?cull=invert`. A headless run still counts zero where a windowed
// Chrome draws, so the readback is not yet trustworthy on its own - the canvas
// is. Do not read a zero here as proof of nothing.
//
// Measured correct, on a real adapter, as of 2026-09-10:
//
//   - the pipeline: cull back / front-face cw / depth less-equal with write,
//     one bgra8unorm target, no blending - the states `quadv5` authors;
//   - the vertex layout: all seven attributes at the right offsets over a
//     72-byte stride, matched to the program's declared inputs;
//   - the draw: `drawIndexed(19155, 1, 217332, 0, 0)` - 6385 triangles, with
//     the suballocated buffer's index offset folded into `firstIndex` and the
//     vertex allocation at zero, so `baseVertex` is correctly zero;
//   - the pass: colour and depth both CLEAR, depth cleared to 1, both stored;
//   - the constants: the per-frame block lands at b1 and the per-object block
//     at b3, the two registers the vertex stage declares, at the dynamic
//     offsets the arena handed out, and the sixteen floats at `cb1[4..7]` are
//     byte-for-byte the transposed view-projection this file computed;
//   - the geometry bytes: position followed by a unit-length normal at the
//     declared offsets, so the interleave is right;
//   - winding: checkable by running the frame again with the cull mode inverted
//     through the state manager's own override - `?cull=invert`;
//   - the fragment shader: no `discard` anywhere and alpha hard-coded to 1, so
//     it cannot be silently throwing fragments away;
//   - no WebGPU validation error, with an error scope around the frame.
//
// What is left is the SHADING, not the frame: two of the five uniform bindings
// receive no upload at all, and the material's textures and constants are
// unfilled, so the hull comes out white. The SOF document for
// `dna:/af1_t1:amarrbase:amarr` names exactly what they should be - its
// `mesh.opaqueAreas[0].effect` carries the parameters and a `TriTextureParameter`
// per map, AlbedoMap through PaintMaskMap - so the next step is to hydrate the
// material from it and load those textures rather than to invent values.
//
// Nothing here hands the backend a pipeline. The frame runs the way Carbon's
// does: `EveSpaceSceneRenderDriver` sequences it, `CjsBatchManager` collects,
// `Tr2RenderContext.RenderBatches` walks the accumulator and calls the
// abstraction layer's verbs, and every draw resolves its own pipeline inside the
// verb that issued it. The previous version of this demo injected a
// hand-written pipeline past the container and was deleted with the dispatcher
// it composed; this one has no such hook, because there is no longer anywhere to
// put it.
//
// WHERE THE WGSL COMES FROM, AND WHY THAT IS THE POINT. tools-core serves
// translated WebGPU effect containers of its own, under
// `graphics/effect.webgpu/`, built by `CjsToolShaderBuilderWebgpu`. A container
// from that tree is an ordinary Carbon v15 container whose stage programs happen
// to be WGSL text, so `Tr2EffectRes` reads it with no special case, and
// `Tr2EffectStateManager` hands those bytes to `CreateShader` exactly as it
// would hand DXBC to a DX12 backend. The shader this demo draws with is the
// shipped `quadv5` - 5 KB of vertex WGSL and 21 KB of fragment WGSL - not a
// stand-in.
//
// THE OVERLAY IS PINNED TO AN EXACT BUILD. Those containers live in a persistent
// resource overlay, and overlays are only opened for an exact build number, so
// `latest` does not see them and returns 404. The runner's proxy pins the build;
// see its TOOLS_CORE default.
//
// WHAT IS STILL STUBBED, AND IT IS THE SCENE. A full `EveSpaceScene` needs SOF
// data; this supplies the four things the driver asks a scene for - its
// renderables and its two per-frame blocks, plus no-op update hooks. The
// per-frame matrices are computed here rather than by a scene graph, which is
// honest: they are the scene's to own (`BindPerFrameVSData` reads
// `scene.GetPerFrameVSData()`), and a camera is not what this demo is testing.
// Everything below the scene is real - the declaration translated by
// `Tr2MeshBase`, the vertex layout built from it against the program's declared
// inputs, the draw arguments from the LOD's areas, the render states the effect
// authors, the resource set laid out against the program's bindings.

import { CjsBatchManager, Tr2MeshArea, Tr2MeshBase, Tr2RenderContext, RawData, TriRenderBatchAccumulator } from "../../../../npm/dist/trinity/core/index.js";
import { CjsWebgpuDevice } from "../../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuRenderContextAL, CjsWebgpuRenderTarget } from "../../../../npm/dist/trinityal/webgpu/internal.js";
import { EveSpaceSceneRenderDriver } from "../../../../npm/dist/trinity/index.js";
import { Tr2Effect, Tr2EffectStateManager } from "../../../../npm/dist/trinity/shader/index.js";
import { Tr2EffectRes } from "../../../../npm/dist/resource/shader/index.js";
import { CjsGr2Format } from "../../../../npm/dist/resource/formats/gr2/index.js";
import { CjsCmfFormat } from "../../../../npm/dist/resource/formats/cmf/index.js";
import { TriBatchType } from "../../../../npm/dist/global/consts/graphics/index.js";
import { mat4 } from "../../../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../../../npm/dist/global/math/vec3.js";


/** The hull's own shader, from tools-core's WebGPU effect tree. */
const EFFECT = "graphics/effect.webgpu/managed/space/spaceobject/v5/quad/unpacked_quadv5.sm_hi";

/** An Amarr frigate. Real geometry, real declaration, real packed tangents. */
const HULL = "dx9/model/ship/amarr/frigate/af1/af1_t1.gr2";


/**
 * Fetches one client resource through the runner's proxy.
 *
 * @param {string} path Logical resource path, without the `res:/` prefix.
 * @returns {Promise<Uint8Array>} The bytes.
 */
async function ResourceBytes(path)
{
  const response = await fetch(`/resource/${path}`);

  if (!response.ok) throw new Error(`${path}: ${response.status} ${response.statusText}`);

  return new Uint8Array(await response.arrayBuffer());
}


/**
 * Reads a GR2 hull into the CMF shape the mesh path takes.
 *
 * Both halves are the public one-shot readers: `CjsGr2Format.read` gives shared
 * geometry, `CjsCmfFormat.loadShared` projects it to a CMF graph with a
 * declaration and LOD areas. An earlier version reached past them into the gr2
 * target projection, which is not exported from the built package at all - so
 * the demo only ran from source, and raw Node then choked on the decorators in
 * the modules beside it.
 *
 * @param {Uint8Array} bytes Container bytes.
 * @returns {object} A CMF-shaped mesh.
 */
function HullMesh(bytes)
{
  return CjsCmfFormat.loadShared(CjsGr2Format.read(bytes)).meshes[0];
}


/** The channels and declaration the `unpacked_` shader family reads. */
const UNPACKED_DECLARATION = Object.freeze([
  { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3 },
  { usage: "Normal", usageIndex: 0, type: "Float32", elementCount: 3 },
  { usage: "Tangent", usageIndex: 0, type: "Float32", elementCount: 3 },
  { usage: "Binormal", usageIndex: 0, type: "Float32", elementCount: 3 },
  { usage: "TexCoord", usageIndex: 0, type: "Float32", elementCount: 2 },
  { usage: "TexCoord", usageIndex: 1, type: "Float32", elementCount: 2 },
  { usage: "BoneIndices", usageIndex: 0, type: "UInt16", elementCount: 4 }
]);


/**
 * Re-declares a hull's vertices in the form the `unpacked_` shaders read.
 *
 * THREE TANGENT FORMS EXIST - unpacked, packed, and packed legacy - and a hull
 * and a shader need not agree on which. This one stores the legacy packed frame,
 * and `unpacked_quadv5` declares explicit normal, tangent and binormal plus a
 * second UV set and bone indices, so a declaration taken straight off the
 * container satisfies POSITION and TEXCOORD0 alone. The backend then refuses
 * the draw and names what it could not supply, which is how this demo found out:
 * `a vertex element for input 6:0, 2:0, 4:0, 5:1`.
 *
 * NOTHING IS DECODED HERE. The GR2 reader's own post-processing already expands
 * the frame - the mesh arrives carrying `normal`, `tangent`, `binormal`,
 * `texcoord1`, `blendIndice` and `blendWeight` channels beside the packed one -
 * and only the DECLARATION prefers the packed form. So this rewrites the
 * declaration over channels that are already there, which is the whole of the
 * difference between the two shader families for this hull. Choosing the form
 * per shader belongs in the mesh path rather than in a demo.
 *
 * Carbon's DX11 path FABRICATES a missing element so the layout still builds
 * (`Tr2VertexLayoutALDx11.cpp:179-207`) and ccpwgl disables the attribute; this
 * backend refuses instead, so something must supply what both of them fake.
 *
 * @param {object} mesh CMF mesh, mutated in place.
 * @returns {object} The same mesh, with the unpacked declaration.
 */
function Unpack(mesh)
{
  for (const channel of [ "normal", "tangent", "binormal", "texcoord1", "blendIndice" ])
  {
    if (!mesh.vertex[channel]?.length) throw new Error(`hull carries no ${channel} channel`);
  }

  let offset = 0;

  mesh.decl = UNPACKED_DECLARATION.map(element =>
  {
    const stride = element.type === "UInt16" ? 2 : 4;
    const placed = { ...element, offset, stream: 0 };

    offset += stride * element.elementCount;

    return placed;
  });

  // PackLodGeometry reads the LOD's own channels when it has them, so the LOD
  // the batch draws has to carry the expanded ones too, not just the mesh.
  for (const lod of mesh.lods ?? [])
  {
    if (lod.vertex) lod.vertex = mesh.vertex;
  }

  return mesh;
}


/**
 * The bounding sphere of a mesh's positions, so the camera can frame it.
 *
 * @param {object} mesh CMF mesh.
 * @returns {{centre: Float32Array, radius: number}} Centre and radius.
 */
function Bounds(mesh)
{
  const position = mesh.vertex.position;
  const min = [ Infinity, Infinity, Infinity ];
  const max = [ -Infinity, -Infinity, -Infinity ];

  for (let i = 0; i < position.length; i += 3)
  {
    for (let axis = 0; axis < 3; axis += 1)
    {
      min[axis] = Math.min(min[axis], position[i + axis]);
      max[axis] = Math.max(max[axis], position[i + axis]);
    }
  }

  const centre = vec3.fromValues((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  const radius = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2 || 1;

  return { centre, radius };
}


/**
 * A geometry resource of the shape `Tr2MeshBase` asks for.
 *
 * @param {object} mesh CMF mesh.
 * @param {string} path Resource path.
 * @returns {object} The resource.
 */
function GeometryResource(mesh, path)
{
  return {
    GetPath: () => path,
    IsGood: () => true,
    GetPayload: () => ({ meshes: [ mesh ] }),
    GetMeshVertexElements: () => mesh.decl,
    GetMeshLod: () => mesh.lods[0]
  };
}


/**
 * The material: a real `Tr2Effect` over a real container.
 *
 * `RebuildCachedData` is what maps the container's authored constants onto the
 * byte offsets the material uploads from, and `registerShaderHandles` is what
 * turns the pass's reserved slots into live render-state and shader-program
 * handles. Both are the shipped calls; nothing about the material is a stand-in.
 *
 * @param {Uint8Array} bytes Container bytes.
 * @param {string} path Resource path.
 * @returns {object} The effect, used as the area's material.
 */
function Material(bytes, path)
{
  const resource = new Tr2EffectRes().Initialize(path);

  resource.DoLoad(bytes);

  const effect = new Tr2Effect();

  effect.effectResource = resource;
  effect.RebuildCachedData();

  Tr2EffectStateManager.registerShaderHandles(effect.shader);

  return effect;
}


/**
 * One renderable holding the hull's areas.
 *
 * @param {object} material The effect.
 * @param {object} geometry The geometry resource.
 * @param {object} mesh CMF mesh, for its area count.
 * @param {object} perObject The per-object payload pair.
 * @returns {object} The renderable.
 */
function HullRenderable(material, geometry, mesh, perObject)
{
  const area = new Tr2MeshArea();

  area.SetMaterial(material);
  area.SetIndex(0);
  area.SetCount(mesh.lods[0].areas.length);

  return {
    GetPerObjectData: () => perObject,
    HasTransparentBatches: () => false,
    GetBatches(accumulator, batchType, perObjectData)
    {
      if (batchType !== TriBatchType.TRIBATCHTYPE_OPAQUE) return false;

      // The real batch-building path: the declaration is translated here and
      // the draw arguments come from the LOD's areas.
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
 * Read back off the GPU rather than inferred from a screenshot: both cheaper
 * proxies have given a wrong answer here before, in both directions.
 *
 * THE TEXTURE IS THE ONE THE PASS RENDERED INTO, passed in, and that is the
 * whole correction. This called `context.getCurrentTexture()` itself, which
 * after a submit can hand back a DIFFERENT swap-chain image than the frame was
 * drawn into - so it counted zero while the hull was on screen, and the demo
 * then ran its cull-inverted second frame and wiped the hull away. The operator
 * saw the silhouette for a split second; the instruments reported nothing.
 *
 * @param {GPUDevice} device Live device.
 * @param {GPUTexture} texture The texture the frame rendered into.
 * @param {HTMLCanvasElement} canvas The canvas drawn into.
 * @returns {Promise<number>} Count of non-clear pixels.
 */
async function CountDrawnPixels(device, texture, canvas)
{
  if (!texture) return 0;

  const bytesPerRow = Math.ceil(canvas.width * 4 / 256) * 256;
  const buffer = device.createBuffer({
    size: bytesPerRow * canvas.height,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  const encoder = device.createCommandEncoder();

  encoder.copyTextureToBuffer(
    { texture },
    { buffer, bytesPerRow },
    { width: canvas.width, height: canvas.height }
  );

  device.queue.submit([ encoder.finish() ]);

  await buffer.mapAsync(GPUMapMode.READ);

  const pixels = new Uint8Array(buffer.getMappedRange());
  const clear = [ pixels[0], pixels[1], pixels[2] ];
  let drawn = 0;

  for (let y = 0; y < canvas.height; y += 1)
  {
    for (let x = 0; x < canvas.width; x += 1)
    {
      const at = y * bytesPerRow + x * 4;

      if (pixels[at] !== clear[0] || pixels[at + 1] !== clear[1] || pixels[at + 2] !== clear[2]) drawn += 1;
    }
  }

  buffer.unmap();
  buffer.destroy();

  return drawn;
}


/**
 * The scene's per-frame blocks, framed on the hull.
 *
 * CARBON IS ROW-VECTOR AND gl-matrix IS COLUMN-VECTOR, so every composition
 * swaps its operands: Carbon's `view * projection` is `multiply(out,
 * projection, view)` here. Getting it the other way round yields a matrix that
 * is not obviously wrong and puts the hull nowhere.
 *
 * @param {object} bounds Centre and radius of the hull.
 * @param {number} aspect Viewport aspect ratio.
 * @returns {{vs: object, ps: object, viewProjection: Float32Array}} The blocks.
 */
function PerFrameData(bounds, aspect)
{
  const distance = bounds.radius * 3;
  const eye = vec3.fromValues(
    bounds.centre[0] + distance * 0.8,
    bounds.centre[1] + distance * 0.35,
    bounds.centre[2] + distance * 0.8
  );
  const view = mat4.lookAt(mat4.create(), eye, bounds.centre, vec3.fromValues(0, 1, 0));

  // ZO, not NO: WebGPU's clip volume puts the near plane at zero, as D3D and
  // Metal do. An OpenGL-style projection clips half the model away before any
  // raster state gets a say.
  const projection = mat4.perspectiveZO(mat4.create(), Math.PI / 4, aspect, bounds.radius * 0.05, distance * 4);
  const viewProjection = mat4.multiply(mat4.create(), projection, view);
  const vs = RawData.create("EveSpaceScenePerFrameVSData");
  const ps = RawData.create("EveSpaceScenePerFramePSData");

  // TRANSPOSED ON THE WAY IN, which is not decoration. The shader reads each
  // matrix as four consecutive `vec4`s and DOTS the position with them, so it
  // wants the rows where gl-matrix stores columns. `SetAndTranspose` is the
  // method the rest of the runtime writes these with for exactly that reason.
  const viewInverse = mat4.invert(mat4.create(), view);

  vs.SetAndTranspose("ViewMat", view);
  vs.SetAndTranspose("ProjectionMat", projection);
  vs.SetAndTranspose("ViewProjectionMat", viewProjection);
  vs.SetAndTranspose("ViewInverseTransposeMat", viewInverse);
  vs.Set("Sun.DirWorld", [ 0.57, 0.57, 0.57 ]);
  vs.Set("Sun.DiffuseColor", [ 1, 1, 1, 1 ]);
  vs.Set("TargetResolution", [ 768, 576 ]);
  vs.Set("ViewportSize", [ 768, 576 ]);

  ps.SetAndTranspose("ViewInverseTransposeMat", viewInverse);
  ps.SetAndTranspose("ViewMat", view);
  ps.Set("Sun.DirWorld", [ 0.57, 0.57, 0.57 ]);
  ps.Set("Sun.DiffuseColor", [ 1, 1, 1, 1 ]);
  ps.Set("AmbientColor", [ 0.3, 0.33, 0.4 ]);
  ps.Set("ReflectionIntensity", 0.2);
  ps.Set("ViewportSize", [ 768, 576 ]);
  ps.Set("TargetResolution", [ 768, 576 ]);

  return { vs, ps, viewProjection };
}


/** Composes and runs one frame. Returns a short report for the page. */
export async function RunDemo(canvas)
{
  const adapter = await navigator.gpu?.requestAdapter();

  if (!adapter) throw new Error("no WebGPU adapter");

  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");

  // REMEMBERS WHICH SWAP-CHAIN IMAGE THE FRAME WENT INTO, because asking the
  // context again after a submit can hand back a different one, and the readback
  // then measures a blank image while the drawn one is on screen.
  let presented = null;
  const getCurrentTexture = context.getCurrentTexture.bind(context);

  context.getCurrentTexture = () =>
  {
    presented = getCurrentTexture();

    return presented;
  };
  const format = navigator.gpu.getPreferredCanvasFormat();

  // THE CONTEXT IS CONFIGURED ONCE, BY THE RENDER TARGET, below. Configuring it
  // here as well destroys the canvas texture the target has already acquired,
  // and the only symptom is a submit warning and a blank canvas.
  // DIAGNOSTIC, AND IT EARNED ITS PLACE. A frame that resolves a pipeline and
  // encodes a draw and still shows nothing has several equally plausible causes
  // - winding, depth compare, matrices, a black material - and guessing between
  // them cost three wrong attempts the last time. This reports what the device
  // was actually asked for.
  const pipelines = [];
  const createRenderPipeline = device.createRenderPipeline.bind(device);

  device.createRenderPipeline = descriptor =>
  {
    pipelines.push({
      primitive: descriptor.primitive ?? null,
      depthStencil: descriptor.depthStencil ?? null,
      targets: (descriptor.fragment?.targets ?? []).map(target => ({
        format: target?.format ?? null,
        blend: target?.blend ?? null,
        writeMask: target?.writeMask ?? null
      })),
      vertexBuffers: (descriptor.vertex?.buffers ?? []).map(buffer => ({
        arrayStride: buffer?.arrayStride ?? null,
        attributes: (buffer?.attributes ?? []).map(a => `${a.shaderLocation}:${a.format}@${a.offset}`)
      }))
    });

    return createRenderPipeline(descriptor);
  };

  // Every constant upload, so "the matrix never reached the shader" can be
  // distinguished from "the matrix was wrong" without another guess.
  const uploads = [];
  const writeBuffer = device.queue.writeBuffer.bind(device.queue);

  device.queue.writeBuffer = (buffer, offset, data, ...rest) =>
  {
    // THROUGH THE VIEW, NOT THE BACKING BUFFER. Reading `data.buffer` from zero
    // ignores `byteOffset` and reports whatever else shares the allocation: the
    // first version of this probe showed vertex positions where it claimed to
    // show constants, which is a worse failure than no probe at all.
    const view = data.buffer
      ? new Float32Array(data.buffer, data.byteOffset ?? 0, Math.floor((data.byteLength ?? data.buffer.byteLength) / 4))
      : new Float32Array(data);

    uploads.push({
      label: buffer.label ?? null,
      offset,
      bytes: view.byteLength,
      floats: Array.from(view.slice(0, 40))
    });

    return writeBuffer(buffer, offset, data, ...rest);
  };

  const bindGroups = [];
  const createBindGroup = device.createBindGroup.bind(device);

  device.createBindGroup = descriptor =>
  {
    bindGroups.push((descriptor.entries ?? []).map(entry => ({
      binding: entry.binding,
      kind: entry.resource?.buffer ? "buffer" : (entry.resource?.constructor?.name ?? "resource"),
      offset: entry.resource?.offset ?? null,
      size: entry.resource?.size ?? null
    })));

    return createBindGroup(descriptor);
  };

  // What the encoder was actually told to draw. An index count of zero and a
  // full count that is entirely culled look identical on the canvas.
  const draws = [];
  const createCommandEncoder = device.createCommandEncoder.bind(device);

  device.createCommandEncoder = descriptor =>
  {
    const encoder = createCommandEncoder(descriptor);
    const beginRenderPass = encoder.beginRenderPass.bind(encoder);

    encoder.beginRenderPass = passDescriptor =>
    {
      const depth = passDescriptor.depthStencilAttachment;

      draws.push(`beginRenderPass:colors=${(passDescriptor.colorAttachments ?? []).map(a => `${a?.loadOp}/${a?.storeOp}`).join("|")}`
        + ` depth=${depth ? `${depth.depthLoadOp}/${depth.depthStoreOp}@${depth.depthClearValue}` : "none"}`);

      const pass = beginRenderPass(passDescriptor);
      const drawIndexed = pass.drawIndexed.bind(pass);
      const setBindGroup = pass.setBindGroup.bind(pass);
      const setViewport = pass.setViewport?.bind(pass);
      const setScissorRect = pass.setScissorRect?.bind(pass);

      if (setViewport) pass.setViewport = (...a) => { draws.push(`setViewport:${a.join(",")}`); return setViewport(...a); };
      if (setScissorRect) pass.setScissorRect = (...a) => { draws.push(`setScissorRect:${a.join(",")}`); return setScissorRect(...a); };

      pass.setBindGroup = (index, group, offsets) =>
      {
        draws.push(`setBindGroup:${index}:offsets=${(offsets ?? []).join("/")}`);

        return setBindGroup(index, group, offsets);
      };
      const setIndexBuffer = pass.setIndexBuffer.bind(pass);
      const setVertexBuffer = pass.setVertexBuffer.bind(pass);

      pass.drawIndexed = (...args) => { draws.push(`drawIndexed:${args.join(",")}`); return drawIndexed(...args); };
      pass.setIndexBuffer = (buffer, format, offset, size) =>
      {
        draws.push(`setIndexBuffer:${format}@${offset ?? 0}+${size ?? "rest"}`);

        return setIndexBuffer(buffer, format, offset, size);
      };
      pass.setVertexBuffer = (slot, buffer, offset, size) =>
      {
        draws.push(`setVertexBuffer:${slot}@${offset ?? 0}+${size ?? "rest"}`);

        return setVertexBuffer(slot, buffer, offset, size);
      };

      return pass;
    };

    return encoder;
  };

  const webgpu = new CjsWebgpuDevice({ device, shaderStage: GPUShaderStage });
  const [ effectBytes, hullBytes ] = await Promise.all([ ResourceBytes(EFFECT), ResourceBytes(HULL) ]);
  const mesh = Unpack(HullMesh(hullBytes));
  const bounds = Bounds(mesh);
  const geometry = GeometryResource(mesh, `res:/${HULL}`);
  const material = Material(effectBytes, `res:/${EFFECT}`);
  const frame = PerFrameData(bounds, canvas.width / canvas.height);

  // The hull sits at the origin, so the camera does the framing and the world
  // matrix is identity. EveTransform's payload is the simplest placeable one
  // and carries the three matrices a ship's vertex stage reads.
  const perObject = { vs: RawData.create("EveBasicPerObjectData") };
  const renderable = HullRenderable(material, geometry, mesh, perObject);
  const depthFormat = "depth24plus";
  const renderTarget = new CjsWebgpuRenderTarget(webgpu, {
    canvas,
    context,
    format,
    depthFormat,
    // The frame is counted back off the surface, so it must be copyable.
    // Without this the demo draws and then cannot prove it.
    extraUsage: GPUTextureUsage.COPY_SRC
  }).Configure({ width: canvas.width, height: canvas.height });

  const batchManager = new CjsBatchManager({
    batchTypes: [ TriBatchType.TRIBATCHTYPE_OPAQUE, TriBatchType.TRIBATCHTYPE_DECAL ],
    createAccumulator: () => new TriRenderBatchAccumulator()
  });

  batchManager.Initialize();

  const al = new CjsWebgpuRenderContextAL({ webgpu, renderTarget });

  al.CreateDevice();

  const renderContext = new Tr2RenderContext();

  renderContext.SetRenderContextAL(al);

  const driver = new EveSpaceSceneRenderDriver().SetBatchManager(batchManager);

  // THE FOUR THINGS THE DRIVER ASKS A SCENE FOR. The update hooks are no-ops on
  // purpose: this demo proves the draw path, and a fog or lighting blend it does
  // not use would be scenery pretending to be a test.
  driver.scene = {
    Update: () => {},
    BlendLightingOverrides: () => {},
    UpdateFogSettings: () => {},
    GetPerFrameVSData: () => frame.vs,
    GetPerFramePSData: () => frame.ps,
    GetRenderables: out => { out.push(renderable); return out; }
  };

  // A non-black clear, so a hull drawn in black is still a lit pixel. Keeping
  // the clear black made "drew nothing" and "drew black" the same reading.
  driver.clearColor = [ 0.07, 0.09, 0.14, 1 ];
  driver.view = frame.viewProjection;
  driver.projection = frame.viewProjection;

  /**
   * Runs one frame and counts what reached the canvas.
   *
   * @returns {Promise<{litPixels: number, validation: string|null}>} The result.
   */
  async function Frame()
  {
    al.BeginScene();

    // BIND THE TARGETS SO `Clear` HAS SOMETHING TO CLEAR. The driver clears
    // during the frame, and a clear builds its load actions from the attachments
    // bound on the work queue - with none bound it names nothing, the pass loads
    // an uninitialised depth buffer, and every fragment fails the depth test
    // while the draw still reports success.
    al.SetRenderTarget(0, renderTarget);
    al.SetDepthStencil(renderTarget);

    // Errors on the verb path are otherwise invisible: a pipeline WebGPU rejects
    // is reported to the error scope and nowhere else, and the draw returns true.
    device.pushErrorScope("validation");

    driver.Execute([ renderTarget ], null, 0, 0, null, renderContext);

    await al.EndScene();

    return {
      validation: (await device.popErrorScope())?.message ?? null,
      litPixels: await CountDrawnPixels(device, presented, canvas)
    };
  }

  const asAuthored = await Frame();

  // THE WINDING TEST IS OPT-IN, `?cull=invert`, AND THAT IS NOT TIDINESS.
  // `quadv5` authors cullMode back with frontFace cw, so a hull wound the other
  // way is entirely back-facing and the canvas stays empty - worth being able to
  // check. But it ran automatically whenever the pixel count came back zero, and
  // the count was reading the wrong swap-chain image, so it fired on a frame that
  // HAD drawn and overwrote the hull with an empty one. The operator saw the
  // silhouette for a split second and the report said nothing was drawn. A
  // diagnostic that destroys the thing it measures is worse than no diagnostic.
  //
  // `SetInvertedCullMode` is Carbon's own override, the one
  // `BeginManagedRendering` uses to mirror, so the check costs no edited state.
  const wantsInverted = new URLSearchParams(globalThis.location?.search ?? "").get("cull") === "invert";
  let inverted = null;

  if (wantsInverted)
  {
    renderContext.GetEffectStateManager().SetInvertedCullMode(true);
    inverted = await Frame();
    renderContext.GetEffectStateManager().SetInvertedCullMode(false);
  }

  const validation = asAuthored.validation ?? inverted?.validation ?? null;
  const events = al.DrainTransitions();
  const shader = material.GetShaderStateInterface();
  const pass = shader.GetEffect().techniques[0].passes[0];
  const stages = (pass.stageInputs ?? [])
    .filter(stage => stage?.sourceProgram?.bytes?.length)
    .map(stage => `stage${stage.stageType}:${stage.sourceProgram.bytes.length}B`);

  return {
    litPixels: inverted?.litPixels ?? asAuthored.litPixels,
    litPixelsAsAuthored: asAuthored.litPixels,
    litPixelsCullInverted: inverted?.litPixels ?? null,
    validation,
    effect: EFFECT,
    hull: HULL,
    effectBytes: effectBytes.length,
    hullBytes: hullBytes.length,
    wgsl: stages,
    techniques: shader.GetEffect().techniques.map(technique => technique.name),
    renderStateHandle: pass.renderStates,
    shaderProgramHandle: pass.shaderProgram,
    declaration: mesh.decl.map(element => `${element.usage}${element.usageIndex}:${element.type}x${element.elementCount}`),
    areas: mesh.lods[0].areas.length,
    triangles: mesh.lods[0].areas.reduce((total, area) => total + (area.elementCount ?? 0), 0),
    radius: Number(bounds.radius.toFixed(3)),
    drawnBatches: al.GetDrawnBatchCount(),
    pipelineFailure: al.m_pipelineFailure ?? null,
    events: events.map(event => event.type + (event.encoderType ? `:${event.encoderType}` : "")),
    targetFormat: renderTarget.GetFormat(),
    pipelines,
    bindGroups,
    uploads: uploads.filter(u => u.bytes <= 1024).map(u => ({ label: u.label, offset: u.offset, bytes: u.bytes, head: u.floats.slice(0, 4).map(v => Number(v.toFixed(3))), row4to7: u.floats.slice(16, 32).map(v => Number(v.toFixed(3))) })),
    uploadCount: uploads.length,
    draws,
    expectedViewProjectionTransposed: Array.from(mat4.transpose(mat4.create(), frame.viewProjection)).map(v => Number(v.toFixed(3)))
  };
}
