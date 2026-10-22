import { exposure as be } from "#be";
// Source: audio/src/AudEmitter.h + AudEmitter.cpp
// Hand-owned since 2026-07-18 (behavior port); the generator skips this file.
// Verify against audio/AudEmitter.json.
import { meta, type, blue } from "#schema";
import { ITr2DebugRenderable } from "#interfaces/ITr2DebugRenderable";
import { IBlueEventListener, IBluePlacementObserver } from "#blue";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { color as colorMath } from "#math/color";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
import { AudGameObjResource } from "./AudGameObjResource.js";
import { ITr2AudEmitter } from "../trinityAudioApi/ITr2AudEmitter.js";

// Debug render toggle names (AudEmitter.cpp:11-15).
const AUDIO_ATTENUATION_SPHERE_DEBUG_OPTION = "Audio Attenuation Sphere";
const AUDIO_EMITTER_DIRECTION_DEBUG_OPTION = "Audio Emitter Direction";

/**
 * TRI_DBG_FONT_SMALL (ITr2DebugRenderer2.h:19-24). The audio layer does not import
 * trinity, where the TriDebugFont table lives, so the value is named here.
 */
const TRI_DBG_FONT_SMALL = 0;

// _RenderDebugDirection's direction and arrow end; debug drawing is single-threaded.
const ARROW_DIRECTION = vec3.create();
const ARROW_END = vec3.create();

/**
 * Carbon: DebugUtilities::GenerateRandomNumber (audio/src/DebugUtilities.cpp:19-23):
 * `minRange + rand() / RAND_MAX * ( maxRange - minRange )`, with `Math.random()` for `rand()`.
 *
 * @param {number} minRange Lower bound.
 * @param {number} maxRange Upper bound.
 * @returns {number} A random number between the bounds.
 */
function GenerateRandomNumber(minRange, maxRange)
{
  return Math.fround(minRange + Math.random() * (maxRange - minRange));
}

/**
 * Carbon: DebugUtilities::GenerateDebugColor (audio/src/DebugUtilities.cpp:10-17): an
 * opaque colour whose channels are random in the range and never below 0.3.
 *
 * @param {number} minRange Lower bound of each channel.
 * @param {number} maxRange Upper bound of each channel.
 * @returns {Float32Array} The colour.
 */
function GenerateDebugColor(minRange, maxRange)
{
  const rand1 = Math.max(GenerateRandomNumber(minRange, maxRange), Math.fround(0.3));
  const rand2 = Math.max(GenerateRandomNumber(minRange, maxRange), Math.fround(0.3));
  const rand3 = Math.max(GenerateRandomNumber(minRange, maxRange), Math.fround(0.3));
  return colorMath.fromValues(rand1, rand2, rand3, 1);
}

/** Represents the concrete content-facing audio emitter (ITr2AudEmitter) with authored placement and attenuation controls. */
@be.define("AudEmitter")
@be.inherit(ITr2AudEmitter, IBlueEventListener, IBluePlacementObserver, ITr2DebugRenderable)
@be.mapInterface(IBlueEventListener)
@be.mapInterface(IBluePlacementObserver)
@be.mapInterface(ITr2AudEmitter)
@be.mapInterface(ITr2DebugRenderable)
@be.exposureChainTo(AudGameObjResource)
export class AudEmitter extends AudGameObjResource
{

  /** m_authoredRotation (Quaternion) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.quat
  rotation = quat.create();

  /** Effective front vector sent to Wwise; Carbon's read-only `front` property (GetFront). */
  @be.mapPropertyReadOnly()
  @type.vec3
  get front()
  {
    return this.GetFront();
  }

  /** Effective top vector sent to Wwise; Carbon's read-only `top` property (GetTop). */
  @be.mapPropertyReadOnly()
  @type.vec3
  get top()
  {
    return this.GetTop();
  }

  /** m_normalizeAttenuationScaling (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  normalizeAttenuationScaling = false;

  /** m_visualizationRadius (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  visualizationRadius = 0;

  /** m_maxNormalizedValue (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  maxNormalizedValue = 9000;

  /** m_maxNormalizedScalingFactor (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  maxNormalizedScalingFactor = 3.5;

  /** m_minNormalizedValue (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  minNormalizedValue = 30;

  /** m_minNormalizedScalingFactor (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  minNormalizedScalingFactor = 0.4;

  /**
   * m_debugColor (Color, AudEmitter.h:76): the emitter's debug colour, random per emitter
   * (AudEmitter.cpp:23, 40) and red once code scales its attenuation.
   */
  @meta.implemented
  _debugColor = GenerateDebugColor(0.4, 0.9);

  /** m_simulationColor (Color, AudEmitter.h:77): green, `0xff00ff00` (AudEmitter.cpp:24, 41). */
  @meta.implemented
  _simulationColor = colorMath.fromARGB(colorMath.create(), 0xff00ff00);

