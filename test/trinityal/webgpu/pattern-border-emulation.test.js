import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";

import { CjsWebgpuRenderContextAL } from "../../../npm/dist/trinityal/webgpu/internal.js";
import { CjsWebgpuDevice } from "../../../npm/dist/trinityal/webgpu/index.js";
import { Tr2RenderStateSetup } from "../../../npm/dist/resource/shader/index.js";
import { PixelFormat, Tr2CpuUsage, Tr2GpuUsage, ShaderType, Topology } from "../../../npm/dist/global/consts/renderContext/index.js";
import { writeBackendBlock } from "../../../npm/dist/resource/format/index.js";
import { Tr2BitmapDimensions, Tr2BufferDescriptionAL, Tr2ResourceSetDescriptionAL, ALResult } from "../../../npm/dist/trinityal/index.js";
import { buildEffectPackage } from "../../../npm/dist/resource/formats/webgpu/core/packageEffect.js";
import { readEffectAnalysis } from "../../../npm/dist/resource/formats/webgpu/core/effectAnalysis.js";
import { buildEffectAnalysis } from "../../../npm/dist/resource/formats/webgpu/core/helpers.js";
import { BorderColorLiteral } from "../../../npm/dist/resource/formats/webgpu/core/wgsl/emulatedAddressing.js";

// A ship pattern draw, end to end: the real quadv5 effect translated to WGSL,
// a resource set carrying the sampler EveSOF's pattern override puts on
// PatternMask1MapSampler (clamp-to-border), a draw through the WebGPU AL
// against a device that records what it is given, and the emitted
// border helper evaluated against the modes the draw uploaded.
//
// quadv5 AUTHORS that sampler wrap/wrap; border reaches it only through the
// override (EveSOF.cpp:639 -> Tr2Effect::RebuildSamplerOverrides). Gating the
// emulation on the authored modes alone left the pattern on the GPU sampler's
// clamp-to-edge, so a mask's edge texels smeared across the hull where
// Carbon's border leaves the pattern out.

const EFFECT = "managed/space/spaceobject/v5/quad/quadv5.sm_depth";
const PERMUTATION = [ { name: "SPACE_OBJECT_PPT_ENABLED", value: "SOPPT_ENABLED" } ];
const SAMPLER_NAME = "PatternMask1MapSampler";
const corpusDir = process.env.CARBON_EFFECT_CORPUS_DIR || null;
const CORPUS_LAYOUT_PREFIXES = [ "graphics/effect.dx11", "dx11", "" ];

const SHADER_STAGE = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
const BUFFER_USAGE = Object.freeze({ UNIFORM: 16, COPY_DST: 32, VERTEX: 64, INDEX: 128, STORAGE: 256 });
const TEXTURE_USAGE = Object.freeze({ TEXTURE_BINDING: 4, COPY_DST: 2, RENDER_ATTACHMENT: 16 });
const VERTEX_WGSL = "@vertex fn main() -> @builtin(position) vec4f { return vec4f(0); }";

/**
 * The corpus file under whichever layout the corpus uses.
 *
 * @param {string} root Corpus root.
 * @returns {Promise<string|null>} The file, or null when absent.
 */
async function resolveCorpusFile(root)
{
  for (const prefix of CORPUS_LAYOUT_PREFIXES)
  {
    const candidate = path.join(root, ...prefix ? [ prefix ] : [], EFFECT);

    try
    {
      if ((await stat(candidate)).isFile()) return candidate;
    }
    catch
    {
      // Next layout.
    }
  }

  return null;
}

/**
 * A WebGPU AL over a device faked at the seams a draw touches, recording the
 * samplers, bind groups and buffers it is asked to create.
 *
 * @returns {object} The AL and what the device recorded.
 */
