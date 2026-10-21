import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightSpotLight.h
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightSpotLight.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightSpotLight_Blue.cpp
// Promoted to hand-maintained source 2026-08-22; the renderer obligation remains explicit.
import { meta, type, blue } from "#schema";
import { Tr2Light } from "../lights/Tr2Light.js";
import { EveSmartLightPointLight } from "./EveSmartLightPointLight.js";
import { num } from "#math/num";
import { color } from "#math/color";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

/** Carbon's TRI_2PI float constant (Include/TriMath.h:245). */
const TRI_2PI = Math.fround(6.283185307);

/** A spot-light specialization with persisted cone angles. */
@be.define("EveSmartLightSpotLight")
@be.exposureChainTo(EveSmartLightPointLight)
export class EveSmartLightSpotLight extends EveSmartLightPointLight
{

  // Carbon maps these rows into the embedded LightData m_lightGroupData
  // (EveSmartLightPointLight.h:41). Each is an attribute over that path, as
  // Tr2SkinnedObject's m_lod rows are: the accessors only read and write the
  // record.

  /** m_lightGroupData.innerAngle (float) [READWRITE, PERSIST] (EveSmartLightSpotLight_Blue.cpp:33). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  get innerAngle()
  {
    return this._lightGroupData.innerAngle;
  }

  /** Writes m_lightGroupData.innerAngle. */
  set innerAngle(value)
  {
    this._lightGroupData.innerAngle = value;
  }

  /** m_lightGroupData.outerAngle (float) [READWRITE, PERSIST] (EveSmartLightSpotLight_Blue.cpp:34). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  get outerAngle()
  {
    return this._lightGroupData.outerAngle;
  }

  /** Writes m_lightGroupData.outerAngle. */
  set outerAngle(value)
  {
    this._lightGroupData.outerAngle = value;
  }

  /** m_lightType override - the constructor's only job (EveSmartLightSpotLight.cpp:7-11). */
  lightType = Tr2Light.SPOT_LIGHT;

  /**
   * Carbon EveSmartLightSpotLight::RenderDebugInfo
   * (EveSmartLightSpotLight.cpp:13-56): behind the "smartLightSets" option
   * and `display`, two solid cones per placement, outer (radius, outer angle)
   * then inner (inner radius, inner angle).
   *
   * Radii scale by the product of the largest initial and additional scale
   * components, the inner radius rounded through Float_16. The cone apex sits
   * at the static offset rotated by the placement rotation (skipped when the
   * offset is zero) plus both placement translations; the cone turns from
   * Carbon's forward onto the negated, rotated +Y axis, then by the static
   * offset rotation, and is followed by the captured world transform. The
   * colour is the group colour * brightness at alpha 0.03, with alpha steps of
   * 0.025 for the selected and inner variants.
   *
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {Array<object>} placements Placement data with identifiers.
   * @param {number} size Number of placements to draw.
   */

  @meta.implemented
  RenderDebugInfo(renderer, placements, size)
  {
    if (!renderer.HasOption(this, "smartLightSets") || !this.display)
    {
      return;
    }

    const statics = EveSmartLightSpotLight;
    const baseColor = color.scale(statics._debugBaseColor, this.GetGroupColor(), this._lightGroupData.brightness);
    baseColor[3] = 0.03;
    const colorMod = statics._debugColorMod;

    for (let index = 0; index < size; index++)
    {
      const placement = placements[index];

      let perLightScaling = Math.max(Math.max(placement.initialScale[0], placement.initialScale[1]), placement.initialScale[2]);
      perLightScaling = Math.fround(perLightScaling * Math.max(Math.max(placement.additionalScale[0], placement.additionalScale[1]), placement.additionalScale[2]));

      const radius = Math.fround(this._lightGroupData.radius * perLightScaling);
      const innerRadius = num.fromCarbonHalfFloat(num.toCarbonHalfFloat(Math.fround(this._lightGroupData.innerRadius * perLightScaling)));

      const outerAngle = Math.fround(Math.fround(TRI_2PI * this._lightGroupData.outerAngle) / 360);
      const innerAngle = Math.fround(Math.fround(TRI_2PI * this._lightGroupData.innerAngle) / 360);

      // Carbon's own spelling of the local (cpp:35).
      const ligtPosition = vec3.set(statics._debugPosition, 0, 0, 0);
      // Carbon (row-vector): initialRotation * additionalRotation - initialRotation first.
      const rotation = quat.multiply(statics._debugRotation, placement.additionalRotation, placement.initialRotation);

      if (!vec3.exactEquals(this.staticOffsetTranslation, ligtPosition))
      {
        vec3.transformQuat(ligtPosition, this.staticOffsetTranslation, rotation);
      }

      vec3.add(ligtPosition, ligtPosition, vec3.add(statics._debugTranslation, placement.initialTranslation, placement.additionalTranslation));

      const lightRotation = vec3.set(statics._debugLightRotation, 0, 1, 0);
      const rot = statics._debugArc;
      vec3.transformQuat(lightRotation, lightRotation, rotation);
      vec3.scale(lightRotation, vec3.normalize(lightRotation, lightRotation), -1);
      quat.arcFromForward(rot, lightRotation);
      // Carbon (row-vector): rot *= m_staticOffsetRotation - rot first.
      quat.multiply(rot, this.staticOffsetRotation, rot);
      // Carbon (row-vector): RotationMatrix( rot ) * TranslationMatrix( ligtPosition ) * m_worldTransform.
      const lightMatrix = mat4.fromRotationTranslation(statics._debugLightTransform, rot, ligtPosition);
      mat4.multiply(lightMatrix, this._worldTransform, lightMatrix);

      renderer.DrawCone__TransformAngle(
        Tr2DebugObjectReference.create__Object(this),
        lightMatrix,
        radius,
        outerAngle,
        15,
        15,
        ITr2DebugRenderer2.Effect.Solid,
        Tr2DebugColor.create__ColorZFail(vec4.scaleAndAdd(statics._debugOuterColor, baseColor, colorMod, 2), baseColor));
      renderer.DrawCone__TransformAngle(
        Tr2DebugObjectReference.create__Object(this),
        lightMatrix,
        innerRadius,
        innerAngle,
        15,
        15,
        ITr2DebugRenderer2.Effect.Solid,
        Tr2DebugColor.create__ColorZFail(
          vec4.scaleAndAdd(statics._debugInnerColor, baseColor, colorMod, 3),
          vec4.add(statics._debugInnerZFailColor, baseColor, colorMod)));
    }
  }

  /** Carbon's `Color( 0.0f, 0.0f, 0.0f, 0.025f )` (EveSmartLightSpotLight.cpp:22). */
  static _debugColorMod = color.fromValues(0, 0, 0, 0.025);

  static _debugLightRotation = vec3.create();

  static _debugArc = quat.create();

  static _debugOuterColor = color.create();

  static _debugInnerColor = color.create();

  static _debugInnerZFailColor = color.create();

}

// EveSmartLightSpotLight_Blue.cpp: native exposure.
