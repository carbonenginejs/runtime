import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Eve/Volume/EveSphereVolume.h
// Source: trinity/trinity/Eve/Volume/EveSphereVolume.cpp
// Source: trinity/trinity/Eve/Volume/EveSphereVolume_Blue.cpp
import { IsMatch } from "#blue";
import { INotify } from "../../../global/blue/INotify.js";
import { color } from "#math/color";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { IEveVolume } from "./IEveVolume.js";
import { meta, type, blue } from "#schema";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_TRANSFORM = mat4.create();
const DEBUG_BASE_COLOR = color.create();
const DEBUG_COLOR = color.create();

// IEveVolume.h:18's default baseColor, Color( 0xFFFFFFFF ).
const DEFAULT_BASE_COLOR = color.fromARGB(color.create(), 0xFFFFFFFF);
// Carbon scales baseColor by the float literals 0.5f and 0.6f.
const OUTER_COLOR_SCALE = 0.5;
const INNER_COLOR_SCALE = Math.fround(0.6);

// Scratch for the TranslationMatrix temporary.
const DEBUG_TRANSLATION = mat4.create();


/**
 * Sphere of influence with a solid inner radius and a falloff out to the outer
 * radius, weighting points and seeding random ones inside it.
 */
@be.define("EveSphereVolume")
@blue.inherit(INotify)
@be.mapInterface(IEveVolume)
@be.mapInterface(INotify)
export class EveSphereVolume extends IEveVolume
{
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.vec3
  position = vec3.create();

  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.float32
  radius = 1;

  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.float32
  innerRadius = 1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  _callbacks = new Map();

  _nextCallbackId = 1;

  /** Returns a fresh sphere centred on the volume position with its outer radius. */

  @meta.adapted
  GetBoundingSphere()
  {
    return {
      center: vec3.clone(this.position),
      radius: this.radius
    };
  }

  /**
   * Returns the falloff weight for a point given in the volume's own space: 1
   * within the inner radius, 0 past the outer radius, and a ramp that is linear
   * in squared distance between them.
   */

  @meta.implemented
  GetIntensity(position)
  {
    const distanceSq = vec3.squaredDistance(position, this.position);
    const outerRadiusSq = this.radius * this.radius;
    if (distanceSq > outerRadiusSq)
    {
      return 0;
    }
    const innerRadiusSq = this.innerRadius * this.innerRadius;
    if (distanceSq <= innerRadiusSq)
    {
      return 1;
    }
    const interpolationDistance = outerRadiusSq - innerRadiusSq;
    return interpolationDistance > 0 ? 1 - (distanceSq - innerRadiusSq) / interpolationDistance : 0;
  }

  /**
   * Appends random points expressed relative to the sphere centre rather than offset by its position, spread in direction uniformly over the sphere and in distance between the inner and outer radius as shaped by fallOffFactor.
   *
   * @param points Caller-owned array the new points are pushed onto.
   * @param excludeInnerVolume Keeps every point outside the inner radius.
   */

  @meta.adapted
  GeneratePointsInVolume(points, howManyToAdd, excludeInnerVolume, fallOffFactor)
  {
    const count = Math.max(0, Math.trunc(howManyToAdd));
    const radiusRange = this.radius - this.innerRadius;
    let innerSelectionChance = 0;
    if (!excludeInnerVolume)
    {
      const adjustedOuterRadius = this.innerRadius + 0.5 * radiusRange;
      innerSelectionChance = this.innerRadius ** 2 / adjustedOuterRadius ** 2;
    }

    for (let i = 0; i < count; i++)
    {
      let distance;
      if (excludeInnerVolume)
      {
        distance = this.innerRadius + radiusRange * Math.pow(carbonRandom.triFloatRandom01(), 1 / 3);
      }
      else if (carbonRandom.triFloatRandom01() < innerSelectionChance)
      {
        distance = this.innerRadius * Math.pow(carbonRandom.triFloatRandom01(), 1 / 3);
      }
      else
      {
        distance = this.innerRadius + radiusRange * Math.pow(carbonRandom.triFloatRandom01(), fallOffFactor);
      }

      const angle = Math.PI * 2 * carbonRandom.triFloatRandom01();
      const z = carbonRandom.triFloatRandom01() * 2 - 1;
      const radial = Math.sqrt(1 - z * z);
      points.push(vec3.fromValues(
        radial * Math.cos(angle) * distance,
        radial * Math.sin(angle) * distance,
        z * distance
      ));
    }
  }

