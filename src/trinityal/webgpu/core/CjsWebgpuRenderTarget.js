// Attachment and target ownership for the WebGPU backend.
//
// Carbon's target model is a render context that owns its swap chain and
// depth-stencil surface. WebGPU's is a render-pass descriptor with FIXED
// attachments, decided before the pass opens and unchangeable inside it, so
// there is nothing to port line for line - the divergence table already records
// this as one of the places the two backends legitimately differ in
// implementation while agreeing on the frame progression.
//
// What this owns: canvas configuration, the depth attachment, the multisample
// attachment, and their size. What it deliberately does not own: when a frame
// happens, which passes exist, or what is drawn. Those belong to the executor
// and to Trinity's steps.
//
// THREE THINGS THAT MUST FAIL LOUDLY, because each is silent otherwise.
//
// 1. A canvas texture view is valid for ONE frame. WebGPU replaces the texture
//    behind `getCurrentTexture()` at presentation, so a view cached across
//    frames refers to a texture that is gone. Reusing one is rejected here
//    rather than surfacing as a validation error from a pass whose descriptor
//    looks correct.
// 2. Depth and colour attachments must agree on size and sample count exactly.
//    A stale depth attachment after a resize is the classic version of this,
//    and beginRenderPass reports it far from the resize that caused it.
// 3. Everything is bound to a device generation. After device loss the context
//    must be reconfigured and every attachment recreated; an attachment from
//    the previous device is not repairable.
//
// PRESENTATION IS NOT A CALL. Carbon presents the previous frame at the top of
// the next tick through Tr2RenderContextAL::Present. WebGPU has no present:
// the browser presents a configured canvas after the queue submission that drew
// into its current texture. So the engine-side tick wrapper has a Present step
// for WebGL and genuinely nothing to do here, and that asymmetry is expected
// rather than a missing port.

import { CjsWebgpuDevice } from "../CjsWebgpuDevice.js";

function fail(message)
{
  const error = new Error(`CjsWebgpuRenderTarget: ${message}`);
  error.code = "CJS_WEBGPU_RENDER_TARGET_INVALID";
  throw error;
}


function positiveSize(value, name)
{
  if (!Number.isInteger(value) || value < 1)
  {
    fail(`${name} must be a positive integer`);
  }
  return value;
}


/** Owns a WebGPU presentation surface and its per-frame attachments. */
export class CjsWebgpuRenderTarget
{
  _webgpu;

  _canvas = null;

  _context = null;

  _format = null;

  _alphaMode = "opaque";

  _extraUsage = 0;

  _sampleCount = 1;

  _depthFormat = null;

  _width = 0;

  _height = 0;

  _generation = 0;

  _depth = null;

  _multisample = null;

  _frame = null;

  _destroyed = false;

  /**
   * @param {CjsWebgpuDevice} webgpu Canonical WebGPU device.
   * @param {object} options Target options.
   * @param {object} options.canvas Canvas or OffscreenCanvas to present to.
   * @param {object} [options.context] Pre-acquired WebGPU canvas context.
   * @param {string} [options.format] Presentation format; defaults to the
   *   browser's preferred canvas format.
   * @param {string} [options.alphaMode="opaque"] Canvas alpha mode.
   * @param {number} [options.sampleCount=1] Multisample count.
   * @param {string} [options.depthFormat] Depth attachment format, or omitted
   *   for a colour-only target.
   * @param {object} [options.textureUsage] GPUTextureUsage constants.
   * @param {object} [options.gpu] `navigator.gpu`-like object, for the
   *   preferred canvas format.
   * @param {number} [options.extraUsage] Extra `GPUTextureUsage` bits for the
   *   surface - `COPY_SRC` when the frame has to be read back and counted.
   */
  constructor(webgpu, options = {})
  {
    if (!(webgpu instanceof CjsWebgpuDevice))
    {
      fail("webgpu boundary must be a CjsWebgpuDevice");
    }
    this._webgpu = webgpu;
    this._canvas = options.canvas ?? null;
    this._context = options.context ?? null;

    if (!this._context && !this._canvas) fail("a canvas or a context is required");

    this._textureUsage = options.textureUsage || globalThis.GPUTextureUsage || null;
    this._gpu = options.gpu ?? globalThis.navigator?.gpu ?? null;
    this._alphaMode = options.alphaMode ?? "opaque";
    this._sampleCount = options.sampleCount ?? 1;
    this._depthFormat = options.depthFormat ?? null;
    this._format = options.format ?? null;
    this._extraUsage = options.extraUsage ?? 0;
  }

  /** The presentation format the canvas is configured with. */
  GetFormat()
  {
    return this._format;
  }

  /**
   * The depth attachment's format, or null when there is no depth.
   *
   * The field existed from the start and nothing could read it, so the value
   * reached a pipeline only by being passed separately into the batch
   * resolver's constructor. A pipeline description assembled from bound state
   * has no constructor to receive it, and asking the target that owns it is
   * both shorter and impossible to disagree with.
   *
   * @returns {string|null} A `GPUTextureFormat`, or null.
   */
  GetDepthFormat()
  {
    return this._depthFormat;
  }

