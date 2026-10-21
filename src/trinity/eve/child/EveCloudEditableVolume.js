import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveCloudEditableVolume_Blue.cpp
// Hand-maintained after promotion from generated intake.
import { CjsSchema, meta, type, blue } from "#schema";
import { BlueList, CjsBlueOS, IInitialize, INotify, IListNotify } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { PixelFormat } from "#consts/render-context";
import { num } from "#math/num";
import { TriTextureRes } from "#resource/texture";
import { Tr2HostBitmap } from "../../core/Tr2HostBitmap.js";
import { EveCloudVolumeBall } from "./EveCloudVolumeBall.js";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

const MAX_FRAMES = 4;
const Status = Object.freeze({ Working: 0, StopRequested: 1, DataReady: 2, Aborted: 3 });

/** Holds the editable voxel dimensions, bitmap and texture backing, control balls, and curve sets used to author a cloud volume. */
@blue.define({ className: "EveCloudEditableVolume", purpose: "Holds the editable voxel dimensions, bitmap and texture backing, control balls, and curve sets used to author a cloud volume." })
@blue.inherit(IInitialize, INotify, IListNotify)
@blue.interface(IListNotify, IInitialize, INotify)
export class EveCloudEditableVolume
{

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("TriCurveSet")
  curveSets = [];

  /** m_animated (bool) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.boolean
  animated = false;

  /** m_balls (PEveCloudVolumeBallVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveCloudVolumeBall")
  balls = new BlueList(EveCloudVolumeBall);

  /** m_bitmap (Tr2HostBitmapPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("Tr2HostBitmap")
  bitmap = new Tr2HostBitmap();

  /** m_texture (TriTextureResPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("TriTextureRes")
  texture = new TriTextureRes();

  /** m_depth (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.uint32
  depth = 64;

  /** m_height (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.uint32
  height = 64;

  /** m_width (uint32_t) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.uint32
  width = 64;

  /** m_renderDebugInfo (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  renderDebugInfo = false;

  _thread = null;

  _timer = null;

  _currentParams = null;

  _volumeDirty = false;

  _updating = false;

  /** Installs the native single observer on the owned ball list (cpp:35-51). */
  constructor()
  {
    this.balls.SetNotify(this);
  }

  /**
   * Cancels pending computation; shared bitmap and texture references remain usable.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  Destruct()
  {
    clearTimeout(this._timer);
    this._timer = null;
    if (this._currentParams) this._currentParams.status = Status.StopRequested;
    if (this._thread) this._thread.return();
    this._thread = null;
  }

  /** Begins the initial volume snapshot (cpp:64-68). */

  @meta.implemented
  Initialize()
  {
    this.OnVolumeModified();
    return true;
  }

  /** Any notified volume property schedules regeneration (cpp:70-74). */

  @meta.implemented
  OnModified(_names)
  {
    this.OnVolumeModified();
    return true;
  }

