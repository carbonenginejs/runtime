// Source: trinity/trinity/Lights/Tr2FactionLight.h
import { IsMatch, IInitialize, INotify } from "#blue";
// Hand-maintained from Carbon source, promoted out of generated intake.
// Flattened LightData surface (2026-07-23 decision): the m_lightData.* Blue
// attributes are real decorated fields here, verified against
// lights/Tr2FactionLight.json (tools-core schema build).
import { meta, type, blue } from "#schema";
import { IEveInheritPropertiesOwner } from "../IEveInheritPropertiesOwner.js";
import { color } from "#math/color";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { Tr2Light } from "./Tr2Light.js";
import { hasFactionColor, resolveFactionColor } from "../resolveFactionColor.js";
import { vec4 } from "#math/vec4";
import { mat4 } from "#math/mat4";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
import { MatrixCopyFrom3x4 } from "./lightConversion.js";

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_BASE_COLOR = color.create();
const DEBUG_SELECTED_COLOR = color.create();
const DEBUG_OUTER_COLOR = color.create();
const DEBUG_INNER_COLOR = color.create();
const DEBUG_INNER_ZFAIL_COLOR = color.create();
const DEBUG_BONE_MATRIX = mat4.create();
const DEBUG_LIGHT_MATRIX = mat4.create();

/** Carbon's spot-branch `Color( 0.0f, 0.0f, 0.0f, 0.025f )` (Tr2FactionLight.cpp:70). */
const DEBUG_COLOR_MOD = color.fromValues(0, 0, 0, 0.025);

/** Carbon's point-branch `Color( 0.0, 0.0, 0.0, 0.2 )` (Tr2FactionLight.cpp:90). */
const DEBUG_SELECTED_OFFSET = color.fromValues(0, 0, 0, 0.2);

/** Carbon's TRI_2PI float constant (Include/TriMath.h:245). */
const TRI_2PI = Math.fround(6.283185307);

/** A light whose colour is derived from a faction palette entry blended by a saturation factor, in addition to its own authored light attributes. */
@blue.define("Tr2FactionLight")
@blue.inherit(IEveInheritPropertiesOwner)
@blue.interface(IEveInheritPropertiesOwner, Tr2Light, IInitialize, INotify)
export class Tr2FactionLight extends Tr2Light
{

  _parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  _selectedFactionColor = color.createLinear();

  /** m_lightData.castsShadows (PerLightShadowSetting) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.PerLightShadowSetting")
  castsShadows = 0;

  /** m_lightData.flags (uint16_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint16
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
  @meta.notify
  @meta.persist
  @type.color
  color = color.createLinear();

  /** m_lightData.brightness (float) [READWRITE, PERSIST, NOTIFY] */
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

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_selectedColor (int) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  factionColor = -1;

  /** m_saturation (float) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  saturation = 1;

  /** m_isSpotlight (bool) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  isSpotlight = false;

  /** m_lightProfilePath (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.wpath("Tr2LightProfileRes")
  lightProfilePath = "";

  /** m_lightProfile (Tr2LightProfileResPtr) [READ] */
  @blue.read
  @type.rootRef("Tr2LightProfileRes")
  lightProfile = null;

  type = Tr2Light.POINT_LIGHT;

  /**
   * Stores an inherited faction colour palette and recomputes the light's colour from it.
   */
  @meta.implemented
  @blue.method
  SetInheritProperties(colorSet)
  {
    if (colorSet)
    {
      this._parentColorSet = colorSet;
      this.SetLightColorFromFactionColor();
    }
  }

  /**
   * Recolours the light by blending its palette entry's luminance with the full palette colour by the saturation factor, reporting false when no palette entry is available.
   */
  @meta.implemented
  @blue.method
  SetLightColorFromFactionColor()
  {
    if (!hasFactionColor(this._parentColorSet, this.factionColor))
    {
      return false;
    }
    const color = resolveFactionColor(
      this._selectedFactionColor,
      this.color,
      true,
      this.factionColor,
      this._parentColorSet
    );
    const intensity = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
    const saturation = Math.max(0, Number(this.saturation) || 0);
    this.color[0] = intensity + (color[0] - intensity) * saturation;
    this.color[1] = intensity + (color[1] - intensity) * saturation;
    this.color[2] = intensity + (color[2] - intensity) * saturation;
    this.color[3] = color[3] ?? 1;
    return true;
  }

  /**
   * Light colour helper: Carbon's MAP_PROPERTY_READONLY "selectedColor" over
   * GetSelectedColor (Tr2FactionLight_Blue.cpp:29).
   */
  @blue.read
  @type.color
  get selectedColor()
  {
    return this.GetSelectedColor();
  }

  /**
   * The light's current colour.
   */
  @meta.implemented
  @blue.method
  GetSelectedColor()
  {
    return this.color;
  }

  /**
   * Switches the light between spot and point when the spotlight flag is edited, and recomputes the faction-derived colour when the faction colour or saturation changes.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "isSpotlight"))
    {
      this.type = this.isSpotlight ? Tr2Light.SPOT_LIGHT : Tr2Light.POINT_LIGHT;
    }
    if (IsMatch(propertyName, "factionColor") || IsMatch(propertyName, "saturation"))
    {
      this.SetLightColorFromFactionColor();
    }
    return super.OnModified(propertyName);
  }

  /**
   * Carbon Tr2FactionLight::RenderDebugInfo (Tr2FactionLight.cpp:64-105): the
   * spot branch is Tr2SpotLight's body (two solid cones), the point branch is
   * Tr2PointLight's body (two solid spheres), chosen by `isSpotlight`.
   *
   * In both branches the bone matrix starts from the stored bone transform; a
   * bone in range overwrites its 3x4 part (the stored transform is not
   * updated).
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
    if (this.isSpotlight)
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
    else
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

  static LightDataFields = [
    "flags", "position", "rotation", "boneIndex", "radius", "innerRadius",
    "color", "brightness", "innerAngle", "outerAngle", "noiseAmplitude",
    "noiseFrequency", "noiseOctaves", "castsShadows", "isVolumetric"
  ];

}

