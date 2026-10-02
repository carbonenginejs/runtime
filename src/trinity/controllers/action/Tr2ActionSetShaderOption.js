// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetShaderOption.h
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetShaderOption.cpp
// Source: trinity/trinity/Controllers/Actions/Tr2ActionSetShaderOption_Blue.cpp
import { meta, types } from "#schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that sets a named shader option on its owner when it starts,
 * changing which shader permutation the owner renders with.
 */
@meta.define({
  className: "Tr2ActionSetShaderOption",
  family: "controllers"
})
export class Tr2ActionSetShaderOption extends ITr2ControllerAction
{
  /**
   * Shader-option name forwarded to the controller owner.
   * @type {string}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  key = "";

  /**
   * Shader-option value selecting the requested permutation on the owner.
   * @type {string}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  value = "";

  /**
   * Sets a shader option on the controller owner when supported.
   * Adapted: preserves the existing owner adapter until the native
   * IShaderConfigurer contract is ported; this is not a native BlueCast check.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Start(controller)
  {
    const owner = ITr2ControllerAction.getOwner(controller);
    if (!ITr2ControllerAction.hasFunction(owner, "SetShaderOption"))
    {
      return;
    }
    owner.SetShaderOption(this.key, this.value);
  }
}

// Native exposure ends at this concrete table (Tr2ActionSetShaderOption_Blue.cpp:14-15,18).
meta.carbon.interfaceTable({
  interfaces: [Tr2ActionSetShaderOption, ITr2ControllerAction],
  chainTo: null
})(Tr2ActionSetShaderOption);
