import { CjsGraph } from "../../global/model/graph/CjsGraph.js";
// Ours: the WebGL2 backend's asynchronous video average colour, behind
// Tr2TextureAL.RequestAverageColor, as CjsWebgpuVideoColorSampler is WebGPU's.
//
// Carbon averages each decoded frame on the CPU while converting it to BGRA
// (videoplayer/VpxDecoder.cpp:255-272). The browser decodes, so the WebGL2
// texture is filled straight from the video element and its pixels never
// reach the CPU. WebCodecs copies the presented frame's planes out
// asynchronously (`VideoFrame.copyTo`), without the synchronous canvas
// readback VideoPlayer otherwise falls back to. The planes are averaged, and
// the plane means converted to RGB with the frame's own colour space: the
// conversion is affine, so converting the means equals averaging converted
// pixels, except where single pixels would clamp.
//
// Where WebCodecs is missing, or Tr2PlatformInfo.webgl2LightAveraging asks for
// APPROXIMATION (the default), RequestApproximation averages a small mip of the video
// texture instead: the frame is blitted into a mipmapped RGBA8 texture, the
// level about 16 texels wide is read into a pixel-pack buffer behind a fence,
// and the CPU averages it once the fence signals. Nothing waits on the GPU.

/** Texels along the long side of the mip level the approximation reads. */
const APPROXIMATION_TEXELS = 16;

/** Polls of an approximation's fence before it is given up. */
const APPROXIMATION_POLLS = 120;

/** Kr and Kb of each YUV matrix VideoColorSpace names. */
const MATRICES = {
  bt709: [ 0.2126, 0.0722 ],
  bt470bg: [ 0.299, 0.114 ],
  smpte170m: [ 0.299, 0.114 ],
  "bt2020-ncl": [ 0.2627, 0.0593 ]
};

/**
 * One asynchronous average at a time for one video texture.
 */
export class CjsWebgl2VideoColorSampler
{
  static className = "CjsWebgl2VideoColorSampler";

  /** Whether a copy is in flight. */
  _pending = false;

  /** Set by Destruct; a copy that finishes afterwards answers null. */
  _destroyed = false;

  /** The plane bytes, reused while the frame size holds. */
  _bytes = new Uint8Array(0);

  /** The approximation's GL objects: mip texture, two framebuffers, pack buffer; null until used. */
  _mip = null;

  /** The approximation's size and level: `{ width, height, level, levelWidth, levelHeight }`. */
  _mipSize = null;

  /** The WebGL2 context the approximation's objects belong to. */
  _gl = null;

  /**
   * Starts an average of the video's presented frame.
   *
   * @param {HTMLVideoElement} video The element the texture is filled from.
   * @returns {Promise<Float32Array|null>|null} The mean RGBA, each 0-1 in the
   *   video's encoded channels; a promise of null while another is in flight,
   *   or for a format it cannot read; null when the browser has no WebCodecs.
   */
  Request(video)
  {
    const VideoFrameClass = video.ownerDocument?.defaultView?.VideoFrame ?? globalThis.VideoFrame;
    if (typeof VideoFrameClass !== "function") return null;
    // Busy is a skipped sample, not a request to start the canvas fallback.
    if (this._pending || this._destroyed || video.readyState < 2) return Promise.resolve(null);
    let frame;
    try { frame = new VideoFrameClass(video); }
    catch { return Promise.resolve(null); }
    this._pending = true;
    return this._Read(frame);
  }

  /**
   * Copies the frame's planes and averages them.
   *
   * @param {VideoFrame} frame The frame, closed here.
   * @returns {Promise<Float32Array|null>} The mean RGBA, or null.
   */
  async _Read(frame)
  {
    try
    {
      const size = frame.allocationSize();
      if (this._bytes.length < size) this._bytes = new Uint8Array(size); // alloc: plane bytes, grown to the largest frame seen.
      const layout = await frame.copyTo(this._bytes);
      if (this._destroyed) return null;
      return CjsWebgl2VideoColorSampler.meanOf(this._bytes, layout, frame.format,
        frame.visibleRect.width, frame.visibleRect.height, frame.colorSpace);
    }
    finally
    {
      frame.close();
      this._pending = false;
    }
  }

