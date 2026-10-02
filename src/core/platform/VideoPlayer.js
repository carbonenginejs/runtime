// Source: videoplayer/VideoPlayer.h, videoplayer/VideoPlayer.cpp:104-247
// Browser adaptation: HTML media owns decoding, presentation and audio clocks.
// Resource paths and playlist policy remain with VideoPlaylistController.
import { CjsSchema, meta } from "#schema";
import { State } from "../../resource/video/enums.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../trinity/core/context/Tr2RenderContext.js";
import { ClearVideoTexture, RealizeTexture } from "../../trinity/core/Tr2ImageIOHelpers.js";

/** Carbon VideoPlayer using browser-decoded frames and ordinary texture bindings. */
export class VideoPlayer
{
  _bgraTexture = null;

  /** Carbon's weak texture property; the shared playlist owns the resource. */
  get bgraTexture() { return this.GetBgraTexture(); }

  /** Assign a target and invalidate the last uploaded presentation serial. */
  set bgraTexture(texture) { this.SetBgraTexture(texture); }

  onStateChange = null;

  onError = null;

  onCreateTextures = null;

  video = null;

  error = null;

  autoplayBlocked = false;

  averageColorError = null;

  _generation = 0;

  _frameCallback = null;

  _sampleRequest = null;

  _watchdog = null;

  _objectUrl = null;

  _listeners = [];

  _canvas = null;

  _context = null;

  _paused = false;

  _lastSampleTime = -Infinity;

  _lastFrame = -1;

  _serial = 0;

  _state = State.UNINITIALIZED;

  stats = { frames: 0, samples: 0, samplingMilliseconds: 0 };

