import { exposure as be } from "#be";
// Source: trinity/trinity/Lights/Tr2PointLight.cpp
// Source: trinity/trinity/Lights/Tr2PointLight_Blue.cpp
import { IInitialize, INotify } from "#blue";
import { meta, type, blue } from "#schema";
import { color } from "#math/color";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { mat4 } from "#math/mat4";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
import { Tr2Light } from "./Tr2Light.js";
import { MatrixCopyFrom3x4 } from "./lightConversion.js";

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_BASE_COLOR = color.create();
const DEBUG_SELECTED_COLOR = color.create();
const DEBUG_LIGHT_MATRIX = mat4.create();

/** Carbon's `Color( 0.0, 0.0, 0.0, 0.2 )` (Tr2PointLight.cpp:18). */
const DEBUG_SELECTED_OFFSET = color.fromValues(0, 0, 0, 0.2);


/**
 * Omnidirectional light. Its LightData attributes are accessors over the
 * embedded record Tr2Light holds (Tr2PointLight_Blue.cpp:18-34).
 */
@be.define("Tr2PointLight")
@be.mapInterface(Tr2Light)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
export class Tr2PointLight extends Tr2Light
{
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

  // Carbon maps these rows into the embedded LightData m_lightData
  // (Tr2Light.h:102). Each is an attribute over that path, as Tr2SkinnedObject's
  // m_lod rows are: the accessors only read and write the record, and maths
  // values are copied into the record's own storage.

  /** m_lightData.flags (uint16_t) [READWRITE, PERSIST], with Tr2LightFlagChooser and no ENUM bit (Tr2PointLight_Blue.cpp:18). */
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

  /** m_lightData.position (Vector3) [READWRITE, PERSIST] (Tr2PointLight_Blue.cpp:19). */
  @blue.readwrite
  @blue.persist
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

  /** m_lightData.rotation (Quaternion) [READWRITE, PERSIST] (Tr2PointLight_Blue.cpp:20). */
  @blue.readwrite
  @blue.persist
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

  /** m_lightData.boneIndex (int32_t) [READWRITE, PERSIST, NOTIFY] (Tr2PointLight_Blue.cpp:21). */
  @blue.notify
  @blue.readwrite
  @blue.persist
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

  /** m_lightData.radius (float) [READWRITE, PERSIST] (Tr2PointLight_Blue.cpp:23). */
  @blue.readwrite
  @blue.persist
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

  /** m_lightData.innerRadius (float) [READWRITE, PERSIST] (Tr2PointLight_Blue.cpp:24). */
  @blue.readwrite
  @blue.persist
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

  /** m_lightData.color (Color) [READWRITE, PERSIST, NOTIFY] (Tr2PointLight_Blue.cpp:26). */
  @blue.notify
  @blue.readwrite
  @blue.persist
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

  /** m_lightData.brightness (float) [READWRITE, PERSIST, NOTIFY] (Tr2PointLight_Blue.cpp:27). */
  @blue.notify
  @blue.readwrite
  @blue.persist
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

  /** m_lightData.noiseAmplitude (float) [READWRITE, PERSIST] (Tr2PointLight_Blue.cpp:29). */
  @blue.readwrite
  @blue.persist
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

  /** m_lightData.noiseFrequency (float) [READWRITE, PERSIST] (Tr2PointLight_Blue.cpp:30). */
  @blue.readwrite
  @blue.persist
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

  /** m_lightData.noiseOctaves (uint32_t) [READWRITE, PERSIST] (Tr2PointLight_Blue.cpp:31). */
  @blue.readwrite
  @blue.persist
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

  /** m_lightData.castsShadows (PerLightShadowSetting) [READWRITE, PERSIST, NOTIFY, ENUM], with PerLightShadowSettingChooser (Tr2PointLight_Blue.cpp:33). */
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

  /** m_lightData.isVolumetric (bool) [READWRITE, PERSIST, NOTIFY] (Tr2PointLight_Blue.cpp:34). */
  @blue.notify
  @blue.readwrite
  @blue.persist
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
  type = Tr2Light.POINT_LIGHT;

  /**
   * Carbon Tr2PointLight::RenderDebugInfo (Tr2PointLight.cpp:14-29): two solid
   * spheres at the light position, outer radius then inner radius, coloured
   * by colour * brightness at alpha 0.1, zero-fail-selected alpha + 0.2.
   *
   * The light matrix starts from the stored bone transform; a bone in range
   * overwrites its 3x4 part (the stored transform is not updated), and the
   * result is followed by the world matrix.
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
    baseColor[3] = 0.1;
    const selectedColor = color.add(DEBUG_SELECTED_COLOR, baseColor, DEBUG_SELECTED_OFFSET);

    const lightMatrix = mat4.copy(DEBUG_LIGHT_MATRIX, this.boneTransform);
    if (this._lightData.boneIndex >= 0 && this._lightData.boneIndex < boneCount)
    {
      MatrixCopyFrom3x4(lightMatrix, bones, this._lightData.boneIndex);
    }
    // Carbon (row-vector): lightMatrix *= worldMatrix - bone first.
    mat4.multiply(lightMatrix, worldMatrix, lightMatrix);

    renderer.DrawSphere__TransformCenterRadius(
      Tr2DebugObjectReference.create__Object(this),
      lightMatrix,
      this._lightData.position,
      this._lightData.radius,
      10,
      ITr2DebugRenderer2.Effect.Solid,
      Tr2DebugColor.create__ColorZFail(selectedColor, baseColor));
    renderer.DrawSphere__TransformCenterRadius(
      Tr2DebugObjectReference.create__Object(this),
      lightMatrix,
      this._lightData.position,
      this._lightData.innerRadius,
      10,
      ITr2DebugRenderer2.Effect.Solid,
      Tr2DebugColor.create__ColorZFail(selectedColor, baseColor));
  }

}

