// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightPointLight.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { EveEntity } from "../EveEntity.js";
import { resolveGroupColor } from "../../eve/smartLights/EveSmartLightBaseGroup.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2Light } from "../lights/Tr2Light.js";
import { EveComponentType } from "../EveComponentTypes.js";
import {
  createCjsLightDataView,
  setCjsLightDataOwnerValues
} from "../lights/CjsLightData.js";
import { BELIST_INSERTED } from "../../controllers/contracts.js";

/** A smart-light group member that places faction-colour-aware point or spot lights at each distribution placement and submits them to the light manager. */
@type.define({ className: "EveSmartLightPointLight", family: "eve/smartLights" })
export class EveSmartLightPointLight extends EveEntity
{
  /** m_lightGroupData.flags (uint16_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint16
  flags = 1;

  /** m_lightGroupData.innerRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  innerRadius = 0;

  /** m_lightGroupData.brightness (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  brightness = 1;

  /** m_lightGroupData.radius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  radius = 0;

  /** m_lightProfile (Tr2LightProfileResPtr) [READ] */
  @io.read
  @type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_lightProfilePath (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  lightProfilePath = "";

  /** m_staticOffsetTranslation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  staticOffsetTranslation = vec3.create();

  /** m_staticOffsetRotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  staticOffsetRotation = quat.create();

  // Flattened EveSmartLightBaseGroup secondary base (Carbon multiple
  // inheritance; EveSmartLightBaseGroup_Blue.cpp:15-20 - the wire format of
  // this class carries these fields).

  /** m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] (EveSmartLightBaseGroup.h:31) */
  @io.notify
  @io.persist
  @type.int32
  factionColor = -1;

  /** m_useFactionColor (bool) [READWRITE, PERSIST] (EveSmartLightBaseGroup.h:32) */
  @io.persist
  @type.boolean
  useFactionColor = false;

  /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST] (EveSmartLightBaseGroup.h:29) */
  @io.persist
  @type.list("IEveSmartLightGroupAttributeModifier")
  attributeModifiers = [];

  /** m_color (Color) [READWRITE, PERSIST] (EveSmartLightBaseGroup.h:30) */
  @io.persist
  @type.color
  customColor = vec4.createLinear();

  /** m_lightType (Tr2Light::LIGHT_TYPE) - POINT_LIGHT here, SPOT_LIGHT on the subclass (EveSmartLightPointLight.cpp:15). */
  lightType = Tr2Light.POINT_LIGHT;

  /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
  #parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  #resolvedGroupColor = vec4.createLinear();

  /** m_activationStrength (float) - captured from the update params (EveSmartLightPointLight.h:49). */
  #activationStrength = 1;

  /** m_worldTransform (Matrix) - captured from the update params (EveSmartLightPointLight.h:45). */
  #worldTransform = mat4.create();

  /** m_distribution (IEveDistributionMethodPtr) - captured from the update pass (EveSmartLightPointLight.h:52). */
  #distribution = null;

  /** Last lightProfilePath the settle hook applied (JS-only change detection). */
  #lastAppliedProfilePath = "";

  // Compat view over the flattened m_lightGroupData fields (2026-07-23
  // flatten decision); light-manager records and the pre-flatten hydration
  // shape keep reading a LightData-shaped object.
  #lightDataView = null;

  /** IEveSmartLightGroup default: point-light groups have no async work. */
  @carbon.method
  @impl.noop
  UpdateAsyncronous(_updateContext, _params, _distribution)
  {
  }

  /** IEveSmartLightGroup default: light-manager visibility is handled later. */
  @carbon.method
  @impl.noop
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** IEveSmartLightGroup default: point lights are components, not renderables. */
  @carbon.method
  @impl.noop
  GetRenderables(renderables = [])
  {
    return renderables;
  }

  /** IEveSmartLightGroup default: point lights contribute no quads. */
  @carbon.method
  @impl.noop
  AddQuadsToQuadRenderer(_placements, _size, _frustum, _quadRenderer)
  {
  }

