// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch.h
// Source: trinity/trinity/Eve/Renderable/Stretch/EveStretch.cpp
import "#consts/trinity";
import { Tr2Lod } from "#consts/trinity";
import { IEveSpaceObject2 } from "../../IEveSpaceObject2.js";
import { IEveTransform } from "../../IEveTransform.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsSchema, meta } from "#schema";
import { INotify, IsMatch, TimeAsDouble } from "#blue";
import { IEveFiringEffectElement } from "../../IEveFiringEffectElement.js";
import { EveComponentType } from "../../EveComponentTypes.js";
import { TriFloat } from "../../../core/variable/TriFloat.js";
import { Tr2CurveScalar } from "../../../curves/curve/Tr2CurveScalar.js";
import { translationMatrix } from "./CjsStretchRuntime.js";
import { sph3 } from "#math/sph3";


/**
 * An effect drawn between a source point and a destination point, hosting
 * transform children pinned at each end, stretched along the span, and
 * travelling from one end to the other.
 */
@meta.define({ className: "EveStretch", family: "eve/renderable/stretch" })
@meta.blue.inherit(IEveSpaceObject2, IEveTransform)
@meta.blue.mapInterface(INotify)
export class EveStretch extends IEveFiringEffectElement
{

  /** Carbon EveStretch.cpp:43: display controls component registry membership. */
  @meta.implemented
  OnModified(names)
  {
    if (IsMatch(names, "display")) this.ReRegister();
    return true;
  }

  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.string name = "";
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("ITriVectorFunction") source = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("ITriVectorFunction") dest = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("IStretchAudio") stretchAudio = null;
  @meta.blue.read
  @meta.type.int32
  @meta.type.enum("trinity.Tr2Lod")
  lodLevel = 0;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("ITriScalarFunction") progressCurve = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("TriCurveSet") moveCompletion = null;
  @meta.blue.read
  @meta.blue.persist
 @meta.type.list("TriCurveSet") curveSets = [];
  @meta.blue.read
  @meta.blue.persist
 @meta.type.model("TriFloat") length = new TriFloat();
  @meta.blue.readwrite @meta.type.boolean moving = false;
  @meta.blue.readwrite @meta.type.boolean moveCompleted = false;
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.boolean display = true;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.boolean update = true;
  @meta.blue.read
  @meta.blue.persist
 @meta.type.list("Tr2Light") destLights = [];
  @meta.blue.read
  @meta.blue.persist
 @meta.type.list("Tr2Light") sourceLights = [];
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("EveTransform") destObject = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("EveTransform") sourceObject = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("EveTransform") stretchObject = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.boolean useCurveLod = true;
  @meta.blue.read @meta.type.float64 startTime = -1;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("ITr2Audio") audio = null;
  @meta.blue.readwrite
  @meta.blue.persist
 @meta.type.model("EveTransform") moveObject = null;

  _sourcePosition = vec3.create();
  _destinationPosition = vec3.create();
  _sourceTransform = mat4.create();
  _destinationTransform = mat4.create();
  _useTransforms = false;
  _displaySource = true;
  _displayDestination = true;
  _sourceScale = 1;
  _destinationScale = 1;
  _negativeZ = false;

  /**
   * Samples the source and destination position curves for the frame; with no
   * source curve the source position falls back to the translation of the
   * transform last given to SetSourceTransform. Skipped entirely while update is
   * false.
   */
  @meta.blue.method @meta.implemented
  UpdateSynchronous(context)
  {
    if (!this.update) return true;
    // Carbon EveStretch.cpp:57-75: source and destination update through their Be::Time overloads.
    const time = context.GetTime();
    if (this.source) this.source.Update_Ticks(time, this._sourcePosition);
    else if (this._useTransforms) mat4.getTranslation(this._sourcePosition, this._sourceTransform);
    if (this.dest) this.dest.Update_Ticks(time, this._destinationPosition);
    return true;
  }

  /** Carbon's IEveSpaceObject2 spelling of UpdateSynchronous; forwards unchanged. */
  UpdateSyncronous(context)
  {
    return this.UpdateSynchronous(context);
  }

