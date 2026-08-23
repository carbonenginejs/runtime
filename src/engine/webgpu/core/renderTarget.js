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
  #webgpu;

  #canvas = null;

  #context = null;

  #format = null;

  #alphaMode = "opaque";

  #sampleCount = 1;

  #depthFormat = null;

  #width = 0;

  #height = 0;

  #generation = 0;

  #depth = null;

  #multisample = null;

  #frame = null;

  #destroyed = false;

  /**
   * @param {object} webgpu CjsWebgpuDevice-compatible boundary.
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
   */
  constructor(webgpu, options = {})
  {
    for (const method of [ "GetDevice", "GetGeneration" ])
    {
      if (typeof webgpu?.[method] !== "function") fail(`webgpu boundary requires ${method}`);
    }
    this.#webgpu = webgpu;
    this.#canvas = options.canvas ?? null;
    this.#context = options.context ?? null;

    if (!this.#context && !this.#canvas) fail("a canvas or a context is required");

    this._textureUsage = options.textureUsage || globalThis.GPUTextureUsage || null;
    this._gpu = options.gpu ?? globalThis.navigator?.gpu ?? null;
    this.#alphaMode = options.alphaMode ?? "opaque";
    this.#sampleCount = options.sampleCount ?? 1;
    this.#depthFormat = options.depthFormat ?? null;
    this.#format = options.format ?? null;
  }

  /** The presentation format the canvas is configured with. */
  GetFormat()
  {
    return this.#format;
  }

  /** The current attachment size. */
  GetSize()
  {
    return Object.freeze({ width: this.#width, height: this.#height });
  }

  /** The multisample count every attachment is created with. */
  GetSampleCount()
  {
    return this.#sampleCount;
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
    this.#AssertLive();

    const width = positiveSize(options.width ?? this.#width, "width");
    const height = positiveSize(options.height ?? this.#height, "height");
    const generation = this.#webgpu.GetGeneration();
    const device = this.#webgpu.GetDevice();

    if (!this.#context)
    {
      this.#context = this.#canvas?.getContext?.("webgpu") ?? null;
      if (!this.#context) fail("the canvas does not provide a webgpu context");
    }

    if (!this.#format)
    {
      this.#format = options.format
        ?? this._gpu?.getPreferredCanvasFormat?.()
        ?? fail("a presentation format is required when the browser reports no preferred one");
    }

    const changed = generation !== this.#generation
      || width !== this.#width
      || height !== this.#height;

    if (!changed) return this;

    // The canvas backing store drives the surface size, so it is set before the
    // context is configured rather than after.
    if (this.#canvas)
    {
      this.#canvas.width = width;
      this.#canvas.height = height;
    }

    const usage = this.#RequireUsage();
    this.#context.configure({
      device,
      format: this.#format,
      alphaMode: this.#alphaMode,
      usage: usage.RENDER_ATTACHMENT
    });

    this.#width = width;
    this.#height = height;
    this.#generation = generation;
    this.#ReleaseAttachments();
    this.#CreateAttachments(device, usage);
    this.#frame = null;

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
    this.#AssertLive();
    if (!this.#context || !this.#width) fail("Configure must run before a frame is acquired");
    if (this.#generation !== this.#webgpu.GetGeneration())
    {
      fail("the device generation changed; Configure must run again before acquiring a frame");
    }

    const texture = this.#context.getCurrentTexture();
    if (!texture) fail("the canvas context returned no current texture");

    if (this.#frame) this.#frame.valid = false;

    const view = texture.createView();
    this.#frame = {
      valid: true,
      generation: this.#generation,
      // With multisampling the pass renders into the multisample attachment and
      // resolves into the canvas; without it the canvas is the render target.
      colorView: this.#multisample ? this.#multisample.view : view,
      resolveView: this.#multisample ? view : null,
      depthView: this.#depth ? this.#depth.view : null
    };

    return Object.freeze({ ...this.#frame });
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
    this.#AssertLive();
    this.#AssertFrame(frame);

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
    this.#AssertLive();
    if (typeof pass?.setViewport !== "function") fail("a GPURenderPassEncoder is required");

    const viewport = options.viewport ?? null;
    const scissor = options.scissor ?? null;

    if (viewport)
    {
      this.#AssertInside(viewport, "viewport");
      pass.setViewport(
        viewport.x, viewport.y, viewport.width, viewport.height,
        viewport.minDepth ?? 0, viewport.maxDepth ?? 1
      );
    }
    else
    {
      pass.setViewport(0, 0, this.#width, this.#height, 0, 1);
    }

    if (typeof pass.setScissorRect !== "function") return this;

    if (scissor)
    {
      this.#AssertInside(scissor, "scissor");
      pass.setScissorRect(scissor.x, scissor.y, scissor.width, scissor.height);
    }
    else
    {
      pass.setScissorRect(0, 0, this.#width, this.#height);
    }

    return this;
  }

  /** Releases every attachment this target created. The canvas is the caller's. */
  Destroy()
  {
    if (this.#destroyed) return this;
    this.#destroyed = true;
    if (this.#frame) this.#frame.valid = false;
    this.#frame = null;
    this.#ReleaseAttachments();
    // Unconfiguring returns the surface; the canvas element itself is not ours
    // to remove, and a caller may configure a new target against it.
    this.#context?.unconfigure?.();
    return this;
  }

  /** Creates owned multisample and depth attachments for the current size. */
  #CreateAttachments(device, usage)
  {
    if (this.#sampleCount > 1)
    {
      const texture = device.createTexture({
        label: "CjsWebgpuRenderTarget.multisample",
        size: { width: this.#width, height: this.#height, depthOrArrayLayers: 1 },
        sampleCount: this.#sampleCount,
        format: this.#format,
        usage: usage.RENDER_ATTACHMENT
      });
      this.#multisample = { texture, view: texture.createView() };
    }

    if (this.#depthFormat)
    {
      // Same size and sample count as the colour attachment, which is what
      // beginRenderPass validates and what a stale depth texture violates.
      const texture = device.createTexture({
        label: "CjsWebgpuRenderTarget.depth",
        size: { width: this.#width, height: this.#height, depthOrArrayLayers: 1 },
        sampleCount: this.#sampleCount,
        format: this.#depthFormat,
        usage: usage.RENDER_ATTACHMENT
      });
      this.#depth = { texture, view: texture.createView() };
    }
  }

  /** Destroys and forgets every owned attachment. */
  #ReleaseAttachments()
  {
    this.#depth?.texture?.destroy?.();
    this.#multisample?.texture?.destroy?.();
    this.#depth = null;
    this.#multisample = null;
  }

  /** Gets the validated texture-usage vocabulary supplied by the host. */
  #RequireUsage()
  {
    const usage = this._textureUsage;
    if (!usage || !Number.isInteger(usage.RENDER_ATTACHMENT))
    {
      fail("the GPUTextureUsage RENDER_ATTACHMENT constant is required");
    }
    return usage;
  }

  /** Throws when this target has already been destroyed. */
  #AssertLive()
  {
    if (this.#destroyed) fail("the render target is destroyed");
  }

  // Ordered so the message names the actual problem. A frame invalidated by a
  // later acquire, a resize or a device loss is STALE, and saying "no frame" of
  // one the caller is holding sends them looking in the wrong place.
  /** Validates that a frame belongs to the target's current generation. */
  #AssertFrame(frame)
  {
    if (!frame || typeof frame !== "object") fail("a frame acquired from this target is required");
    if (!this.#frame || !this.#frame.valid
      || frame.generation !== this.#generation
      || frame.colorView !== this.#frame.colorView)
    {
      fail("the frame is stale; a canvas texture view is valid for one frame only");
    }
  }

  /** Validates that one viewport or scissor rectangle lies inside the target. */
  #AssertInside(rect, name)
  {
    const values = [ rect.x, rect.y, rect.width, rect.height ];
    if (values.some((value) => !Number.isFinite(value) || value < 0))
    {
      fail(`${name} must have non-negative finite bounds`);
    }
    if (rect.x + rect.width > this.#width || rect.y + rect.height > this.#height)
    {
      fail(`${name} exceeds the ${this.#width}x${this.#height} target`);
    }
  }
}
