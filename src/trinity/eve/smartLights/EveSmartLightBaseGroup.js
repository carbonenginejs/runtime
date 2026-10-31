import { IRoot } from "../../../global/blue/IRoot.js";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightBaseGroup.h
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { IEveSmartLightGroup } from "./IEveSmartLightGroup.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type } from "#schema";
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
export function resolveGroupColor(customColor, useFactionColor, factionColor, parentColorSet, out)
{
  return resolveFactionColor(out, customColor, useFactionColor, factionColor, parentColorSet);
}

/** The shared faction-colour resolution and attribute-modifier surface flattened into every smart-light group implementation. */
@be.define("EveSmartLightBaseGroup")
@be.inherit(IEveSmartLightGroup, IListNotify)
@be.mapInterface(IEveSmartLightGroup)
@be.mapInterface(IListNotify)
export class EveSmartLightBaseGroup extends IRoot
{

  /**
   * m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightBaseGroup_Blue.cpp:16); chooser EveSOFDataFactionColorSetTypeChooser (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:10).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.NOTIFY | be.ENUM, "trinity.SOFDataFactionColorChooser.ColorType")
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

  /**
   * IEveSmartLightGroup default: no asynchronous work.
   *
   * @adapted
   */
  @meta.adapted
  UpdateAsyncronous__Distribution(_updateContext, _params, _distribution)
  {
  }

  /**
   * IEveSmartLightGroup default: no synchronous work.
   *
   * @adapted
   */
  @meta.adapted
  UpdateSyncronous__Distribution(_updateContext, _params, _distribution)
  {
  }

  /**
   * IEveSmartLightGroup default: no visibility state.
   *
   * @adapted
   */
  @meta.adapted
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /**
   * IEveSmartLightGroup default: contributes no renderables.
   *
   * @adapted
   */
  @meta.adapted
  GetRenderables(renderables)
  {
    return renderables;
  }

  /**
   * IEveSmartLightGroup default: contributes no quads.
   *
   * @adapted
   */
  @meta.adapted
  AddQuadsToQuadRenderer(_placements, _size, _frustum, _quadRenderer)
  {
  }

  /**
   * IEveSmartLightGroup default: registers no quad effect.
   *
   * @adapted
   */
  @meta.adapted
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

  /**
   * Faction-aware group color (EveSmartLightBaseGroup.cpp:43-53).
   *
   * @implemented
   */

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
   *
   * @implemented
   */

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

  /**
   * Overwrites the custom color (EveSmartLightBaseGroup.cpp:55-58).
   *
   * @implemented
   */

  @meta.implemented
  SetColor(color)
  {
    vec4.copy(this.customColor, color);
  }

  /**
   * Fans a controller variable out to the attribute modifiers (EveSmartLightBaseGroup.cpp:60-66).
   *
   * @implemented
   */

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
   *
   * @implemented
   */

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