function composed()
{
  const bindGroups = [];
  const samplers = [];
  const pass = {
    setPipeline() {},
    setBindGroup() {},
    setViewport() {},
    setVertexBuffer() {},
    setIndexBuffer() {},
    drawIndexed() {},
    draw() {},
    end() {}
  };
  const device = {
    lost: new Promise(() => {}),
    createShaderModule: descriptor => ({ kind: "module", label: descriptor.label }),
    limits: { maxTextureDimension2D: 8192, maxTextureDimension3D: 2048, maxSampledTexturesPerShaderStage: 16, maxSamplersPerShaderStage: 16, maxStorageTexturesPerShaderStage: 4, maxStorageBuffersPerShaderStage: 8, maxUniformBuffersPerShaderStage: 12 },
    createBindGroupLayout: descriptor => ({ kind: "bind-group-layout", descriptor }),
    createPipelineLayout: descriptor => ({ kind: "pipeline-layout", descriptor }),
    createBindGroup(descriptor)
    {
      const group = { id: bindGroups.length + 1, descriptor };

      bindGroups.push(group);

      return group;
    },
    createBuffer: descriptor => ({ kind: "buffer", descriptor, destroy() {} }),
    createTexture: descriptor => ({ kind: "texture", descriptor, destroy() {}, createView: view => ({ kind: "view", dimension: view.dimension }) }),
    createSampler(descriptor)
    {
      const sampler = { kind: "sampler", descriptor };

      samplers.push(sampler);

      return sampler;
    },
    queue: { writeBuffer() {}, submit() {} },
    createRenderPipeline: descriptor => ({ id: 1, descriptor }),
    createCommandEncoder: () => ({ beginRenderPass: () => pass, finish: () => "command-buffer" }),
    pushErrorScope() {},
    popErrorScope() { return Promise.resolve(null); }
  };
  const webgpu = new CjsWebgpuDevice({ device, shaderStage: SHADER_STAGE, bufferUsage: BUFFER_USAGE, textureUsage: TEXTURE_USAGE });
  const al = new CjsWebgpuRenderContextAL({
    webgpu,
    dispatcher: { PrepareAccumulator: () => null, EncodeAccumulator() {} },
    renderTarget: {
      AcquireFrame: () => ({ id: "frame" }),
      CreateRenderPassDescriptor: () => ({ label: "descriptor" }),
      GetWidth: () => 64,
      GetHeight: () => 64,
      GetFormat: () => "bgra8unorm",
      GetDepthFormat: () => "depth24plus",
      GetSampleCount: () => 1
    }
  });

  al.CreateDevice();
  al.BeginScene();
  al.DrainTransitions();

  return { al, bindGroups, samplers };
}

/**
 * Evaluates one emitted `cjsAddressBorder2` call the way the WGSL reads.
 *
 * Interprets the helper's own emitted lines, so a change to the helper is a
 * change to what this evaluates; any line it does not recognise fails the test
 * rather than being skipped.
 *
 * @param {string} code Emitted WGSL.
 * @returns {Function} `(sampled, uv, modes, borderColor) => vec4`.
 */
function emittedBorderHelper(code)
{
  const body = code.match(/fn cjsAddressBorder2\([^)]*\) -> vec4<f32>\s*\{([\s\S]*?)\n\}/u);

  assert.ok(body, "the WGSL carries the border helper");

  const tests = [];

  for (const raw of body[1].split("\n"))
  {
    const line = raw.trim();

    if (!line || line === "return sampled;") continue;

    const match = line.match(/^if \(i32\(modes\.([xy])\) == (\d+) && \(uv\.\1 < 0\.0 \|\| uv\.\1 > 1\.0\)\) \{ return borderColor; \}$/u);

    assert.ok(match, `a helper line this evaluator understands: ${line}`);
    tests.push({ axis: match[1] === "x" ? 0 : 1, mode: Number(match[2]) });
  }

  return (sampled, uv, modes, borderColor) =>
  {
    for (const { axis, mode } of tests)
    {
      if (Math.trunc(modes[axis]) === mode && (uv[axis] < 0 || uv[axis] > 1)) return borderColor;
    }

    return sampled;
  };
}

/**
 * A `vec4<f32>(...)` literal as numbers.
 *
 * @param {string} literal The literal.
 * @returns {number[]} Its components.
 */
function literalComponents(literal)
{
  return literal.replace(/^vec4<f32>\(|\)$/gu, "").split(",").map(Number);
}

