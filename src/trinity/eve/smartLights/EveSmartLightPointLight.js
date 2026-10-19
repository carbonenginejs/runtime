// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightPointLight.h
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { INotify } from "../../../global/blue/INotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { EveSmartLightBaseGroup } from "./EveSmartLightBaseGroup.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { ResourceRequirement } from "#resource";
import { IsMatch, be } from "#blue";
import { EveEntity } from "../EveEntity.js";
import { resolveGroupColor } from "../../eve/smartLights/EveSmartLightBaseGroup.js";
import { num } from "#math/num";
import { color } from "#math/color";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { ITr2LightOwner } from "../lights/ITr2LightOwner.js";
import { Tr2Light } from "../lights/Tr2Light.js";
import { EveComponentType } from "../EntityComponents.js";
import { LightData } from "../lights/LightData.js";
import { BLUELISTEVENT } from "#consts/blue";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";

/** A smart-light group member that places faction-colour-aware point or spot lights at each distribution placement and submits them to the light manager. */
@blue.define("EveSmartLightPointLight")
@blue.inherit(EveSmartLightBaseGroup, IInitialize, INotify, ITr2LightOwner)
@blue.interface(EveSmartLightBaseGroup, IInitialize, INotify, IListNotify, EveEntity)
@blue.chainTo(EveSmartLightBaseGroup)
export class EveSmartLightPointLight extends EveEntity
{
  /**
   * m_lightGroupData (LightData), held by value
   * (EveSmartLightPointLight.h:41).
   */
  _lightGroupData = new LightData();

  // Carbon maps these rows into the embedded LightData m_lightGroupData
  // (EveSmartLightPointLight.h:41). Each is an attribute over that path, as
  // Tr2SkinnedObject's m_lod rows are: the accessors only read and write the
  // record.

  /** m_lightGroupData.flags (uint16_t) [READWRITE, PERSIST], with Tr2LightFlagChooser and no ENUM bit (EveSmartLightPointLight_Blue.cpp:24). */
  @blue.readwrite
  @blue.persist
  @type.uint16
  @blue.chooser("trinity.Tr2LightFlags")
  get flags()
  {
    return this._lightGroupData.flags;
  }

  /** Writes m_lightGroupData.flags. */
  set flags(value)
  {
    this._lightGroupData.flags = value;
  }

  /** m_lightGroupData.radius (float) [READWRITE, PERSIST] (EveSmartLightPointLight_Blue.cpp:26). */
  @blue.readwrite
  @blue.persist
  @type.float32
  get radius()
  {
    return this._lightGroupData.radius;
  }

  /** Writes m_lightGroupData.radius. */
  set radius(value)
  {
    this._lightGroupData.radius = value;
  }

  /** m_lightGroupData.innerRadius (float) [READWRITE, PERSIST] (EveSmartLightPointLight_Blue.cpp:27). */
  @blue.readwrite
  @blue.persist
  @type.float32
  get innerRadius()
  {
    return this._lightGroupData.innerRadius;
  }

  /** Writes m_lightGroupData.innerRadius. */
  set innerRadius(value)
  {
    this._lightGroupData.innerRadius = value;
  }

  /** m_lightGroupData.brightness (float) [READWRITE, PERSIST] (EveSmartLightPointLight_Blue.cpp:29). */
  @blue.readwrite
  @blue.persist
  @type.float32
  get brightness()
  {
    return this._lightGroupData.brightness;
  }

  /** Writes m_lightGroupData.brightness. */
  set brightness(value)
  {
    this._lightGroupData.brightness = value;
  }

  /** m_lightProfile (Tr2LightProfileResPtr) [READ] */
  @blue.read
  @type.rootRef("Tr2LightProfileRes")
  lightProfile = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  display = true;