  /**
   * The mean RGBA of one copied frame.
   *
   * Fixes CE-235: Carbon converts every video with fixed BT.601 limited-range
   * coefficients, applied with Cb and Cr swapped (R takes 2.018 of Cr, B 1.596
   * of Cb; VpxDecoder.cpp:11-44), and averages the result; ours converts with
   * the frame's tagged matrix and range, so the mean matches the colours the
   * browser displays. An untagged matrix is taken as BT.601 (smpte170m), and
   * an untagged range as limited.
   *
   * @param {Uint8Array} bytes The copied planes.
   * @param {PlaneLayout[]} layout Each plane's offset and stride.
   * @param {string} format The VideoPixelFormat.
   * @param {number} width Visible width.
   * @param {number} height Visible height.
   * @param {VideoColorSpace} colorSpace The frame's colour space.
   * @returns {Float32Array|null} The mean RGBA, or null for a format it cannot read.
   */
  static meanOf(bytes, layout, format, width, height, colorSpace)
  {
    const mean = CjsWebgl2VideoColorSampler._PlaneMean;
    const halfWidth = (width + 1) >> 1, halfHeight = (height + 1) >> 1;
    let y, u, v, alpha = 255;
    switch (format)
    {
      case "I420":
      case "I420A":
        y = mean(bytes, layout[0], width, height, 1, 0);
        u = mean(bytes, layout[1], halfWidth, halfHeight, 1, 0);
        v = mean(bytes, layout[2], halfWidth, halfHeight, 1, 0);
        if (format === "I420A") alpha = mean(bytes, layout[3], width, height, 1, 0);
        break;
      case "I422":
        y = mean(bytes, layout[0], width, height, 1, 0);
        u = mean(bytes, layout[1], halfWidth, height, 1, 0);
        v = mean(bytes, layout[2], halfWidth, height, 1, 0);
        break;
      case "I444":
        y = mean(bytes, layout[0], width, height, 1, 0);
        u = mean(bytes, layout[1], width, height, 1, 0);
        v = mean(bytes, layout[2], width, height, 1, 0);
        break;
      case "NV12":
        y = mean(bytes, layout[0], width, height, 1, 0);
        u = mean(bytes, layout[1], halfWidth, halfHeight, 2, 0);
        v = mean(bytes, layout[1], halfWidth, halfHeight, 2, 1);
        break;
      case "RGBA":
      case "RGBX":
      case "BGRA":
      case "BGRX":
      {
        const red = format[0] === "B" ? 2 : 0, blue = 2 - red;
        return Float32Array.of( // alloc: the returned colour.
          mean(bytes, layout[0], width, height, 4, red) / 255,
          mean(bytes, layout[0], width, height, 4, 1) / 255,
          mean(bytes, layout[0], width, height, 4, blue) / 255,
          format.endsWith("A") ? mean(bytes, layout[0], width, height, 4, 3) / 255 : 1);
      }
      default:
        return null;
    }
    const [ kr, kb ] = MATRICES[colorSpace?.matrix] ?? MATRICES.smpte170m;
    const full = colorSpace?.fullRange === true;
    const luma = full ? y : (y - 16) * 255 / 219;
    const cb = (u - 128) * (full ? 1 : 255 / 224), cr = (v - 128) * (full ? 1 : 255 / 224);
    const kg = 1 - kr - kb;
    const clamp = value => Math.min(1, Math.max(0, value / 255));
    return Float32Array.of( // alloc: the returned colour.
      clamp(luma + 2 * (1 - kr) * cr),
      clamp(luma - 2 * (1 - kb) * kb / kg * cb - 2 * (1 - kr) * kr / kg * cr),
      clamp(luma + 2 * (1 - kb) * cb),
      alpha / 255);
  }

  /**
   * The mean of one channel of a plane.
   *
   * @param {Uint8Array} bytes The copied planes.
   * @param {PlaneLayout} plane The plane's offset and stride.
   * @param {number} width Samples per row.
   * @param {number} height Rows.
   * @param {number} step Bytes between samples.
   * @param {number} channel Byte offset of the channel within a sample.
   * @returns {number} The mean, 0-255.
   */
  static _PlaneMean(bytes, plane, width, height, step, channel)
  {
    let sum = 0;
    for (let row = 0; row < height; row++)
    {
      let index = plane.offset + row * plane.stride + channel;
      for (let column = 0; column < width; column++, index += step) sum += bytes[index];
    }
    return width && height ? sum / (width * height) : 0;
  }