  /** Browser host injection keeps imports headless and permits deterministic lifecycle tests. */
  constructor({ host = globalThis, sampleSize = 32, sampleInterval = 125, stallTimeout = 15000,
    getRenderContext = Tr2RenderContext_GetMainThreadRenderContext, withSound = false } = {})
  {
    if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 256
      || !Number.isFinite(sampleInterval) || sampleInterval < 1
      || !Number.isFinite(stallTimeout) || stallTimeout < 1) throw new RangeError("Invalid video sampling or timeout options");
    this._host = host;
    this._sampleSize = sampleSize;
    this._sampleInterval = sampleInterval;
    this._stallTimeout = stallTimeout;
    this._getRenderContext = getRenderContext;
    this._withSound = withSound;
  }

  /** Carbon Create; browser takes acquired bytes, with its native decoder replacing VideoController. */
  Create(stream, _audioSink = null, _audioTrack = 0, looped = false)
  {
    this._ReleaseMedia();
    const host = this._host;
    if (!host.document) throw new Error("Video playback requires a browser document");
    const video = host.document.createElement("video");
    if (typeof video.requestVideoFrameCallback !== "function") throw new Error("Video playback requires requestVideoFrameCallback");
    const generation = this._generation;
    this.video = video;
    this.error = null;
    this.averageColorError = null;
    this.autoplayBlocked = false;
    this._lastFrame = -1;
    this._lastSampleTime = -Infinity;
    video.crossOrigin = "anonymous";
    video.muted = !this._withSound;
    video.playsInline = true;
    video.preload = "auto";
    video.loop = looped;
    const listen = (name, callback) =>
    {
      const handler = () => { if (generation === this._generation) callback(); };
      video.addEventListener(name, handler);
      this._listeners.push([name, handler]);
    };
    listen("ended", () => { this._ClearWatchdog(); this._SetState(State.DONE); });
    listen("error", () => this._Fail(new Error(`Video decode failed (${video.error?.code ?? "unknown"}): ${video.error?.message ?? "unsupported or invalid media"}`)));
    listen("waiting", () => { this._SetState(State.BUFFERING); this._ArmWatchdog(); });
    listen("stalled", () => { this._SetState(State.BUFFERING); this._ArmWatchdog(); });
    listen("playing", () => { this._SetState(State.PLAYING); this._ArmWatchdog(); });
    const onFrame = (now, metadata) =>
    {
      if (generation !== this._generation) return;
      this._frameCallback = null;
      if (metadata.presentedFrames !== this._lastFrame)
      {
        this._lastFrame = metadata.presentedFrames;
        this._serial++;
        this.stats.frames++;
        this._ClearWatchdog();
        this._ArmWatchdog();
        try
        {
          this.Update();
          this._RequestAverageColor(now, generation);
        }
        catch (error) { this._Fail(error); }
      }
      if (generation === this._generation) this._frameCallback = video.requestVideoFrameCallback(onFrame);
    };
    this._frameCallback = video.requestVideoFrameCallback(onFrame);
    this._objectUrl = host.URL.createObjectURL(new host.Blob([stream]));
    video.src = this._objectUrl;
    video.load();
    this._SetState(State.BUFFERING);
    if (!this._paused) this.Resume();
    return true;
  }

  /** Upload only a new decoded frame; the AL retains storage and ordinary material bindings. */
  Update()
  {
    const video = this.video, resource = this.bgraTexture;
    if (!video || !resource || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return false;
    let payload = resource.GetPayload();
    if (payload?.payloadType !== "video" || payload.width !== video.videoWidth || payload.height !== video.videoHeight)
    {
      resource.SetPayload({ payloadType: "video", sourceFormat: "browser", durationTimescale: 1000,
        duration: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0,
        tracks: [], width: video.videoWidth, height: video.videoHeight, depth: 1, arraySize: 1, mipCount: 1,
        frameSource: video, frameSerial: this._serial });
      resource.MarkPrepared();
      payload = resource.GetPayload();
      if (this.onCreateTextures) this.onCreateTextures(this, video.videoWidth, video.videoHeight);
    }
    payload.frameSource = video;
    payload.frameSerial = this._serial;
    const context = this._getRenderContext();
    if (context && context.IsValid()) RealizeTexture(resource, context);
    return true;
  }

  /** One deferred, bounded readback per shared player; stale clips never publish colour. */
  _RequestAverageColor(now, generation)
  {
    const storage = this.bgraTexture ? this.bgraTexture.GetTexture() : null;
    if (storage !== this._averageTexture)
    {
      this._averageTexture = storage;
      this.averageColorError = null;
    }
    if (this.averageColorError || this._sampleRequest !== null || now - this._lastSampleTime < this._sampleInterval) return;
    this._lastSampleTime = now;
    if (this._RequestGpuAverageColor(generation)) return;
    this._sampleRequest = this._host.requestAnimationFrame(() =>
    {
      if (generation !== this._generation) return;
      this._sampleRequest = null;
      const video = this.video, texture = this.bgraTexture;
      if (!video || !texture || video.readyState < 2) return;
      const start = this._host.performance.now();
      try
      {
        if (!this._canvas)
        {
          this._canvas = this._host.document.createElement("canvas");
          this._canvas.width = this._canvas.height = this._sampleSize;
          this._context = this._canvas.getContext("2d", { alpha: true, willReadFrequently: true, colorSpace: "srgb" });
          if (!this._context) throw new Error("Video average colour requires a 2D canvas");
          this._context.imageSmoothingEnabled = true;
          this._context.imageSmoothingQuality = "high";
        }
        const size = this._sampleSize, context = this._context;
        context.clearRect(0, 0, size, size);
        context.drawImage(video, 0, 0, size, size);
        const data = context.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, a = 0;
        for (let i = 0; i < data.length; i += 4)
        {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; a += data[i + 3];
        }
        // VpxDecoder.cpp:254-272 averages straight encoded channels, without
        // gamma, smoothing or alpha weighting. Canvas returns straight sRGB,
        // but resampling is premultiplied: mixed alpha and hidden RGB are an
        // approximation. Browser YUV conversion also differs from Carbon's
        // fixed coefficients. These limits are measured by the video probe.
        const divisor = data.length / 4 * 255;
        if (generation === this._generation) texture.SetAverageColor(r / divisor, g / divisor, b / divisor, a / divisor);
        this.stats.samples++;
      }
      catch (error) { this.averageColorError = error; }
      finally { this.stats.samplingMilliseconds += this._host.performance.now() - start; }
    });
  }

  /** Use the AL capability when present, keeping one asynchronous result and rejecting replaced storage. */
  _RequestGpuAverageColor(generation)
  {
    const resource = this.bgraTexture, texture = resource ? resource.GetTexture() : null;
    if (!texture || typeof texture.RequestAverageColor !== "function") return false;
    const start = this._host.performance.now();
    let promise;
    try { promise = texture.RequestAverageColor(); }
    catch (error) { this.averageColorError = error; return true; }
    if (!promise) return false;
    this.stats.samplingMilliseconds += this._host.performance.now() - start;
    const request = this._sampleRequest = {};
    promise.then(color =>
    {
      if (color && this._sampleRequest === request && generation === this._generation
        && resource === this.bgraTexture && resource.GetTexture() === texture && texture.IsValid())
      {
        resource.SetAverageColor(color[0], color[1], color[2], color[3]);
        this.stats.samples++;
      }
    }).catch(error =>
    {
      if (this._sampleRequest === request && generation === this._generation && texture.IsValid()) this.averageColorError = error;
    }).finally(() => { if (this._sampleRequest === request) this._sampleRequest = null; });
    return true;
  }

  /** Carbon Pause; no media-clock emulation and no decode/readback driven by lights. */
  Pause()
  {
    this._paused = true;
    this._ClearWatchdog();
    if (this.video) this.video.pause();
  }

  /** Carbon Resume; blocked autoplay waits for an explicit host retry after a gesture. */
  Resume()
  {
    this._paused = false;
    const video = this.video, generation = this._generation;
    if (!video) return;
    this.autoplayBlocked = false;
    this._ArmWatchdog();
    Promise.resolve(video.play()).catch(error =>
    {
      if (generation !== this._generation) return;
      if (error.name === "NotAllowedError")
      {
        this.autoplayBlocked = true;
        this._ClearWatchdog();
        this._SetState(State.INITIAL_BUFFERING);
      }
      else this._Fail(error);
    });
  }

  /** Carbon pause query, independent of buffering and autoplay policy. */
  IsPaused() { return this._paused; }
  /** Browser media seconds; Blue's 100 ns frame ticks never enter this clock. */
  GetMediaTime() { return this.video ? this.video.currentTime : 0; }
  /** Browser duration in seconds. */
  GetDuration() { return this.video && Number.isFinite(this.video.duration) ? this.video.duration : 0; }
  /** Seek in media seconds, leaving presentation scheduling to the browser. */
  Seek(time) { if (this.video) this.video.currentTime = time; }
  /** Carbon state; autoplayBlocked and Validate distinguish browser policy from decode failure. */
  GetState() { return this._state; }
  /** Furthest buffered media time, in the same seconds as GetMediaTime. */
  GetDownloadedMediaTime()
  {
    const ranges = this.video ? this.video.buffered : null;
    return ranges && ranges.length ? ranges.end(ranges.length - 1) : 0;
  }

  /** Browser metadata; hasAlpha is unknown because HTMLVideoElement does not expose it. */
  GetVideoInfo(metadata = {})
  {
    if (!this.video || !this.video.videoWidth) throw new Error("Video information is not yet parsed");
    metadata.width = this.video.videoWidth;
    metadata.height = this.video.videoHeight;
    metadata.hasAlpha = null;
    return metadata;
  }

  /** Explicit Carbon clear, preserving dimensions and GPU storage until the next decoded frame. */
  ClearTextures()
  {
    const resource = this.bgraTexture;
    if (!resource) return;
    if (typeof this._sampleRequest === "number") this._host.cancelAnimationFrame(this._sampleRequest);
    this._sampleRequest = null;
    ClearVideoTexture(resource, this._getRenderContext());
    resource.SetAverageColor(0, 0, 0, 0);
  }

  /** Carbon modification invalidates presentation deduplication without advancing the media clock. */
  OnModified(_value = null) { this._serial++; return true; }

  /** Optional Carbon tick integration; decoded-frame notifications still own presentation timing. */
  OnTick(_realTime, _simTime, _cookie) { this.Update(); }

  /** Carbon setter invalidates the upload cache when a target changes. */
  SetBgraTexture(texture)
  {
    if (texture === this._bgraTexture) return;
    if (typeof this._sampleRequest === "number") this._host.cancelAnimationFrame(this._sampleRequest);
    this._sampleRequest = null;
    const previous = this._bgraTexture ? this._bgraTexture.GetPayload() : null;
    if (previous && previous.frameSource === this.video) previous.frameSource = null;
    this._bgraTexture = texture;
    this.OnModified();
  }

  /** Return Carbon's assigned texture resource. */
  GetBgraTexture() { return this._bgraTexture; }

  /** Carbon Validate exposes the last playback failure to its host. */
  Validate() { if (this.error) throw this.error; return true; }

  /** Notify only state transitions, as Carbon VideoPlayer::Update does. */
  _SetState(state)
  {
    if (state === this._state) return;
    this._state = state;
    if (this.onStateChange) this.onStateChange(this);
  }

  /** Bound stalled/failed clips; the playlist decides whether another clip may be tried. */
  _Fail(error)
  {
    this.error = error;
    this._ReleaseMedia();
    this._SetState(State.UNINITIALIZED);
    if (this.onError) this.onError(this);
  }

  /** A single no-progress deadline, suspended while explicitly paused or autoplay-blocked. */
  _ArmWatchdog()
  {
    if (this._watchdog !== null || this._paused || this.autoplayBlocked) return;
    this._watchdog = this._host.setTimeout(() => this._Fail(new Error("Video presentation stalled")), this._stallTimeout);
  }

  /** Cancel the owned no-progress timer. */
  _ClearWatchdog()
  {
    if (this._watchdog !== null) this._host.clearTimeout(this._watchdog);
    this._watchdog = null;
  }

  /** C++ destructor adaptation: cancel callbacks before clearing the source and owned URL. */
  _ReleaseMedia()
  {
    this._generation++;
    this._ClearWatchdog();
    if (typeof this._sampleRequest === "number") this._host.cancelAnimationFrame(this._sampleRequest);
    this._sampleRequest = null;
    if (this.video)
    {
      const payload = this.bgraTexture ? this.bgraTexture.GetPayload() : null;
      if (payload?.frameSource === this.video) payload.frameSource = null;
      if (this._frameCallback !== null) this.video.cancelVideoFrameCallback(this._frameCallback);
      for (const [name, handler] of this._listeners) this.video.removeEventListener(name, handler);
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.load();
    }
    this._listeners.length = 0;
    this._frameCallback = null;
    this.video = null;
    if (this._objectUrl !== null) this._host.URL.revokeObjectURL(this._objectUrl);
    this._objectUrl = null;
  }

  /** Explicit destructor for the shared resource owner; individual billboards never call it. */
  Destroy()
  {
    this._ReleaseMedia();
    this._canvas = this._context = null;
    this.bgraTexture = null;
    this.onStateChange = this.onError = this.onCreateTextures = null;
    this._state = State.UNINITIALIZED;
  }
}

CjsSchema.define(VideoPlayer, { className: "VideoPlayer", carbon: "VideoPlayer", methods: {
  Create: [meta.adapted], Update: [meta.adapted], Pause: [meta.adapted], Resume: [meta.adapted],
  IsPaused: [meta.adapted], GetMediaTime: [meta.adapted], GetDuration: [meta.adapted],
  GetDownloadedMediaTime: [meta.adapted], GetVideoInfo: [meta.adapted],
  ClearTextures: [meta.adapted], OnModified: [meta.adapted], OnTick: [meta.adapted],
  SetBgraTexture: [meta.adapted], GetBgraTexture: [meta.implemented],
  Seek: [meta.adapted], GetState: [meta.adapted], Validate: [meta.adapted], Destroy: [meta.adapted]
} });