  /** The current attachment size. */
  GetSize()
  {
    return { width: this._width, height: this._height };
  }

  // CARBON'S TEXTURE ACCESSORS, so this can BE a bound render target rather
  // than needing an adapter to become one. `Tr2TextureAL` answers `GetWidth`
  // and `GetHeight`, and the abstraction layer resets the viewport from
  // whatever is bound at slot zero by asking exactly those two questions
  // (`Tr2RenderContextMetal.mm:762-766`). Without them a target has to be
  // wrapped at every call site, and the first one that forgets gets a viewport
  // left at the previous pass's size - the 2048 shadow-map defect.

  /** The bound width, as `Tr2TextureAL::GetWidth` answers it. @returns {number} */
  GetWidth()
  {
    return this._width;
  }

  /** The bound height, as `Tr2TextureAL::GetHeight` answers it. @returns {number} */
  GetHeight()
  {
    return this._height;
  }

  /** The multisample count every attachment is created with. */
  GetSampleCount()
  {
    return this._sampleCount;
  }

  /**
   * Configures the canvas context and sizes every attachment.
   *
   * Idempotent for an unchanged size, format and device generation, so a caller
   * may invoke it each frame without recreating anything. A generation change
   * reconfigures unconditionally, because the previous device's configuration
   * does not carry over.
   */
  Configure(options = {})
  {
    this._AssertLive();

    const width = positiveSize(options.width ?? this._width, "width");
    const height = positiveSize(options.height ?? this._height, "height");
    const generation = this._webgpu.GetGeneration();
    const device = this._webgpu.GetDevice();

    if (!this._context)
    {
      this._context = this._canvas?.getContext?.("webgpu") ?? null;
      if (!this._context) fail("the canvas does not provide a webgpu context");
    }

    if (!this._format)
    {
      this._format = options.format
        ?? this._gpu?.getPreferredCanvasFormat?.()
        ?? fail("a presentation format is required when the browser reports no preferred one");
    }

    const changed = generation !== this._generation
      || width !== this._width
      || height !== this._height;

    if (!changed) return this;

    // The canvas backing store drives the surface size, so it is set before the
    // context is configured rather than after.
    if (this._canvas)
    {
      this._canvas.width = width;
      this._canvas.height = height;
    }

    const usage = this._RequireUsage();

    // EXTRA USAGE IS THE CALLER'S TO ASK FOR, because the surface is theirs to
    // read. A frame that has to be counted back needs COPY_SRC, and hardcoding
    // RENDER_ATTACHMENT alone silently makes that impossible - the readback
    // fails at copy time, long after the configure that caused it. Defaults to
    // nothing extra, so nobody pays for a capability they did not ask for.
    this._context.configure({
      device,
      format: this._format,
      alphaMode: this._alphaMode,
      usage: usage.RENDER_ATTACHMENT | (this._extraUsage ?? 0)
    });

    this._width = width;
    this._height = height;
    this._generation = generation;
    this._ReleaseAttachments();
    this._CreateAttachments(device, usage);
    this._frame = null;

    return this;
  }

  /**
   * Acquires this frame's colour texture view and the matching attachments.
   *
   * A new frame invalidates the previous one. The returned record is the only
   * legal source of a view for the frame it belongs to.
   */
  AcquireFrame()
  {
    this._AssertLive();
    if (!this._context || !this._width) fail("Configure must run before a frame is acquired");
    if (this._generation !== this._webgpu.GetGeneration())
    {
      fail("the device generation changed; Configure must run again before acquiring a frame");
    }

    const texture = this._context.getCurrentTexture();
    if (!texture) fail("the canvas context returned no current texture");

    if (this._frame) this._frame.valid = false;

    const view = texture.createView();
    this._frame = {
      valid: true,
      generation: this._generation,
      // With multisampling the pass renders into the multisample attachment and
      // resolves into the canvas; without it the canvas is the render target.
      colorView: this._multisample ? this._multisample.view : view,
      resolveView: this._multisample ? view : null,
      depthView: this._depth ? this._depth.view : null
    };

    return { ...this._frame };
  }

  /**
   * Builds a render-pass descriptor for an acquired frame.
   *
   * `clearColor` omitted means the colour attachment LOADS rather than clears,
   * which is how a second pass over the same target composites. The divergence
   * decision prefers attachment load operations to an explicit clear operation,
   * so clearing is expressed here and never as a separate draw.
   */
  CreateRenderPassDescriptor(frame, options = {})
  {
    this._AssertLive();
    this._AssertFrame(frame);

    const clearColor = options.clearColor ?? null;
    const colorAttachment = {
      view: frame.colorView,
      loadOp: clearColor ? "clear" : "load",
      storeOp: "store"
    };
    if (clearColor) colorAttachment.clearValue = clearColor;
    if (frame.resolveView) colorAttachment.resolveTarget = frame.resolveView;

    const descriptor = {
      label: options.label,
      colorAttachments: [ colorAttachment ]
    };

    if (frame.depthView)
    {
      const clearDepth = options.clearDepth;
      descriptor.depthStencilAttachment = {
        view: frame.depthView,
        depthLoadOp: clearDepth === undefined ? "load" : "clear",
        depthStoreOp: options.discardDepth ? "discard" : "store",
        ...(clearDepth === undefined ? {} : { depthClearValue: clearDepth })
      };
    }
    else if (options.clearDepth !== undefined)
    {
      fail("clearDepth was given but this target has no depth attachment");
    }

    return descriptor;
  }

