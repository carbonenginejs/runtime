import { ITr2DebugRenderable } from "#interfaces/ITr2DebugRenderable";
// Source: trinity/trinity/Interior/Tr2InteriorLightSource.h
//   trinity/trinity/Interior/Tr2InteriorLightSource.cpp
import { meta, type, blue } from "#schema";
import { IInitialize, INotify, IsMatch } from "#blue";
import { ITr2InteriorLight } from "./ITr2InteriorLight.js";
import { color } from "#math/color";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { mat4 } from "#math/mat4";
import { Tr2KelvinColor } from "../../../trinity/core/lighting/Tr2KelvinColor.js";

/**
 * Authored interior light definition with position, color, falloff, cone, and
 * animation settings.
 */
@blue.define("Tr2InteriorLightSource")
@blue.inherit(IInitialize, INotify, ITr2InteriorLight, ITr2DebugRenderable)
@blue.interface(IInitialize, INotify, ITr2InteriorLight)
export class Tr2InteriorLightSource
{
  /** PopulateLightData's AsRGB result. */
  static _kelvinScratch = vec4.create();


  /** m_coneDirection (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec3
  coneDirection = vec3.fromValues(0, -1, 0);

  /** m_coneAlphaInner (float) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  coneAlphaInner = 180;

  /** m_coneAlphaOuter (float) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  coneAlphaOuter = 180;

  /** m_specularIntensity (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  specularIntensity = 1;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_primaryLighting (bool) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  primaryLighting = true;

  /** m_falloff (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  falloff = 1;

  /**
   * m_kelvinColor (Tr2KelvinColorPtr) [READWRITE, PERSIST]
   *
   * A pointer member, but the Carbon constructor CreateInstance()s it
   * (cpp:42), so the record exists with the light.
   */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2KelvinColor")
  kelvinColor = new Tr2KelvinColor();

  /** m_radius (float) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  radius = 1;

  /** m_position (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  /** m_color (Color) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_useKelvinColor (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  useKelvinColor = false;

  // m_worldBoundingBox - protected, not Blue-exposed, so constructor-derived
  // instance state rather than a schema field (class-shape rules). The ctor
  // default is the (-1,-1,-1)..(1,1,1) unit box (cpp:37).
  _boundsMin = vec3.fromValues(-1, -1, -1);

  _boundsMax = vec3.fromValues(1, 1, 1);

  /** Carbon method IsSpotLight (MAP_METHOD_AND_WRAP, h:90-93). */
  @blue.method
  @meta.implemented
  IsSpotLight()
  {
    return this.coneAlphaOuter < 89;
  }

  /** Carbon Initialize (cpp:59-63): derive the world box from position ± radius. */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this._RebuildWorldBoundingBox();
    return true;
  }

  /**
   * Carbon OnModified (cpp:77-92): a change to position, radius,
   * coneAlphaOuter or coneDirection rebuilds the world bounding box. Carbon's
   * two branches run the same rebuild.
   *
   * @param {string|null} [value=null] The modified member, by exposed name.
   * @returns {boolean} Always true.
   */
  @blue.method
  @meta.implemented
  OnModified(value = null)
  {
    if (IsMatch(value, "position") || IsMatch(value, "radius")
      || IsMatch(value, "coneAlphaOuter") || IsMatch(value, "coneDirection"))
    {
      this._RebuildWorldBoundingBox();
    }
    return true;
  }

  /**
   * Carbon PopulateLightData (cpp:100-138), literal: raw radius clamps at
   * zero (a NEGATIVE authored radius means "box light in forward rendering"
   * - the comment is load-bearing), colour comes from the kelvin record or
   * the rgb field and is gamma-2.2 linearized, both shadow influences zero,
   * the inner angle clamps to outer - 1 BEFORE the spotlight test, a
   * non-spot forces BOTH angles to 360 (discarding that clamp), and the
   * cone direction normalizes into the record.
   *
   * @param {object} lightData Tr2InteriorPerObjectLightData-shaped record.
   * @returns {object} lightData
   */
  @blue.method
  @meta.implemented
  PopulateLightData(lightData)
  {
    const f32 = Math.fround;

    vec3.copy(lightData.position, this.position);
    lightData.radius = Math.max(this.radius, 0);

    if (this.useKelvinColor && this.kelvinColor)
    {
      // The field holds the record Carbon CreateInstance()s (cpp:42). Carbon
      // has no null test here (cpp:105-107); this one only sends a read that
      // wrote null into the pointer to the rgb field.
      // Carbon cpp:107-108: Color k = AsRGB(); color = Vector3( k.r, k.g, k.b ).
      const k = this.kelvinColor.AsRGB(Tr2InteriorLightSource._kelvinScratch);
      vec3.set(lightData.color, k[0], k[1], k[2]);
    }
    else
    {
      vec3.set(lightData.color, this.color[0], this.color[1], this.color[2]);
    }
    color.gammaToLinear(lightData.color, lightData.color);

    lightData.pointLightFalloff = this.falloff;
    lightData.shadow0Influence = 0;
    lightData.shadow1Influence = 0;

    let innerAngle = this.coneAlphaInner;
    let outerAngle = this.coneAlphaOuter;
    if (innerAngle + 1 > outerAngle)
    {
      innerAngle = outerAngle - 1;
    }
    if (!this.IsSpotLight())
    {
      outerAngle = innerAngle = 360;
    }

    lightData.coneCosAlphaOuter = f32(Math.cos(f32(outerAngle * (Math.PI / 180))));
    lightData.coneCosAlphaInner = f32(Math.cos(f32(innerAngle * (Math.PI / 180))));
    vec3.normalize(lightData.spotDirection, this.coneDirection);
    return lightData;
  }

  /**
   * Carbon Update (cpp:146-152): forward the time to every curve set.
   *
   * @param {number} time Seconds.
   */
  @blue.method
  @meta.implemented
  Update(time)
  {
    for (let i = 0; i < this.curveSets.length; i++)
    {
      this.curveSets[i].Update(time);
    }
  }

  /**
   * Carbon IsInFrustum (cpp:154-162): a non-primary light is never in
   * frustum; otherwise the out matrix becomes the light's translation and
   * the world box answers.
   *
   * @param {object} frustum TriFrustum-shaped culler.
   * @param {Float32Array} [outObjectToWorld] Receives the translation matrix.
   * @returns {boolean}
   */
  @blue.method
  @meta.implemented
  IsInFrustum(frustum, outObjectToWorld = null)
  {
    if (!this.primaryLighting) return false;
    if (outObjectToWorld) mat4.fromTranslation(outObjectToWorld, this.position);
    return frustum.IsBoxVisible__BoundsMinMax(this._boundsMin, this._boundsMax);
  }

  /** cpp:61 / cpp:81-91: the axis-aligned box at position ± radius, raw radius. */
  _RebuildWorldBoundingBox()
  {
    const r = this.radius;
    vec3.set(this._boundsMin, this.position[0] - r, this.position[1] - r, this.position[2] - r);
    vec3.set(this._boundsMax, this.position[0] + r, this.position[1] + r, this.position[2] + r);
  }

}

