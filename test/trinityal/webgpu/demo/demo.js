// A real EVE hull drawn with its own shader, through the shipped path.
//
// IT DRAWS. The operator saw the af1 hull's silhouette in Chrome on 2026-09-10 -
// white and unshaded, because nothing fills the material's textures or constants
// yet, but the right shape in the right place. af1 has been loaded in a browser
// before; it had not been drawn THROUGH TRINITY, and that is what is new.
//
// IT KEEPS DRAWING NOW, and getting there took three separate faults in this
// file, each of which looked like the engine failing:
//
//   1. The pixel count asked the canvas context for its CURRENT texture rather
//      than the one the frame rendered into, read an empty image, and reported
//      zero while the hull was on screen.
//   2. That zero triggered the cull-inverted diagnostic frame automatically,
//      which drew nothing over the hull. It is opt-in now, `?cull=invert`.
//   3. One presented frame does not stay on a WebGPU canvas, so the page draws
//      every animation tick. When THAT stopped after a dozen frames it was
//      because `Unpack` threw - see its note - and one throw ended the loop
//      silently. The loop now survives a failed frame and records why.
//
// THE LIT-PIXEL COUNT WAS NOT EVIDENCE until 2026-09-26: the readback was
// submitted after an await, by which time the canvas had presented and the
// swap-chain texture was destroyed ("Destroyed texture used in a submit"), so it
// read zero with the hull on screen. `Frame` now submits the copy first. That
// fix is unverified on a real adapter; until it is, THE CANVAS IS THE ORACLE,
// and headless screenshots are pure black regardless.
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
// THE MATERIAL IS THE SHIP'S OWN NOW. The built SOF document for
// `dna:/af1_t1:amarrbase:amarr` carries the area's whole effect, so
// `Tr2Effect.from` produces the real material - its constant parameters, and a
// `TriTextureParameter` per map named as the shader declares it - and each of
// those loads its DDS from the client. Only the effect RESOURCE is substituted,
// because the document names the dx11 `.fx` and this backend needs the WebGPU
// container of the same effect. Ten maps load; six 1024x1024 BC textures reach
// the device, plus the two 1x1 dummies the backend still fills unbound slots
// with.
//
// TWO THINGS HAD TO BE DONE BY HAND, and both are honest gaps rather than
// shortcuts. The device asks for `texture-compression-bc` so EVE's BC7 and BC5
// maps can be uploaded as they are; without it the reader decodes to RGBA8. And
// each resource is marked LOADED then PREPARED explicitly, because no resource
// manager is running here and `RealizeTexture` refuses anything not prepared -
// the first attempt loaded all ten maps and bound none of them.
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

import { Tr2GpuResourcePool } from "../../../../npm/dist/trinity/core/index.js";
import { CjsBatchManager, Tr2MeshArea, Tr2MeshBase, Tr2RenderContext, Tr2Renderer, Tr2RingBuffer, Tr2RingBufferOffsets, Tr2VariableStore, RawData, TriRenderBatchAccumulator } from "../../../../npm/dist/trinity/core/index.js";
import { Tr2RenderTarget } from "../../../../npm/dist/trinity/core/device/Tr2RenderTarget.js";
import { Tr2ReflectionProbe } from "../../../../npm/dist/trinity/core/Tr2ReflectionProbe.js";
import { RealizeTexture } from "../../../../npm/dist/trinity/core/Tr2ImageIOHelpers.js";
import { ResolveEffectPath, SetEffectPathDefaults } from "../../../../npm/dist/global/utils/effectPath.js";
import { ExFlag, PixelFormat, TextureType } from "../../../../npm/dist/global/consts/renderContext/index.js";
import { CjsWebgpuDevice } from "../../../../npm/dist/trinityal/webgpu/index.js";
import { CjsWebgpuRenderContextAL, CjsWebgpuRenderTarget } from "../../../../npm/dist/trinityal/webgpu/internal.js";
import { EveSpaceSceneRenderDriver, Tr2PostProcessRenderer } from "../../../../npm/dist/trinity/index.js";
import { Tr2Effect, Tr2EffectStateManager, TriTextureParameter } from "../../../../npm/dist/trinity/shader/index.js";
import { RegisterShaderResources } from "../../../../npm/dist/resource/shader/index.js";
import CjsWebgpuFormat from "../../../../npm/dist/resource/formats/webgpu/index.js";
import { CjsGr2Format } from "../../../../npm/dist/resource/formats/gr2/index.js";
import { CjsBlackFormat } from "../../../../npm/dist/resource/formats/black/index.js";
import { blue } from "../../../../npm/dist/global/blue/index.js";
import {
  ResourceRequirement,
  RegisterSolidColorTexture,
  RegisterTextureArray,
  RegisterTexturePack,
  RegisterTextureResources
} from "../../../../npm/dist/resource/index.js";
import { CjsCmfFormat } from "../../../../npm/dist/resource/formats/cmf/index.js";
import { RenderingMode, TriBatchType } from "../../../../npm/dist/global/consts/graphics/index.js";
import { mat4 } from "../../../../npm/dist/global/math/mat4.js";
import { vec3 } from "../../../../npm/dist/global/math/vec3.js";
import { EveCamera } from "../../../../npm/dist/trinity/eve/camera/EveCamera.js";
import { decodeTangentFrame } from "../../../../npm/dist/global/math/tangent.js";


/**
 * The shader quality tier. TESTING ALWAYS USES `.sm_depth` (operator rule,
 * 2026-09-26): it is the HIGHEST tier - not a depth pass - the one carrying the
 * local lights, and the largest instruction set the translator must cover.
 * `?tier=hi` or `?tier=lo` picks another tier for comparison only.
 */
const TIER = new URLSearchParams(globalThis.location?.search ?? "").get("tier") || "depth";

/**
 * `?post=off` draws the scene straight into the canvas, as before the post
 * process was wired: a null destination keeps the driver's direct path. It
 * splits "the scene does not draw" from "the post process does not".
 */
const POST_PARAMETER = new URLSearchParams(globalThis.location?.search ?? "").get("post") ?? "";
const POST_OFF = POST_PARAMETER === "off";

/**
 * `?post=<template>` hands the driver a shipped Tr2PostProcess2 as the scene's
 * post process: a bare name reads `res:/dx9/postprocess/environmenttemplate/
 * <name>.black` (the 177 environment templates), a name with a slash is a
 * resource path of its own.
 */
const POST_TEMPLATE = POST_OFF ? "" : POST_PARAMETER;

/**
 * The Tr2PostProcess2 slots whose render pass Tr2PostProcessRenderer does not
 * port yet: each throws by name when reached. The demo empties them on the
 * loaded template and names them, so the ported passes can be seen working on
 * a real template before the rest exist. Remove a slot here as its pass lands.
 */
const UNPORTED_POST_SLOTS = [ "taa" ];

/**
 * Reads a post-process template and empties the slots whose pass is not
 * ported, reporting both halves.
 *
 * @param {string} name A template name or a resource path.
 * @returns {Promise<{postProcess: object, path: string, populated: string[], skipped: string[]}>}
 */
async function LoadPostTemplate(name)
{
  const path = name.includes("/") ? name.replace(/^res:\/+/u, "") : `dx9/postprocess/environmenttemplate/${name}.black`;
  const postProcess = CjsBlackFormat.read(await ResourceBytes(path), { emit: "runtime" }).root;
  const slots = [
    "colorCorrection", "tonemapping", "lut", "luts", "desaturate", "vignette", "fade", "filmGrain", "signalLoss",
    ...UNPORTED_POST_SLOTS
  ];
  const populated = slots.filter(slot => Array.isArray(postProcess[slot]) ? postProcess[slot].length : postProcess[slot]);
  const skipped = populated.filter(slot => UNPORTED_POST_SLOTS.includes(slot));

  for (const slot of skipped) postProcess[slot] = null;

  return { postProcess, path: `res:/${path}`, populated, skipped };
}

/**
 * DIAGNOSTIC COUNTS for `demo.post()`. Tr2Renderer's draw verbs return
 * whether they drew; an effect that has not loaded, or a blit with no
 * material, returns false and throws nothing - which is how a black canvas
 * with no error happens. Counting them per verb says which step drew nothing.
 */
const DRAW_COUNTS = {};
for (const verb of [ "DrawScreenQuad", "DrawTexture" ])
{
  const original = Tr2Renderer.prototype[verb];
  Tr2Renderer.prototype[verb] = function (...args)
  {
    const result = original.apply(this, args);
    const key = `${verb}:${result ? "drew" : "nothing"}`;
    DRAW_COUNTS[key] = (DRAW_COUNTS[key] ?? 0) + 1;
    return result;
  };
}
{
  const original = Tr2Renderer.runComputeShader;
  Tr2Renderer.runComputeShader = function (...args)
  {
    const result = original.apply(this, args);
    const key = `runComputeShader:${result ? "dispatched" : "nothing"}`;
    DRAW_COUNTS[key] = (DRAW_COUNTS[key] ?? 0) + 1;
    return result;
  };
}