  /** m_lightProfilePath (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.wpath("Tr2LightProfileRes")
  lightProfilePath = "";

  /** m_staticOffsetTranslation (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  staticOffsetTranslation = vec3.create();

  /** m_staticOffsetRotation (Quaternion) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.quat
  staticOffsetRotation = quat.create();

  // Flattened EveSmartLightBaseGroup secondary base (Carbon multiple
  // inheritance; EveSmartLightBaseGroup_Blue.cpp:15-20 - the wire format of
  // this class carries these fields).

  /** m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] (EveSmartLightBaseGroup.h:31) */
  @blue.notify
  @blue.persist
  @type.int32
  @blue.readwrite
  factionColor = -1;

  /** m_useFactionColor (bool) [READWRITE, PERSIST] (EveSmartLightBaseGroup.h:32) */
  @blue.persist
  @type.boolean
  @blue.readwrite
  useFactionColor = false;

  /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST] (EveSmartLightBaseGroup.h:29) */
  @blue.persist
  @type.list("IEveSmartLightGroupAttributeModifier")
  @blue.read
  attributeModifiers = [];

  /** m_color (Color) [READWRITE, PERSIST] (EveSmartLightBaseGroup.h:30) */
  @blue.persist
  @type.color
  @blue.readwrite
  customColor = color.createLinear();

  /** m_lightType (Tr2Light::LIGHT_TYPE) - POINT_LIGHT here, SPOT_LIGHT on the subclass (EveSmartLightPointLight.cpp:15). */
  lightType = Tr2Light.POINT_LIGHT;

  /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
  _parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  _resolvedGroupColor = color.createLinear();

  /** m_activationStrength (float) - captured from the update params (EveSmartLightPointLight.h:49). */
  _activationStrength = 1;

  /** m_worldTransform (Matrix) - captured from the update params (EveSmartLightPointLight.h:45). */
  _worldTransform = mat4.create();

  /** m_distribution (IEveDistributionMethodPtr) - captured from the update pass (EveSmartLightPointLight.h:52). */
  _distribution = null;

  /** Last lightProfilePath the settle hook applied (JS-only change detection). */

  /** IEveSmartLightGroup default: point-light groups have no async work. */
  @meta.noop
  @blue.method
  UpdateAsyncronous__Distribution(_updateContext, _params, _distribution)
  {
  }

  /** IEveSmartLightGroup default: light-manager visibility is handled later. */
  @blue.method
  @meta.noop
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** IEveSmartLightGroup default: point lights are components, not renderables. */
  @blue.method
  @meta.noop
  GetRenderables(renderables = [])
  {
    return renderables;
  }

  /** IEveSmartLightGroup default: point lights contribute no quads. */
  @blue.method
  @meta.noop
  AddQuadsToQuadRenderer(_placements, _size, _frustum, _quadRenderer)
  {
  }

  /** IEveSmartLightGroup default: point lights register no quad effect. */
  @blue.method
  @meta.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /**
   * Faction-aware group color (Carbon base EveSmartLightBaseGroup.cpp:43-53).
   *
   * Adapted: Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the
   * base-group surface through the shared resolveGroupColor helper.
   */
  @blue.method
  @meta.adapted
  GetGroupColor()
  {
    return resolveGroupColor(
      this.customColor,
      this.useFactionColor,
      this.factionColor,
      this._parentColorSet,
      this._resolvedGroupColor
    );
  }

  /**
   * Overwrites the custom color (Carbon base EveSmartLightBaseGroup.cpp:55-58).
   *
   * Adapted: Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the
   * base-group surface.
   */
  @blue.method
  @meta.adapted
  SetColor(color)
  {
    vec4.copy(this.customColor, color);
  }

  /**
   * Stores the inherited faction color set and fans it out to the attribute
   * modifiers (Carbon base EveSmartLightBaseGroup.cpp:30-41).
   *
   * Adapted: Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the
   * base-group surface.
   */
  @blue.method
  @meta.adapted
  SetInheritProperties(colorSet)
  {
    if (colorSet)
    {
      this._parentColorSet = colorSet;
    }

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.SetInheritProperties(colorSet);
    }
  }

  /**
   * Fans a controller variable out to the attribute modifiers (Carbon base EveSmartLightBaseGroup.cpp:60-66).
   *
   * Adapted: Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the
   * base-group surface.
   */
  @blue.method
  @meta.adapted
  SetControllerVariable(name, value)
  {
    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.SetControllerVariable(name, value);
    }
  }

  /**
   * Newly inserted attribute modifiers inherit the parent color set (Carbon
   * base EveSmartLightBaseGroup.cpp:16-28).
   *
   * Adapted: The secondary base's list handling lives on this class and receives the Blue
   * list event, inserted value and owning array explicitly.
   */
  @blue.method
  @meta.adapted
  OnListModified(event, _key, _key2, value, list)
  {
    if (
      list === this.attributeModifiers &&
      Number(event) === BLUELISTEVENT.BELIST_INSERTED &&
      this._parentColorSet &&
      value
    )
    {
      value.SetInheritProperties(this._parentColorSet);
    }
  }

  /** Carbon Initialize (EveSmartLightPointLight.cpp:18-27): resolve the profile. */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this._ResolveLightProfile();
    return true;
  }

  /**
   * Carbon's body for both call sites: an empty path clears the profile,
   * otherwise the manager supplies it - `BeResMan->GetResource(
   * m_lightProfilePath, L"lp", profile )`, the extension being its own
   * argument and the requested type deduced from the destination.
   */
  _ResolveLightProfile()
  {
    if (!this.lightProfilePath)
    {
      this.lightProfile = null;
      return;
    }
    this.lightProfile = be.resMan.GetResource(this.lightProfilePath, {
      ext: "lp",
      requirement: ResourceRequirement.LIGHT_PROFILE
    });
  }

  /**
   * A lightProfilePath edit re-resolves the profile
   * (EveSmartLightPointLight.cpp:29-41).
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "lightProfilePath")) this._ResolveLightProfile();
    return true;
  }

  /**
   * Captures the frame state and updates the attribute modifiers with full
   * strength (EveSmartLightPointLight.cpp:43-54).
   */
  @meta.implemented
  @blue.method
  UpdateSyncronous__Distribution(updateContext, params, distribution)
  {
    this._activationStrength = params?.activationStrength ?? 1;
    mat4.copy(this._worldTransform, params?.localToWorldTransform ?? EveSmartLightPointLight._identity);

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.UpdateSyncronous(updateContext, params, 1);
    }

    this._distribution = distribution ?? null;
  }

  /**
   * Registers this entity as a light owner (EveSmartLightPointLight.cpp:56-63).
   *
   * Adapted: Carbon's RegisterComponent<ITr2LightOwner> template is expressed as the
   * registry's explicit component-name signature (verbatim "LightOwner",
   * Lights/ITr2LightOwner.h:18).
   */
  @blue.method
  @meta.adapted
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
    }
  }

  /**
   * Registers one light per distribution placement with the injected light
   * manager (EveSmartLightPointLight.cpp:65-131). The submitted record keeps
   * typed CPU state (float32 color, half-rounded direction, unpacked flags, the
   * LightData and unresolved profile reference); Carbon's Float_16/
   * Vector3_16 values are rounded before submission. Physical storage and profile-index flag packing
   * (GetTextureIndex() + 1 << 4) are renderer/resource-adapter concerns.
   * The record is scratch - the manager must copy, as Carbon's
   * Tr2LightManager::AddLight copies PerLightData by value.
   *
   * Adapted: Physical per-light packing (half words, profile-index flag bits) moves to the
   * renderer backend; Trinity submits the typed CPU record per placement.
   */
  @blue.method
  @meta.adapted
  GetLights(lightManager)
  {
    if (!this.display || !this._distribution)
    {
      return;
    }

    const placements = this._distribution.GetPlacementData();
    const size = Number(this._distribution.GetNumberOfPlacements());
    const statics = EveSmartLightPointLight;
    const m = this._worldTransform;

    // Carbon: (|X| + |Y| + |Z|) / 3 of the world basis rows - single-matrix
    // reads, no composition (cpp:75-78).
    const scaling = (
      Math.hypot(m[0], m[1], m[2]) +
      Math.hypot(m[4], m[5], m[6]) +
      Math.hypot(m[8], m[9], m[10])
    ) / 3;
    const groupColor = this.GetGroupColor();
    const record = statics._lightRecord;
    const rotation = statics._rotation;
    const position = statics._position;
    const direction = statics._direction;

    for (let index = 0; index < size; index++)
    {
      const placement = placements[index];

      let perLightScaling = Math.max(placement.initialScale[0], placement.initialScale[1], placement.initialScale[2]);
      perLightScaling *= Math.max(placement.additionalScale[0], placement.additionalScale[1], placement.additionalScale[2]);

      record.radius = this._lightGroupData.radius * scaling * perLightScaling;
      record.innerRadius = num.fromCarbonHalfFloat(num.toCarbonHalfFloat(Math.fround(Math.fround(this._lightGroupData.innerRadius * scaling) * perLightScaling)));
      record.flags = this._lightGroupData.flags;

      // Carbon (row-vector): initialRotation * additionalRotation - initialRotation first.
      quat.multiply(rotation, placement.additionalRotation, placement.initialRotation);
      vec3.set(position, 0, 0, 0);
      const offset = this.staticOffsetTranslation;
      if (offset[0] !== 0 || offset[1] !== 0 || offset[2] !== 0)
      {
        // TriVectorRotateQuaternion == vec3.transformQuat (q v q* on both sides).
        vec3.transformQuat(position, offset, rotation);
      }

      vec3.add(position, position, placement.initialTranslation);
      vec3.add(position, position, placement.additionalTranslation);
      // TransformCoord == vec3.transformMat4 - identical on the shared layout.
      vec3.transformMat4(position, position, m);
      vec3.copy(record.position, position);

      // Carbon (row-vector): rotation * staticOffsetRotation - rotation first.
      quat.multiply(rotation, this.staticOffsetRotation, rotation);
      vec3.set(direction, 0, 1, 0);
      vec3.transformQuat(direction, direction, rotation);
      vec3.scale(direction, direction, -1);
      // TriVectorRotateMatrix: rotate by the world basis only (no translation).
      statics._TransformNormal(direction, direction, m);
      vec3.normalize(record.direction, direction);
      for (let axis = 0; axis < 3; axis++)
      {
        record.direction[axis] = num.fromCarbonHalfFloat(num.toCarbonHalfFloat(record.direction[axis]));
      }

      const strength = this._lightGroupData.brightness * this._activationStrength;
      vec3.set(record.color, groupColor[0] * strength, groupColor[1] * strength, groupColor[2] * strength);

      for (const attributeModifier of this.attributeModifiers)
      {
        attributeModifier.ProcessAttributeModifier(record.color, placement, position, direction, this._activationStrength);
      }

      record.outerAngle = 0;
      record.innerAngle = 0;

      if (this.lightType === Tr2Light.SPOT_LIGHT)
      {
        record.outerAngle = num.fromCarbonHalfFloat(num.toCarbonHalfFloat(Math.cos(Math.fround(Math.fround(Math.fround(2 * Math.PI) * this._lightGroupData.outerAngle) / 360))));
        record.innerAngle = num.fromCarbonHalfFloat(num.toCarbonHalfFloat(Math.cos(Math.fround(Math.fround(Math.fround(2 * Math.PI) * this._lightGroupData.innerAngle) / 360))));
      }

      record.lightType = this.lightType;
      record.lightData = this._lightGroupData;
      record.lightProfile = this.lightProfile;
      record.owner = this;

      if (lightManager)
      {
        lightManager.AddLight(record);
      }
    }
  }

  /**
   * Carbon EveSmartLightPointLight::RenderDebugInfo
   * (EveSmartLightPointLight.cpp:133-161): behind the "smartLightSets" option
   * and `display`, two solid spheres per placement, outer then inner radius,
   * in the captured world transform.
   *
   * The sphere centre is the static offset rotated by the placement rotation
   * (initial then additional) plus both placement translations; both radii
   * scale by the product of the largest initial and additional scale
   * components, and the inner radius is rounded through Float_16. The colour
   * is the group colour * brightness at alpha 0.03, zero-fail-selected
   * 1.5x + alpha 0.01.
   *
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {Array<object>} placements Placement data with identifiers.
   * @param {number} size Number of placements to draw.
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, placements, size)
  {
    if (!renderer.HasOption(this, "smartLightSets") || !this.display)
    {
      return;
    }

    const statics = EveSmartLightPointLight;
    const baseColor = color.scale(statics._debugBaseColor, this.GetGroupColor(), this._lightGroupData.brightness);
    baseColor[3] = 0.03;
    const selectedColor = vec4.scaleAndAdd(statics._debugSelectedColor, statics._debugSelectedOffset, baseColor, 1.5);
    const lightTransform = mat4.copy(statics._debugLightTransform, this._worldTransform);

    for (let index = 0; index < size; index++)
    {
      const placement = placements[index];

      // Carbon (row-vector): initialRotation * additionalRotation - initialRotation first.
      const lightRotation = quat.multiply(statics._debugRotation, placement.additionalRotation, placement.initialRotation);
      // Carbon's own spelling of the local (cpp:147).
      const ligtPosition = vec3.transformQuat(statics._debugPosition, this.staticOffsetTranslation, lightRotation);
      vec3.add(ligtPosition, ligtPosition, vec3.add(statics._debugTranslation, placement.initialTranslation, placement.additionalTranslation));

      let perLightScaling = Math.max(placement.initialScale[0], placement.initialScale[1], placement.initialScale[2]);
      perLightScaling = Math.fround(perLightScaling * Math.max(placement.additionalScale[0], placement.additionalScale[1], placement.additionalScale[2]));

      const radius = Math.fround(this._lightGroupData.radius * perLightScaling);
      const innerRadius = num.fromCarbonHalfFloat(num.toCarbonHalfFloat(Math.fround(this._lightGroupData.innerRadius * perLightScaling)));

      renderer.DrawSphere__TransformCenterRadius(
        Tr2DebugObjectReference.create__Object(this),
        lightTransform,
        ligtPosition,
        radius,
        10,
        ITr2DebugRenderer2.Effect.Solid,
        Tr2DebugColor.create__ColorZFail(selectedColor, baseColor));
      renderer.DrawSphere__TransformCenterRadius(
        Tr2DebugObjectReference.create__Object(this),
        lightTransform,
        ligtPosition,
        innerRadius,
        10,
        ITr2DebugRenderer2.Effect.Solid,
        Tr2DebugColor.create__ColorZFail(selectedColor, baseColor));
    }
  }

  /** TriVectorRotateMatrix (TriMath.cpp:81-94): basis-rows multiply, no translation. */
  static _TransformNormal(out, direction, matrix)
  {
    const x = direction[0];
    const y = direction[1];
    const z = direction[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    return out;
  }

  static _identity = mat4.create();

  static _rotation = quat.create();

  static _position = vec3.create();

  static _direction = vec3.create();

  // RenderDebugInfo scratch (debug drawing is single-threaded); the spot
  // subclass shares it.
  static _debugBaseColor = color.create();

  static _debugSelectedColor = color.create();

  /** Carbon's `Color( 0.0, 0.0, 0.0, 0.01 )` (EveSmartLightPointLight.cpp:142). */
  static _debugSelectedOffset = color.fromValues(0, 0, 0, 0.01);

  static _debugLightTransform = mat4.create();

  static _debugRotation = quat.create();

  static _debugPosition = vec3.create();

  static _debugTranslation = vec3.create();

  // Scratch per-light record (Carbon Tr2LightManager::PerLightData,
  // Tr2LightManager.h:55-68) - reused across placements; the manager copies.
  static _lightRecord = {
    owner: null,
    lightData: null,
    lightProfile: null,
    lightType: Tr2Light.POINT_LIGHT,
    position: vec3.create(),
    direction: vec3.create(),
    color: vec3.create(),
    radius: 0,
    innerRadius: 0,
    flags: 0,
    outerAngle: 0,
    innerAngle: 0
  };

}

// EveSmartLightPointLight_Blue.cpp: native exposure.
