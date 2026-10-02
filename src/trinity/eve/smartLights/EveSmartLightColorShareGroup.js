import { IsMatch } from "#blue";
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { INotify } from "../../../global/blue/INotify.js";
import { EveSmartLightBaseGroup } from "./EveSmartLightBaseGroup.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightColorShareGroup.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { EveEntity } from "../EveEntity.js";
import { resolveGroupColor } from "../../eve/smartLights/EveSmartLightBaseGroup.js";
import { PlacementDataWithIdentifier } from "../PlacementDataWithIdentifier.js";
import { color } from "#math/color";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { BLUELISTEVENT } from "#consts/blue";

/** A smart-light group that computes one shared faction-aware colour, applies it to its child light groups, and fans out their per-frame updates. */
@meta.define({ className: "EveSmartLightColorShareGroup", family: "eve/smartLights" })
@meta.blue.inherit(INotify, IListNotify)
export class EveSmartLightColorShareGroup extends EveEntity
{

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_lightGroups (PIEveSmartLightGroupVector) [READ, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSmartLightGroup")
  lightGroups = [];

  // Flattened EveSmartLightBaseGroup secondary base (Carbon multiple
  // inheritance; EveSmartLightBaseGroup_Blue.cpp:15-20 - the wire format of
  // this class carries these fields).

  /** m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] (EveSmartLightBaseGroup.h:31) */
  @meta.blue.notify
  @meta.blue.persist
  @meta.type.int32
  factionColor = -1;

  /** m_useFactionColor (bool) [READWRITE, PERSIST] (EveSmartLightBaseGroup.h:32) */
  @meta.blue.persist
  @meta.type.boolean
  useFactionColor = false;

  /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST] (EveSmartLightBaseGroup.h:29) */
  @meta.blue.persist
  @meta.type.list("IEveSmartLightGroupAttributeModifier")
  attributeModifiers = [];

  /** m_color (Color) [READWRITE, PERSIST] (EveSmartLightBaseGroup.h:30) */
  @meta.blue.persist
  @meta.type.color
  customColor = color.createLinear();

  /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
  _parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  _resolvedGroupColor = color.createLinear();

  /** Last `display` value the settle hook applied (JS-only change detection). */

  /** Faction-aware group color (Carbon base EveSmartLightBaseGroup.cpp:43-53). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface through the shared resolveGroupColor helper.")
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

  /** Overwrites the custom color (Carbon base EveSmartLightBaseGroup.cpp:55-58). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon inherits EveSmartLightBaseGroup; JS single inheritance flattens the base-group surface.")
  SetColor(color)
  {
    vec4.copy(this.customColor, color);
  }

  /** display edits re-register the shared groups (EveSmartLightColorShareGroup.cpp:17-24). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS dispatches the native hook using the exposed member name; existing class-owned rendering/resource adaptations remain unchanged.")
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "display")) this.ReRegister();
    return true;
  }

  /**
   * Inserted attribute modifiers and light groups inherit the current color
   * set; inserted light groups register while this entity is registered
   * (EveSmartLightColorShareGroup.cpp:26-82).
   */
  @meta.blue.method
  @meta.implemented
  OnListModified(event, _key, _key2, value, list)
  {
    const maskedEvent = Number(event) & BLUELISTEVENT.BELIST_EVENTMASK;
    if (
      Number(event) === BLUELISTEVENT.BELIST_INSERTED &&
      this._parentColorSet &&
      value &&
      (list === this.attributeModifiers || list === this.lightGroups)
    )
    {
      value.SetInheritProperties(this._parentColorSet);
    }

    if (
      list === this.lightGroups &&
      (Number(event) & BLUELISTEVENT.BELIST_LOADING) === 0 &&
      this.IsInRegistry()
    )
    {
      const registry = this.GetComponentRegistry();
      if (maskedEvent === BLUELISTEVENT.BELIST_INSERTED && value instanceof EveEntity)
      {
        value.Register(registry);
      }
      else if (maskedEvent === BLUELISTEVENT.BELIST_REMOVED && value instanceof EveEntity)
      {
        value.UnRegister(registry);
      }
      else if (maskedEvent === BLUELISTEVENT.BELIST_UNLOADSTART)
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
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
  UpdateAsyncronous(updateContext, params, distribution)
  {
    const statics = EveSmartLightColorShareGroup;
    const groupColor = this.GetGroupColor();
    const colorValues = statics._colorValues;
    vec3.set(colorValues, groupColor[0], groupColor[1], groupColor[2]);

    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.ProcessAttributeModifier(
        colorValues,
        statics._defaultPlacement,
        statics._defaultPlacement.initialTranslation,
        statics._up,
        params.activationStrength
      );
    }
    const sharedColor = statics._sharedColor;
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
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.implemented
  SetInheritProperties(colorSet)
  {
    if (colorSet)
    {
      this._parentColorSet = colorSet;
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
  @meta.blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const group of this.lightGroups)
    {
      group.RegisterWithQuadRenderer(quadRenderer);
    }
  }

  /** Carbon debug-render fan-out, gated by this group's display flag. */
  @meta.blue.method
  @meta.implemented
  RenderDebugInfo(renderer, placements, size)
  {
    if (!this.display)
    {
      return;
    }
    for (const group of this.lightGroups)
    {
      group.RenderDebugInfo(renderer, placements, size);
    }
  }

  /** Visibility fan-out (EveSmartLightColorShareGroup.cpp:213-219). */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(updateContext, parentTransform, parentLod)
  {
    for (const group of this.lightGroups)
    {
      group.UpdateVisibility(updateContext, parentTransform, parentLod);
    }
  }

  // s_PlacementDataWithIdentifierDefaultKey (EveSmartLightColorShareGroup.cpp:7).
  static _defaultPlacement = new PlacementDataWithIdentifier();

  static _up = vec3.fromValues(0, 1, 0);

  static _colorValues = vec3.create();

  static _sharedColor = vec4.create();

}

// EveSmartLightColorShareGroup_Blue.cpp: native exposure.
meta.blue.interfaceTable({ interfaces: [EveSmartLightColorShareGroup, EveSmartLightBaseGroup, INotify, IListNotify, EveEntity], chainTo: EveSmartLightBaseGroup })(EveSmartLightColorShareGroup, { kind: "class" });
