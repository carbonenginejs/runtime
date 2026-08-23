// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/EveSmartLightBaseGroup.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec4 } from "#math/vec4";
import { resolveFactionColor } from "../resolveFactionColor.js";
import { BELIST_INSERTED } from "../../controllers/contracts.js";

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
export function resolveGroupColor(customColor, useFactionColor, factionColor, parentColorSet, out = vec4.createLinear())
{
  return resolveFactionColor(out, customColor, useFactionColor, factionColor, parentColorSet);
}

/** The shared faction-colour resolution and attribute-modifier surface flattened into every smart-light group implementation. */
@type.define({ className: "EveSmartLightBaseGroup", family: "eve/smartLights" })
export class EveSmartLightBaseGroup extends CjsModel
{

  /** m_selectedColor (int32_t) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  factionColor = -1;

  /** m_useFactionColor (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  useFactionColor = false;

  /** m_attributeModifiers (PIEveSmartLightGroupAttributeModifierVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSmartLightGroupAttributeModifier")
  attributeModifiers = [];

  /** m_color (Color) [READWRITE, PERSIST] */
  @io.persist
  @type.color
  customColor = vec4.createLinear();

  /** m_parentColorSet (const Color*) - inherited faction color set, never persisted. */
  #parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  #resolvedGroupColor = vec4.createLinear();

  /** IEveSmartLightGroup default: no asynchronous work. */
  @carbon.method
  @impl.noop
  UpdateAsyncronous(_updateContext, _params, _distribution)
  {
  }

  /** IEveSmartLightGroup default: no synchronous work. */
  @carbon.method
  @impl.noop
  UpdateSyncronous(_updateContext, _params, _distribution)
  {
  }

  /** IEveSmartLightGroup default: no visibility state. */
  @carbon.method
  @impl.noop
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** IEveSmartLightGroup default: contributes no renderables. */
  @carbon.method
  @impl.noop
  GetRenderables(renderables = [])
  {
    return renderables;
  }

  /** IEveSmartLightGroup default: contributes no quads. */
  @carbon.method
  @impl.noop
  AddQuadsToQuadRenderer(_placements, _size, _frustum, _quadRenderer)
  {
  }

  /** IEveSmartLightGroup default: registers no quad effect. */
  @carbon.method
  @impl.noop
  RegisterWithQuadRenderer(_quadRenderer)
  {
  }

  /** Faction-aware group color (EveSmartLightBaseGroup.cpp:43-53). */
  @carbon.method
  @impl.implemented
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

  /**
   * Stores the inherited faction color set and fans it out to the attribute
   * modifiers (EveSmartLightBaseGroup.cpp:30-41).
   */
  @carbon.method
  @impl.implemented
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

  /** Overwrites the custom color (EveSmartLightBaseGroup.cpp:55-58). */
  @carbon.method
  @impl.implemented
  SetColor(color)
  {
    vec4.copy(this.customColor, color);
  }

  /** Fans a controller variable out to the attribute modifiers (EveSmartLightBaseGroup.cpp:60-66). */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
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

}