/**
 * `?stage=` SKIPS POST-PROCESS STAGES to find the one that writes black.
 * nosharpen: CAS is skipped. notonemap: tonemapping becomes a plain copy of
 * its input (the texture it would read as BlitOriginal). raw: both.
 */
const STAGE = new URLSearchParams(globalThis.location?.search ?? "").get("stage") ?? "";
if (STAGE === "nosharpen" || STAGE === "raw")
{
  const original = Tr2PostProcessRenderer.prototype.RenderSharpening;
  Tr2PostProcessRenderer.prototype.RenderSharpening = function (_enable, ...args)
  {
    return original.call(this, false, ...args);
  };
}
if (STAGE === "notonemap" || STAGE === "raw")
{
  Tr2PostProcessRenderer.prototype.RenderTonemapping = function (dest, _postprocess, renderContext, renderer)
  {
    const source = this.tonemappingEffect.GetResourceByName("BlitOriginal").GetTextureProvider().GetTexture();
    const esm = renderContext.GetEffectStateManager();

    esm.PushRenderTarget(dest);
    try
    {
      renderer.DrawTexture(renderContext, source);
    }
    finally
    {
      esm.PopRenderTarget();
    }
  };
}

/**
 * THE POOL'S TEXTURES BY NAME, for `demo.readback()`: the last texture each
 * name was borrowed as. The pool keeps them after they are freed, so their
 * contents from the last frame can still be read.
 */
const POOL_TEXTURES = new Map();
{
  const original = Tr2GpuResourcePool.prototype.GetTempTexture;
  Tr2GpuResourcePool.prototype.GetTempTexture = function (name, description)
  {
    const handle = original.call(this, name, description);
    POOL_TEXTURES.set(name, handle.Get());
    return handle;
  };
}

/** Bytes per texel for the formats the post chain uses. */
const TEXEL_BYTES = { "rgba16float": 8, "bgra8unorm": 4, "rgba8unorm": 4, "rgba32float": 16, "r32float": 4 };

