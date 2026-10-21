import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightBaseGroup.h
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { IEveSmartLightGroup } from "./IEveSmartLightGroup.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
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
@be.define("EveSmartLightBaseGroup")
@blue.inherit(IEveSmartLightGroup, IListNotify)
@be.mapInterface(IEveSmartLightGroup)
@be.mapInterface(IListNotify)
export class EveSmartLightBaseGroup
{

  /** m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  factionColor = -1;

  /** m_useFactionColor (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  useFactionColor = false;

  /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("IEveSmartLightGroupAttributeModifier")
  attributeModifiers = [];

  /** m_color (Color) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  customColor = color.createLinear();

  /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
  _parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  _resolvedGroupColor = color.createLinear();

  /** IEveSmartLightGroup default: no asynchronous work. */
  @meta.noop
  @blue.method
  UpdateAsyncronous__Distribution(_updateContext, _params, _distribution)
  {
  }

  /** IEveSmartLightGroup default: no synchronous work. */
  @meta.noop
  @blue.method
  UpdateSyncronous__Distribution(_updateContext, _params, _distribution)
  {
  }

  /** IEveSmartLightGroup default: no visibility state. */
  @blue.method
  @meta.noop
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** IEveSmartLightGroup default: contributes no renderables. */
  @blue.method
  @meta.noop
  GetRenderables(renderables = [])
  {
    return renderables;
  }

  /** IEveSmartLightGroup default: contributes no quads. */
  @blue.method
  @meta.noop
  AddQuadsToQuadRenderer(_placements, _size, _frustum, _quadRenderer)
  {
  }

  /** IEveSmartLightGroup default: registers no quad effect. */
  @blue.method
  @meta.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /**
   * The colour being used: Carbon's MAP_PROPERTY_READONLY "activeColor" over
   * GetGroupColor (EveSmartLightBaseGroup_Blue.cpp:18), so each group
   * subclass's own GetGroupColor answers it.
   */
  @be.mapPropertyReadOnly()
  @type.color
  get activeColor()
  {
    return this.GetGroupColor();
  }

  /** Faction-aware group color (EveSmartLightBaseGroup.cpp:43-53). */
  @blue.method
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
  @blue.method
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
  @blue.method
  @meta.implemented
  SetColor(color)
  {
    vec4.copy(this.customColor, color);
  }

  /** Fans a controller variable out to the attribute modifiers (EveSmartLightBaseGroup.cpp:60-66). */
  @blue.method
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
  @blue.method
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