  /** IEveSmartLightGroup default: point lights register no quad effect. */
  @carbon.method
  @impl.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /**
   * A lazily built compatibility view over the flattened light-group fields,
   * shaped like the pre-flatten light-data object its readers still expect.
   */
  get lightData()
  {
    this.#lightDataView ??= createCjsLightDataView(this, this.constructor.LightDataFields);
    return this.#lightDataView;
  }

  /**
   * Routes light-data properties through the shared light-data setter and delegates everything else to the base entity.
   */
  SetValues(values = {}, options = {})
  {
    return setCjsLightDataOwnerValues(
      this,
      values,
      options,
      (ownerValues, ownerOptions) => super.SetValues(ownerValues, ownerOptions),
      this.constructor.LightDataFields
    );
  }

  /** Faction-aware group color (Carbon base EveSmartLightBaseGroup.cpp:43-53). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface through the shared resolveGroupColor helper.")
  GetGroupColor()
  {
    return resolveGroupColor(
      this.customColor,
      this.useFactionColor,
      this.factionColor,
      this.#parentColorSet,
      this.#resolvedGroupColor
    );
  }

  /** Overwrites the custom color (Carbon base EveSmartLightBaseGroup.cpp:55-58). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface.")
  SetColor(color)
  {
    vec4.copy(this.customColor, color);
  }

  /**
   * Stores the inherited faction color set and fans it out to the attribute
   * modifiers (Carbon base EveSmartLightBaseGroup.cpp:30-41).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface.")
  SetInheritProperties(colorSet)
  {
    if (colorSet)
    {
      this.#parentColorSet = colorSet;
    }

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.SetInheritProperties(colorSet);
    }
  }

  /** Fans a controller variable out to the attribute modifiers (Carbon base EveSmartLightBaseGroup.cpp:60-66). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface.")
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
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's EveSmartLightBaseGroup secondary base is flattened; CjsModel still forwards its exact BELIST event and inserted value.")
  OnListModified(event, _key, _key2, value, list)
  {
    if (
      list === this.attributeModifiers &&
      Number(event) === BELIST_INSERTED &&
      this.#parentColorSet &&
      value
    )
    {
      value.SetInheritProperties(this.#parentColorSet);
    }
  }

  /**
   * Carbon resolves the light profile through BeResMan
   * (EveSmartLightPointLight.cpp:18-27); profile resolution belongs to the
   * resource adapter in CarbonEngineJS.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Light-profile resolution (BeResMan lp resource) is supplied by the resource/runtime adapter; Trinity keeps only the typed path/reference.")
  Initialize()
  {
    this.#lastAppliedProfilePath = this.lightProfilePath;
    return true;
  }

  /**
   * A lightProfilePath edit re-resolves the profile
   * (EveSmartLightPointLight.cpp:29-41); the stale reference is dropped so the
   * resource adapter re-resolves it.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The settle hook receives no changed-property list, and profile resolution belongs to the resource adapter; a detected path edit only invalidates the cached reference.")
  OnModified(_options = {})
  {
    if (this.lightProfilePath !== this.#lastAppliedProfilePath)
    {
      this.#lastAppliedProfilePath = this.lightProfilePath;
      this.lightProfile = null;
    }
    return true;
  }

  /**
   * Captures the frame state and updates the attribute modifiers with full
   * strength (EveSmartLightPointLight.cpp:43-54).
   */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext, params, distribution)
  {
    this.#activationStrength = params?.activationStrength ?? 1;
    mat4.copy(this.#worldTransform, params?.localToWorldTransform ?? EveSmartLightPointLight.#identity);

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.UpdateSyncronous(updateContext, params, 1);
    }

    this.#distribution = distribution ?? null;
  }

  /** Registers this entity as a light owner (EveSmartLightPointLight.cpp:56-63). */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's RegisterComponent<ITr2LightOwner> template is expressed as the registry's explicit component-name signature (verbatim \"LightOwner\", Lights/ITr2LightOwner.h:18).")
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
   * typed CPU state only (float32 color/direction, unpacked flags, the
   * CjsLightData and unresolved profile reference); Carbon's Float_16/
   * Vector3_16 packing and the profile-index flag packing
   * (GetTextureIndex() + 1 << 4) are renderer/resource-adapter concerns.
   * The record is scratch - the manager must copy, as Carbon's
   * Tr2LightManager::AddLight copies PerLightData by value.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Physical per-light packing (half floats, profile-index flag bits) moves to the renderer backend; Trinity submits the typed CPU record per placement.")
  GetLights(lightManager)
  {
    if (!this.display || !this.#distribution)
    {
      return;
    }

    const placements = this.#distribution.GetPlacementData();
    const size = Number(this.#distribution.GetNumberOfPlacements());
    const statics = EveSmartLightPointLight;
    const m = this.#worldTransform;

    // Carbon: (|X| + |Y| + |Z|) / 3 of the world basis rows - single-matrix
    // reads, no composition (cpp:75-78).
    const scaling = (
      Math.hypot(m[0], m[1], m[2]) +
      Math.hypot(m[4], m[5], m[6]) +
      Math.hypot(m[8], m[9], m[10])
    ) / 3;
    const groupColor = this.GetGroupColor();
    const record = statics.#lightRecord;
    const rotation = statics.#rotation;
    const position = statics.#position;
    const direction = statics.#direction;

    for (let index = 0; index < size; index++)
    {
      const placement = placements[index];

      let perLightScaling = Math.max(placement.initialScale[0], placement.initialScale[1], placement.initialScale[2]);
      perLightScaling *= Math.max(placement.additionalScale[0], placement.additionalScale[1], placement.additionalScale[2]);

      record.radius = this.radius * scaling * perLightScaling;
      record.innerRadius = this.innerRadius * scaling * perLightScaling;
      record.flags = this.flags;

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
      statics.#TransformNormal(direction, direction, m);
      vec3.normalize(record.direction, direction);

      const strength = this.brightness * this.#activationStrength;
      vec3.set(record.color, groupColor[0] * strength, groupColor[1] * strength, groupColor[2] * strength);

      for (const attributeModifier of this.attributeModifiers)
      {
        attributeModifier.ProcessAttributeModifier(record.color, placement, position, direction, this.#activationStrength);
      }

      record.outerAngle = 0;
      record.innerAngle = 0;

      if (this.lightType === Tr2Light.SPOT_LIGHT)
      {
        record.outerAngle = Math.cos((2 * Math.PI * this.outerAngle) / 360);
        record.innerAngle = Math.cos((2 * Math.PI * this.innerAngle) / 360);
      }

      record.lightType = this.lightType;
      record.lightData = this.lightData;
      record.lightProfile = this.lightProfile;
      record.owner = this;

      if (lightManager)
      {
        lightManager.AddLight(record);
      }
    }
  }

  /** Carbon method RenderDebugInfo (EveSmartLightPointLight.cpp:133-161). */
  @carbon.method
  @impl.notImplemented
  RenderDebugInfo(..._args)
  {
    throw new Error("EveSmartLightPointLight.RenderDebugInfo is not implemented in CarbonEngineJS.");
  }

  static LightDataFields = ["flags", "innerRadius", "brightness", "radius"];

  /** TriVectorRotateMatrix (TriMath.cpp:81-94): basis-rows multiply, no translation. */
  static #TransformNormal(out, direction, matrix)
  {
    const x = direction[0];
    const y = direction[1];
    const z = direction[2];
    out[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    out[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    out[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    return out;
  }

  static #identity = mat4.create();

  static #rotation = quat.create();

  static #position = vec3.create();

  static #direction = vec3.create();

  // Scratch per-light record (Carbon Tr2LightManager::PerLightData,
  // Tr2LightManager.h:55-68) - reused across placements; the manager copies.
  static #lightRecord = {
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
