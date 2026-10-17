// Source: trinity/trinity/Lights/Tr2SpotLight.cpp
// Source: trinity/trinity/Lights/Tr2SpotLight_Blue.cpp
import { IInitialize, INotify } from "#blue";
// Flattened LightData surface (2026-07-23 decision): the m_lightData.* Blue
// attributes are real decorated fields here, verified against
// lights/Tr2SpotLight.json (tools-core schema build).
import { meta, type, blue } from "#schema";
import { color } from "#math/color";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { mat4 } from "#math/mat4";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
import { Tr2Light } from "./Tr2Light.js";
import { MatrixCopyFrom3x4 } from "./lightConversion.js";

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_BASE_COLOR = color.create();
const DEBUG_OUTER_COLOR = color.create();
const DEBUG_INNER_COLOR = color.create();
const DEBUG_INNER_ZFAIL_COLOR = color.create();
const DEBUG_BONE_MATRIX = mat4.create();
const DEBUG_LIGHT_MATRIX = mat4.create();

/** Carbon's `Color( 0.0f, 0.0f, 0.0f, 0.025f )` (Tr2SpotLight.cpp:20). */
const DEBUG_COLOR_MOD = color.fromValues(0, 0, 0, 0.025);

/** Carbon's TRI_2PI float constant (Include/TriMath.h:245). */
const TRI_2PI = Math.fround(6.283185307);


/**
 * Cone light, adding inner and outer cone angles to the flattened point-light
 * attribute set.
 */
@blue.define("Tr2SpotLight")
@blue.interface(Tr2Light, IInitialize, INotify)
export class Tr2SpotLight extends Tr2Light
{
  static LightDataFields = [
    "flags", "position", "rotation", "boneIndex", "radius", "innerRadius",
    "innerAngle", "outerAngle", "color", "brightness", "noiseAmplitude",
    "noiseFrequency", "noiseOctaves", "castsShadows", "isVolumetric"
  ];

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.wpath("Tr2LightProfileRes")
  lightProfilePath = "";

  @blue.read
  @type.rootRef("Tr2LightProfileRes")
  lightProfile = null;

  /** m_lightData.castsShadows (PerLightShadowSetting) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.PerLightShadowSetting")
  castsShadows = 0;

  /** m_lightData.flags (uint16_t) [READWRITE, PERSIST], with Tr2LightFlagChooser and no ENUM bit (Tr2SpotLight_Blue.cpp:18). */
  @blue.readwrite
  @blue.persist
  @type.uint16
  @blue.chooser("trinity.Tr2LightFlags")
  flags = 1;

  /** m_lightData.position (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  /** m_lightData.rotation (Quaternion) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.quat
  rotation = quat.create();

  /** m_lightData.boneIndex (int32_t) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  boneIndex = -1;

  /** m_lightData.radius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  radius = 0;

  /** m_lightData.innerRadius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  innerRadius = 0;

  /** m_lightData.innerAngle (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  innerAngle = 0;

  /** m_lightData.outerAngle (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  outerAngle = 0;

  /** m_lightData.color (Color) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.color
  color = color.createLinear();

  /** m_lightData.brightness (float) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  brightness = 1;

  /** m_lightData.noiseAmplitude (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  noiseAmplitude = 0;

  /** m_lightData.noiseFrequency (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  noiseFrequency = 1;

  /** m_lightData.noiseOctaves (uint32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint32
  noiseOctaves = 1;

  /** m_lightData.isVolumetric (bool) [READWRITE, NOTIFY, PERSIST] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  isVolumetric = false;

  @type.int32
  @type.enum("trinity.Tr2Light.LIGHT_TYPE")
  type = Tr2Light.SPOT_LIGHT;

  /**
   * Carbon Tr2SpotLight::RenderDebugInfo (Tr2SpotLight.cpp:16-36): two solid
   * cones, outer (radius, outer angle) then inner (inner radius, inner
   * angle), coloured by colour * brightness at alpha 0.025 with alpha steps of
   * 0.025 for the selected and inner variants.
   *
   * The bone matrix starts from the stored bone transform; a bone in range
   * overwrites its 3x4 part (the stored transform is not updated). Angles are
   * authored in degrees and converted to radians in float.
   *
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {mat4} worldMatrix The owner's world matrix.
   * @param {Float32Array|null} [bones] Packed Float4x3 bone matrices.
   * @param {number} [boneCount] Number of bones in `bones`.
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, worldMatrix, bones = null, boneCount = 0)
  {
    const baseColor = color.scale(DEBUG_BASE_COLOR, this.color, this.brightness);
    baseColor[3] = 0.025;
    const colorMod = DEBUG_COLOR_MOD;

    const boneMatrix = mat4.copy(DEBUG_BONE_MATRIX, this.boneTransform);
    if (this.boneIndex >= 0 && this.boneIndex < boneCount)
    {
      MatrixCopyFrom3x4(boneMatrix, bones, this.boneIndex);
    }

    // Carbon (row-vector): RotationMatrix( rotation ) * TranslationMatrix( position ) * boneMatrix * worldMatrix.
    const lightMatrix = mat4.fromRotationTranslation(DEBUG_LIGHT_MATRIX, this.rotation, this.position);
    mat4.multiply(lightMatrix, boneMatrix, lightMatrix);
    mat4.multiply(lightMatrix, worldMatrix, lightMatrix);

    const outerAngle = Math.fround(Math.fround(TRI_2PI * this.outerAngle) / 360);
    const innerAngle = Math.fround(Math.fround(TRI_2PI * this.innerAngle) / 360);

    renderer.DrawCone__TransformAngle(
      Tr2DebugObjectReference.create__Object(this),
      lightMatrix,
      this.radius,
      outerAngle,
      15,
      15,
      ITr2DebugRenderer2.Effect.Solid,
      Tr2DebugColor.create__ColorZFail(vec4.scaleAndAdd(DEBUG_OUTER_COLOR, baseColor, colorMod, 2), baseColor));
    renderer.DrawCone__TransformAngle(
      Tr2DebugObjectReference.create__Object(this),
      lightMatrix,
      this.innerRadius,
      innerAngle,
      15,
      15,
      ITr2DebugRenderer2.Effect.Solid,
      Tr2DebugColor.create__ColorZFail(
        vec4.scaleAndAdd(DEBUG_INNER_COLOR, baseColor, colorMod, 3),
        vec4.add(DEBUG_INNER_ZFAIL_COLOR, baseColor, colorMod)));
  }

}