  /**
   * Advances the curves, records the endpoint separation in length, forwards the
   * asynchronous phase to the displayed endpoint children plus the stretch and
   * move children, and feeds both audio objects the current endpoints.
   */
  @meta.blue.method @meta.adapted
  @meta.reason("Carbon splits synchronous and asynchronous work; the browser graph keeps both phases but executes child calls serially.")
  UpdateAsynchronous(context)
  {
    if (!this.update) return true;
    this.UpdateCurves(context);
    this.length.value = vec3.distance(this._sourcePosition, this._destinationPosition);
    if (this.sourceObject && this._displaySource) this.sourceObject.Update(context);
    if (this.stretchObject) this.stretchObject.Update(context);
    if (this.moveObject) this.moveObject.Update(context);
    if (this.destObject && this._displayDestination) this.destObject.Update(context);
    // Carbon dynamic_cast<Tr2AudioStretchBase*>( m_audio ) (EveStretch.cpp:111-114); the audio layer registers the class.
    const audioBase = CjsSchema.GetConstructor("Tr2AudioStretchBase");
    const stretchAudioBase = audioBase ? CjsSchema.cast(this.audio, audioBase) : null;
    if (stretchAudioBase) stretchAudioBase.Update(this._sourcePosition, this._destinationPosition);
    if (this.stretchAudio)
    {
      this.stretchAudio.Update(this._sourcePosition, this._destinationPosition);
    }
    return true;
  }

  /**
   * Carbon's IEveSpaceObject2 spelling of UpdateAsynchronous; forwards
   * unchanged.
   */
  UpdateAsyncronous(context)
  {
    return this.UpdateAsynchronous(context);
  }

  /**
   * IEveFiringEffectElement synchronous hook; EveStretch does all of its firing
   * work in the asynchronous phase, so this only reports success.
   */
  UpdateEffectSync(context)
  {
    void context;
    return true;
  }

  /**
   * IEveFiringEffectElement asynchronous hook; runs both update phases through
   * Update.
   */
  UpdateEffectAsync(context)
  {
    return this.Update(context);
  }

  /**
   * Runs both update phases in order, for callers that drive the stretch outside
   * the scene's split synchronous/asynchronous pass.
   */
  @meta.blue.method @meta.implemented
  Update(context)
  {
    this.UpdateSynchronous(context);
    this.UpdateAsynchronous(context);
    return true;
  }

  /**
   * Carbon EveStretch::UpdateCurves (EveStretch.cpp:138-171), in its order: the
   * progress curve takes the time since startTime (latched on the first frame
   * after StartMoving), then the move-completion set and the curve sets take the
   * ABSOLUTE scene time, all in seconds.
   *
   * Adapted: Carbon's curve-LOD gate (`m_useCurveLod` with
   * EveLODHelper::ShouldUpdate on m_lodLevel) is not applied. lodLevel is set by
   * UpdateVisibility's child LOD merge, which is not ported, so the gate would
   * read the default level and update the curves once a second.
   */
  @meta.blue.method @meta.adapted
  UpdateCurves(context)
  {
    const time = context.GetTime();
    if (!this.update) return;
    if (this.moving && this.startTime === -1) this.startTime = time;
    if (this.moving && this.progressCurve) this.progressCurve.UpdateValue(TimeAsDouble(time - this.startTime));
    if (this.moveCompletion) this.moveCompletion.Update(TimeAsDouble(time), context.renderContext);
    for (const curveSet of this.curveSets) curveSet.Update(TimeAsDouble(time), context.renderContext);
  }