  /**
   * Carbon `Py__init__` (AudEmitter_Blue.cpp), the Python constructor: sets
   * the name, then runs the no-argument `Initialize()`.
   *
   * @param {string} [name] Emitter name; Carbon defaults it to empty.
   */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.renamed("Py__init__")
  @meta.implemented
  __init__(name = "")
  {
    this.name = name;
    this.Initialize();
  }

  /** Carbon method SendEvent -> PostEvent (ITr2AudEmitter). */
  @be.mapMethodAndWrapOptionalArgs()
  @meta.implemented
  SendEvent(name, bypassPrefix = false)
  {
    return this.PostEvent(name, bypassPrefix);
  }

  /** Carbon method HandleEvent (IBlueEventListener): event tracks post directly on this emitter. */

  @meta.implemented
  HandleEvent(eventName)
  {
    this.PostEvent(eventName);
  }

  /**
   * Carbon method SetPosition (AudEmitter.cpp:75-79): the one place Carbon marks
   * a game object as placed (which lets Wake register it), then applies the
   * parent placement.
   */
  @be.mapMethodAndWrap("SetPlacement")
  @meta.implemented
  SetPosition(front, top, position)
  {
    this._hasReceivedPosition = true;
    return this.SetPlacementFromParent(front, top, position);
  }

  /** Carbon Blue method SetPlacement -> SetPosition. */
  @meta.renamed("SetPosition")
  @meta.implemented
  SetPlacement(front, top, position)
  {
    return this.SetPosition(front, top, position);
  }

  /** Carbon method UpdatePlacement: placement observers forward here. */

  @meta.implemented
  UpdatePlacement(front, top, position)
  {
    this.SetPosition(front, top, position);
  }

  // Linear remap of the input from [minNormalizedValue, maxNormalizedValue]
  // to [minNormalizedScalingFactor, maxNormalizedScalingFactor]. Carbon does
  // NOT clamp - out-of-domain inputs extrapolate. Preserved.
  /** Carbon method SetAttenuationScalingFactor: optional normalization, then base store/push. */

  @meta.implemented
  SetAttenuationScalingFactor(scalingFactor)
  {
    let finalScalingFactor = scalingFactor;
    if (this.normalizeAttenuationScaling)
    {
      finalScalingFactor = (scalingFactor - this.minNormalizedValue)
        * (this.maxNormalizedScalingFactor - this.minNormalizedScalingFactor)
        / (this.maxNormalizedValue - this.minNormalizedValue)
        + this.minNormalizedScalingFactor;
    }
    // Emitter's whose attenuation is affected by code will always show red in debug.
    colorMath.fromARGB(this._debugColor, 0xaaff0000);
    return super.SetAttenuationScalingFactor(finalScalingFactor);
  }

  /** Carbon method SetName (ITr2AudEmitter). */

  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Carbon method GetName (ITr2AudEmitter). */

  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method SetPrefix (ITr2AudEmitter). */

  @meta.implemented
  SetPrefix(prefix)
  {
    this.eventPrefix = String(prefix ?? "");
  }

  /** Carbon method SetVisibility (ITr2AudEmitter). */

  @meta.implemented
  SetVisibility(isVisible)
  {
    this.isVisible = !!isVisible;
  }