  /**
   * Starts an average of a small mip of the video texture. Fixes CE-235 as
   * meanOf does: the texture holds the frame the browser converted with the
   * video's own colour space, not Carbon's swapped BT.601.
   *
   * @param {WebGL2RenderingContext} gl The texture's context.
   * @param {WebGLTexture} source The video texture's RGBA8 (UNORM) storage.
   * @param {number} width Its width.
   * @param {number} height Its height.
   * @param {Function} rebindFramebuffer Binds the render context's own framebuffer again.
   * @param {object} host The realm whose setTimeout paces the fence polls.
   * @returns {Promise<Float32Array|null>} The mean RGBA, each 0-1 in encoded
   *   channels; null while another is in flight or if the fence never signals.
   */
  RequestApproximation(gl, source, width, height, rebindFramebuffer, host = globalThis)
  {
    if (this._pending || this._destroyed || !source || width < 1 || height < 1) return Promise.resolve(null);
    const mip = this._MipFor(gl, width, height), size = this._mipSize;
    // Scissor clips blits; the AL's own depth copy turns it off the same way.
    const scissor = gl.isEnabled(gl.SCISSOR_TEST);
    if (scissor) gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, mip.read);
    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, source, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, mip.draw);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, mip.texture, 0);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, mip.texture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, mip.texture, size.level);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, mip.pack);
    gl.readPixels(0, 0, size.levelWidth, size.levelHeight, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    if (scissor) gl.enable(gl.SCISSOR_TEST);
    rebindFramebuffer();
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    this._pending = true;
    return new Promise(resolve =>
    {
      let polls = 0;
      const poll = () =>
      {
        const status = this._destroyed ? gl.TIMEOUT_EXPIRED : gl.clientWaitSync(sync, 0, 0);
        if (status === gl.TIMEOUT_EXPIRED && !this._destroyed && ++polls < APPROXIMATION_POLLS)
        {
          host.setTimeout(poll, 4);
          return;
        }
        gl.deleteSync(sync);
        this._pending = false;
        if (status !== gl.ALREADY_SIGNALED && status !== gl.CONDITION_SATISFIED) return resolve(null);
        const bytes = new Uint8Array(size.levelWidth * size.levelHeight * 4); // alloc: one small level per sample.
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, mip.pack);
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, bytes);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        const layout = [ { offset: 0, stride: size.levelWidth * 4 } ];
        resolve(CjsWebgl2VideoColorSampler.meanOf(bytes, layout, "RGBA", size.levelWidth, size.levelHeight, null));
      };
      poll();
    });
  }

  /**
   * The approximation's GL objects for a frame size, made or remade as it changes.
   *
   * @param {WebGL2RenderingContext} gl The context.
   * @param {number} width Frame width.
   * @param {number} height Frame height.
   * @returns {{ texture: WebGLTexture, read: WebGLFramebuffer, draw: WebGLFramebuffer, pack: WebGLBuffer }} The objects.
   */
  _MipFor(gl, width, height)
  {
    const size = this._mipSize;
    if (this._mip && this._gl === gl && size.width === width && size.height === height) return this._mip;
    this._ReleaseMip();
    const levels = Math.floor(Math.log2(Math.max(width, height))) + 1;
    const level = Math.max(0, levels - 1 - Math.log2(APPROXIMATION_TEXELS));
    const levelWidth = Math.max(1, width >> level), levelHeight = Math.max(1, height >> level);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texStorage2D(gl.TEXTURE_2D, levels, gl.RGBA8, width, height);
    const pack = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pack);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, levelWidth * levelHeight * 4, gl.STREAM_READ);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this._gl = gl;
    this._mip = { texture, read: gl.createFramebuffer(), draw: gl.createFramebuffer(), pack };
    this._mipSize = { width, height, level, levelWidth, levelHeight };
    return this._mip;
  }

  /** Deletes the approximation's GL objects. */
  _ReleaseMip()
  {
    const gl = this._gl, mip = this._mip;
    if (gl && mip)
    {
      gl.deleteTexture(mip.texture);
      gl.deleteFramebuffer(mip.read);
      gl.deleteFramebuffer(mip.draw);
      gl.deleteBuffer(mip.pack);
    }
    this._mip = null;
    this._mipSize = null;
  }

  /**
   * @cjs Thin public entry; this plain helper has no Blue schema or graph value exposure.
   * @returns {boolean} True if it ran; false on a second call.
   */
  Destruct()
  {
    return CjsGraph.destruct(this);
  }

  /**
   * Stops answering; a copy in flight resolves null.
   *
   * @cjs Preserves browser-owned sampling cancellation through graph lifetime dispatch.
   * @returns {boolean} True: nothing here refuses.
   */
  OnDestruct()
  {
    this._destroyed = true;
    this._bytes = new Uint8Array(0);
    this._ReleaseMip();
    return true;
  }
}

CjsGraph.defineLifetime(CjsWebgl2VideoColorSampler, {});
