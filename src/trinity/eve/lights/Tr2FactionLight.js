import { exposure as be } from "#be";
// Source: trinity/trinity/Lights/Tr2FactionLight.h
import { IsMatch, IInitialize, INotify } from "#blue";
// Hand-maintained from Carbon source, promoted out of generated intake.
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
@be.define("Tr2FactionLight")
@blue.inherit(IEveInheritPropertiesOwner)
@be.mapInterface(IEveInheritPropertiesOwner)
@be.mapInterface(Tr2Light)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
export class Tr2FactionLight extends Tr2Light
{

  _parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  _selectedFactionColor = color.createLinear();

  // Carbon maps these rows into the embedded LightData m_lightData
  // (Tr2Light.h:102). Each is an attribute over that path, as Tr2SkinnedObject's
  // m_lod rows are: the accessors only read and write the record, and maths
  // values are copied into the record's own storage.

  /** m_lightData.flags (uint16_t) [READWRITE, PERSIST], with Tr2LightFlagChooser and no ENUM bit (Tr2FactionLight_Blue.cpp:18). */
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

  /** m_lightData.position (Vector3) [READWRITE, PERSIST] (Tr2FactionLight_Blue.cpp:19). */
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

  /** m_lightData.rotation (Quaternion) [READWRITE, PERSIST] (Tr2FactionLight_Blue.cpp:20, again at :32). */
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

  /** m_lightData.boneIndex (int32_t) [READWRITE, PERSIST, NOTIFY] (Tr2FactionLight_Blue.cpp:21). */
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

  /** m_lightData.radius (float) [READWRITE, PERSIST] (Tr2FactionLight_Blue.cpp:23). */
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

  /** m_lightData.innerRadius (float) [READWRITE, PERSIST] (Tr2FactionLight_Blue.cpp:24). */
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

  /** m_lightData.brightness (float) [READWRITE, PERSIST] (Tr2FactionLight_Blue.cpp:26). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

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

  /** m_lightData.innerAngle (float) [READWRITE, PERSIST] (Tr2FactionLight_Blue.cpp:33). */
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

  /** m_lightData.outerAngle (float) [READWRITE, PERSIST] (Tr2FactionLight_Blue.cpp:34). */
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

  /** m_lightData.noiseAmplitude (float) [READWRITE, PERSIST] (Tr2FactionLight_Blue.cpp:36). */
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

  /** m_lightData.noiseFrequency (float) [READWRITE, PERSIST] (Tr2FactionLight_Blue.cpp:37). */
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

  /** m_lightData.noiseOctaves (uint32_t) [READWRITE, PERSIST] (Tr2FactionLight_Blue.cpp:38). */
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

  /** m_lightData.castsShadows (PerLightShadowSetting) [READWRITE, PERSIST, NOTIFY, ENUM], with PerLightShadowSettingChooser (Tr2FactionLight_Blue.cpp:40). */
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

  /** m_lightData.isVolumetric (bool) [READWRITE, PERSIST, NOTIFY] (Tr2FactionLight_Blue.cpp:41). */
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

  /**
   * m_lightData.color (Color), ours: Tr2FactionLight_Blue.cpp:17-50 maps no
   * "color" row (the faction colour drives it, cpp:46), so this carries meta
   * flags, not Carbon's.
   */
  @meta.attribute(meta.NOTIFY | meta.PERSIST)

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

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_selectedColor (int) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  factionColor = -1;

  /** m_saturation (float) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.float32
  saturation = 1;

  /** m_isSpotlight (bool) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.boolean
  isSpotlight = false;

  /** m_lightProfilePath (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.wpath("Tr2LightProfileRes")
  lightProfilePath = "";

  /** m_lightProfile (Tr2LightProfileResPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.rootRef("Tr2LightProfileRes")
  lightProfile = null;

  type = Tr2Light.POINT_LIGHT;

  /**
   * Stores an inherited faction colour palette and recomputes the light's colour from it.
   */
  @meta.implemented

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

  SetLightColorFromFactionColor()
  {
    if (!hasFactionColor(this._parentColorSet, this.factionColor))
    {
      return false;
    }
    const color = resolveFactionColor(
      this._selectedFactionColor,
      this._lightData.color,
      true,
      this.factionColor,
      this._parentColorSet
    );
    const intensity = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
    const saturation = Math.max(0, Number(this.saturation) || 0);
    this._lightData.color[0] = intensity + (color[0] - intensity) * saturation;
    this._lightData.color[1] = intensity + (color[1] - intensity) * saturation;
    this._lightData.color[2] = intensity + (color[2] - intensity) * saturation;
    this._lightData.color[3] = color[3] ?? 1;
    return true;
  }

  /**
   * Light colour helper: Carbon's MAP_PROPERTY_READONLY "selectedColor" over
   * GetSelectedColor (Tr2FactionLight_Blue.cpp:29).
   */
  @be.mapPropertyReadOnly()
  @type.color
  get selectedColor()
  {
    return this.GetSelectedColor();
  }

  /**
   * The light's current colour.
   */
  @meta.implemented

  GetSelectedColor()
  {
    return this._lightData.color;
  }

  /**
   * Switches the light between spot and point when the spotlight flag is edited, and recomputes the faction-derived colour when the faction colour or saturation changes.
   */

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

  @meta.implemented
  RenderDebugInfo(renderer, worldMatrix, bones = null, boneCount = 0)
  {
    if (this.isSpotlight)
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
    else
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

}