  /**
   * Places the endpoint, stretch and move children for the frame (Carbon EveStretch.cpp:175-294). The direction runs from
   * the destination back to the source. The source child points its Y axis along it, or in transform mode takes the
   * source transform under a -90 degree X correction. The destination child points its Y axis along it at its scale. The
   * stretch child is turned by TriQuaternionArcFromForward (which turns -Z onto the direction; the direction is first
   * flipped to source-to-destination unless the stretch is -Z forward) and scaled in Z by the length, or in transform
   * mode the source transform's Z is scaled by the length. The move child is turned the same way and slides from source
   * to destination with the progress curve. Carbon quirk, kept: the move direction is flipped once more when not -Z
   * forward, so when a stretch child was placed both flips cancel.
   * Adapted: the child LOD merge is not ported; parentTransform is unused, as in Carbon.
   */
  @meta.blue.method @meta.adapted
  UpdateVisibility(context, _parentTransform = EveStretch._identity)
  {
    if (!this.display) return;
    const { vec3_0, vec3_1, vec3_2, quat_0, mat4_0 } = EveStretch.scratch;
    vec3.normalize(vec3_0, vec3.subtract(vec3_0, this._sourcePosition, this._destinationPosition));
    const scalingLength = this.length.value;

    if (this.sourceObject && this._displaySource)
    {
      // Artwork is authored aligned to the y-axis rather than z, so transform mode adds a rotation.
      if (this._useTransforms) mat4.multiply(mat4_0, this._sourceTransform, EveStretch._sourceCorrection);
      else mat4.fromRotationTranslation(mat4_0, quat.rotationArc(quat_0, EveStretch._yAxis, vec3_0), this._sourcePosition);
      this.sourceObject.UpdateVisibility(context, mat4_0);
    }

    if (this.destObject && this._displayDestination)
    {
      vec3.set(vec3_2, this._destinationScale, this._destinationScale, this._destinationScale);
      mat4.fromRotationTranslationScale(mat4_0, quat.rotationArc(quat_0, EveStretch._yAxis, vec3_0), this._destinationPosition, vec3_2);
      this.destObject.UpdateVisibility(context, mat4_0);
    }

    if (this.stretchObject)
    {
      if (this._useTransforms)
      {
        // Carbon ScalingMatrix(1, 1, length) * m_sourceTransform: the source's Z axis stretched over the length.
        mat4.copy(mat4_0, this._sourceTransform);
        mat4_0[8] *= scalingLength;
        mat4_0[9] *= scalingLength;
        mat4_0[10] *= scalingLength;
      }
      else
      {
        if (!this._negativeZ) vec3.negate(vec3_0, vec3_0);
        vec3.set(vec3_2, 1, 1, scalingLength);
        mat4.fromRotationTranslationScale(mat4_0, quat.arcFromForward(quat_0, vec3_0), this._sourcePosition, vec3_2);
      }
      this.stretchObject.UpdateVisibility(context, mat4_0);
    }

    if (this.moveObject)
    {
      if (!this._negativeZ) vec3.negate(vec3_0, vec3_0);
      quat.arcFromForward(quat_0, vec3_0);
      vec3.copy(vec3_1, this._sourcePosition);
      const progressCurve = CjsSchema.cast(this.progressCurve, Tr2CurveScalar);
      if (this.progressCurve)
      {
        const progress = progressCurve ? progressCurve.GetCurrentValue() : 0;
        if (progress >= 1 && !this.moveCompleted)
        {
          if (this.moveCompletion) this.moveCompletion.Play();
          this.moveObject.SetDisplay(false);
          this.moveCompleted = true;
        }
        vec3.lerp(vec3_1, this._sourcePosition, this._destinationPosition, progress);
      }
      mat4.fromRotationTranslation(mat4_0, quat_0, vec3_1);
      this.moveObject.UpdateVisibility(context, mat4_0);
    }
  }

  /** Carbon's GetRenderables( renderables ): forwards with no impostor manager. */
  @meta.blue.method
  @meta.implemented
  GetRenderables(out)
  {
    return this.GetRenderables_Impostors(out, null);
  }

  /**
   * Appends the displayed children's renderables to out; this package stops at collection, and runtime-engine turns the collected objects into draw batches.
   * @returns {Array} out
   */
  @meta.blue.renamed("GetRenderables") @meta.adapted
  @meta.reason("Renderable collection is backend-neutral; runtime-engine turns the returned objects into draw batches.")
  GetRenderables_Impostors(out = [], impostors)
  {
    if (!this.display) return out;
    if (this.sourceObject && this._displaySource) this.sourceObject.GetRenderables_Impostors(out, impostors);
    if (this.destObject && this._displayDestination) this.destObject.GetRenderables_Impostors(out, impostors);
    if (this.stretchObject) this.stretchObject.GetRenderables_Impostors(out, impostors);
    if (this.moveObject) this.moveObject.GetRenderables_Impostors(out, impostors);
    return out;
  }

  /**
   * Restarts the travelling child from the source end: clears the latched start
   * time and the completion flag, re-shows the move child and fires the stretch
   * audio event.
   */
  @meta.blue.method @meta.implemented
  StartMoving()
  {
    this.startTime = -1;
    this.moving = true;
    this.moveCompleted = false;
    if (this.moveObject) this.moveObject.SetDisplay(true);
    // Carbon dynamic_cast<Tr2AudioStretchAuto*>( m_audio ) (cpp:340-343).
    const autoAudio = EveStretch._GetAutoAudio(this.audio);
    if (autoAudio) autoAudio.TriggerStretchEvent();
  }

