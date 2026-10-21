import { exposure as be } from "#be";
// Source: trinity/trinity/Lights/Tr2SpotLight.cpp
// Source: trinity/trinity/Lights/Tr2SpotLight_Blue.cpp
import { IInitialize, INotify } from "#blue";
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
 * Cone light. Its LightData attributes, the cone angles among them, are
 * accessors over the embedded record Tr2Light holds
 * (Tr2SpotLight_Blue.cpp:18-37).
 */
@be.define("Tr2SpotLight")
@be.mapInterface(Tr2Light)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
export class Tr2SpotLight extends Tr2Light
{
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.wpath("Tr2LightProfileRes")
  lightProfilePath = "";

  @be.mapAttribute(be.READ)
  @type.rootRef("Tr2LightProfileRes")
  lightProfile = null;

  // Carbon maps these rows into the embedded LightData m_lightData
  // (Tr2Light.h:102). Each is an attribute over that path, as Tr2SkinnedObject's
  // m_lod rows are: the accessors only read and write the record, and maths
  // values are copied into the record's own storage.

  /** m_lightData.flags (uint16_t) [READWRITE, PERSIST], with Tr2LightFlagChooser and no ENUM bit (Tr2SpotLight_Blue.cpp:18). */
  @blue.readwrite
  @blue.persist
  @type.uint16
  @blue.chooser("trinity.Tr2LightFlags")
  get flags()
  {
    return this._lightData.flags;
  }

  /** Writes m_lightData.flags. */
  set flags(value)
  {
    this._lightData.flags = value;
  }

  /** m_lightData.position (Vector3) [READWRITE, PERSIST] (Tr2SpotLight_Blue.cpp:19). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  get position()
  {
    return this._lightData.position;
  }

  /** Writes m_lightData.position in place. */
  set position(value)
  {
    vec3.copy(this._lightData.position, value);
  }

  /** m_lightData.rotation (Quaternion) [READWRITE, PERSIST] (Tr2SpotLight_Blue.cpp:20). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.quat
  get rotation()
  {
    return this._lightData.rotation;
  }

  /** Writes m_lightData.rotation in place. */
  set rotation(value)
  {
    quat.copy(this._lightData.rotation, value);
  }

  /** m_lightData.boneIndex (int32_t) [READWRITE, PERSIST, NOTIFY] (Tr2SpotLight_Blue.cpp:21). */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.int32
  get boneIndex()
  {
    return this._lightData.boneIndex;
  }

  /** Writes m_lightData.boneIndex. */
  set boneIndex(value)
  {
    this._lightData.boneIndex = value;
  }

  /** m_lightData.radius (float) [READWRITE, PERSIST] (Tr2SpotLight_Blue.cpp:23). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  get radius()
  {
    return this._lightData.radius;
  }

  /** Writes m_lightData.radius. */
  set radius(value)
  {
    this._lightData.radius = value;
  }

  /** m_lightData.innerRadius (float) [READWRITE, PERSIST] (Tr2SpotLight_Blue.cpp:24). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  get innerRadius()
  {
    return this._lightData.innerRadius;
  }

  /** Writes m_lightData.innerRadius. */
  set innerRadius(value)
  {
    this._lightData.innerRadius = value;
  }

  /** m_lightData.innerAngle (float) [READWRITE, PERSIST] (Tr2SpotLight_Blue.cpp:26). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  get innerAngle()
  {
    return this._lightData.innerAngle;
  }

  /** Writes m_lightData.innerAngle. */
  set innerAngle(value)
  {
    this._lightData.innerAngle = value;
  }

  /** m_lightData.outerAngle (float) [READWRITE, PERSIST] (Tr2SpotLight_Blue.cpp:27). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  get outerAngle()
  {
    return this._lightData.outerAngle;
  }

  /** Writes m_lightData.outerAngle. */
  set outerAngle(value)
  {
    this._lightData.outerAngle = value;
  }

  /** m_lightData.color (Color) [READWRITE, PERSIST, NOTIFY] (Tr2SpotLight_Blue.cpp:29). */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.color
  get color()
  {
    return this._lightData.color;
  }

  /** Writes m_lightData.color in place. */
  set color(value)
  {
    color.copy(this._lightData.color, value);
  }

  /** m_lightData.brightness (float) [READWRITE, PERSIST, NOTIFY] (Tr2SpotLight_Blue.cpp:30). */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.float32
  get brightness()
  {
    return this._lightData.brightness;
  }