  /**
   * Joins and publishes the current snapshot, then starts a dirty successor.
   * Adapted: JavaScript cannot synchronously join a browser thread, so the
   * pending iterator is drained here. Like native cpp:76-97 this explicit call
   * can block, and returns the current snapshot without waiting for a successor.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  Rasterize()
  {
    this.OnVolumeModified();
    if (this._thread)
    {
      clearTimeout(this._timer);
      this._timer = null;
      while (!this._thread.next().done) { /* Explicit synchronous native join. */ }
      this._thread = null;
      this._PublishRasterization();
    }
    return this.bitmap;
  }

  /**
   * Publishes completed work before advancing curves (cpp:99-117).
   * Native status remains DataReady after publication: subsequent Updates
   * republish the bitmap until a new job changes that status.
   */

  @meta.implemented
  Update(time)
  {
    if (this._currentParams?.status === Status.DataReady)
    {
      this._thread = null;
      this._PublishRasterization();
    }
    // Carbon's Update( Be::Time, Be::Time ) overload (EveCloudEditableVolume.cpp:115).
    for (const curves of this.curveSets) curves.Update__RealTimeSimTime(time, time);
  }

  /**
   * Preserves native loading/unloading owner assignment and regeneration (cpp:119-170).
   * Adapted: JavaScript WeakRef stores the native BlueWeakRef owner.
   */
  @blue.method
  @meta.adapted
  OnListModified(event, _key, _key2, value, _list)
  {
    // WeakRef represents BlueWeakRef; list events remain the native contract.
    switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
    {
      case BLUELISTEVENT.BELIST_INSERTED:
        if (event & BLUELISTEVENT.BELIST_LOADING) return;
        {
          const ball = CjsSchema.cast(value, EveCloudVolumeBall);
          if (ball) ball._owner = new WeakRef(this);
        }
        this.OnVolumeModified();
        break;
      case BLUELISTEVENT.BELIST_REMOVED:
        if (event & BLUELISTEVENT.BELIST_UNLOADING) return;
        {
          const ball = CjsSchema.cast(value, EveCloudVolumeBall);
          if (ball) ball._owner = null;
        }
        this.OnVolumeModified();
        break;
      case BLUELISTEVENT.BELIST_LOADFINISHED:
        for (const ball of this.balls) ball._owner = new WeakRef(this);
        break;
      case BLUELISTEVENT.BELIST_UNLOADSTART:
        for (const ball of this.balls) ball._owner = null;
        break;
    }
  }

  /**
   * Snapshots balls, sampling four curve frames for animated volumes (cpp:172-230).
   * Adapted: portable JavaScript has no CcpThread or synchronous thread join.
   * A resumable iterator preserves the job/publication boundary and runs in
   * short event-loop slices. This is cooperative CPU work, not parallel work.
   * Curve sampling and snapshot allocation remain synchronous, as in Carbon.
   */
  @be.mapMethodAndWrap()
  @meta.adapted
  OnVolumeModified()
  {
    if (this._updating) return;
    if (this._thread)
    {
      this._volumeDirty = true;
      return;
    }
    this._volumeDirty = false;
    this._updating = true;
    try
    {
      const params = {
        width: this.width, height: this.height, depth: this.depth,
        pixels: new Uint8Array(this.width * this.height * this.depth * 4), // alloc: new native rasterization snapshot
        balls: [], status: Status.Working
      };
      this._currentParams = params;
      for (let frame = 0; frame < (this.animated ? MAX_FRAMES : 1); frame++)
      {
        if (this.animated)
        {
          for (const curves of this.curveSets)
          {
            const resume = curves.IsPlaying(), time = curves.GetScaledTime();
            curves.Stop();
            curves.Play();
            curves.Update(0);
            curves.Update(Math.fround(frame / (MAX_FRAMES - 1)));
            if (resume) curves.PlayFrom(time);
          }
        }
        params.balls.push(Array.from(this.balls, ball => ({
          position: Array.from(ball.position), radius: ball.radius,
          selfIllumination: Array.from(ball.selfIllumination),
          opacity: ball.opacity, falloff: ball.falloff
        })));
      }
      this._thread = this.animated
        ? EveCloudEditableVolume.threadProcAnimated(params)
        : EveCloudEditableVolume.threadProc(params);
      this._timer = setTimeout(() => this._RunRasterization(), 0);
    }
    finally
    {
      this._updating = false;
    }
  }

  /** Returns the owned texture, whose bitmap is adopted at publication (cpp:357-360). */

  @meta.implemented
  GetTexture()
  {
    return this.texture;
  }

  /** Runs bounded CPU slices without moving the native publication point into the job. */
  _RunRasterization()
  {
    this._timer = null;
    if (!this._thread) return;
    const deadline = CjsBlueOS.Monotonic() + 4;
    do
    {
      if (this._thread.next().done) return;
    }
    while (CjsBlueOS.Monotonic() < deadline);
    this._timer = setTimeout(() => this._RunRasterization(), 0);
  }

  /** Shared native publication body from Rasterize/Update; texture realization stays in the AL. */
  _PublishRasterization()
  {
    const params = this._currentParams;
    if (params.status !== Status.DataReady) return;
    this.bitmap.CreateVolume(params.width, params.height, params.depth, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM);
    if (this.bitmap.GetRawDataSize()) this.bitmap.GetRawData().set(params.pixels);
    this.texture.CreateFromHostBitmap(this.bitmap);
    if (this._volumeDirty) this.OnVolumeModified();
  }

  /**
   * Carbon EveCloudEditableVolume::GetDebugOptions (cpp:362-365).
   * @param {Set<string>} options The caller-owned option set.
   */

  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Cloud Balls");
  }

  /**
   * Carbon `EveCloudEditableVolume::RenderDebugInfo( ITr2DebugRenderer2&,
   * const Matrix& worldTransform )` (cpp:367-382): with "Cloud Balls", every
   * ball twice under the world transform at its position and radius -
   * wireframe, then solid with a zero colour. Each ball is its own owner.
   * Carbon declares minBounds/maxBounds here and never uses them.
   * @param {ITr2DebugRenderer2} renderer
   * @param {mat4} worldTransform
   */

  @meta.implemented
  RenderDebugInfo(renderer, worldTransform)
  {
    if (renderer.HasOption(this, "Cloud Balls"))
    {
      const color = 0x888888ff;

      for (const ball of this.balls)
      {
        renderer.DrawSphere__TransformCenterRadius(
          Tr2DebugObjectReference.create__Object(ball),
          worldTransform,
          ball.position,
          ball.radius,
          16,
          ITr2DebugRenderer2.Effect.Wireframe,
          Tr2DebugColor.create__Uint32(color));
        renderer.DrawSphere__TransformCenterRadius(
          Tr2DebugObjectReference.create__Object(ball),
          worldTransform,
          ball.position,
          ball.radius,
          16,
          ITr2DebugRenderer2.Effect.Solid,
          Tr2DebugColor.create__Uint32(0));
      }
    }
  }

  /**
   * Carbon `EveCloudEditableVolume::RenderDebugInfo( const Matrix& world,
   * Tr2RenderContext& )` (cpp:338-355), split from the renderer overload per
   * the overload rule. Under m_renderDebugInfo it draws a half-scaled oriented
   * box and one sphere per ball through Carbon's immediate-mode
   * Tr2Renderer::DrawOrientedBox / Tr2Renderer::DrawSphere, which have no
   * JavaScript port.
   * @param {mat4} _world
   * @param {Tr2RenderContext} _renderContext
   */

  @meta.notImplemented
  RenderDebugInfo__RenderContext(_world, _renderContext)
  {
    throw new Error("EveCloudEditableVolume.RenderDebugInfo__RenderContext requires Tr2Renderer::DrawOrientedBox and Tr2Renderer::DrawSphere, which are not ported.");
  }

  /** Native worker entry (cpp:232-237); iterator suspension replaces its OS thread. */

  @meta.adapted
  static *threadProc(params)
  {
    yield* EveCloudEditableVolume.rasterizeBalls(params);
    return 0;
  }

  /** Native animated worker entry (cpp:239-243); iterator suspension replaces its OS thread. */

  @meta.adapted
  static *threadProcAnimated(params)
  {
    yield* EveCloudEditableVolume.rasterizeBallsAnimated(params);
    return 0;
  }

  /** Native cpp:244-267; yields between rows and conversion blocks for portable scheduling. */

  @meta.adapted
  static *rasterizeBalls(params)
  {
    const pixels = new Float32Array(params.pixels.length); // alloc: native floating-point accumulation
    for (const ball of params.balls[0])
    {
      yield* EveCloudEditableVolume.rasterizeBall(ball, params, pixels);
      if (params.status !== Status.Working) { params.status = Status.Aborted; return; }
    }
    for (let index = 0; index < pixels.length; index++)
    {
      params.pixels[index] = Math.min(Math.max(num.linearToGamma(pixels[index]) * 255, 0), 255);
      if ((index & 16383) === 16383) yield;
    }
    params.status = Status.DataReady;
  }

  /** Native cpp:270-294 packs four opacity frames into R,G,B,A; yields replace worker execution. */

  @meta.adapted
  static *rasterizeBallsAnimated(params)
  {
    const pixels = new Float32Array(params.pixels.length); // alloc: native reusable frame accumulation
    const channels = [2, 1, 0, 3];
    for (let frame = 0; frame < MAX_FRAMES; frame++)
    {
      pixels.fill(0);
      for (const ball of params.balls[frame])
      {
        yield* EveCloudEditableVolume.rasterizeBall(ball, params, pixels);
        if (params.status !== Status.Working) { params.status = Status.Aborted; return; }
      }
      for (let index = 0; index < pixels.length; index += 4)
      {
        params.pixels[index + channels[frame]] = Math.min(Math.max(num.linearToGamma(pixels[index + 3]) * 255, 0), 255);
        if ((index & 16383) === 16380) yield;
      }
    }
    params.status = Status.DataReady;
  }

  /**
   * Native cpp:297-337 accumulates BGRA illumination/opacity over truncated bounds.
   * Adapted: row yields permit cooperative cancellation; the existing gamma
   * helpers and arithmetic use JavaScript intermediates while accumulated
   * channels round to float32; native floating-point byte identity is not claimed.
   */

  @meta.adapted
  static *rasterizeBall(ball, params, pixels)
  {
    const red = num.gammaToLinear(ball.selfIllumination[0]);
    const green = num.gammaToLinear(ball.selfIllumination[1]);
    const blue = num.gammaToLinear(ball.selfIllumination[2]);
    const dimensions = [params.width, params.height, params.depth];
    const minimum = dimensions.map((size, axis) => Math.max(Math.trunc((ball.position[axis] + 0.5 - ball.radius) * size), 0));
    const maximum = dimensions.map((size, axis) => Math.min(Math.trunc((ball.position[axis] + 0.5 + ball.radius) * size), size - 1));
    const f = Math.fround;
    for (let z = minimum[2]; z <= maximum[2]; z++)
    {
      const dz = f(f(z / params.depth) - 0.5 - ball.position[2]);
      for (let y = minimum[1]; y <= maximum[1]; y++)
      {
        if (params.status === Status.StopRequested) return;
        const dy = f(f(y / params.height) - 0.5 - ball.position[1]);
        for (let x = minimum[0]; x <= maximum[0]; x++)
        {
          const dx = f(f(x / params.width) - 0.5 - ball.position[0]);
          const quotient = f(f(Math.sqrt(f(f(f(dx * dx) + f(dy * dy)) + f(dz * dz)))) / ball.radius);
          // std::min(1.f, NaN) returns its first operand; Math.min would poison the voxel.
          const distance = quotient < 1 ? quotient : 1;
          const alpha = f(Math.pow(f(1 - distance), ball.falloff));
          const offset = (x + y * params.width + z * params.width * params.height) * 4;
          pixels[offset] += blue * alpha;
          pixels[offset + 1] += green * alpha;
          pixels[offset + 2] += red * alpha;
          pixels[offset + 3] += alpha * ball.opacity;
        }
        yield;
      }
    }
  }

}

