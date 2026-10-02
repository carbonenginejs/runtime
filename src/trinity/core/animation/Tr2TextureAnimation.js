import { IInitialize } from "../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Tr2TextureAnimation.h
// Source: trinity/trinity/Tr2TextureAnimation.cpp
import * as CcpLog from "../../../global/logging/ccpLog.js";
import { meta } from "#schema";
import { blue } from "#blue";
import { BitmapDimensions } from "#imageio";
import { GetBytesPerPixel, PixelFormat, PixelFormatFromCanonical, TextureType, Tr2GpuUsage, Tr2CpuUsage } from "#consts/render-context";
import { CjsVtaFormat } from "../../../resource/formats/vta/CjsVtaFormat.js";
import { Tr2SubresourceData } from "../../../trinityal/Tr2HalHelperStructures/Tr2SubresourceData.js";
import { Tr2TextureSubresource } from "../../../trinityal/Tr2HalHelperStructures/Tr2TextureSubresource.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";

/** Advances a multi-channel texture flipbook, tracking frame and restart state per channel. */
@meta.define({ className: "Tr2TextureAnimation", family: "trinityCore" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class Tr2TextureAnimation
{
  _channels = new Map();

  _grids = [];

  _asyncState = null;

  _restartState = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  fps = 1;

  @meta.blue.read
  @meta.type.uint32
  frame = 0;

  @meta.blue.read
  @meta.type.float32
  time = 0;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  paused = false;

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  updateOnlyWhenRendered = true;

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  resPath = "";

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  looped = true;

  /**
   * Starts loading the authored VTA.
   *
   * Adapted: Schedules promise-based reads and decoding instead of native queues.
   * @returns {boolean} True; asynchronous failures are reported by the load task.
   */
  @meta.blue.method
  @meta.adapted
  Initialize()
  {
    this.ReadData();
    return true;
  }

  /**
   * Reloads after a notification, matching Carbon's unconditional reload hook.
   *
   * Adapted: Uses promise-based resource reads instead of a native worker queue.
   * @returns {boolean} True.
   */
  @meta.blue.method
  @meta.adapted
  OnModified()
  {
    this.ReadData();
    return true;
  }

  /**
   * Cancels the previous load, drops the grid textures and reads the current path.
   *
   * Adapted: The shared resource manager supplies bytes through its injected
   * sources; CjsVtaFormat streams decoded frames. No filesystem access is owned
   * here. Like Carbon's `m_grids.clear()` (Tr2TextureAnimation.cpp:258) the
   * textures are only released, never destroyed: a realized resource set may
   * still bind one, since the parameter invalidates only on an `animation` edit.
   * @returns {Promise<boolean>} Whether the initial frame decoded successfully.
   */
  @meta.blue.method
  @meta.adapted
  ReadData()
  {
    this._clear();
    if (!this.resPath)
    {
      return Promise.resolve(true);
    }
    this._asyncState = { cancel: false, bitmapsReady: false, bytes: null, decoder: null, frameData: null, pending: null, error: null };
    return this._queue(Tr2TextureAnimation.readFile);
  }

  /**
   * Captures the request's path and state, marking its decoded frame unavailable.
   *
   * Adapted: A JavaScript record replaces the native shared-state request object.
   * Carbon swaps `.vta` for `_lowdetail.vta` here when the LOD manager's low-res
   * VTA setting is on (Tr2TextureAnimation.cpp:286-291); that swap is not done,
   * because files are always fetched and never limited to a local low-detail install.
   * @returns {object} Request record.
   */
  @meta.blue.method
  @meta.adapted
  MakeRequest()
  {
    this._asyncState.bitmapsReady = false;
    return { filename: this.resPath, state: this._asyncState };
  }

  /**
   * Realizes frame zero and advances at most one ready frame per call.
   *
   * Adapted: Uses the ambient render context and asynchronous format iterator.
   * The strict time > 1 threshold, remainder, pause and restart ordering match
   * Carbon. Texture identity stays stable across frame uploads.
   * @param {number} dt Elapsed seconds.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  AdvanceTime(dt)
  {
    const state = this._asyncState;
    if (!state)
    {
      return;
    }
    if (state.bitmapsReady && this._grids.length === 0)
    {
      const context = Tr2RenderContext_GetMainThreadRenderContext();
      for (const grid of state.frameData.grids)
      {
        // The decoder bitmap is a volume in the grid's own format
        // (imageio/VtaHandler.cpp:432); pitches follow it as cpp:151-152 do.
        const dimensions = new BitmapDimensions({
          type: TextureType.TEX_TYPE_3D, format: this._gridPixelFormat(grid),
          width: grid.width, height: grid.height, depth: grid.depth, mipCount: 1
        });
        const pitch = dimensions.GetMipPitch(0);
        const texture = context.CreateTexture(dimensions, {
          gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, cpuUsage: Tr2CpuUsage.WRITE,
          initialData: [new Tr2SubresourceData(grid.frames[0], pitch, pitch * dimensions.GetMipHeight(0))]
        });
        if (!texture)
        {
          CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s %s %s", "Tr2TextureAnimation failed to create texture", this.resPath, grid.name);
        }
        this._grids.push({ name: grid.name, frame: texture });
      }
      this.frame = 0;
      this.time = 0;
      this._restartState = Tr2TextureAnimation.RestartState.NotRestarting;
      this._queue(Tr2TextureAnimation.decodeNextFrame);
    }
    if (this._grids.length === 0)
    {
      return;
    }
    if (this._restartState === Tr2TextureAnimation.RestartState.WaitingToRestart)
    {
      if (state.bitmapsReady)
      {
        this._queue(Tr2TextureAnimation.restartAndDecodeFrame);
        this._restartState = Tr2TextureAnimation.RestartState.WaitingForFrame;
      }
      return;
    }
    if (this._restartState === Tr2TextureAnimation.RestartState.WaitingForFrame)
    {
      if (state.bitmapsReady)
      {
        this.UpdateGrids();
        this._queue(Tr2TextureAnimation.decodeNextFrame);
        this.frame = 0;
        this.time = 0;
        this._restartState = Tr2TextureAnimation.RestartState.NotRestarting;
      }
      return;
    }
    if (!this.paused)
    {
      // Carbon: float dt, float m_fps (Tr2TextureAnimation.h:77, cpp:200).
      this.time = Math.fround(this.time + Math.fround(Math.fround(dt) * Math.fround(this.fps)));
      if (this.time > 1 && state.bitmapsReady)
      {
        this.frame++;
        if (this.frame >= state.frameData.frameCount)
        {
          if (!this.looped)
          {
            this.frame--;
            this.time = 1;
            return;
          }
          this.frame = 0;
        }
        this.time %= 1;
        this.UpdateGrids();
        this._queue(Tr2TextureAnimation.decodeNextFrame);
      }
    }
  }

  /**
   * Uploads the decoded frame to each existing volume texture.
   *
   * Adapted: Calls the active AL backend through the ambient render context.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  UpdateGrids()
  {
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    for (let i = 0; i < this._grids.length; i++)
    {
      const grid = this._asyncState.frameData.grids[i];
      const texture = this._grids[i].frame;
      if (texture)
      {
        const pitch = grid.width * GetBytesPerPixel(this._gridPixelFormat(grid));
        texture.UpdateSubresource(Tr2TextureSubresource.ForMipLevel(0), grid.frames[0], pitch, pitch * grid.height, context);
      }
    }
  }

  /**
   * Schedules frame zero once the pending decode finishes.
   *
   * Adapted: Promises replace native worker tasks. Legacy SetChannels attachments
   * retain their synchronous Restart/Reset adapter behavior when no VTA is loaded.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  RestartAnimation()
  {
    if (!this._asyncState)
    {
      this.frame = 0;
      this.time = 0;
      for (const channel of this._channels.values())
      {
        if (typeof channel?.Restart === "function") channel.Restart();
        else if (typeof channel?.Reset === "function") channel.Reset();
      }
      return;
    }
    if (this._restartState === Tr2TextureAnimation.RestartState.NotRestarting)
    {
      if (this._asyncState.bitmapsReady)
      {
        this._queue(Tr2TextureAnimation.restartAndDecodeFrame);
        this._restartState = Tr2TextureAnimation.RestartState.WaitingForFrame;
      }
      else
      {
        this._restartState = Tr2TextureAnimation.RestartState.WaitingToRestart;
      }
    }
  }

  /**
   * Returns names of realized channels in file order.
   *
   * Adapted: Returns a JavaScript array instead of a vector of shared strings.
   * @returns {string[]} Channel names.
   */
  @meta.blue.method
  @meta.adapted
  GetChannelNames()
  {
    return this._asyncState ? this._grids.map(grid => grid.name) : Array.from(this._channels.keys());
  }

  /**
   * Returns the current channel texture, or null if it is unavailable.
   *
   * Adapted: Returns the live AL object instead of a native shared-handle copy.
   * @param {string} channel Channel name.
   * @returns {object|null} Texture handle.
   */
  @meta.blue.method
  @meta.adapted
  GetTexture(channel)
  {
    if (this._asyncState)
    {
      return this._grids.find(grid => grid.name === channel)?.frame ?? null;
    }
    const value = this._channels.get(String(channel ?? ""));
    return value?.texture ?? value ?? null;
  }

  /** @returns {boolean} Whether the owner should advance only when rendered. */
  @meta.blue.method
  @meta.implemented
  UpdateOnlyWhenRendered()
  {
    return this.updateOnlyWhenRendered;
  }

  /**
   * Attaches caller-owned channel adapters without loading a VTA.
   *
   * Custom: Preserves the decoded-channel integration API; these adapters remain
   * caller-owned and are not destroyed with this animation.
   * @param {Map<string, object>|Object<string, object>} channels Channel adapters.
   * @returns {void}
   */
  @meta.ours
  SetChannels(channels)
  {
    this._clear();
    const entries = channels instanceof Map ? channels : Object.entries(channels ?? {});
    for (const [name, channel] of entries)
    {
      this._channels.set(String(name), channel);
    }
  }

  /**
   * Cancels the pending load and drops the grid textures.
   *
   * Custom: Stands in for Carbon's destructor, which only sets `cancel` on the
   * shared state (Tr2TextureAnimation.cpp:103-109); the grid textures are freed
   * by refcount when their last holder lets go. No texture is destroyed here
   * either: a bound resource set may still hold one, and garbage collection
   * reclaims it after the last reference drops.
   * @returns {void}
   */
  @meta.ours
  Destroy()
  {
    this._clear();
  }

  /** Cancels the load, releases owned frame values and drops borrowed channels. */
  _clear()
  {
    if (this._asyncState) this._asyncState.cancel = true;
    this._asyncState = null;
    for (const grid of this._grids) if (grid.frame) grid.frame.Destroy();
    this._grids = [];
    this._channels.clear();
  }

  /**
   * Maps a decoded grid's canonical format string to its PixelFormat.
   * @param {object} grid Decoded grid.
   * @returns {number} PixelFormat value, or PIXEL_FORMAT_UNKNOWN.
   */
  _gridPixelFormat(grid)
  {
    return PixelFormatFromCanonical[grid.format] ?? PixelFormat.PIXEL_FORMAT_UNKNOWN;
  }

  /** Schedules one decode task and reports failures without unhandled rejections. */
  _queue(operation)
  {
    const request = this.MakeRequest();
    request.state.pending = Promise.resolve().then(() => operation.call(Tr2TextureAnimation, request)).then(() => !request.state.cancel).catch(error =>
    {
      if (!request.state.cancel)
      {
        request.state.error = error;
        CcpLog.CCP_LOGERR_CH(CcpLog.GetModuleChannel("trinity"), "%s %s %s", "Tr2TextureAnimation decode failed", request.filename, error);
      }
      return false;
    });
    return request.state.pending;
  }

  /**
   * Loads cached source bytes, then decodes frame zero.
   * Adapted: The resource manager and DecompressionStream replace native IO tasks.
   * @param {object} request Captured load request.
   * @returns {Promise<void>} Completion of the first decode.
   */
  @meta.blue.renamed("ReadFile")
  @meta.adapted
  static async readFile(request)
  {
    const bytes = await blue.resMan.ReadResource(request.filename);
    if (request.state.cancel) return;
    request.state.bytes = bytes;
    await this.decodeFirstFrame(request);
  }

  /**
   * Creates fresh grid decoders and prepares frame zero.
   * Adapted: Uses the format's asynchronous frame iterator.
   * @param {object} request Captured load request.
   * @returns {Promise<void>} Decode completion.
   */
  @meta.blue.renamed("DecodeFirstFrame")
  @meta.adapted
  static async decodeFirstFrame(request)
  {
    request.state.decoder = CjsVtaFormat.readFrames(request.state.bytes);
    await this.decodeNextFrame(request);
  }

  /**
   * Prepares the next frame, restarting the delta chain at end of file.
   * Adapted: Uses promise completion instead of an atomic worker-ready flag.
   * @param {object} request Captured load request.
   * @returns {Promise<void>} Decode completion.
   */
  @meta.blue.renamed("DecodeNextFrame")
  @meta.adapted
  static async decodeNextFrame(request)
  {
    const state = request.state;
    if (state.cancel) return;
    let next = await state.decoder.next();
    if (state.cancel) return;
    if (next.done)
    {
      state.decoder = CjsVtaFormat.readFrames(state.bytes);
      next = await state.decoder.next();
    }
    if (state.cancel) return;
    state.frameData = next.value;
    state.bitmapsReady = true;
  }

  /**
   * Rewinds the format decoder and prepares frame zero.
   * Adapted: Recreates the asynchronous iterator instead of native decoder reset.
   * @param {object} request Captured load request.
   * @returns {Promise<void>} Decode completion.
   */
  @meta.blue.renamed("RestartAndDecodeFrame")
  @meta.adapted
  static async restartAndDecodeFrame(request)
  {
    await this.decodeFirstFrame(request);
  }

  static RestartState = Object.freeze({ NotRestarting: 0, WaitingToRestart: 1, WaitingForFrame: 2 });
}
