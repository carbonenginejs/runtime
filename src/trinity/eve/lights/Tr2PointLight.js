// Source: trinity/trinity/Lights/Tr2PointLight.cpp
// Source: trinity/trinity/Lights/Tr2PointLight_Blue.cpp
import { IInitialize, INotify } from "#blue";
// Flattened LightData surface (2026-07-23 decision): the m_lightData.* Blue
// attributes are real decorated fields here, verified against
// lights/Tr2PointLight.json (tools-core schema build).
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
 * Omnidirectional light whose LightData attributes are flattened into persisted
 * Blue properties.
 */
@blue.define("Tr2PointLight")
@blue.interface(Tr2Light, IInitialize, INotify)
export class Tr2PointLight extends Tr2Light
{
  static LightDataFields = [
    "flags", "position", "rotation", "boneIndex", "radius", "innerRadius",
    "color", "brightness", "noiseAmplitude", "noiseFrequency",
    "noiseOctaves", "castsShadows", "isVolumetric"
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

  /** m_lightData.flags (uint16_t) [READWRITE, PERSIST], with Tr2LightFlagChooser and no ENUM bit (Tr2PointLight_Blue.cpp:18). */
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
    const baseColor = color.scale(DEBUG_BASE_COLOR, this.color, this.brightness);
    baseColor[3] = 0.1;
    const selectedColor = color.add(DEBUG_SELECTED_COLOR, baseColor, DEBUG_SELECTED_OFFSET);

    const lightMatrix = mat4.copy(DEBUG_LIGHT_MATRIX, this.boneTransform);
    if (this.boneIndex >= 0 && this.boneIndex < boneCount)
    {
      MatrixCopyFrom3x4(lightMatrix, bones, this.boneIndex);
    }
    // Carbon (row-vector): lightMatrix *= worldMatrix - bone first.
    mat4.multiply(lightMatrix, worldMatrix, lightMatrix);

    renderer.DrawSphere__TransformCenterRadius(
      Tr2DebugObjectReference.create__Object(this),
      lightMatrix,
      this.position,
      this.radius,
      10,
      ITr2DebugRenderer2.Effect.Solid,
      Tr2DebugColor.create__ColorZFail(selectedColor, baseColor));
    renderer.DrawSphere__TransformCenterRadius(
      Tr2DebugObjectReference.create__Object(this),
      lightMatrix,
      this.position,
      this.innerRadius,
      10,
      ITr2DebugRenderer2.Effect.Solid,
      Tr2DebugColor.create__ColorZFail(selectedColor, baseColor));
  }

}