  /**
   * Carbon: AudEmitter::GetDebugOptions (AudEmitter.cpp:125-129; AudEmitter.h:61): offers
   * the attenuation sphere and emitter direction toggles.
   *
   * @param {Set<string>} options The caller-owned option set.
   */
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add(AUDIO_ATTENUATION_SPHERE_DEBUG_OPTION);
    options.add(AUDIO_EMITTER_DIRECTION_DEBUG_OPTION);
  }

  /**
   * Carbon: AudEmitter::RenderDebugInfo (AudEmitter.cpp:131-141; AudEmitter.h:62): draws the
   * sphere, direction arrow and name, but only for an emitter that is not culled while
   * audio is enabled.
   *
   * Adapted: `g_audioManager` is the `AudGameObjResource.manager` seam.
   *
   * @param {ITr2DebugRenderer2} renderer The renderer to draw with.
   */
  @meta.adapted
  RenderDebugInfo(renderer)
  {
    const manager = AudGameObjResource.manager;

    if (this._culled || manager === null || manager.GetState() !== "enabled")
    {
      return;
    }

    this._RenderDebugBoundingSphere(renderer);
    this._RenderDebugDirection(renderer);
    this._RenderDebugName(renderer);
  }

  /**
   * Carbon: AudEmitter::RenderDebugBoundingSphere (AudEmitter.cpp:143-164; AudEmitter.h:65),
   * protected: the visualisation sphere (scaled by the attenuation factor, in the
   * simulation colour) and the emitter's range sphere (in the debug colour), as
   * wireframes with 8 segments plus one per 5000 of radius, at most 25.
   * Drawn only when every emitter is shown or the attenuation-sphere option is on.
   *
   * Adapted: `g_debugDisplayAllEmitters` is the manager's flag (`GetDebugDisplayAllEmitters`).
   * The range is `max( m_visualizationRadius, AK::SoundEngine::Query::GetMaxRadius( m_ID ) )`
   * in Carbon; that Wwise query has no seam on the sound-engine interface, so the
   * authored radius this emitter already tracks for its posted events
   * (`GetMaxAttenuationRadius` is its square times the scaling factor) stands in:
   * `sqrt( radiusSq ) * scalingFactor`.
   *
   * @param {ITr2DebugRenderer2} renderer The renderer to draw with.
   */
  @meta.adapted
  _RenderDebugBoundingSphere(renderer)
  {
    if (!(AudGameObjResource.manager.GetDebugDisplayAllEmitters()
      || renderer.HasOption(this, AUDIO_ATTENUATION_SPHERE_DEBUG_OPTION)))
    {
      return;
    }

    const BASE_SEGMENTS = 8;
    const RADIUS_PER_SEGMENT = 5000;
    const MAX_SEGMENTS = 25;

    let debugSphereSegments = Math.trunc(BASE_SEGMENTS + this.visualizationRadius / RADIUS_PER_SEGMENT);
    debugSphereSegments = Math.min(debugSphereSegments, MAX_SEGMENTS);

    const owner = Tr2DebugObjectReference.create__Object(this);

    if (this.visualizationRadius > 0)
    {
      const scaledRadius = this.visualizationRadius * this.scalingFactor;
      renderer.DrawSphere__CenterRadius(owner, this.position, scaledRadius, debugSphereSegments,
        ITr2DebugRenderer2.Effect.Wireframe, Tr2DebugColor.create__Color(this._simulationColor));
    }

    const emitterRange = Math.max(this.visualizationRadius, Math.sqrt(this._maxAttenuationRadiusSq) * this.scalingFactor);
    renderer.DrawSphere__CenterRadius(owner, this.position, emitterRange, debugSphereSegments,
      ITr2DebugRenderer2.Effect.Wireframe, Tr2DebugColor.create__Color(this._debugColor));
  }

  /**
   * Carbon: AudEmitter::RenderDebugDirection (AudEmitter.cpp:166-197; AudEmitter.h:66),
   * protected: a solid arrow along the effective front vector, its length 0.025 of the
   * distance to the listener clamped to 25..250 and its radius 0.035 of its length with a
   * 1.5 floor, under the direction option.
   *
   * Adapted: the effective front is `GetFront()`, which is Carbon's `m_effectiveOrientation.front`.
   *
   * @param {ITr2DebugRenderer2} renderer The renderer to draw with.
   */
  @meta.adapted
  _RenderDebugDirection(renderer)
  {
    if (!renderer.HasOption(this, AUDIO_EMITTER_DIRECTION_DEBUG_OPTION))
    {
      return;
    }

    const ARROW_LENGTH_PER_DISTANCE = 0.025;
    const ARROW_MIN_LENGTH = 25.0;
    const ARROW_MAX_LENGTH = 250.0;
    const ARROW_RADIUS_PER_LENGTH = 0.035;
    const ARROW_MIN_RADIUS = 1.5;
    const ARROW_POINTER_LENGTH = 0.22;
    const ARROW_SEGMENTS = 12;

    const listener = AudGameObjResource.manager.GetListener();
    const distanceToListener = vec3.distance(this.position, listener.GetPosition());
    const arrowLength = Math.min(Math.max(distanceToListener * ARROW_LENGTH_PER_DISTANCE, ARROW_MIN_LENGTH), ARROW_MAX_LENGTH);
    const arrowRadius = Math.max(arrowLength * ARROW_RADIUS_PER_LENGTH, ARROW_MIN_RADIUS);

    const direction = vec3.normalize(ARROW_DIRECTION, this.GetFront());
    const end = vec3.scaleAndAdd(ARROW_END, this.position, direction, arrowLength);

    renderer.DrawArrow(
      Tr2DebugObjectReference.create__Object(this),
      this.position,
      end,
      arrowRadius,
      ARROW_POINTER_LENGTH,
      ARROW_SEGMENTS,
      ITr2DebugRenderer2.Effect.Solid,
      Tr2DebugColor.create__Color(this._debugColor)
    );
  }

  /**
   * Carbon: AudEmitter::RenderDebugName (AudEmitter.cpp:199-211; AudEmitter.h:67),
   * protected: the name and game-object id in the small debug font, shown when every
   * emitter is shown or either option is on.
   *
   * Carbon quirk (cpp:209): the built string is passed as DrawText's printf format, so a
   * name holding `%` is read as a conversion. Reproduced.
   *
   * @param {ITr2DebugRenderer2} renderer The renderer to draw with.
   */
  @meta.adapted
  _RenderDebugName(renderer)
  {
    if (!AudGameObjResource.manager.GetDebugDisplayAllEmitters()
      && !renderer.HasOption(this, AUDIO_ATTENUATION_SPHERE_DEBUG_OPTION)
      && !renderer.HasOption(this, AUDIO_EMITTER_DIRECTION_DEBUG_OPTION))
    {
      return;
    }

    const debugName = `${this.name}(${this.ID})`;
    renderer.DrawText(TRI_DBG_FONT_SMALL, this.position, colorMath.toARGB(this._debugColor), debugName);
  }

}
