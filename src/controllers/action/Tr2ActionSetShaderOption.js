// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionSetShaderOption.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Actions\Tr2ActionSetShaderOption.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { ITr2ControllerAction } from "./ITr2ControllerAction.js";


/**
 * Controller action that sets a named shader option on its owner when it starts,
 * changing which shader permutation the owner renders with.
 */
@type.define({
  className: "Tr2ActionSetShaderOption",
  family: "controllers"
})
export class Tr2ActionSetShaderOption extends CjsModel
{
  @io.persist
  @type.string
  key = "";

  @io.persist
  @type.string
  value = "";

  /**
   * Sets a shader option on the controller owner when supported.
   */
  @carbon.method
  @impl.adapted
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