  /** Starts the travelling child and plays the first curve set. */
  @meta.blue.method @meta.implemented
  Start()
  {
    this.StartMoving();
    if (this.curveSets.length) this.curveSets[0].Play();
  }

  /**
   * Shows or hides the whole stretch, gating visibility, renderable collection
   * and light contribution.
   */
  @meta.blue.method @meta.implemented
  SetDisplay(display)
  {
    this.display = !!display;
  }

  /**
   * Pins the source endpoint to a plain position, which also switches the
   * stretch out of transform mode so the source orientation is derived from the
   * span again.
   */
  @meta.blue.method @meta.implemented
  SetSourcePosition(value)
  {
    this._useTransforms = false;
    vec3.copy(this._sourcePosition, value);
  }

  /**
   * Pins the destination endpoint and rebuilds its transform as a pure
   * translation.
   */
  @meta.blue.method @meta.implemented
  SetDestinationPosition(value)
  {
    vec3.copy(this._destinationPosition, value);
    translationMatrix(value, this._destinationTransform);
  }

  /**
   * Pins the source endpoint from a full transform and switches the stretch into
   * transform mode, so UpdateVisibility uses the supplied orientation instead of
   * deriving one from the two endpoints.
   */
  @meta.blue.method @meta.implemented
  SetSourceTransform(value)
  {
    this._useTransforms = true;
    mat4.copy(this._sourceTransform, value);
    mat4.getTranslation(this._sourcePosition, value);
  }

  /**
   * Pins the destination endpoint from a full transform and takes its position
   * from that transform's translation.
   */
  @meta.blue.method @meta.implemented
  SetDestinationTransform(value)
  {
    mat4.copy(this._destinationTransform, value);
    mat4.getTranslation(this._destinationPosition, value);
  }

  /**
   * Reverses the direction the stretch child is scaled along, for effects
   * authored pointing down -Z.
   */
  @meta.blue.method @meta.implemented
  SetIsNegZForward(value)
  {
    this._negativeZ = !!value;
  }

  /**
   * Longest curve-set duration in seconds, each divided by that set's own time
   * scale.
   */
  @meta.blue.method @meta.implemented
  GetCurveDuration()
  {
    let duration = 0;
    for (const curveSet of this.curveSets)
    {
      duration = Math.max(duration, curveSet.GetMaxCurveDuration() / curveSet.GetTimeScale());
    }
    return duration;
  }

  /**
   * Begins a firing cycle by curve-set name convention: play_start and play_loop are played from -delay, play_end is stopped, and the audio outburst/impact/stretch events are triggered. Starting play_start also restarts the travelling child.
   * @param {Number} [delay] - seconds the curve sets wait before reaching time zero
   */
  @meta.blue.method @meta.implemented
  StartFiring(delay = 0)
  {
    for (const curveSet of this.curveSets)
    {
      if (!curveSet) continue;
      const name = curveSet.GetName();
      if (name === "play_start")
      {
        curveSet.PlayFrom(-delay);
        this.StartMoving();
      }
      else if (name === "play_loop") curveSet.PlayFrom(-delay);
      else if (name === "play_end") curveSet.Stop();
    }
    // Carbon cpp:464-475: the Tr2AudioStretchAuto events, then the stretch audio starts.
    const autoAudio = EveStretch._GetAutoAudio(this.audio);
    if (autoAudio)
    {
      autoAudio.TriggerOutburstEvent();
      autoAudio.TriggerImpactEvent();
      autoAudio.TriggerStretchEvent();
    }
    if (this.stretchAudio)
    {
      this.stretchAudio.Start();
    }
  }

  /**
   * Ends a firing cycle: play_start and play_loop stop, play_end plays, the
   * travelling child restarts and the stretch audio stops.
   */
  @meta.blue.method @meta.implemented
  StopFiring()
  {
    for (const curveSet of this.curveSets)
    {
      if (!curveSet) continue;
      const name = curveSet.GetName();
      if (name === "play_start")
      {
        curveSet.Stop();
        this.StartMoving();
      }
      else if (name === "play_loop") curveSet.Stop();
      else if (name === "play_end") curveSet.Play();
    }
    if (this.stretchAudio)
    {
      this.stretchAudio.Stop();
    }
  }