  /**
   * Registers a callback fired whenever the volume changes, returning the id
   * needed to unregister it again.
   */

  @meta.adapted
  RegisterForChanges(callback)
  {
    const id = this._nextCallbackId++;
    this._callbacks.set(id, callback);
    return id;
  }

  /** Drops a change callback by the id RegisterForChanges returned. */

  @meta.implemented
  UnregisterForChanges(callbackId)
  {
    this._callbacks.delete(callbackId);
  }

  /**
   * Clamps the radii so the outer radius stays non-negative and never smaller
   * than the inner one, then notifies every registered listener.
   */

  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "innerRadius") && this.innerRadius > this.radius)
    {
      this.radius = this.innerRadius;
    }
    if (IsMatch(propertyName, "radius"))
    {
      this.radius = Math.max(0, this.radius);
      if (this.innerRadius > this.radius)
      {
        this.innerRadius = this.radius;
      }
    }
    for (const callback of this._callbacks.values())
    {
      callback?.();
    }
    return true;
  }

  /**
   * Carbon EveSphereVolume::RenderDebugInfo (EveSphereVolume.cpp:20-24): the
   * outer and inner spheres as 20-segment wireframes translated to their
   * centres, at 0.5 and 0.6 of baseColor - Carbon's Color * float scales all
   * four channels, alpha included (Color_inline.h:125-128).
   *
   * Carbon's members are m_outerSphere and m_innerSphere (EveSphereVolume.h:38-39);
   * the exposed attributes map position, radius and innerRadius onto
   * m_outerSphere.center, m_outerSphere.radius and m_innerSphere.radius
   * (EveSphereVolume_Blue.cpp:16-18). m_innerSphere.center is zero from the
   * constructor (cpp:10) and nothing writes it, so Carbon's
   * TranslationMatrix( m_outerSphere.center + m_innerSphere.center ) is the
   * translation to position here.
   *
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {mat4} parentTransform The parent's world transform.
   * @param {vec4} [baseColor] Base colour, Carbon's `const Color&`; defaults to Color( 0xFFFFFFFF ).
   */

  @meta.implemented
  RenderDebugInfo(renderer, parentTransform, baseColor = DEFAULT_BASE_COLOR)
  {
    const owner = Tr2DebugObjectReference.create__Object(this);
    color.copy(DEBUG_BASE_COLOR, baseColor);

    // Carbon TranslationMatrix( m_outerSphere.center ) * parentTransform (row-vector).
    mat4.multiply(DEBUG_TRANSFORM, parentTransform, mat4.fromTranslation(DEBUG_TRANSLATION, this.position));
    color.scale(DEBUG_COLOR, DEBUG_BASE_COLOR, OUTER_COLOR_SCALE);
    renderer.DrawSphere__TransformRadius(owner, DEBUG_TRANSFORM, this.radius, 20,
      ITr2DebugRenderer2.Effect.Wireframe, Tr2DebugColor.create__Color(DEBUG_COLOR));

    // Carbon TranslationMatrix( m_outerSphere.center + m_innerSphere.center ) * parentTransform
    // (row-vector); m_innerSphere.center is always zero, so the translation is unchanged.
    color.scale(DEBUG_COLOR, DEBUG_BASE_COLOR, INNER_COLOR_SCALE);
    renderer.DrawSphere__TransformRadius(owner, DEBUG_TRANSFORM, this.innerRadius, 20,
      ITr2DebugRenderer2.Effect.Wireframe, Tr2DebugColor.create__Color(DEBUG_COLOR));
  }
}

// Exact native Blue exposure: only these identities participate in loading.