  /** Writes m_lightData.brightness. */
  set brightness(value)
  {
    this._lightData.brightness = value;
  }

  /** m_lightData.noiseAmplitude (float) [READWRITE, PERSIST] (Tr2SpotLight_Blue.cpp:32). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  get noiseAmplitude()
  {
    return this._lightData.noiseAmplitude;
  }

  /** Writes m_lightData.noiseAmplitude. */
  set noiseAmplitude(value)
  {
    this._lightData.noiseAmplitude = value;
  }

  /** m_lightData.noiseFrequency (float) [READWRITE, PERSIST] (Tr2SpotLight_Blue.cpp:33). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  get noiseFrequency()
  {
    return this._lightData.noiseFrequency;
  }

  /** Writes m_lightData.noiseFrequency. */
  set noiseFrequency(value)
  {
    this._lightData.noiseFrequency = value;
  }

  /** m_lightData.noiseOctaves (uint32_t) [READWRITE, PERSIST] (Tr2SpotLight_Blue.cpp:34). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint32
  get noiseOctaves()
  {
    return this._lightData.noiseOctaves;
  }

  /** Writes m_lightData.noiseOctaves. */
  set noiseOctaves(value)
  {
    this._lightData.noiseOctaves = value;
  }

  /** m_lightData.castsShadows (PerLightShadowSetting) [READWRITE, PERSIST, NOTIFY, ENUM], with PerLightShadowSettingChooser (Tr2SpotLight_Blue.cpp:36). */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.PerLightShadowSetting")
  get castsShadows()
  {
    return this._lightData.castsShadows;
  }

  /** Writes m_lightData.castsShadows. */
  set castsShadows(value)
  {
    this._lightData.castsShadows = value;
  }

  /** m_lightData.isVolumetric (bool) [READWRITE, PERSIST, NOTIFY] (Tr2SpotLight_Blue.cpp:37). */
  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.boolean
  get isVolumetric()
  {
    return this._lightData.isVolumetric;
  }

  /** Writes m_lightData.isVolumetric. */
  set isVolumetric(value)
  {
    this._lightData.isVolumetric = value;
  }

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
    const baseColor = color.scale(DEBUG_BASE_COLOR, this._lightData.color, this._lightData.brightness);
    baseColor[3] = 0.025;
    const colorMod = DEBUG_COLOR_MOD;

    const boneMatrix = mat4.copy(DEBUG_BONE_MATRIX, this.boneTransform);
    if (this._lightData.boneIndex >= 0 && this._lightData.boneIndex < boneCount)
    {
      MatrixCopyFrom3x4(boneMatrix, bones, this._lightData.boneIndex);
    }

    // Carbon (row-vector): RotationMatrix( rotation ) * TranslationMatrix( position ) * boneMatrix * worldMatrix.
    const lightMatrix = mat4.fromRotationTranslation(DEBUG_LIGHT_MATRIX, this._lightData.rotation, this._lightData.position);
    mat4.multiply(lightMatrix, boneMatrix, lightMatrix);
    mat4.multiply(lightMatrix, worldMatrix, lightMatrix);

    const outerAngle = Math.fround(Math.fround(TRI_2PI * this._lightData.outerAngle) / 360);
    const innerAngle = Math.fround(Math.fround(TRI_2PI * this._lightData.innerAngle) / 360);

    renderer.DrawCone__TransformAngle(
      Tr2DebugObjectReference.create__Object(this),
      lightMatrix,
      this._lightData.radius,
      outerAngle,
      15,
      15,
      ITr2DebugRenderer2.Effect.Solid,
      Tr2DebugColor.create__ColorZFail(vec4.scaleAndAdd(DEBUG_OUTER_COLOR, baseColor, colorMod, 2), baseColor));
    renderer.DrawCone__TransformAngle(
      Tr2DebugObjectReference.create__Object(this),
      lightMatrix,
      this._lightData.innerRadius,
      innerAngle,
      15,
      15,
      ITr2DebugRenderer2.Effect.Solid,
      Tr2DebugColor.create__ColorZFail(
        vec4.scaleAndAdd(DEBUG_INNER_COLOR, baseColor, colorMod, 3),
        vec4.add(DEBUG_INNER_ZFAIL_COLOR, baseColor, colorMod)));
  }

}

