// The browser half of device startup: acquire WebGPU or WebGL2 on a canvas and
// hand its abstraction layer to CjsLibrary.AttachTrinity.
//
// Ours, with no Carbon counterpart: Carbon's host builds its device in client
// code (Python's `trinity.TriDevice()`), and the browser decides which graphics
// API a page may have. Lifted from Graphene's working viewport startup
// (graphene/src/features/viewport/runtime/demo/demo.js CreateWebgpuHost and
// webgl2/webgl2Host.js), without its diagnostics, so Tny and Graphene start the
// same way. Carbon has no browser backend selection; this is our extension.
import { Failed } from "../../trinityal/ALResult.js";
import { Tr2RenderContextALWebgl2 } from "../../trinityal/webgl2/Tr2RenderContextALWebgl2.js";
import { CjsWebgpuDevice } from "../../trinityal/webgpu/CjsWebgpuDevice.js";
import { CjsWebgpuRenderContextAL } from "../../trinityal/webgpu/CjsWebgpuRenderContextAL.js";
import { CjsWebgpuRenderTarget } from "../../trinityal/webgpu/core/CjsWebgpuRenderTarget.js";
import { CjsWebgpuFormat } from "../../resource/formats/webgpu/CjsWebgpuFormat.js";
import { CjsWebglFormat } from "../../resource/formats/webgl/CjsWebglFormat.js";
import { Tr2RenderTarget } from "../../trinity/core/device/Tr2RenderTarget.js";
import { Tr2StepExecuteRenderNode } from "../../trinity/renderJob/step/Tr2StepExecuteRenderNode.js";
import { Tr2PlatformInfo } from "./Tr2PlatformInfo.js";

/** The order backends are tried in when the caller states none. */
export const CjsBrowserBackendPreference = Object.freeze([ "webgpu", "webgl2" ]);

/**
 * Dx11 effects lowered to GLSL with packed lights and the sixteen texture units
 * WebGL2 guarantees each stage.
 */
const webgl2Translator = {
  buildEffect(bytes, options)
  {
    return CjsWebglFormat.buildEffect(bytes, { ...options,
      localLights: "packed-texture", textureUnitBudget: 16,
      emitterOptions: { lightPackedTexture: { dataTexelBase: 2097152 }, packedLightProfiles: false, depthRange: "forward", clipYFlip: true } });
  }
};

/**
 * One acquired device backend on one canvas: its abstraction layer, the canvas
 * destination the scene driver draws into, and the effect policy that matches it.
 */
export class CjsBrowserBackend
{
  static className = "CjsBrowserBackend";

  /** "webgpu" or "webgl2", as CjsLibrary.AttachTrinity names it. */
  name = null;

  /** The abstraction layer to attach. */
  al = null;

  /** The canvas this backend draws to. */
  canvas = null;

  /** Whether block-compressed (BC) textures upload without decoding. */
  compressed = false;

  /** WebGPU: the device boundary. Null on WebGL2. */
  webgpu = null;

  /** The canvas destination: CjsWebgpuRenderTarget, or a Tr2RenderTarget over WebGL2's back buffer. */
  renderTarget = null;

  /** WebGL2: the step that runs the driver into the back buffer. Null on WebGPU. */
  _step = null;

  /** Set by Destroy. */
  _destroyed = false;

  /**
   * Acquires the first backend in `preference` the browser can provide.
   * Each WebGPU attempt acquires its device before it touches the canvas, so a
   * refused adapter or device still leaves the canvas free for WebGL2. Once a
   * canvas context is taken, failure rejects; it is never retried elsewhere.
   *
   * @param {object} options Start-up options.
   * @param {HTMLCanvasElement} options.canvas The canvas to draw to.
   * @param {string[]} [options.preference] Backends to try, in order.
   * @param {"opaque"|"premultiplied"} [options.alphaMode="opaque"] Canvas compositing.
   * @param {object} [options.webgpuDevice] A device request replacing the default one.
   * @returns {Promise<CjsBrowserBackend>} The acquired backend.
   * @throws {AggregateError} When no backend could be acquired, with each reason.
   */
  static async create({ canvas, preference = CjsBrowserBackendPreference, alphaMode = "opaque", webgpuDevice = null } = {})
  {
    if (!canvas) throw new TypeError("CjsBrowserBackend requires a canvas.");

    const reasons = [];

    for (const name of preference)
    {
      if (name === "webgpu")
      {
        const device = await RequestWebgpuDevice(webgpuDevice).catch(error => { reasons.push(error); return null; });
        if (device) return CjsBrowserBackend._createWebgpu(canvas, device, alphaMode);
      }
      else if (name === "webgl2")
      {
        const gl = canvas.getContext("webgl2", { alpha: alphaMode !== "opaque", antialias: false, depth: false, stencil: false });
        if (gl) return CjsBrowserBackend._createWebgl2(canvas, gl);
        reasons.push(new Error("WebGL2 unavailable"));
      }
      else throw new RangeError(`Unknown backend ${JSON.stringify(name)}; expected webgpu or webgl2.`);
    }

    throw new AggregateError(reasons, "No browser graphics backend could be acquired.");
  }

