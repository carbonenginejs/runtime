// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightQuad.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveChildTransform } from "../child/EveChildTransform.js";
import { EveChildQuad } from "../../eve/child/EveChildQuad.js";
import { resolveGroupColor } from "../../eve/smartLights/EveSmartLightBaseGroup.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { TriBatchType } from "@carbonenginejs/runtime-utils/graphics";
import { BELIST_INSERTED } from "../../controllers/contracts.js";
import { packQuadInstanceData, QUAD_INSTANCE_SIZE } from "../child/packQuadInstanceData.js";

/** A smart-light group member that places faction-colour-aware flare quads at each distribution placement and submits them to the quad renderer. */
@type.define({ className: "EveSmartLightQuad", family: "eve/smartLights" })
export class EveSmartLightQuad extends EveChildTransform
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2Effect")
  effect = null;

  /** m_brightness (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  brightness = 1;

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_staticQuadScale (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  staticQuadScale = vec3.fromValues(1, 1, 1);

  /** m_staticOffsetTranslation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  staticOffsetTranslation = vec3.create();

  /** m_editMode (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  editMode = false;

  /** m_softQuad (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  softQuad = false;

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

  /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
  #parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  #resolvedGroupColor = vec4.createLinear();

  /** m_effectKey (unsigned) - cached Tr2Effect hash used as the quad-renderer bucket key (EveSmartLightQuad.h:59). */
  #effectKey = 0;

  /** m_activationStrength (float) - captured from the update params (EveSmartLightQuad.h:54). */
  #activationStrength = 1;

  /** Last softQuad value the settle hook applied (JS-only change detection). */
  #lastAppliedSoftQuad = false;

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

  /** softQuad edits swap the flare-quad effect path (EveSmartLightQuad.cpp:36-54). */
  @carbon.method
  @impl.adapted
  @impl.reason("The settle hook receives no changed-property list; the softQuad edit is detected by comparing the cached last-applied value.")
  OnModified(_options = {})
  {
    if (this.softQuad !== this.#lastAppliedSoftQuad)
    {
      this.#lastAppliedSoftQuad = this.softQuad;
      this.#ApplyEffectPath();
    }
    return true;
  }

  /**
   * Creates the default flare-quad effect when none was authored (Carbon
   * constructor, EveSmartLightQuad.cpp:10-34) and caches the effect key
   * (EveSmartLightQuad.cpp:56-65).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2QuadRenderer::Instance() is engine-owned; Initialize caches the effect key and defers effect registration to RegisterWithQuadRenderer.")
  Initialize()
  {
    if (!this.effect)
    {
      this.effect = new Tr2Effect();
      this.#ApplyEffectPath();
    }
    this.#effectKey = Number(this.effect.GetHashValue()) >>> 0;
    this.#lastAppliedSoftQuad = this.softQuad;
    return true;
  }

  /** Registers the effect bucket with a quad renderer (EveSmartLightQuad.cpp:68-71). */
  @carbon.method
  @impl.adapted
  @impl.reason("The injected renderer owns physical realization; Trinity forwards the required Carbon registration contract directly using EveChildQuad's shared definition.")
  RegisterWithQuadRenderer(quadRenderer)
  {
    quadRenderer.RegisterEffect(
      this.#effectKey,
      TriBatchType.TRIBATCHTYPE_ADDITIVE,
      EveSmartLightQuad.QUAD_INSTANCE_SIZE,
      1,
      EveChildQuad.GetQuadDefinition(),
      this.effect
    );
  }

  /**
   * Captures the activation strength, refreshes the effect key in edit mode,
   * and updates the attribute modifiers with full strength
   * (EveSmartLightQuad.cpp:73-98).
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon re-registers through the Tr2QuadRenderer singleton; the relocated renderer arrives via the threaded update context when present.")
  UpdateSyncronous(updateContext, params, _distribution)
  {
    this.#activationStrength = params?.activationStrength ?? 1;

    if (this.editMode)
    {
      if (this.effect)
      {
        const key = Number(this.effect.GetHashValue()) >>> 0;
        if (key !== this.#effectKey)
        {
          this.#effectKey = key;
          const quadRenderer = updateContext?.GetQuadRenderer?.() ?? updateContext?.quadRenderer;
          if (quadRenderer)
          {
            this.RegisterWithQuadRenderer(quadRenderer);
          }
        }
      }
      else
      {
        this.#effectKey = 0;
      }
    }

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.UpdateSyncronous(updateContext, params, 1);
    }
  }

  /**
   * Rebuilds the world transform against the nearest parent's local-to-world
   * matrix (EveSmartLightQuad.cpp:100-114); the child parent wins over the
   * space object parent.
   */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(_updateContext, params, _distribution)
  {
    let localToWorld = params?.localToWorldTransform ?? EveSmartLightQuad.#identity;

    const parent = params?.childParent ?? params?.spaceObjectParent;
    if (parent)
    {
      const transform = parent.GetLocalToWorldTransform(EveSmartLightQuad.#parentTransform);
      if (transform)
      {
        localToWorld = transform;
      }
    }

    this.UpdateTransform(localToWorld);
  }

  /**
   * Builds one frustum-culled quad per placement and submits it to the quad
   * renderer (EveSmartLightQuad.cpp:116-170). The transforms are packed as
   * Carbon's Vector4 rows (_11,_21,_31,_41 / ...), which on the shared
   * D3D-row-major / GL-column-major byte layout is the column-stride pattern
   * (m[0],m[4],m[8],m[12]) etc. The mixed float32/float16 record is packed
   * into terminal bytes here before the quad renderer copies it.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The injected renderer owns physical realization; Trinity builds and packs Carbon's logical record before direct submission.")
  AddQuadsToQuadRenderer(placements, size, frustum, quadRenderer)
  {
    if (!this.display || !this.effect)
    {
      return;
    }

    const statics = EveSmartLightQuad;
    const quad = statics.#quad;
    const rotation = statics.#rotation;
    const position = statics.#position;
    const direction = statics.#direction;
    const worldPosition = statics.#worldPosition;
    const sphere = statics.#sphere;
    const color = statics.#color;
    const m = this.worldTransform;
    const groupColor = this.GetGroupColor();
    const count = Math.min(Number(size ?? placements?.length ?? 0), placements?.length ?? 0);

    for (let index = 0; index < count; index++)
    {
      const placement = placements[index];

      const scaleX = placement.initialScale[0] * placement.additionalScale[0] * this.staticQuadScale[0];
      const scaleY = placement.initialScale[1] * placement.additionalScale[1] * this.staticQuadScale[1];
      const scaleZ = placement.initialScale[2] * placement.additionalScale[2] * this.staticQuadScale[2];

      vec3.set(position, 0, 0, 0);
      // Carbon (row-vector): initialRotation * additionalRotation - initialRotation first.
      quat.multiply(rotation, placement.additionalRotation, placement.initialRotation);

      const offset = this.staticOffsetTranslation;
      if (offset[0] !== 0 || offset[1] !== 0 || offset[2] !== 0)
      {
        // TriVectorRotateQuaternion == vec3.transformQuat (q v q* on both sides).
        vec3.transformQuat(position, offset, rotation);
      }

      vec3.set(direction, 0, 1, 0);
      vec3.transformQuat(direction, direction, rotation);
      // TriVectorRotateMatrix: rotate by the world basis only (no translation).
      statics.#TransformNormal(direction, direction, m);

      vec3.add(position, position, placement.initialTranslation);
      vec3.add(position, position, placement.additionalTranslation);
      const maxScale = Math.max(scaleX, scaleY, scaleZ);
      // TransformCoord == vec3.transformMat4 - identical on the shared layout.
      vec3.transformMat4(worldPosition, position, m);
      vec4.set(sphere, worldPosition[0], worldPosition[1], worldPosition[2], maxScale);

      if (!frustum || frustum.IsSphereVisible(sphere))
      {
        const strength = this.#activationStrength;
        vec3.set(color, groupColor[0] * strength, groupColor[1] * strength, groupColor[2] * strength);

        for (const attributeModifier of this.attributeModifiers)
        {
          attributeModifier.ProcessAttributeModifier(color, placement, worldPosition, direction, strength);
        }

        vec4.set(quad.parentTransform0, m[0], m[4], m[8], m[12]);
        vec4.set(quad.parentTransform1, m[1], m[5], m[9], m[13]);
        vec4.set(quad.parentTransform2, m[2], m[6], m[10], m[14]);
        vec4.set(quad.localTransform0, scaleX, 0, 0, position[0]);
        vec4.set(quad.localTransform1, 0, scaleY, 0, position[1]);
        vec4.set(quad.localTransform2, 0, 0, scaleZ, position[2]);
        vec4.set(quad.color, color[0], color[1], color[2], this.customColor[3]);
        quad.brightness[0] = this.brightness;
        quad.brightness[1] = 0;

        quadRenderer.AddQuads(this.#effectKey, packQuadInstanceData(quad, statics.#quadBytes), 1);
      }
    }
  }

  /** Applies the softQuad-selected flare effect path (EveSmartLightQuad.cpp:25-33 and cpp:40-51). */
  #ApplyEffectPath()
  {
    if (this.effect)
    {
      this.effect.SetEffectPathName(
        this.softQuad
          ? "res:/Graphics/Effect/Managed/Space/SpecialFX/flarequadsoft.fx"
          : "res:/Graphics/Effect/Managed/Space/SpecialFX/FlareQuad.fx"
      );
    }
  }

  /** sizeof(EveSmartLightQuad::SimplifiedQuad): 6 * 16 + 4 * 2 + 2 * 2 bytes (EveSmartLightQuad.h:38-49). */
  static QUAD_INSTANCE_SIZE = QUAD_INSTANCE_SIZE;

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

  // m_quad-equivalent CPU record (SimplifiedQuad, EveSmartLightQuad.h:38-49) -
  // scratch reused across placements; the quad renderer copies on AddQuads.
  static #quad = {
    parentTransform0: vec4.create(),
    parentTransform1: vec4.create(),
    parentTransform2: vec4.create(),
    localTransform0: vec4.create(),
    localTransform1: vec4.create(),
    localTransform2: vec4.create(),
    color: vec4.create(),
    brightness: new Float32Array(2)
  };

  static #quadBytes = new Uint8Array(QUAD_INSTANCE_SIZE);

  static #identity = mat4.create();

  static #parentTransform = mat4.create();

  static #rotation = quat.create();

  static #position = vec3.create();

  static #direction = vec3.create();

  static #worldPosition = vec3.create();

  static #sphere = vec4.create();

  static #color = vec3.create();

}