  /**
   * Applies viewport and scissor to an open pass.
   *
   * Both default to the whole target. WebGPU treats these as encoder state
   * inside a pass rather than as context state, so they are applied per pass
   * and never persist across one.
   */
  ApplyViewport(pass, options = {})
  {
    this._AssertLive();
    if (typeof pass?.setViewport !== "function") fail("a GPURenderPassEncoder is required");

    const viewport = options.viewport ?? null;
    const scissor = options.scissor ?? null;

    if (viewport)
    {
      this._AssertInside(viewport, "viewport");
      pass.setViewport(
        viewport.x, viewport.y, viewport.width, viewport.height,
        viewport.minDepth ?? 0, viewport.maxDepth ?? 1
      );
    }
    else
    {
      pass.setViewport(0, 0, this._width, this._height, 0, 1);
    }

    if (typeof pass.setScissorRect !== "function") return this;

    if (scissor)
    {
      this._AssertInside(scissor, "scissor");
      pass.setScissorRect(scissor.x, scissor.y, scissor.width, scissor.height);
    }
    else
    {
      pass.setScissorRect(0, 0, this._width, this._height);
    }

    return this;
  }

  /** Releases every attachment this target created. The canvas is the caller's. */
  Destroy()
  {
    if (this._destroyed) return this;
    this._destroyed = true;
    if (this._frame) this._frame.valid = false;
    this._frame = null;
    this._ReleaseAttachments();
    // Unconfiguring returns the surface; the canvas element itself is not ours
    // to remove, and a caller may configure a new target against it.
    this._context?.unconfigure?.();
    return this;
  }

  /** Creates owned multisample and depth attachments for the current size. */
  _CreateAttachments(device, usage)
  {
    if (this._sampleCount > 1)
    {
      const texture = device.createTexture({
        label: "CjsWebgpuRenderTarget.multisample",
        size: { width: this._width, height: this._height, depthOrArrayLayers: 1 },
        sampleCount: this._sampleCount,
        format: this._format,
        usage: usage.RENDER_ATTACHMENT
      });
      this._multisample = { texture, view: texture.createView() };
    }

    if (this._depthFormat)
    {
      // Same size and sample count as the colour attachment, which is what
      // beginRenderPass validates and what a stale depth texture violates.
      const texture = device.createTexture({
        label: "CjsWebgpuRenderTarget.depth",
        size: { width: this._width, height: this._height, depthOrArrayLayers: 1 },
        sampleCount: this._sampleCount,
        format: this._depthFormat,
        usage: usage.RENDER_ATTACHMENT
      });
      this._depth = { texture, view: texture.createView() };
    }
  }

  /** Destroys and forgets every owned attachment. */
  _ReleaseAttachments()
  {
    this._depth?.texture?.destroy?.();
    this._multisample?.texture?.destroy?.();
    this._depth = null;
    this._multisample = null;
  }

  /** Gets the validated texture-usage vocabulary supplied by the host. */
  _RequireUsage()
  {
    const usage = this._textureUsage;
    if (!usage || !Number.isInteger(usage.RENDER_ATTACHMENT))
    {
      fail("the GPUTextureUsage RENDER_ATTACHMENT constant is required");
    }
    return usage;
  }

  /** Throws when this target has already been destroyed. */
  _AssertLive()
  {
    if (this._destroyed) fail("the render target is destroyed");
  }

  // Ordered so the message names the actual problem. A frame invalidated by a
  // later acquire, a resize or a device loss is STALE, and saying "no frame" of
  // one the caller is holding sends them looking in the wrong place.
  /** Validates that a frame belongs to the target's current generation. */
  _AssertFrame(frame)
  {
    if (!frame || typeof frame !== "object") fail("a frame acquired from this target is required");
    if (!this._frame || !this._frame.valid
      || frame.generation !== this._generation
      || frame.colorView !== this._frame.colorView)
    {
      fail("the frame is stale; a canvas texture view is valid for one frame only");
    }
  }

  /** Validates that one viewport or scissor rectangle lies inside the target. */
  _AssertInside(rect, name)
  {
    const values = [ rect.x, rect.y, rect.width, rect.height ];
    if (values.some((value) => !Number.isFinite(value) || value < 0))
    {
      fail(`${name} must have non-negative finite bounds`);
    }
    if (rect.x + rect.width > this._width || rect.y + rect.height > this._height)
    {
      fail(`${name} exceeds the ${this._width}x${this._height} target`);
    }
  }
}
