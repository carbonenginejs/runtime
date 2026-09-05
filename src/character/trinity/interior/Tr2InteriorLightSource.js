// Source: trinity/trinity/Interior/Tr2InteriorLightSource.h
//   trinity/trinity/Interior/Tr2InteriorLightSource.cpp
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { mat4 } from "#math/mat4";

/**
 * Authored interior light definition with position, color, falloff, cone, and
 * animation settings.
 */
@type.define({ className: "Tr2InteriorLightSource", family: "interior" })
export class Tr2InteriorLightSource extends CjsModel
{

  /** m_coneDirection (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.vec3
  coneDirection = vec3.fromValues(0, -1, 0);

  /** m_coneAlphaInner (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  coneAlphaInner = 180;

  /** m_coneAlphaOuter (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  coneAlphaOuter = 180;

  /** m_specularIntensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  specularIntensity = 1;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_primaryLighting (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  primaryLighting = true;

  /** m_falloff (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  falloff = 1;

  /** m_kelvinColor (Tr2KelvinColorPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2KelvinColor")
  kelvinColor = null;

  /** m_radius (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  radius = 1;

  /** m_position (Vector3) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  color = vec4.fromValues(1, 1, 1, 1);

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_useKelvinColor (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  useKelvinColor = false;

  // m_worldBoundingBox - protected, not Blue-exposed, so constructor-derived
  // instance state rather than a schema field (class-shape rules). The ctor
  // default is the (-1,-1,-1)..(1,1,1) unit box (cpp:37).
  #boundsMin = vec3.fromValues(-1, -1, -1);

  #boundsMax = vec3.fromValues(1, 1, 1);

  /** Carbon method IsSpotLight (MAP_METHOD_AND_WRAP, h:90-93). */
  @carbon.method
  @impl.implemented
  IsSpotLight()
  {
    return this.coneAlphaOuter < 89;
  }

  /** Carbon Initialize (cpp:59-63): derive the world box from position ± radius. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.#RebuildWorldBoundingBox();
    return true;
  }

  /**
   * Carbon OnModified (cpp:77-92) rebuilds the same box for position,
   * radius, coneAlphaOuter and coneDirection changes - both branches run the
   * identical rebuild, so the settled-state notification just rebuilds.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("CjsModel notifications expose settled state rather than Be::Var identity; Carbon's two OnModified branches perform the same rebuild, so no per-member dispatch is needed.")
  OnModified()
  {
    this.#RebuildWorldBoundingBox();
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
  @carbon.method
  @impl.implemented
  PopulateLightData(lightData)
  {
    const f32 = Math.fround;

    vec3.copy(lightData.position, this.position);
    lightData.radius = Math.max(this.radius, 0);

    if (this.useKelvinColor && this.kelvinColor)
    {
      // Carbon eagerly CreateInstance()s the kelvin record (cpp:42); here
      // hydration supplies it, and a null falls through to the rgb field.
      this.kelvinColor.GetColor(lightData.color);
    }
    else
    {
      vec3.set(lightData.color, this.color[0], this.color[1], this.color[2]);
    }
    vec3.gammaToLinear(lightData.color, lightData.color);

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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  IsInFrustum(frustum, outObjectToWorld = null)
  {
    if (!this.primaryLighting) return false;
    if (outObjectToWorld) mat4.fromTranslation(outObjectToWorld, this.position);
    return frustum.IsBoxVisible(this.#boundsMin, this.#boundsMax);
  }

  /** cpp:61 / cpp:81-91: the axis-aligned box at position ± radius, raw radius. */
  #RebuildWorldBoundingBox()
  {
    const r = this.radius;
    vec3.set(this.#boundsMin, this.position[0] - r, this.position[1] - r, this.position[2] - r);
    vec3.set(this.#boundsMax, this.position[0] + r, this.position[1] + r, this.position[2] + r);
  }

}