  /**
   * Sets both endpoints from a firing call, accepting either a 16-element source
   * transform or a source position, and marks the stretch as -Z forward.
   */
  @meta.blue.method @meta.implemented
  SetFiringTransform(source, destination)
  {
    if (source?.length === 16) this.SetSourceTransform(source);
    else this.SetSourcePosition(source);
    this.SetDestinationPosition(destination);
    this.SetIsNegZForward(true);
  }

  /**
   * Selects which endpoint children take part in updates, visibility, renderable
   * collection and light contribution.
   */
  @meta.blue.method @meta.implemented
  DisplayEndPoints(displaySource, displayDestination)
  {
    this._displaySource = !!displaySource;
    this._displayDestination = !!displayDestination;
  }

  /**
   * Uniform scale applied to the source endpoint child's basis and to its light
   * placement.
   */
  @meta.blue.method @meta.implemented
  SetSourceObjectScale(scale)
  {
    this._sourceScale = Number(scale);
  }

  /**
   * Uniform scale applied to the destination endpoint child's basis and to its
   * light placement.
   */
  @meta.blue.method @meta.implemented
  SetDestObjectScale(scale)
  {
    this._destinationScale = Number(scale);
  }

  /**
   * IEveFiringEffectElement intensity hook; EveStretch has no intensity term of
   * its own.
   */
  @meta.blue.method @meta.noop
  SetIntensity(_intensity)
  {
  }

  /**
   * Carbon GetBoundingSphere (EveStretch.cpp:363-394): the union of the
   * destination, source and stretch children's spheres, in that order; the
   * travelling child is not included.
   * @param {vec4} out - packed (x, y, z, radius), written when any child contributes
   * @param {number} [query] - BoundingSphereQuery forwarded to the children
   * @returns {Boolean} whether any child contributed a sphere
   */
  @meta.blue.method @meta.implemented
  GetBoundingSphere(out = vec4.create(), query = 0)
  {
    let valid = false;
    for (const child of [this.destObject, this.sourceObject, this.stretchObject])
    {
      if (child && child.GetBoundingSphere(EveStretch._sphere, query))
      {
        // BoundingSphereSetOrUpdate: the first sphere is copied, later ones grow it.
        if (valid) sph3.union(out, out, EveStretch._sphere);
        else vec4.copy(out, EveStretch._sphere);
        valid = true;
      }
    }
    return valid;
  }

  /**
   * Offers the source and destination lights to the light manager at their
   * endpoint positions, each scaled by its endpoint scale; a hidden stretch or a
   * hidden endpoint contributes nothing.
   */
  @meta.blue.method @meta.adapted
  @meta.reason("Light ownership is forwarded to browser light objects; device light-manager registration stays outside Trinity.")
  GetLights(lightManager)
  {
    if (!this.display) return;
    const source = translationMatrix(this._sourcePosition, EveStretch._lightSource, this._sourceScale);
    const destination = translationMatrix(this._destinationPosition, EveStretch._lightDestination, this._destinationScale);
    if (this._displaySource) for (const light of this.sourceLights) light.AddLight(lightManager, source, this._sourceScale);
    if (this._displayDestination) for (const light of this.destLights) light.AddLight(lightManager, destination, this._destinationScale);
  }

  /** Carbon EveStretch::RegisterComponents (cpp:606-613): LightOwner leaf
   * self-registration. Gate m_display. */
  @meta.blue.method @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  static Tr2Lod = Tr2Lod;
  static _identity = mat4.create();
  /** The audio as Carbon's Tr2AudioStretchAuto, or null; the audio layer registers the class. */
  static _GetAutoAudio(audio)
  {
    const autoType = CjsSchema.GetConstructor("Tr2AudioStretchAuto");
    return autoType ? CjsSchema.cast(audio, autoType) : null;
  }

  static _sphere = vec4.create();
  static _lightSource = mat4.create();
  static _lightDestination = mat4.create();
  static _sourceCorrection = mat4.fromXRotation(mat4.create(), -Math.PI * 0.5);
  static _yAxis = vec3.fromValues(0, 1, 0);
  static scratch = { vec3_0: vec3.create(), vec3_1: vec3.create(), vec3_2: vec3.create(), quat_0: quat.create(), mat4_0: mat4.create() };
}
