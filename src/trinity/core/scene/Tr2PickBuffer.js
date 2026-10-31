// Source: trinity/trinity/Tr2PickBuffer.h
// Source: trinity/trinity/Tr2PickBuffer.cpp
import { CjsSchema, meta, type } from "#schema";
import { Tr2TextureAL, Tr2BitmapDimensions, Tr2TextureSubresource, Failed, ALResult } from "#trinityal";
import { PixelFormat, Tr2GpuUsage, Tr2CpuUsage } from "#consts/render-context";
import { TriDevice } from "../device/TriDevice.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";

/** Native picking attachments and their explicit device-resource lifetime. */
export class Tr2PickBuffer
{
  // Fields in Carbon's member order (Tr2PickBuffer.h:51-57).

  /** Carbon `int m_size`, the constructor's `size = 1` (Tr2PickBuffer.h:14, :51). */
  _size = 1;

  /**
   * Carbon `m_format`, the constructor's `format = PIXEL_FORMAT_UNKNOWN`
   * (Tr2PickBuffer.h:14, :52).
   */
  _format = PixelFormat.PIXEL_FORMAT_UNKNOWN;

  /** Carbon `m_clearColor( 0xFFFFFFFF )` (Tr2PickBuffer.cpp:13). */
  _clearColor = 0xffffffff;

  /** Carbon `Tr2TextureAL m_pickTarget`, by value (Tr2PickBuffer.h:56). */
  _pickTarget = new Tr2TextureAL();

  /** Carbon `Tr2TextureAL m_depthBuffer`, by value (Tr2PickBuffer.h:57). */
  _depthBuffer = new Tr2TextureAL();

  /** The native lock object is unnecessary in JavaScript. */
  constructor(format = PixelFormat.PIXEL_FORMAT_UNKNOWN, size = 1)
  {
    this._format = format;
    this._size = size;
    TriDevice.RegisterResource(this);
  }

  /**
   * Drops attachments so the next prepare uses the requested dimensions.
   *
   * @implemented
   */
  SetSize(size)
  {
    this.ReleaseResources();
    this._size = size;
  }

  /**
   * Authored buffer size, prior to the native minimum-one clamp.
   *
   * @implemented
   */
  GetSize()
  {
    return this._size;
  }

  /**
   * Native development resource description.
   *
   * @adapted
   */
  GetDescription()
  {
    return "Tr2PickBuffer";
  }

  /**
   * Native packed ARGB clear value.
   *
   * @implemented
   */
  SetClearColor(value)
  {
    this._clearColor = value >>> 0;
  }

  /**
   * Releases both owned attachment values.
   *
   * @adapted
   */
  ReleaseResources()
  {
    this._pickTarget.Destroy();
    this._depthBuffer.Destroy();
  }

  /**
   * Explicit resource preparation replaces the absent native base-class drive.
   *
   * @adapted
   */
  PrepareResources(context = Tr2RenderContext_GetMainThreadRenderContext())
  {
    return this._pickTarget.IsValid() && this._depthBuffer.IsValid() || this.OnPrepareResources(context);
  }

  /**
   * Native render target with frequent CPU reads and a D24S8 depth attachment.
   *
   * @adapted
   */
  OnPrepareResources(context = Tr2RenderContext_GetMainThreadRenderContext())
  {
    const size = Math.max(this._size, 1);
    if (Failed(this._pickTarget.Create__GpuUsageCpuUsage(Tr2BitmapDimensions.create__WidthHeightMipCountFormat(size, size, 1, this._format),
      Tr2GpuUsage.RENDER_TARGET, Tr2CpuUsage.READ_OFTEN, context))) return false;
    return !Failed(this._depthBuffer.Create__GpuUsage(Tr2BitmapDimensions.create__WidthHeightMipCountFormat(size, size, 1, PixelFormat.PIXEL_FORMAT_D24_UNORM_S8_UINT),
      Tr2GpuUsage.DEPTH_STENCIL, context));
  }

  /**
   * Binds, clears and selects the full pick-target viewport.
   *
   * @adapted
   */
  BeginRendering(initialDepth, context)
  {
    if (!this._pickTarget.IsValid() || !this._depthBuffer.IsValid()) return false;
    const esm = context.GetEffectStateManager();
    esm.PushRenderTarget__TextureAL(this._pickTarget);
    esm.PushDepthStencilBuffer__TextureAL(this._depthBuffer);
    if (Failed(context.Clear({ clearColor: true, clearDepth: true, color: this._clearColor, depth: initialDepth })))
    {
      this.EndRendering(context);
      return false;
    }
    esm.SetFullScreenViewport();
    return true;
  }