test("a pattern mask on a border-overridden dynamic sampler reads its border outside 0-1 and its edge inside", { skip: corpusDir ? false : "set CARBON_EFFECT_CORPUS_DIR for the quadv5 effect" }, async (t) =>
{
  const file = await resolveCorpusFile(corpusDir);

  if (!file)
  {
    t.skip(`${EFFECT} is not in the corpus`);
    return;
  }

  const bytes = new Uint8Array(await readFile(file));

  // The effect's own declaration of the pattern sampler: dynamic, so an
  // override reaches it, and authored WITHOUT border.
  const resolved = readEffectAnalysis(bytes, { source: EFFECT, permutation: PERMUTATION });
  const analysis = buildEffectAnalysis(resolved, { source: EFFECT, decodeBytecode: false, decodeInstructions: false });
  const pixelStage = analysis.stages.find(stage => stage.techniqueName === "Main" && stage.passIndex === 0 && stage.stageName === "pixel");
  const declared = pixelStage.bindings.find(binding => binding.kind === "sampler" && binding.carbon?.name === SAMPLER_NAME);

  assert.ok(declared, `${SAMPLER_NAME} is declared by the pixel stage`);
  assert.equal(declared.dynamic, true, "an override can reach it");
  assert.notEqual(declared.carbon.sampler.addressU, 4, "border is not authored; only the override brings it");

  const samplerRegister = declared.registerIndex;
  const declaredBorder = declared.carbon.sampler.borderColor;

  // 1. The translated WGSL wraps the pattern sample, reading the modes buffer
  //    at the sampler's register, with the effect's declared border colour.
  const effectPackage = buildEffectPackage(bytes, { source: EFFECT, permutation: PERMUTATION, mode: "selected" });
  const pixel = effectPackage.wgsl.shaders.find(shader => shader.key === "Main.pass0.pixel");
  const layout = effectPackage.wgsl.layouts.find(entry => entry.key === "Main.pass0");
  const call = pixel.code.match(new RegExp(
    `cjsAddressBorder2\\(textureSample\\w*\\((t\\d+), s${samplerRegister}, [\\s\\S]*?cjsAddressModes\\[${samplerRegister}\\]\\.xy, (vec4<f32>\\([^)]*\\))\\)`, "u"));

  assert.ok(call, `the sample through s${samplerRegister} is wrapped in the border test`);
  assert.equal(call[2], BorderColorLiteral(declaredBorder), "the border colour is the one the effect declares");

  const textureRegister = Number(call[1].slice(1));
  const modesDeclaration = pixel.code.match(/@group\((\d+)\) @binding\((\d+)\) var<uniform> cjsAddressModes: array<vec4<f32>, (\d+)>/u);

  assert.ok(modesDeclaration, "the pixel stage declares the modes buffer");

  const modesGroup = Number(modesDeclaration[1]);
  const modesBinding = Number(modesDeclaration[2]);
  const layoutBinding = layout.bindGroups.flatMap(group => group.bindings).find(binding => binding.generatedSymbol === "cjsAddressModes");

  assert.equal(layoutBinding.group, modesGroup, "the layout's group is the shader's");
  assert.equal(layoutBinding.binding, modesBinding, "the layout's binding is the shader's");

  // 2. The resource set binds the sampler EveSOF's pattern override makes
  //    (EveSOF.cpp:639; the JS port's Tr2SamplerOverride fields) at the
  //    sampler's register, and the layer's mask at the texture's.
  const { al, bindGroups, samplers } = composed();
  const signature = {
    registers: [ { registerType: 36, registerIndex: textureRegister }, { registerType: 1, registerIndex: samplerRegister } ],
    pipelineInputs: [ { usage: 0, usageIndex: 0, registerIndex: 0 } ],
    backendBlock: (() =>
    {
      const block = writeBackendBlock({ bindGroups: layout.bindGroups, transforms: [] });

      return { bytes: block, size: block.byteLength };
    })()
  };
  const program = al.CreateShaderProgram([
    al.CreateShader(ShaderType.VERTEX_SHADER, VERTEX_WGSL, signature, "v.wgsl"),
    al.CreateShader(ShaderType.PIXEL_SHADER, pixel.code, signature, "f.wgsl")
  ]);
  const override = al.CreateSamplerState({
    minFilter: 3, magFilter: 3, mipFilter: 2, addressU: 4, addressV: 4, addressW: 1,
    mipLODBias: 0, maxAnisotropy: 4, borderColor: [ 0, 0, 0, 0 ]
  });
  const mask = al.CreateTexture(Tr2BitmapDimensions.create__WidthHeightMipCountFormat(4, 4, 1, PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM),
    { gpuUsage: Tr2GpuUsage.SHADER_RESOURCE });
  const description = new Tr2ResourceSetDescriptionAL({ program });

  description.SetSampler(ShaderType.PIXEL_SHADER, samplerRegister, override);
  description.SetSrv__TextureAL(ShaderType.PIXEL_SHADER, textureRegister, mask);

  const set = al.CreateResourceSet(description, program);
  const geometry = () => al.CreateBuffer(Tr2BufferDescriptionAL.create__Stride(4, 64,
    Tr2GpuUsage.VERTEX_BUFFER | Tr2GpuUsage.INDEX_BUFFER, Tr2CpuUsage.WRITE));

  al.SetTopology(Topology.TOP_TRIANGLES);
  al.SetVertexLayout(al.CreateVertexLayout([ { usage: 0, usageIndex: 0, type: "Float32", elementCount: 3, offset: 0, stream: 0 } ]));
  al.SetStreamSource(0, geometry(), 0, 12);
  al.SetIndices__Stride(geometry(), 2);
  al.SetShaderProgram(program);
  al.SetRenderStates(Tr2RenderStateSetup.fromKeyValues([]));
  al.SetResourceSet(set);

  assert.equal(al.DrawIndexedInstanced(36, 1), ALResult.S_OK, al._pipelineFailure ?? "drew");
  assert.deepEqual([ ...set._resourceSet.implementation.GetAddressModes(samplerRegister + 1).slice(samplerRegister * 4, samplerRegister * 4 + 4) ],
    [ 4, 4, 1, 0 ], "the set reports border for the register");

  // The GPUSampler the draw binds: border flattened to clamp-to-edge, as
  // WebGPU has no border mode; the emulation stands in for the rest.
  const gpuSampler = samplers.find(sampler => sampler === override.TrinityALImpl_GetObject().GetSampler());

  assert.equal(gpuSampler.descriptor.addressModeU, "clamp-to-edge");
  assert.equal(gpuSampler.descriptor.addressModeV, "clamp-to-edge");

  // 3. The draw's bind group fills the shader's modes binding from the
  //    backend's modes buffer, which holds border at the sampler's register.
  const group = bindGroups.find(entry => entry.descriptor.entries.some(item => item.binding === modesBinding && item.resource?.buffer));

  assert.ok(group, "the draw's bind group has an entry at the modes binding");
  assert.ok(group.descriptor.entries.some(item => item.resource === gpuSampler), "and binds the override's sampler");
  assert.ok(al._addressModes, "the backend recognised and filled the modes buffer");

  const modes = new Float32Array(al._addressModes._shadowCopy.buffer, 0, Number(modesDeclaration[3]) * 4);
  const bound = [ ...modes.slice(samplerRegister * 4, samplerRegister * 4 + 4) ];

  assert.deepEqual(bound, [ 4, 4, 1, 0 ], "border U and V at the sampler's register");

  // 4. The emitted helper, evaluated against what the draw bound: a mask that
  //    clamp-to-edge samples (edge texel 1) reads its edge inside 0-1 and the
  //    declared border outside it.
  const border = emittedBorderHelper(pixel.code);
  const borderColor = literalComponents(call[2]);
  const edge = [ 1, 1, 1, 1 ];
  const sample = uv => border(edge, uv, bound, borderColor);

  assert.deepEqual(borderColor, [ ...declaredBorder ]);
  assert.deepEqual(sample([ 1, 0.5 ]), edge, "inside 0-1: the mask's edge value is unchanged");
  assert.deepEqual(sample([ 0, 0.5 ]), edge);
  assert.deepEqual(sample([ 1.25, 0.5 ]), borderColor, "past U = 1: the border, not the smeared edge");
  assert.deepEqual(sample([ -0.25, 0.5 ]), borderColor);
  assert.deepEqual(sample([ 0.5, 1.5 ]), borderColor, "past V = 1");
  assert.equal(sample([ 1.25, 0.5 ])[0], 0, "mask = 0 outside: no pattern contribution");
});
