import { IListNotify } from "../../../global/blue/IListNotify.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightBaseGroup.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { color } from "#math/color";
import { vec4 } from "#math/vec4";
import { resolveFactionColor } from "../resolveFactionColor.js";
import { BLUELISTEVENT } from "#consts/blue";

/**
 * Faction-color resolution shared by every class that flattens Carbon's
 * EveSmartLightBaseGroup secondary base (EveSmartLightBaseGroup.cpp:43-53):
 * the selected faction color when enabled and in range, otherwise the custom
 * color. Carbon's bound is SOFDataFactionColorChooser::TYPE_MAX; the inherited
 * JS accepts Carbon's array and the combined runtime's named SOF colour-set
 * model. The resolved value is copied into caller-owned storage.
 * @param {Float32Array} customColor
 * @param {Boolean} useFactionColor
 * @param {Number} factionColor
 * @param {Array|Object|null} parentColorSet
 * @param {Float32Array} out
 * @returns {Float32Array}
 */
export function resolveGroupColor(customColor, useFactionColor, factionColor, parentColorSet, out = color.createLinear())
{
  return resolveFactionColor(out, customColor, useFactionColor, factionColor, parentColorSet);
}

/** The shared faction-colour resolution and attribute-modifier surface flattened into every smart-light group implementation. */
@meta.define({ className: "EveSmartLightBaseGroup", family: "eve/smartLights" })
@meta.blue.inherit(IListNotify)
export class EveSmartLightBaseGroup
{

  /** m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  factionColor = -1;

  /** m_useFactionColor (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  useFactionColor = false;

  /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSmartLightGroupAttributeModifier")
  attributeModifiers = [];

  /** m_color (Color) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  customColor = color.createLinear();

  /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
  _parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  _resolvedGroupColor = color.createLinear();

  /** IEveSmartLightGroup default: no asynchronous work. */
  @meta.blue.method
  @meta.noop
  UpdateAsyncronous(_updateContext, _params, _distribution)
  {
  }

  /** IEveSmartLightGroup default: no synchronous work. */
  @meta.blue.method
  @meta.noop
  UpdateSyncronous(_updateContext, _params, _distribution)
  {
  }

  /** IEveSmartLightGroup default: no visibility state. */
  @meta.blue.method
  @meta.noop
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** IEveSmartLightGroup default: contributes no renderables. */
  @meta.blue.method
  @meta.noop
  GetRenderables(renderables = [])
  {
    return renderables;
  }

  /** IEveSmartLightGroup default: contributes no quads. */
  @meta.blue.method
  @meta.noop
  AddQuadsToQuadRenderer(_placements, _size, _frustum, _quadRenderer)
  {
  }

  /** IEveSmartLightGroup default: registers no quad effect. */
  @meta.blue.method
  @meta.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /** Faction-aware group color (EveSmartLightBaseGroup.cpp:43-53). */
  @meta.blue.method
  @meta.implemented
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
   * Stores the inherited faction color set and fans it out to the attribute
   * modifiers (EveSmartLightBaseGroup.cpp:30-41).
   */
  @meta.blue.method
  @meta.implemented
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

  /** Overwrites the custom color (EveSmartLightBaseGroup.cpp:55-58). */
  @meta.blue.method
  @meta.implemented
  SetColor(color)
  {
    vec4.copy(this.customColor, color);
  }

  /** Fans a controller variable out to the attribute modifiers (EveSmartLightBaseGroup.cpp:60-66). */
  @meta.blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    for (const attributeModifier of this.attributeModifiers)
    {
      attributeModifier.SetControllerVariable(name, value);
    }
  }

  /**
   * Newly inserted attribute modifiers inherit the parent color set
   * (EveSmartLightBaseGroup.cpp:16-28).
   */
  @meta.blue.method
  @meta.implemented
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

}

// EveSmartLightBaseGroup_Blue.cpp: native exposure; unported contracts: IEveSmartLightGroup.
meta.blue.interfaceTable({ interfaces: [EveSmartLightBaseGroup, IListNotify], chainTo: null })(EveSmartLightBaseGroup, { kind: "class" });