/** Decodes one IEEE-754 binary16 value. */
function Half(bits)
{
  const exponent = (bits >> 10) & 0x1f, fraction = bits & 0x3ff, sign = bits & 0x8000 ? -1 : 1;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

/** Per format: reads the texel at a byte offset as [ r, g, b, a ]. */
const TEXEL_DECODERS = {
  "rgba16float": (view, at) => [ 0, 2, 4, 6 ].map(c => Half(view.getUint16(at + c, true))),
  "bgra8unorm": (view, at) => [ 2, 1, 0, 3 ].map(c => view.getUint8(at + c) / 255),
  "rgba8unorm": (view, at) => [ 0, 1, 2, 3 ].map(c => view.getUint8(at + c) / 255),
  "rgba32float": (view, at) => [ 0, 4, 8, 12 ].map(c => view.getFloat32(at + c, true)),
  "r32float": (view, at) => [ view.getFloat32(at, true), 0, 0, 0 ]
};

/**
 * Reads a texture back and reports its colour: texels with non-zero RGB,
 * mean and max RGBA, and the centre texel.
 *
 * @param {GPUDevice} device The device.
 * @param {GPUTexture} texture The texture.
 * @returns {Promise<object>} The texture's format, size and colour statistics.
 */
async function CountNonZeroTexels(device, texture)
{
  const texel = TEXEL_BYTES[texture.format];
  if (!texel) return { format: texture.format, skipped: "format not counted" };
  const bytesPerRow = Math.ceil(texture.width * texel / 256) * 256;
  const buffer = device.createBuffer({ size: bytesPerRow * texture.height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  const encoder = device.createCommandEncoder();

  encoder.copyTextureToBuffer({ texture }, { buffer, bytesPerRow }, { width: texture.width, height: texture.height });
  device.queue.submit([ encoder.finish() ]);
  await buffer.mapAsync(GPUMapMode.READ);

  // COLOUR, NOT BYTES. Counting any non-zero byte let an opaque black image
  // (alpha 1, RGB 0) report as fully populated, so this decodes each texel to
  // RGBA and counts only texels whose RGB is non-zero.
  const view = new DataView(buffer.getMappedRange());
  const decode = TEXEL_DECODERS[texture.format];
  const sum = [ 0, 0, 0, 0 ], max = [ 0, 0, 0, 0 ];
  let nonZero = 0;
  for (let y = 0; y < texture.height; y++)
  {
    for (let x = 0; x < texture.width; x++)
    {
      const rgba = decode(view, y * bytesPerRow + x * texel);
      if (rgba[0] || rgba[1] || rgba[2]) nonZero++;
      for (let c = 0; c < 4; c++)
      {
        sum[c] += rgba[c];
        if (rgba[c] > max[c]) max[c] = rgba[c];
      }
    }
  }
  const count = texture.width * texture.height;
  const round = values => values.map(value => Math.round(value * 1000) / 1000);
  const centre = round(decode(view, (texture.height >> 1) * bytesPerRow + (texture.width >> 1) * texel));
  buffer.unmap();
  buffer.destroy();
  return {
    format: texture.format,
    size: `${texture.width}x${texture.height}`,
    nonZeroRgbTexels: nonZero,
    meanRgba: round(sum.map(value => value / count)),
    maxRgba: round(max),
    centreRgba: centre
  };
}

{
  // A refused pipeline returns false from the draw and records its reason in
  // m_pipelineFailure; counting the reasons shows a draw that silently skipped.
  const original = CjsWebgpuRenderContextAL.prototype._RefusePipeline;
  CjsWebgpuRenderContextAL.prototype._RefusePipeline = function (reason)
  {
    const key = `pipelineRefused:${reason}`;
    DRAW_COUNTS[key] = (DRAW_COUNTS[key] ?? 0) + 1;
    return original.call(this, reason);
  };
}

/** One effect's load state, for `demo.post()`. */
function EffectState(effect)
{
  if (!effect) return "none";
  const res = effect.GetEffectRes();
  return {
    path: effect.GetEffectPathName(),
    resolved: effect.actualEffectFilePath,
    resource: res ? { state: res.state, good: res.IsGood() } : null,
    shader: Boolean(effect.GetShaderStateInterface())
  };
}


/** Used only when the SOF document cannot be had; see `EffectPath`. */
const EFFECT = EffectPath("res:/graphics/effect/managed/space/spaceobject/v5/quad/quadv5.fx");


/**
 * Turns a SOF effect path into the container this backend loads, through the
 * runtime's own resolver (`ResolveEffectPath`, which Carbon does in
 * `Tr2Effect` with the platform name and the tier). No prebuilt overlay is
 * needed: the byte source reads the shipped dx11 container for it and
 * `RegisterShaderResources` translates in memory.
 *
 * A SOF DOCUMENT NAMES NO BACKEND. It carries
 * `res:/graphics/effect/.../quadv5.fx` - the neutral path - and the resolver
 * substitutes the backend tree and the quality tier: `/effect/` becomes
 * `/effect.webgpu/` and `.fx` becomes the tier's suffix.
 *
 * AND THE NAME DOES NOT CHANGE. Every variant of a shader shares one name; the
 * VARIANT is chosen by the effect's `options`, which the document also carries,
 * and `Tr2Effect.RebuildCachedData` passes them to `GetShader`. An earlier
 * version of this demo hardcoded `unpacked_quadv5`, treating a permutation as
 * if it were a separate shader, which is not how the loader works.
 *
 * @param {string} effectFilePath The document's `effectFilePath`.
 * @returns {string} A resource path, without the `res:/` prefix.
 */
function EffectPath(effectFilePath)
{
  return ResolveEffectPath(effectFilePath, { platformName: "webgpu", shaderModel: TIER })
    .replace(/^res:\/+/u, "");
}

/** An Amarr frigate. Real geometry, real declaration, real packed tangents. */
const DEFAULT_HULL = "dx9/model/ship/amarr/frigate/af1/af1_t1.gr2";

/**
 * The DNA whose built SOF document names this hull's maps, constants and
 * geometry. `?dna=` picks another, e.g. `?dna=at1_t1:amarrbase:amarr`.
 */
const DNA = new URLSearchParams(globalThis.location?.search ?? "").get("dna") || "af1_t1:amarrbase:amarr";


/**
 * Rest-pose bones for skinned hulls: every bone identity, so a vertex stays
 * where the geometry authored it whatever bone it names. A stand-in for an
 * animation updater, which this demo does not have.
 *
 * The skinned shaders read Carbon's `BoneTransforms` - rows of `Float4x3`, 12
 * floats each - at `boneIndex + boneOffsets.x` from the per-object block
 * (`EveSpaceObject2.cpp:1424-1428`); an index past the end reads zeros, which
 * collapses the hull to the origin.
 */
const REST_POSE_BONES = 256;

function RestPoseBones(count)
{
  const rows = new Float32Array(count * 12);

  for (let bone = 0; bone < count; bone += 1)
  {
    rows[bone * 12] = 1;
    rows[bone * 12 + 5] = 1;
    rows[bone * 12 + 10] = 1;
  }

  return rows;
}


/**
 * `?detail=1`: a TEST SETUP, not a real ship. Only skinned hulls (titans,
 * carriers) author the detail shader, and this demo does not skin yet, so the
 * hull area borrows `quaddetailv5` and at1_t1's Amarr detail maps and
 * constants. Its browser container merges Detail1Map..Detail3Map into one
 * texture array at t9, which is what this exercises: the effect keeps the
 * three named parameters and `CjsTextureArrayBridge` binds
 * `dynamic:/texturearray/<their paths>` in the merged register.
 */
const DETAIL_TEST = new URLSearchParams(globalThis.location?.search ?? "").get("detail") === "1";

const DETAIL_TEXTURES = Object.freeze({
  Detail1Map: "res:/dx9/model/shared/amarr/textures/ama_plating_detail_01_horizontal.dds",
  Detail2Map: "res:/dx9/model/shared/amarr/textures/ama_plating_detail_02_horizontal.dds",
  Detail3Map: "res:/dx9/model/shared/amarr/textures/ama_detail_blank.dds"
});

// at1_t1:amarrbase:amarr's area_hull values.
const DETAIL_CONSTANTS = Object.freeze({
  Detail1Data: [ 5, 0.8, 0, 0 ],
  Detail2Data: [ 6, 0.8, 0.5, 0 ],
  Detail3Data: [ 0, 0, 0, 0 ],
  DetailAlbedoColor: [ 0, 0, 0, 0 ],
  DetailFresnelColor: [ 0, 0, 0, 0 ],
  DetailSelector: [ 0.8, 0, 0, 0.8 ]
});

/**
 * The hull area's effect values moved onto the detail shader, for `?detail=1`.
 *
 * @param {object} effect SOF effect values.
 * @returns {object} A copy naming `quaddetailv5`, with the detail maps and constants.
 */
function WithDetailMaps(effect)
{
  return {
    ...effect,
    effectFilePath: effect.effectFilePath.replace(/quadv5\.fx$/u, "quaddetailv5.fx"),
    resources: [
      ...effect.resources,
      ...Object.entries(DETAIL_TEXTURES).map(([ name, resourcePath ]) => ({ _type: "TriTextureParameter", name, resourcePath }))
    ],
    constParameters: [
      ...(effect.constParameters ?? []),
      ...Object.entries(DETAIL_CONSTANTS).map(([ name, value ]) => ({ _type: "Tr2ConstantEffectParameter", name, value }))
    ]
  };
}


/**
 * Fetches the built SOF document for one DNA through the runner's proxy.
 *
 * @param {string} dna The DNA string.
 * @returns {Promise<object|null>} The document, or null when it cannot be had.
 */
async function SofDocument(dna)
{
  try
  {
    const response = await fetch(`/sof/${dna}`);

    // Not fatal: without it the material is empty and the hull draws white,
    // which is exactly where this demo was before and still worth seeing.
    if (!response.ok) return null;

    return await response.json();
  }
  catch
  {
    return null;
  }
}


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
 * The declaration the packed shader family (`quadv5`, `skinned_quadv5`, ... -
 * no `unpacked_` prefix) reads: TANGENT0 is the file's legacy packed frame, a
 * vec4 of angles the vertex shader decodes with sin/cos
 * (`PackTangentsLegacy`, mesh/src/cmf/tangents.cpp). Feeding it the decoded
 * tangent VECTOR instead - what this demo did until 2026-09-26 - makes the
 * shader decode a direction as angles, and every normal-mapped surface lights
 * wrong.
 */
const PACKED_DECLARATION = Object.freeze([
  { usage: "Position", usageIndex: 0, type: "Float32", elementCount: 3 },
  { usage: "Tangent", usageIndex: 0, type: "Float32", elementCount: 4 },
  { usage: "TexCoord", usageIndex: 0, type: "Float32", elementCount: 2 },
  { usage: "TexCoord", usageIndex: 1, type: "Float32", elementCount: 2 },
  { usage: "BoneIndices", usageIndex: 0, type: "UInt16", elementCount: 4 }
]);

/**
 * Whether every area's shader reads the packed frame. One vertex buffer serves
 * every area, so a hull mixing the two families cannot satisfy both here.
 *
 * @param {object[]} areas SOF document areas.
 * @returns {boolean} True when no area names an `unpacked_` shader.
 */
function ReadsPackedTangents(areas)
{
  return !areas.some(area => /\/unpacked/u.test(area.effect?.effectFilePath ?? ""));
}


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
 * THE DECODE IS REAL WORK, and a previous version of this comment claimed it was
 * not. The mesh does arrive with `normal`, `tangent`, `binormal`, `texcoord1`
 * and `blendIndice` KEYS - but they are EMPTY. Reading the key list and not the
 * lengths is what produced the wrong claim, and deleting the decode on the
 * strength of it broke the hull. Only `position`, `texcoord0` and
 * `packedTangentLegacy` carry data.
 *
 * THE CHANNELS THAT MATTER ARE THE LOD'S. `PackLodGeometry` reads
 * `lod.vertex ?? mesh.vertex`, so the LOD is what the draw is built from and
 * what has to be filled. They are the same object for this hull, and writing to
 * the mesh alone would have been silently ignored for one that differed.
 *
 * Choosing the tangent form per shader belongs in the mesh path rather than in a
 * demo; this is the smallest thing that lets one hull meet one shader.
 *
 * Carbon's DX11 path FABRICATES a missing element so the layout still builds
 * (`Tr2VertexLayoutALDx11.cpp:179-207`) and ccpwgl disables the attribute; this
 * backend refuses instead, so something must supply what both of them fake.
 *
 * @param {object} mesh CMF mesh, mutated in place.
 * @param {boolean} [packed] Keep the packed frame for the packed shader family.
 * @returns {object} The same mesh, with the matching declaration.
 */
function Unpack(mesh, packed = false)
{
  for (const channels of new Set([ mesh.vertex, ...(mesh.lods ?? []).map(lod => lod.vertex) ]))
  {
    if (!channels) continue;

    const packedFrame = channels.packedTangentLegacy;
    const count = (channels.position?.length ?? 0) / 3;

    if (!count || !packedFrame?.length) continue;

    channels.texcoord1 = Array.from(channels.texcoord0 ?? new Array(count * 2).fill(0));
    channels.blendIndice = new Array(count * 4).fill(0);

    if (packed)
    {
      channels.tangent = Array.from(packedFrame);
      continue;
    }

    const normal = new Array(count * 3);
    const tangent = new Array(count * 3);
    const binormal = new Array(count * 3);

    for (let i = 0; i < count; i += 1)
    {
      const frame = decodeTangentFrame(packedFrame.slice(i * 4, i * 4 + 4));
      const at = i * 3;

      for (let axis = 0; axis < 3; axis += 1)
      {
        normal[at + axis] = frame.N[axis];
        tangent[at + axis] = frame.T[axis];
        binormal[at + axis] = frame.B[axis];
      }
    }

    channels.normal = normal;
    channels.tangent = tangent;
    channels.binormal = binormal;
  }

  let offset = 0;

  mesh.decl = (packed ? PACKED_DECLARATION : UNPACKED_DECLARATION).map(element =>
  {
    const stride = element.type === "UInt16" ? 2 : 4;
    const placed = { ...element, offset, stream: 0 };

    offset += stride * element.elementCount;

    return placed;
  });

  if (!packed && !mesh.lods?.[0]?.vertex?.normal?.length && !mesh.vertex.normal?.length)
  {
    throw new Error("hull carries no packed tangent frame to expand");
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
async function Material(path, values = null)
{
  const resource = blue.resMan.GetResource(path, { requirement: ResourceRequirement.SHADER });

  await resource.Ready();

  // HYDRATED FROM THE SOF DOCUMENT WHEN THERE IS ONE. The built document for a
  // DNA carries the area's whole effect - its constant parameters and a
  // `TriTextureParameter` per map, named as the shader declares them - so
  // `Tr2Effect.from` produces the real material rather than an empty one whose
  // textures a demo would have to invent. Only the effect RESOURCE is
  // substituted: the document names the dx11 `.fx`, and this backend needs the
  // WebGPU container of the same effect.
  const effect = values ? Tr2Effect.from(values) : new Tr2Effect();

  effect.effectResource = resource;
  effect.RebuildCachedData();

  Tr2EffectStateManager.registerShaderHandles(effect.shader);

  return effect;
}


/**
 * The scene-owned textures `quadv5` declares, and what "nothing" means for each.
 *
 * ZERO IS THE WRONG NOTHING FOR MOST OF THESE, which is why the hull came out
 * near-black once it stopped being white. The pixel stage declares nine
 * textures: six are the material's own maps, and these three belong to the
 * SCENE. Nothing supplies them here, so the backend substitutes its zero-filled
 * 1x1 dummy - and a zero ambient-occlusion map means FULLY OCCLUDED, a zero
 * shadow map means FULLY SHADOWED. The ship is then lit by almost nothing, and
 * the frame is not wrong so much as unanswered.
 *
 * Carbon's scene owns these: `EveSpaceScene` binds its environment cube, its
 * shadow map and the SSAO target. A stand-in scene has none, so the neutral
 * value each one carries when the feature is off is supplied instead - which is
 * what the backend's dummy should arguably be doing per texture rather than
 * handing every slot the same zeros.
 *
 * THE ENVIRONMENT CUBE IS NOT NEUTRAL-ABLE THE SAME WAY. A flat grey cube gives
 * flat reflections rather than none, so it is left dark deliberately and named
 * here: a real scene environment map is the next thing this demo needs.
 */
/**
 * What the shader's `Sun.DirWorld` holds, which is NOT the scene's own value.
 *
 * A SCENE STORES THE DIRECTION THE LIGHT TRAVELS and the shader wants the
 * direction TOWARD the sun, so the per-frame block carries the NEGATED vector.
 * ccpwgl does exactly this in `EveSpaceScene.GetPerFrameSunDirection`
 * (`EveSpaceScene.js:2775-2785`): copy, negate, normalise.
 *
 * Writing the un-negated direction inverts every sun term at once. It does not
 * look like darkness, it looks like the lighting is inside out - shadow where
 * the reflection should be, and a dull disc where the sun should be mirrored,
 * which is what the operator saw and named before I did.
 *
 * The scene direction is straight down, (0, -1, 0), through that same
 * negate-and-normalise - a top-down sun, which is the easiest one to read a
 * hull under. ccpwgl's own default is (1, -1, 1).
 */
const SUN_DIRECTION = (() =>
{
  const direction = vec3.negate(vec3.create(), vec3.fromValues(0, -1, 0));

  return Array.from(vec3.normalize(direction, direction));
})();


/**
 * `?probe=copy`: a STEP TOWARD Carbon's reflection probe, not the probe.
 *
 * Tr2ReflectionProbe fills EveSpaceSceneEnvMap with a 256x256 HDR cube it
 * builds with compute (Tr2ReflectionProbe.cpp:15-16, 272, 347-381). This runs
 * its last pass alone - CopyCube.fx, the nebula into the cube's top mip, with
 * Hollywood backlighting at the scene's values (EveSpaceScene.cpp:211-212) -
 * so the compute path is exercised end to end: in-memory translation, a
 * writable cube render target, storage bindings and a dispatch. The cube has
 * one mip because nothing fills the others until the filter passes run.
 */
const PROBE_MODE = new URLSearchParams(globalThis.location?.search ?? "").get("probe");

const COPY_CUBE = "res:/graphics/effect/managed/space/System/Reflection/CopyCube.fx";

/**
 * Carbon's reflection probe filtering the nebula into EveSpaceSceneEnvMap:
 * `customSourceTexture` and `RunFilter`, the two Carbon exposes to Blue for
 * exactly this ("Filters the currently set texture"). EveSpaceScene gives its
 * probe the scene's backlight (EveSpaceScene.cpp:211-212, 3220-3221). The
 * default; `?probe=off` binds the unfiltered nebula instead.
 */
async function ReflectionProbe(renderContext, al, areas)
{
  SetEffectPathDefaults({ platformName: "webgpu", shaderModel: TIER });

  const envPath = SCENE_TEXTURES.find(scene => scene.name === "EveSpaceSceneEnvMap").path;
  const nebula = blue.resMan.GetResource(`res:/${envPath}`, { requirement: ResourceRequirement.TEXTURE });

  await nebula.Ready();
  // Carbon's TriTextureRes makes its texture in DoPrepare; ours at first bind.
  RealizeTexture(nebula, renderContext);

  const probe = new Tr2ReflectionProbe();
  probe.customSourceTexture = nebula;
  probe.SetBackLightColor([ 2, 2, 2, 2 ]);
  probe.SetBackLightContrast(8);

  // The effects load through the resource manager, as the scene's would; the
  // first frame the probe filters is the first one they are all ready for.
  if (!probe.DoPrepareResources(PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT, renderContext))
  {
    throw new Error("reflection probe resources could not be created");
  }
  await Promise.all([ probe._preFilterEffect, probe._filterEffect, probe._copyMipEffect ]
    .map(effect => effect.effectResource.Ready()));
  await new Promise(resolve => setTimeout(resolve, 0));

  al.BeginScene();
  probe.Filter(renderContext);
  await al.EndScene();

  const reflection = probe.GetReflection();
  for (const area of areas)
  {
    area.material.GetResourceByName("EveSpaceSceneEnvMap").SetResource(reflection);
  }
  globalThis.__probe = { mips: reflection.GetMipCount(), size: reflection.GetWidth(), failure: al.m_pipelineFailure ?? null };
  console.log(`probe: ${JSON.stringify(globalThis.__probe)}`);
}

async function ProbeCopyCube(renderContext, al, areas)
{
  SetEffectPathDefaults({ platformName: "webgpu", shaderModel: TIER });

  const envPath = SCENE_TEXTURES.find(scene => scene.name === "EveSpaceSceneEnvMap").path;
  const nebula = blue.resMan.GetResource(`res:/${envPath}`, { requirement: ResourceRequirement.TEXTURE });

  await nebula.Ready();
  // Carbon's TriTextureRes makes its texture in DoPrepare; ours at first bind.
  RealizeTexture(nebula, renderContext);

  const target = new Tr2RenderTarget();
  target.SetName("ReflectionProbe");
  // ?probe=mips gives the cube Carbon's eight levels and fills them with
  // GenerateMipMaps - a box chain, NOT the probe's filter; it proves the AL's
  // mip generation, and the filter passes replace it.
  const mipCount = PROBE_MODE === "mips" ? 8 : 1;
  const created = target.CreateArray(256, 256, 1, mipCount, PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT,
    ExFlag.EX_BIND_UNORDERED_ACCESS, TextureType.TEX_TYPE_CUBE, renderContext);
  if (created !== 0) throw new Error(`probe cube CreateArray failed: ${created}`);

  const copy = new Tr2Effect();
  copy.SetEffectPathName(COPY_CUBE);
  await copy.effectResource.Ready();
  copy.RebuildCachedData();
  Tr2EffectStateManager.registerShaderHandles(copy.shader);

  copy.SetOption("HOLLYWOOD_MODE", "HOLLYWOOD_ON");
  copy.SetParameter("tex_hi_res", nebula);
  copy.SetParameter("tex_lo_res", target);
  copy.SetParameter("BackLightColor", [ 2, 2, 2, 2 ]);
  copy.SetParameter("BackLightContrast", 8);
  copy.SetParameter("ViewDirection", [ 0, 1, 0 ]);

  al.BeginScene();
  const dispatched = Tr2Renderer.runComputeShader(copy, 256 / 8, 256 / 8, 6, renderContext);
  const mipped = mipCount > 1 ? target.GenerateMipMaps(renderContext) : null;
  await al.EndScene();
  if (!dispatched) throw new Error(`probe CopyCube did not dispatch: ${al.m_pipelineFailure ?? "no compute pass"}`);

  for (const area of areas)
  {
    area.material.GetResourceByName("EveSpaceSceneEnvMap").SetResource(target);
  }

  // EVIDENCE THE DISPATCH WROTE: read back the centre texel of two faces. An
  // untouched rgba16float target reads all zeros.
  const device = al.GetWebgpu().GetDevice();
  const texels = [];
  for (const [ face, mip ] of [ [ 0, 0 ], [ 3, 0 ], ...(mipCount > 1 ? [ [ 0, 3 ], [ 0, 7 ] ] : []) ])
  {
    const readback = device.createBuffer({ size: 256, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const encoder = device.createCommandEncoder();
    const texel = (256 >> mip) >> 1;
    encoder.copyTextureToBuffer(
      { texture: target.GetRenderTarget().GetDeviceTexture(), mipLevel: mip, origin: { x: texel, y: texel, z: face } },
      { buffer: readback, bytesPerRow: 256 },
      { width: 1, height: 1, depthOrArrayLayers: 1 });
    device.queue.submit([ encoder.finish() ]);
    await readback.mapAsync(GPUMapMode.READ);
    texels.push(Array.from(new Uint16Array(readback.getMappedRange().slice(0, 8))));
    readback.unmap();
  }
  globalThis.__probe = { dispatched, mipped, faces: target.GetArraySize(), size: target.GetWidth(), mips: target.GetMipCount(), texels };
  console.log(`probe: ${JSON.stringify(globalThis.__probe)}`);
}

const SCENE_TEXTURES = Object.freeze([
  // 1.0 is "not occluded". Zero darkened every surface uniformly.
  { name: "SSAOMap", colour: [ 255, 255, 255, 255 ] },
  // A depth map read as "nothing is closer than this", so nothing is shadowed.
  { name: "EveSpaceSceneShadowMap", colour: [ 255, 255, 255, 255 ] },
  // THE ENVIRONMENT CUBE HAS NO NEUTRAL, so a real one is loaded instead.
  // A black cube is not "no reflection", it is a reflection OF BLACK: the hull
  // came out with a dark grey disc where the sun should have been mirrored, and
  // every polished surface reflected nothing. A flat grey cube is no better, it
  // just reflects flat grey, which is why ccpwgl leaves this parameter empty
  // rather than defaulting it.
  //
  // A SCENE OWNS THIS ONE, and it is the NEBULA. Carbon binds the reflection
  // probe's cube here, or without a probe the static env map - the scene's
  // `envMapResPath`, the full backdrop cube (`EveSpaceScene.cpp:3207-3226`).
  // The small `<scene>_cube_refl.dds` files feed EnvMap1/ReflectionMap, a
  // different variable; binding one here (the Amarr ship-icon cube, until
  // 2026-09-26) reflected a 128x128 icon backdrop. This demo has no probe, so
  // it binds a universe nebula; `?env=` picks another. A STAND-IN for scene
  // data: a real scene supplies its own and this line goes away.
  { name: "EveSpaceSceneEnvMap", path: new URLSearchParams(globalThis.location?.search ?? "").get("env") || "dx9/scene/universe/a01_cube.dds" }
]);


// Blue's resource manager, which every texture comes through. A texture
// parameter fetches its own path when the path is set
// (`TriTextureParameter.Initialize`), as Carbon's does, so the demo supplies
// only the byte source and the texture routes. Textures load as Carbon's
// HostBitmap through the ordinary image route - including `dynamic:/color`
// and the texture pack and array constructors a merged shader slot resolves.
//
// Effects are requested at their WebGPU paths and translated in memory: the
// source answers an `effect.webgpu/` path with the shipped `effect.dx11/`
// container, and `RegisterShaderResources` converts it. No prebuilt overlay.
blue.resMan.Register({
  source: {
    Read: path => ResourceBytes(String(path).replace(/^res:\//u, "").replace("graphics/effect.webgpu/", "graphics/effect.dx11/"))
  }
});
RegisterTextureResources(blue.resMan);
RegisterSolidColorTexture(blue.resMan);
RegisterTextureArray(blue.resMan);
RegisterTexturePack(blue.resMan);
RegisterShaderResources(blue.resMan, { translator: CjsWebgpuFormat });

/**
 * A scene texture's path: a client file, or a flat colour as Carbon's
 * `dynamic:/color/r,g,b,a` (float components).
 *
 * @param {object} scene A `SCENE_TEXTURES` entry.
 * @returns {string} The resource path.
 */
function SceneTexturePath(scene)
{
  return scene.path
    ? `res:/${scene.path}`
    : `dynamic:/color/${scene.colour.map(byte => byte / 255).join(",")}`;
}


/**
 * Waits for every texture the material's parameters already requested.
 *
 * A `TriTextureParameter` binds `GetResource()`, and until that resource is
 * PREPARED the backend gets Carbon's fallback rather than a texture. Waiting is
 * the demo's choice, so the first frame shows the finished hull; a scene may
 * equally draw at once and let each texture replace the fallback as it
 * arrives. A failed texture keeps the fallback and is named.
 *
 * BC STAYS BC. The hull's maps are BC7, which WebGPU exposes only behind the
 * `texture-compression-bc` feature. The image route keeps the file's format,
 * so a device without that feature cannot take them; decoding for such a
 * device is not wired yet.
 *
 * @param {object} effect The hydrated effect.
 * @returns {Promise<{loaded: number, failed: string[]}>} What arrived.
 */
async function LoadTextures(effect)
{
  const failed = [];
  let loaded = 0;

  await Promise.all((effect.resources ?? []).map(async parameter =>
  {
    if (!parameter.resourcePath) return;

    const resource = parameter.GetResource();

    try
    {
      await resource.Ready();
      if (!resource.GetBitmap()) throw new Error(`${parameter.resourcePath}: no image`);
      loaded += 1;
    }
    catch (error)
    {
      // Named rather than swallowed: a hull missing one map should say which.
      failed.push(`${parameter.name}: ${error.message}`);
    }
  }));

  return { loaded, failed };
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
function HullRenderable(areas, geometry, perObject)
{
  // ONE MESH AREA PER DOCUMENT AREA, EACH WITH ITS OWN SHADER. This built a
  // single area spanning every geometry range and gave the whole mesh the FIRST
  // area's material - so `area_booster` was drawn with `quadv5` instead of the
  // `quadheatv5` the document names for it. That is why the booster showed
  // texture but no heat: it was not running the heat shader at all. The index
  // and count come from the document too, rather than being assumed.
  const meshAreas = areas.map(({ material, index, count }) =>
  {
    const area = new Tr2MeshArea();

    area.SetMaterial(material);
    area.SetIndex(index);
    area.SetCount(count);

    return area;
  });

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

      return base.GetBatches(accumulator, meshAreas, perObjectData);
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
 * An EveCamera orbiting the hull, as the client's space camera orbits a ship.
 *
 * The camera's parent is the hull's centre (`extraTranslation`), its distance
 * `translationFromParent`. It starts on the angle the demo used to fix: yaw a
 * quarter turn between +X and +Z, pitched slightly down onto the hull. The clip
 * planes follow the hull's size; the camera's defaults (10 to 10,000,000) suit
 * a scene, not one frigate.
 *
 * @param {object} bounds Centre and radius of the hull.
 * @returns {EveCamera} The camera.
 */
function OrbitCamera(bounds)
{
  const camera = new EveCamera();

  camera.useExtraTranslation = true;
  vec3.copy(camera.extraTranslation, bounds.centre);
  camera.fieldOfView = Math.PI / 4;
  camera.frontClip = Math.max(1, bounds.radius * 0.05);
  camera.backClip = bounds.radius * 100;
  camera.translationFromParent = bounds.radius * 2.2;
  camera.SetOrbit(Math.PI / 4, -0.3);
  return camera;
}


/**
 * Keeps the canvas's backing size equal to its displayed size.
 *
 * The page sizes the canvas once at load, and CSS then stretches it to the
 * window, so a resize (or devtools opening) distorted the image. When the two
 * differ this resizes the canvas, reconfigures the render target and updates
 * the viewport constants.
 *
 * @param {HTMLCanvasElement} canvas The canvas.
 * @param {object} renderTarget The canvas render target.
 * @param {{vs: object, ps: object}} frame The per-frame blocks.
 * @returns {void}
 */
function FitCanvas(canvas, renderTarget, frame)
{
  const width = Math.max(1, Math.round(canvas.clientWidth * devicePixelRatio));
  const height = Math.max(1, Math.round(canvas.clientHeight * devicePixelRatio));
  if (width === canvas.width && height === canvas.height) return;

  canvas.width = width;
  canvas.height = height;
  renderTarget.Configure({ width, height });
  for (const block of [ frame.vs, frame.ps ])
  {
    block.Set("TargetResolution", [ width, height ]);
    block.Set("ViewportSize", [ width, height ]);
  }
}


/**
 * Drags orbit the camera and the wheel dollies it, through Carbon's verbs.
 *
 * `OrbitParent` scales by the camera's `maxSpeed` (0.05 rad per unit), so
 * pixels are scaled down to keep a full-width drag near one turn. Both axes
 * are inverted (operator preference): dragging moves the view the other way.
 *
 * @param {HTMLCanvasElement} canvas The canvas receiving input.
 * @param {EveCamera} camera The camera.
 * @param {object} bounds Centre and radius of the hull.
 * @returns {void}
 */
function BindCameraInput(canvas, camera, bounds)
{
  let last = null;

  canvas.addEventListener("pointerdown", event =>
  {
    last = [ event.clientX, event.clientY ];
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointerup", event =>
  {
    last = null;
    canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", event =>
  {
    if (!last) return;
    camera.OrbitParent((last[0] - event.clientX) * 0.1, (last[1] - event.clientY) * 0.1);
    last = [ event.clientX, event.clientY ];
  });
  canvas.addEventListener("wheel", event =>
  {
    event.preventDefault();
    camera.Dolly(Math.sign(event.deltaY) * bounds.radius * 0.1);
  }, { passive: false });
}


/**
 * The scene's per-frame blocks, with everything but the camera filled.
 *
 * @param {number} width Viewport width in pixels.
 * @param {number} height Viewport height in pixels.
 * @returns {{vs: object, ps: object, viewProjection: Float32Array}} The blocks.
 */
function PerFrameData(width, height)
{
  const vs = RawData.create("EveSpaceScenePerFrameVSData");
  const ps = RawData.create("EveSpaceScenePerFramePSData");

  vs.Set("Sun.DirWorld", SUN_DIRECTION);
  vs.Set("Sun.DiffuseColor", [ 1, 1, 1, 1 ]);
  vs.Set("TargetResolution", [ width, height ]);
  vs.Set("ViewportSize", [ width, height ]);

  ps.Set("Sun.DirWorld", SUN_DIRECTION);
  ps.Set("Sun.DiffuseColor", [ 1, 1, 1, 1 ]);
  // ccpwgl's own scene defaults rather than invented numbers: ambient and fog
  // both 0.25 grey, sun diffuse white (`EveSpaceScene.js:187,225,286`).
  ps.Set("AmbientColor", [ 0.25, 0.25, 0.25 ]);
  ps.Set("FogColor", [ 0.25, 0.25, 0.25, 1 ]);
  ps.Set("ReflectionIntensity", 1);
  ps.Set("ViewportSize", [ width, height ]);
  ps.Set("TargetResolution", [ width, height ]);

  // GAMMABRIGHTNESS IS WHY THE HULL WAS WHITE, and it is worth spelling out
  // because a zero here is not a dim picture, it is a saturated one. `quadv5`
  // ends with the sRGB encode, and the encode's exponent IS this field:
  //
  //     value187 = log2(colour) * cb2[21].w
  //     value189 = exp2(value187)          // colour raised to that power
  //
  // At zero the multiply annihilates the logarithm, `exp2(0)` is one whatever
  // the colour was, and every channel leaves at 1.0. Lighting, textures and
  // material constants can all be perfect and the frame is still pure white -
  // which is exactly what it was, and why chasing the textures first found
  // nothing wrong with them.
  //
  // `SceneMipLodBias` sits beside it and reaches every `textureSampleBias` in
  // the shader; zero is the honest default, but it is set explicitly so the
  // next reader knows it was considered rather than missed.
  ps.Set("GammaBrightness", 1);
  ps.Set("SceneMipLodBias", 0);
  ps.Set("Upscaling", 1);

  return { vs, ps, viewProjection: mat4.create() };
}


/**
 * Updates the camera and writes its view and projection into the frame.
 *
 * CARBON IS ROW-VECTOR AND gl-matrix IS COLUMN-VECTOR, so every composition
 * swaps its operands: Carbon's `view * projection` is `multiply(out,
 * projection, view)` here. The camera's projection is Carbon's own
 * (`EveCamera::CalculateProjectionMatrix`), depth 0 to 1 as WebGPU's clip
 * volume expects.
 *
 * @param {{vs: object, ps: object, viewProjection: Float32Array}} frame The blocks.
 * @param {EveCamera} camera The camera.
 * @param {number} width Viewport width in pixels.
 * @param {number} height Viewport height in pixels.
 * @returns {void}
 */
function WriteCamera(frame, camera, width, height)
{
  const seconds = performance.now() / 1000;

  camera.Update(seconds, width / height, seconds);

  const { vs, ps, viewProjection } = frame;
  const view = camera.GetViewMatrix().transform;
  const projection = camera.GetProjection().transform;

  mat4.multiply(viewProjection, projection, view);

  // TRANSPOSED ON THE WAY IN, which is not decoration. The shader reads each
  // matrix as four consecutive `vec4`s and DOTS the position with them, so it
  // wants the rows where gl-matrix stores columns. `SetAndTranspose` is the
  // method the rest of the runtime writes these with for exactly that reason.
  //
  // ViewInverseTransposeMat IS WHAT ITS NAME SAYS: the TRANSPOSED inverse view,
  // which SetAndTranspose then stores as the inverse view itself. That is
  // Carbon's "need the transposed, but shader also needs column_major, so it is
  // transpose(transpose(m)) == m" (EveSpaceScene.cpp:3026-3027, 3082-3083).
  // Passing the plain inverse scrambled the camera position and view
  // directions the shader derives from it, so Fresnel and reflections landed
  // on the wrong surfaces: gold dark, matte panels shiny.
  const viewInverse = mat4.invert(mat4.create(), view);
  const viewInverseTranspose = mat4.transpose(mat4.create(), viewInverse);

  vs.SetAndTranspose("ViewMat", view);
  vs.SetAndTranspose("ProjectionMat", projection);
  vs.SetAndTranspose("ViewProjectionMat", viewProjection);
  vs.SetAndTranspose("ViewInverseTransposeMat", viewInverseTranspose);
  ps.SetAndTranspose("ViewInverseTransposeMat", viewInverseTranspose);
  ps.SetAndTranspose("ViewMat", view);
}


/**
 * Writes one world transform into both halves of a per-object payload.
 *
 * The vertex and pixel blocks carry the SAME three matrices under the same
 * names, and Carbon fills both - a pixel stage that reconstructs world position
 * needs them as much as the vertex stage does.
 *
 * @param {object} perObject A `{ vs, ps }` pair of `RawData`.
 * @param {Float32Array} world The world transform.
 * @returns {void}
 */
function SetWorld(perObject, world)
{
  const inverse = mat4.invert(mat4.create(), world);

  for (const block of [ perObject.vs, perObject.ps ])
  {
    if (!block) continue;

    block.SetAndTranspose("worldTransform", world);
    block.SetAndTranspose("worldTransformLast", world);
    block.SetAndTranspose("invWorldTransform", inverse);
  }
}


/** Composes and runs one frame. Returns a short report for the page. */
export async function RunDemo(canvas)
{
  const adapter = await navigator.gpu?.requestAdapter();

  if (!adapter) throw new Error("no WebGPU adapter");

  // ASKS FOR BC, TAKES WHAT IT GETS. EVE's maps are BC7 and WebGPU exposes the
  // family only behind this feature; a device without it decodes to RGBA8
  // instead, so the demo runs either way and reports which happened.
  const compressed = adapter.features.has("texture-compression-bc");
  // EIGHT STORAGE TEXTURES PER STAGE, when the adapter has them: the
  // reflection probe's main filter writes seven cube mips in one dispatch
  // (ReflectionFilterActivision128), and WebGPU's default is four.
  const storageTextures = Math.min(8, adapter.limits.maxStorageTexturesPerShaderStage);
  const device = await adapter.requestDevice({
    ...(compressed ? { requiredFeatures: [ "texture-compression-bc" ] } : {}),
    requiredLimits: { maxStorageTexturesPerShaderStage: storageTextures }
  });
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
      floats: Array.from(view.slice(0, 128))
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

  // Counts the textures that actually reach the device, which is the only proof
  // that a loaded map became a bound one rather than a dummy.
  const madeTextures = [];
  const createTexture = device.createTexture.bind(device);

  device.createTexture = descriptor =>
  {
    const layers = descriptor.size?.[2] ?? descriptor.size?.depthOrArrayLayers ?? 1;

    madeTextures.push(`${descriptor.size?.[0] ?? descriptor.size?.width}x${descriptor.size?.[1] ?? descriptor.size?.height}x${layers}:${descriptor.format}:${descriptor.mipLevelCount ?? 1}mip`);

    return createTexture(descriptor);
  };

  const webgpu = new CjsWebgpuDevice({ device, shaderStage: GPUShaderStage });
  const sof = await SofDocument(DNA);
  // The document names the geometry; the default hull only when it cannot be had.
  const HULL = sof?.mesh?.geometryResPath?.replace(/^res:\//u, "") || DEFAULT_HULL;
  const documentAreas = sof?.mesh?.opaqueAreas ?? [];
  const hullBytes = await ResourceBytes(HULL);
  const mesh = Unpack(HullMesh(hullBytes), ReadsPackedTangents(documentAreas));
  const bounds = Bounds(mesh);
  const geometry = GeometryResource(mesh, `res:/${HULL}`);
  const textures = { loaded: 0, failed: [] };

  // EACH AREA GETS ITS OWN SHADER. `area_hull` names `quadv5` and `area_booster`
  // names `quadheatv5`; one material for both meant the booster ran the hull's
  // shader, which is why it showed texture and no heat.
  const areas = [];

  for (const declared of documentAreas)
  {
    const effect = DETAIL_TEST && declared.name === "area_hull" && declared.effect
      ? WithDetailMaps(declared.effect)
      : declared.effect ?? null;
    const path = effect?.effectFilePath ? EffectPath(effect.effectFilePath) : EFFECT;
    const material = await Material(`res:/${path}`, effect);

    // The scene's share of the texture slots, before the material is applied
    // and its resource set laid out. Added as ordinary named parameters,
    // because that is how a material finds a texture: by the name the shader
    // declares. Every area needs its own - a resource set is per material.
    for (const scene of SCENE_TEXTURES)
    {
      const parameter = new TriTextureParameter();

      parameter.name = scene.name;
      parameter.SetResourcePath(SceneTexturePath(scene));
      material.resources.push(parameter);
    }

    material.RebuildCachedData();

    const loaded = await LoadTextures(material);

    textures.loaded += loaded.loaded;
    textures.failed.push(...loaded.failed);

    areas.push({
      material,
      path,
      name: declared.name,
      index: declared.index ?? 0,
      count: declared.count ?? 1
    });
  }

  if (!areas.length) throw new Error("the SOF document declares no opaque areas");

  const material = areas[0].material;
  const effectPath = areas[0].path;
  const frame = PerFrameData(canvas.width, canvas.height);
  const camera = OrbitCamera(bounds);

  BindCameraInput(canvas, camera, bounds);
  WriteCamera(frame, camera, canvas.width, canvas.height);

  // The hull sits at the origin, so the camera does the framing and the world
  // matrix is identity. EveTransform's payload is the simplest placeable one
  // and carries the three matrices a ship's vertex stage reads.
  // THE SHIP'S OWN PER-OBJECT PAIR, not EveTransform's. The pixel stage
  // declares b4 and reads exactly ROW 12 of it, which is `shipData` in
  // `EveSpaceObjectPSData` - booster glow, activation, DIRT LEVEL and bounding
  // radius. With no PS payload supplied, b4 was handed the same arena region as
  // b0, so the shader read the MATERIAL's colours as ship data and the hull
  // blew out white. EveTransform's payload has no pixel half at all, which is
  // why it could never have filled that register.
  const perObject = {
    vs: RawData.create("EveSpaceObjectVSData"),
    ps: RawData.create("EveSpaceObjectPSData")
  };
  const renderable = HullRenderable(areas, geometry, perObject);

  // CONSOLE ACCESS, for editing values live. There is no EveShip2 here: the
  // "ship" is the SOF document, one Tr2Effect per area, the mesh and the ship's
  // per-object data. `demo.param("area_hull", "Mat1DiffuseColor")` finds a
  // material parameter; edit its `value` in place.
  globalThis.demo = {
    sof,
    areas,
    materials: Object.fromEntries(areas.map(area => [ area.name, area.material ])),
    renderable,
    perObject,
    camera,
    frame,
    SetWorld: world => SetWorld(perObject, world),
    param: (areaName, parameterName) => areas
      .find(area => area.name === areaName)?.material.parameters
      .find(parameter => parameter.name === parameterName) ?? null,
    params: areaName => areas
      .find(area => area.name === areaName)?.material.parameters
      .map(parameter => parameter.name) ?? [],
    // shipData is one register of four unrelated floats, and Carbon writes the
    // same value into both halves (EveSpaceObject2.cpp:666-671, :769-776):
    // x booster glow, y activation strength, z dirt level, w bounding radius.
    shipData: (values = {}) =>
    {
      const data = Array.from(perObject.ps.Get("shipData"));
      if (values.boosterGlow !== undefined) data[0] = values.boosterGlow;
      if (values.activation !== undefined) data[1] = values.activation;
      if (values.dirt !== undefined) data[2] = values.dirt;
      if (values.radius !== undefined) data[3] = values.radius;
      perObject.ps.Set("shipData", data);
      perObject.vs.Set("shipData", data);
      return { boosterGlow: data[0], activation: data[1], dirt: data[2], radius: data[3] };
    },
    dirt: value => globalThis.demo.shipData({ dirt: value }),
    activation: value => globalThis.demo.shipData({ activation: value })
  };
  // Carbon writes the bounding radius into w every update (EveSpaceObject2.cpp:774);
  // the layout default of 1 was never overwritten here.
  globalThis.demo.shipData({ radius: bounds.radius });
  console.log(`console: demo.dirt(v), demo.activation(v), demo.shipData({...}); demo.materials has ${areas.map(area => area.name).join(", ")}; demo.params(area) lists parameters`);

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
    // THE ACCUMULATOR CARRIES THE RENDERING MODE, and nothing was setting it.
    // `TriRenderBatchAccumulator.Commit` stamps its mode onto every batch, and
    // the walk skips `ApplyStandardStates` for RM_ANY - so with the default no
    // rendering mode block was EVER applied. Every mesh drew with the
    // interpreted defaults: cull CCW where RM_OPAQUE asks for CULLMODE_CW, so
    // the back faces survived and every hull showed its interior.
    //
    // Carbon sets it per batch list on the SCENE (`Tr2InteriorScene.cpp:1120`,
    // `batches->SetRenderingMode(...)`) and ccpwgl passes a mode into
    // `GetAreaBatches` (`Tw2Mesh.js:512-522`). A scene stand-in has to do the
    // same, and the batch-type to mode mapping belongs in the driver.
    createAccumulator: batchType =>
    {
      const accumulator = new TriRenderBatchAccumulator();

      const mode = batchType === TriBatchType.TRIBATCHTYPE_DECAL
        ? RenderingMode.RM_DECAL
        : RenderingMode.RM_OPAQUE;

      // `Clear` resets the mode back to RM_ANY every frame, so it has to be
      // re-applied every frame - Carbon sets it at collection time for the same
      // reason. Restoring it here keeps that in one place.
      const clear = accumulator.Clear.bind(accumulator);

      accumulator.Clear = (...rest) =>
      {
        const out = clear(...rest);

        accumulator.renderingMode = mode;

        return out;
      };

      accumulator.renderingMode = mode;

      return accumulator;
    }
  });

  batchManager.Initialize();

  const al = new CjsWebgpuRenderContextAL({ webgpu, renderTarget });

  al.CreateDevice();

  // Records every constant bind, by stage and register, so an unfilled uniform
  // block can be told from a block bound to the wrong place.
  const binds = [];
  const setConstants = al.SetConstants.bind(al);

  al.SetConstants = (buffer, stage, register, ...rest) =>
  {
    binds.push(`s${stage}b${register}`);

    return setConstants(buffer, stage, register, ...rest);
  };

  // WHICH SLOTS THE BACKEND HAD TO FAKE. Every unfilled texture register gets a
  // zero-filled 1x1 dummy, and "zero" is not the right nothing for every map -
  // a normal map wants a flat normal, a mask wants black, a reflection wants the
  // scene environment. This names the slots so that argument can be had against
  // facts.
  const srvs = [];
  const dummies = [];
  const createResourceSet = al.CreateResourceSet.bind(al);
  const getDummyTexture = al.GetDummyTexture.bind(al);

  al.GetDummyTexture = dimension => { dummies.push(dimension); return getDummyTexture(dimension); };
  al.CreateResourceSet = (description, program, implementationOnly = false) =>
  {
    // Preserve the facade's internal allocation branch, and inspect once per
    // public Create. Dropping the third argument recurses into the facade.
    if (!implementationOnly)
    {
      const map = description.m_registerMap;
      for (let stage = 0; stage < map.srvs.length; stage += 1)
      {
        for (let register = 0; register < map.srvs[stage].length; register += 1)
        {
          const index = map.srvs[stage][register];
          if (index >= map.srvCount) continue;
          const record = description.m_srv[index];
          if (record.type === 0) continue;
          const resource = record.type === 1 ? record.buffer : record.texture;
          srvs.push(`srv${stage}:${register}=${resource?.constructor?.name ?? "invalid"}`);
        }
      }
    }
    return createResourceSet(description, program, implementationOnly);
  };

  // What rendering mode each batch asks for. RM_ANY means the walk skips
  // ApplyStandardStates entirely, so no mode block is ever laid down.
  const renderModes = [];

  const renderContext = new Tr2RenderContext();

  renderContext.SetRenderContextAL(al);

  // WHAT EveSpaceScene's CONSTRUCTOR DOES (EveSpaceScene.cpp:257-258), which
  // this stand-in scene must do itself: the Float4x3 ring is the global
  // `BoneTransforms` variable. The materials were mapped before this existed,
  // and a register maps to a variable only if it is registered at mapping, so
  // they are rebuilt. Uploaded once: a rest pose never changes, and nothing
  // here drives the ring's per-frame fence.
  const bones = Tr2RingBuffer.GetInstance("Float4x3", 48, renderContext);
  const boneOffsets = new Tr2RingBufferOffsets();

  bones.SetName("BoneTransformsBuffer");
  Tr2VariableStore.GlobalStore().RegisterVariable("BoneTransforms", bones);
  boneOffsets.UploadTransforms(bones, RestPoseBones(REST_POSE_BONES), REST_POSE_BONES);
  bones.PrepareBuffer(renderContext);
  perObject.vs.Set("boneOffsets", [ boneOffsets.GetCurrentFrameOffset(), boneOffsets.GetPreviousFrameOffset(), REST_POSE_BONES, 0 ]);

  for (const area of areas) area.material.RebuildCachedData();

  // ?probe=copy: the first step of Carbon's reflection probe, run on the GPU.
  if (PROBE_MODE === "copy" || PROBE_MODE === "mips") await ProbeCopyCube(renderContext, al, areas);
  else if (PROBE_MODE !== "off") await ReflectionProbe(renderContext, al, areas);

  {
    const esm = renderContext.GetEffectStateManager();
    const applyStandardStates = esm.ApplyStandardStates.bind(esm);

    esm.ApplyStandardStates = mode => { renderModes.push(mode); return applyStandardStates(mode); };
  }

  const driver = new EveSpaceSceneRenderDriver().SetBatchManager(batchManager);

  // demo.post(): which post-process effects loaded, and what each draw verb
  // did since the last call. A "nothing" count with no error is the black
  // canvas's cause.
  // demo.readback(): non-zero texel counts for every pool texture the post
  // chain borrowed, by name. The first one that reads zero is the stage that
  // lost the image.
  globalThis.demo.readback = async () =>
  {
    const device = al.GetWebgpu().GetDevice();
    const report = {};
    for (const [ name, texture ] of POOL_TEXTURES)
    {
      const gpuTexture = texture?.m_texture;
      report[name] = gpuTexture ? await CountNonZeroTexels(device, gpuTexture) : "no GPU texture";
    }
    return report;
  };

  globalThis.demo.post = () =>
  {
    const counts = { ...DRAW_COUNTS };
    for (const key of Object.keys(DRAW_COUNTS)) delete DRAW_COUNTS[key];
    return {
      postOff: POST_OFF,
      template: postTemplate ? { path: postTemplate.path, populated: postTemplate.populated, skipped: postTemplate.skipped } : null,
      stage: STAGE || "all",
      counts,
      tonemapping: EffectState(driver.postProcess.tonemappingEffect),
      cas: EffectState(driver.postProcess._fidelityFxCasShader),
      material: EffectState(areas[0].material)
    };
  };

  let postTemplate = null;

  if (POST_TEMPLATE)
  {
    postTemplate = await LoadPostTemplate(POST_TEMPLATE);
    console.log(`post template ${postTemplate.path}: populates ${postTemplate.populated.join(", ") || "(nothing)"}`
      + (postTemplate.skipped.length ? `; skipped, pass not ported: ${postTemplate.skipped.join(", ")}` : ""));
  }

  // The loaded Tr2PostProcess2, for editing live: demo.postProcess.colorCorrection.
  globalThis.demo.postProcess = postTemplate?.postProcess ?? null;

  // THE FOUR THINGS THE DRIVER ASKS A SCENE FOR. The update hooks are no-ops on
  // purpose: this demo proves the draw path, and a fog or lighting blend it does
  // not use would be scenery pretending to be a test.
  driver.scene = {
    Update: () => {},
    BlendLightingOverrides: () => {},
    UpdateFogSettings: () => {},
    GetPerFrameVSData: () => frame.vs,
    GetPerFramePSData: () => frame.ps,
    GetRenderables: out => { out.push(renderable); return out; },
    // With no `?post=<template>` the chain copies, sharpens and tonemaps only.
    GetPostProcess: () => postTemplate?.postProcess ?? null
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

    driver.Execute(POST_OFF ? null : [ renderTarget ], null, 0, 0, null, renderContext);

    al.EndScene();

    // THE READBACK IS SUBMITTED BEFORE ANYTHING AWAITS. A real await ends the
    // task, the canvas presents, and the swap-chain texture is destroyed, so a
    // copy submitted after popErrorScope failed with "Destroyed texture used in
    // a submit" and the count read zero. CountDrawnPixels records and submits
    // its copy synchronously, before its own first await.
    const litPixels = CountDrawnPixels(device, presented, canvas);

    return {
      validation: (await device.popErrorScope())?.message ?? null,
      litPixels: await litPixels
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

  // KEEPS DRAWING, because one frame does not stay on screen. A WebGPU canvas
  // shows the image that was last PRESENTED, and the next `getCurrentTexture`
  // hands out a fresh uninitialised one - so a demo that draws once and stops
  // can end up compositing a blank image over the frame it just drew. Drawing
  // every tick removes the question entirely, and it is what a demo should do.
  //
  // EVERY FRAME REWRITES THE PER-FRAME BLOCKS from the camera, so the constant
  // uploads and the arena's per-frame reset are exercised continuously rather
  // than once - a single frame cannot tell you whether the second one works.
  // `?spin=1` also turns the hull, rewriting its world matrix each frame.
  //
  // `?still=1` holds it at one frame, for when a report must be deterministic.
  const parameters = new URLSearchParams(globalThis.location?.search ?? "");

  if (parameters.get("still") !== "1")
  {
    const spin = mat4.create();
    const spinning = parameters.get("spin") === "1";
    const start = performance.now();

    // The loop stopped dead after about a dozen frames with nothing in the
    // console, so it reports its own state rather than being guessed at again.
    const loop = { ticks: 0, drawn: 0, error: null, firstError: null, deviceLost: null };

    globalThis.__demoLoop = loop;
    device.lost.then(info => { loop.deviceLost = `${info.reason}: ${info.message}`; });

    const tick = () =>
    {
      try
      {
        FitCanvas(canvas, renderTarget, frame);
        WriteCamera(frame, camera, canvas.width, canvas.height);
        if (spinning)
        {
          mat4.fromYRotation(spin, (performance.now() - start) / 4000);
          SetWorld(perObject, spin);
        }

        // Synchronous: the pixel readback in `Frame` is the only asynchronous
        // part and a live loop does not need it.
        al.BeginScene();
        al.SetRenderTarget(0, renderTarget);
        al.SetDepthStencil(renderTarget);
        driver.Execute(POST_OFF ? null : [ renderTarget ], null, 0, 0, null, renderContext);
        al.EndScene();
        al.DrainTransitions();

        loop.ticks += 1;
        loop.drawn = al.GetDrawnBatchCount();
      }
      catch (error)
      {
        // KEEPS TICKING AFTER A THROW. A frame that fails should not silently
        // end the animation - that is what made this look like the browser
        // losing interest rather than the engine failing.
        loop.error = `${error.message}\n${error.stack ?? ""}`;

        // THE FIRST ERROR IS THE CAUSE. A throw between BeginScene and EndScene
        // leaves the work queue mid-frame, and every later tick then fails with
        // "BeginFrame without EndFrame", which overwrote the real error. Keep the
        // first, and close the failed frame so the next one can start.
        if (!loop.firstError)
        {
          loop.firstError = loop.error;
          console.error(`demo loop: first failed frame: ${loop.error}`);
        }
        try
        {
          al.EndScene();
        }
        catch
        {
          // Closing is best effort; the error above is the one that matters.
        }
      }

      globalThis.requestAnimationFrame(tick);
    };

    globalThis.requestAnimationFrame(tick);
  }

  return {
    litPixels: inverted?.litPixels ?? asAuthored.litPixels,
    litPixelsAsAuthored: asAuthored.litPixels,
    litPixelsCullInverted: inverted?.litPixels ?? null,
    validation,
    effect: effectPath,
    areas: areas.map(a => `${a.name}[${a.index}+${a.count}] -> ${a.path.split("/").pop()}`),
    hull: HULL,
    effectAreas: areas.length,
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
    sof: sof ? "loaded" : "unavailable",
    textureCompression: compressed ? "bc" : "decoded to rgba8",
    texturesLoaded: textures.loaded,
    deviceTextures: madeTextures,
    textureFailures: textures.failed,
    materialResources: (material.resources ?? []).map(r => r.name),
    pipelines,
    bindGroups,
    constantBinds: [ ...new Set(binds) ],
    renderingModes: [ ...new Set(renderModes) ],
    dummyTextureSlots: dummies,
    resourceSetSrvs: srvs,
    uploads: uploads.map(u => `${u.label ?? "?"}@${u.offset}+${u.bytes}`),
    sceneRows: (() => {
      const block = uploads.find(u => u.bytes === 1888);
      if (!block) return null;
      const row = i => block.floats.slice(i * 4, i * 4 + 4).map(v => Number(v.toFixed(3)));
      return { sunDir: row(12), sunDiffuse: row(13), ambient: row(14), fog: row(15), gamma: row(21) };
    })(),
    uploadCount: uploads.length,
    draws,
    expectedViewProjectionTransposed: Array.from(mat4.transpose(mat4.create(), frame.viewProjection)).map(v => Number(v.toFixed(3)))
  };
}