  /** Composes WebGPU on the canvas around an acquired device. */
  static _createWebgpu(canvas, { device, compressed }, alphaMode)
  {
    const backend = new CjsBrowserBackend();
    const context = canvas.getContext("webgpu");
    if (!context) throw new Error("The canvas has no WebGPU context.");

    backend.name = "webgpu";
    backend.canvas = canvas;
    backend.compressed = compressed;
    backend.webgpu = new CjsWebgpuDevice({ device, shaderStage: globalThis.GPUShaderStage });
    // Single-sampled: the space scene draws offscreen with its own anti-aliasing.
    backend.renderTarget = new CjsWebgpuRenderTarget(backend.webgpu, {
      canvas, context, format: globalThis.navigator.gpu.getPreferredCanvasFormat(),
      depthFormat: "depth24plus", sampleCount: 1, alphaMode
    }).Configure({ width: canvas.width, height: canvas.height });
    backend.al = new CjsWebgpuRenderContextAL({ webgpu: backend.webgpu, renderTarget: backend.renderTarget });
    backend.al.CreateDevice();
    return backend;
  }

  /** Composes WebGL2 on the canvas's context; its AL owns the default back buffer. */
  static _createWebgl2(canvas, gl)
  {
    if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("Content HDR targets require EXT_color_buffer_float");
    gl.getExtension("OES_texture_float_linear");

    const backend = new CjsBrowserBackend();
    backend.name = "webgl2";
    backend.canvas = canvas;
    backend.compressed = gl.getSupportedExtensions().includes("EXT_texture_compression_bptc");
    backend.al = new Tr2RenderContextALWebgl2({ gl });
    backend.renderTarget = new Tr2RenderTarget();
    backend._step = new Tr2StepExecuteRenderNode();
    backend._step.destinationTarget = backend.renderTarget;
    backend._step.clearTargetOnFailure = false;
    if (Failed(backend.al.CreateDevice({ mode: { width: canvas.width, height: canvas.height } })))
      throw new Error("WebGL2 device creation failed");
    backend.renderTarget.Attach(backend.al.GetDefaultBackBuffer(), backend.al);
    return backend;
  }

  /**
   * The CjsLibrary `effects` configuration this backend draws: shipped dx11
   * containers translated for it as they load.
   *
   * @param {string} [shaderModel="depth"] The shader model `/effect/` paths resolve to.
   * @returns {object} The configuration's `effects` section.
   */
  GetEffectConfiguration(shaderModel = "depth")
  {
    return this.name === "webgpu"
      ? { source: "dx11", target: "webgpu", translator: CjsWebgpuFormat, shaderModel }
      : { source: "dx11", target: "webgl", translator: webgl2Translator, shaderModel, permutations: "onDemand" };
  }

  /**
   * Resizes the canvas back buffer.
   *
   * @param {number} width Width in device pixels.
   * @param {number} height Height in device pixels.
   */
  Resize(width, height)
  {
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.name === "webgpu")
    {
      this.renderTarget.Configure({ width, height });
      return;
    }
    if (Failed(this.al.SetPresentParameters({ mode: { width, height } }))) throw new Error("WebGL2 resize failed");
    this.renderTarget.Attach(this.al.GetDefaultBackBuffer(), this.al);
  }

  /**
   * Draws a scene driver into the canvas. Runs inside the device's render job.
   *
   * @param {object} driver The scene render driver (EveSpaceSceneRenderDriver).
   * @param {bigint|number} realTime Blue real time.
   * @param {bigint|number} simTime Blue simulation time.
   * @param {object} renderContext The Trinity render context.
   */
  Render(driver, realTime, simTime, renderContext)
  {
    const backBuffer = this.name === "webgpu" ? this.renderTarget : this.al.GetDefaultBackBuffer();
    this.al.SetRenderTarget(0, backBuffer);
    // The canvas owns its depth attachment.
    this.al.SetDepthStencil(null);
    if (this.name === "webgpu") driver.Execute([ this.renderTarget ], null, realTime, simTime, null, renderContext);
    else
    {
      this._step.node = driver;
      this._step.Execute(realTime, simTime, renderContext);
    }
    this.al.SetRenderTarget(0, backBuffer);
    this.al.SetDepthStencil(null);
  }

  /** Releases the abstraction layer and, on WebGPU, the device and canvas configuration. */
  Destroy()
  {
    if (this._destroyed) return;
    this._destroyed = true;
    this.al.Destroy();
    if (this.name === "webgpu")
    {
      this.renderTarget.Destruct();
      this.webgpu.Destruct();
    }
  }
}

/**
 * Requests a WebGPU device with what EVE content uses where the adapter has it:
 * BC textures (2D and sliced 3D), filterable and blendable 32-bit float,
 * unclipped depth for shadow cascades (EveSpaceScene.cpp:748), read-write float
 * storage, sixteen storage textures per stage, 16384-wide textures for the
 * shadow atlas (Tr2ShadowMap.h:14) and buffers up to `webgpuMaxBufferSize`.
 *
 * @param {object|null} request A device request replacing this default.
 * @returns {Promise<{device: GPUDevice, compressed: boolean}>} The device.
 */
async function RequestWebgpuDevice(request)
{
  const adapter = await globalThis.navigator?.gpu?.requestAdapter();
  if (!adapter) throw new Error("no WebGPU adapter");

  const compressed = adapter.features.has("texture-compression-bc");
  const wanted = [
    compressed && "texture-compression-bc",
    compressed && "texture-compression-bc-sliced-3d",
    "float32-filterable", "float32-blendable", "depth-clip-control", "texture-formats-tier2"
  ];
  const requiredFeatures = wanted.filter(feature => feature && adapter.features.has(feature));
  const descriptor = request ?? {
    requiredFeatures,
    requiredLimits: {
      maxStorageTexturesPerShaderStage: Math.min(16, adapter.limits.maxStorageTexturesPerShaderStage),
      maxTextureDimension2D: Math.min(16384, adapter.limits.maxTextureDimension2D),
      maxBufferSize: Math.min(Tr2PlatformInfo.webgpuMaxBufferSize, adapter.limits.maxBufferSize)
    }
  };

  return { device: await adapter.requestDevice(descriptor), compressed };
}
