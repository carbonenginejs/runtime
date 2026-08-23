// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightColorShareGroup.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { EveEntity } from "../EveEntity.js";
import { resolveGroupColor } from "../../eve/smartLights/EveSmartLightBaseGroup.js";
import { PlacementDataWithIdentifier } from "../PlacementDataWithIdentifier.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import {
  BELIST_EVENTMASK,
  BELIST_INSERTED,
  BELIST_LOADING,
  BELIST_REMOVED,
  BELIST_UNLOADSTART
} from "../../controllers/contracts.js";

/** A smart-light group that computes one shared faction-aware colour, applies it to its child light groups, and fans out their per-frame updates. */
@type.define({ className: "EveSmartLightColorShareGroup", family: "eve/smartLights" })
export class EveSmartLightColorShareGroup extends EveEntity
{

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  display = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_lightGroups (PIEveSmartLightGroupVector) [READ, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.list("IEveSmartLightGroup")
  lightGroups = [];

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

  /** Last `display` value the settle hook applied (JS-only change detection). */
  #lastAppliedDisplay = true;

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

  /** display edits re-register the shared groups (EveSmartLightColorShareGroup.cpp:17-24). */
  @carbon.method
  @impl.adapted
  @impl.reason("The settle hook receives no changed-property list; the display edit is detected by comparing the cached last-applied value.")
  OnModified(_options = {})
  {
    if (this.display !== this.#lastAppliedDisplay)
    {
      this.#lastAppliedDisplay = this.display;
      this.ReRegister();
    }
    return true;
  }

  /**
   * Inserted attribute modifiers and light groups inherit the current color
   * set; inserted light groups register while this entity is registered
   * (EveSmartLightColorShareGroup.cpp:26-82).
   */
  @carbon.method
  @impl.implemented
  OnListModified(event, _key, _key2, value, list)
  {
    const maskedEvent = Number(event) & BELIST_EVENTMASK;
    if (
      Number(event) === BELIST_INSERTED &&
      this.#parentColorSet &&
      value &&
      (list === this.attributeModifiers || list === this.lightGroups)
    )
    {
      value.SetInheritProperties(this.#parentColorSet);
    }

    if (
      list === this.lightGroups &&
      (Number(event) & BELIST_LOADING) === 0 &&
      this.IsInRegistry()
    )
    {
      const registry = this.GetComponentRegistry();
      if (maskedEvent === BELIST_INSERTED && value instanceof EveEntity)
      {
        value.Register(registry);
      }
      else if (maskedEvent === BELIST_REMOVED && value instanceof EveEntity)
      {
        value.UnRegister(registry);
      }
      else if (maskedEvent === BELIST_UNLOADSTART)
      {
        for (const group of this.lightGroups)
        {
          if (group instanceof EveEntity)
          {
            group.UnRegister(registry);
          }
        }
      }
    }
  }

  /** Registers the shared groups while displayed (EveSmartLightColorShareGroup.cpp:84-97). */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry && this.display)
    {
      for (const group of this.lightGroups)
      {
        if (group instanceof EveEntity)
        {
          group.Register(registry);
        }
      }
    }
  }

  /** Unregisters the shared groups (EveSmartLightColorShareGroup.cpp:99-112). */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      for (const group of this.lightGroups)
      {
        if (group instanceof EveEntity)
        {
          group.UnRegister(registry);
        }
      }
    }
  }

  /** Quad fan-out, gated on display (EveSmartLightColorShareGroup.cpp:114-125). */
  @carbon.method
  @impl.implemented
  AddQuadsToQuadRenderer(placements, size, frustum, quadRenderer)
  {
    if (!this.display)
    {
      return;
    }

    for (const group of this.lightGroups)
    {
      group.AddQuadsToQuadRenderer(placements, size, frustum, quadRenderer);
    }
  }

  /** Renderable fan-out, gated on display (EveSmartLightColorShareGroup.cpp:127-138). */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables = [])
  {
    if (!this.display)
    {
      return renderables;
    }

    for (const group of this.lightGroups)
    {
      group.GetRenderables(renderables);
    }
    return renderables;
  }

  /**
   * Updates the shared groups, then the group's own attribute modifiers with
   * full strength (EveSmartLightColorShareGroup.cpp:140-151).
   */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext, params, distribution)
  {
    for (const group of this.lightGroups)
    {
      group.UpdateSyncronous(updateContext, params, distribution);
    }

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.UpdateSyncronous(updateContext, params, 1);
    }
  }

  /**
   * Runs the shared attribute modifiers once over the group color (default
   * placement key, up direction), then pushes the shared color into every
   * child group before their asynchronous update
   * (EveSmartLightColorShareGroup.cpp:153-168).
   */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(updateContext, params, distribution)
  {
    const statics = EveSmartLightColorShareGroup;
    const groupColor = this.GetGroupColor();
    const colorValues = statics.#colorValues;
    vec3.set(colorValues, groupColor[0], groupColor[1], groupColor[2]);

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.ProcessAttributeModifier(
        colorValues,
        statics.#defaultPlacement,
        statics.#defaultPlacement.initialTranslation,
        statics.#up,
        params.activationStrength
      );
    }
    const sharedColor = statics.#sharedColor;
    vec4.set(sharedColor, colorValues[0], colorValues[1], colorValues[2], this.customColor[3]);

    for (const group of this.lightGroups)
    {
      group.SetColor(sharedColor);
      group.UpdateAsyncronous(updateContext, params, distribution);
    }
  }

  /**
   * Fans a controller variable to the group's own modifiers, then to the
   * shared groups (EveSmartLightColorShareGroup.cpp:170-178).
   */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.SetControllerVariable(name, value);
    }

    for (const group of this.lightGroups)
    {
      group.SetControllerVariable(name, value);
    }
  }

  /**
   * Stores the inherited color set and fans it out to the modifiers and shared
   * groups; a null set is ignored entirely
   * (EveSmartLightColorShareGroup.cpp:180-190).
   */
  @carbon.method
  @impl.implemented
  SetInheritProperties(colorSet)
  {
    if (colorSet)
    {
      this.#parentColorSet = colorSet;
      for (const attributeModifier of this.attributeModifiers)
      {
        attributeModifier.SetInheritProperties(colorSet);
      }
      for (const group of this.lightGroups)
      {
        group.SetInheritProperties(colorSet);
      }
    }
  }

  /** Effect-registration fan-out (EveSmartLightColorShareGroup.cpp:192-198). */
  @carbon.method
  @impl.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const group of this.lightGroups)
    {
      group.RegisterWithQuadRenderer(quadRenderer);
    }
  }

  /** Carbon method RenderDebugInfo (EveSmartLightColorShareGroup.cpp:200-211). */
  @carbon.method
  @impl.notImplemented
  RenderDebugInfo(..._args)
  {
    throw new Error("EveSmartLightColorShareGroup.RenderDebugInfo is not implemented in CarbonEngineJS.");
  }

  /** Visibility fan-out (EveSmartLightColorShareGroup.cpp:213-219). */
  @carbon.method
  @impl.implemented
  UpdateVisibility(updateContext, parentTransform, parentLod)
  {
    for (const group of this.lightGroups)
    {
      group.UpdateVisibility(updateContext, parentTransform, parentLod);
    }
  }

  // s_PlacementDataWithIdentifierDefaultKey (EveSmartLightColorShareGroup.cpp:7).
  static #defaultPlacement = new PlacementDataWithIdentifier();

  static #up = vec3.fromValues(0, 1, 0);

  static #colorValues = vec3.create();

  static #sharedColor = vec4.create();

}