  /**
   * Restores the caller's attachment stack.
   *
   * @implemented
   */
  EndRendering(context)
  {
    const esm = context.GetEffectStateManager();
    esm.PopDepthStencilBuffer();
    esm.PopRenderTarget();
    return true;
  }

  /**
   * WebGPU's mapping is awaitable; callers submit before reaching this method.
   *
   * @adapted
   */
  async MapForReading(context)
  {
    const readback = this.CreateReadback(context);
    try
    {
      const mapped = await readback.Map(context);
      return { ...mapped, data: mapped.data ? mapped.data.slice() : null };
    }
    finally { readback.Destruct(); }
  }

  /** JS submission snapshot for polling without starting an awaited map. */
  CreateReadback(context)
  {
    return this._pickTarget.CreateReadback(Tr2TextureSubresource.create__MipLevel(0), context);
  }

  /**
   * Completes the native borrowed-map lifetime.
   *
   * @implemented
   */
  UnmapForReading(context)
  {
    if (this._pickTarget.IsValid()) this._pickTarget.UnmapForReading(context);
  }

  /**
   * Replaces the native destructor and base-class unregistration.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   *
   * @adapted
   */
  Destruct()
  {
    this.ReleaseResources();
    TriDevice.UnregisterResource(this);
  }
}

CjsSchema.decorateField(Tr2PickBuffer, "_size", type.int32);
CjsSchema.decorateField(Tr2PickBuffer, "_format", type.uint32);
CjsSchema.decorateField(Tr2PickBuffer, "_clearColor", type.uint32);
CjsSchema.decorateField(Tr2PickBuffer, "_pickTarget", type.rawStruct("Tr2TextureAL"));
CjsSchema.decorateField(Tr2PickBuffer, "_depthBuffer", type.rawStruct("Tr2TextureAL"));
CjsSchema.decorateMethod(Tr2PickBuffer, "SetSize", meta.implemented);
CjsSchema.decorateMethod(Tr2PickBuffer, "GetSize", meta.implemented);
CjsSchema.decorateMethod(Tr2PickBuffer, "GetDescription", meta.adapted);
CjsSchema.decorateMethod(Tr2PickBuffer, "SetClearColor", meta.implemented);
CjsSchema.decorateMethod(Tr2PickBuffer, "ReleaseResources", meta.adapted);
CjsSchema.decorateMethod(Tr2PickBuffer, "PrepareResources", meta.adapted);
CjsSchema.decorateMethod(Tr2PickBuffer, "OnPrepareResources", meta.adapted);
CjsSchema.decorateMethod(Tr2PickBuffer, "BeginRendering", meta.adapted);
CjsSchema.decorateMethod(Tr2PickBuffer, "EndRendering", meta.implemented);
CjsSchema.decorateMethod(Tr2PickBuffer, "MapForReading", meta.adapted);
CjsSchema.decorateMethod(Tr2PickBuffer, "UnmapForReading", meta.implemented);
CjsSchema.decorateMethod(Tr2PickBuffer, "Destruct", meta.adapted);
CjsSchema.meta.carbon("Tr2PickBuffer")(Tr2PickBuffer);

CjsSchema.decorateMethod(Tr2PickBuffer, "SetSize");
CjsSchema.decorateMethod(Tr2PickBuffer, "GetSize");
CjsSchema.decorateMethod(Tr2PickBuffer, "GetDescription");
CjsSchema.decorateMethod(Tr2PickBuffer, "SetClearColor");
CjsSchema.decorateMethod(Tr2PickBuffer, "ReleaseResources");
CjsSchema.decorateMethod(Tr2PickBuffer, "PrepareResources");
CjsSchema.decorateMethod(Tr2PickBuffer, "OnPrepareResources");
CjsSchema.decorateMethod(Tr2PickBuffer, "BeginRendering");
CjsSchema.decorateMethod(Tr2PickBuffer, "EndRendering");
CjsSchema.decorateMethod(Tr2PickBuffer, "MapForReading");
CjsSchema.decorateMethod(Tr2PickBuffer, "UnmapForReading");
