import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Shader/IShaderConfigurer.h:5-9
import { CjsSchema, blue } from "#schema";


/** Contract for an object whose shaders take named options, as Tr2ActionSetShaderOption sets them. */
export class IShaderConfigurer extends IRoot
{
  /**
   * Sets a named shader option.
   * @param {string} _name The option name.
   * @param {string} _value The option value.
   * @returns {void}
   */
  SetShaderOption(_name, _value) {}
}

CjsSchema.decorateMethod(IShaderConfigurer, "SetShaderOption", blue.abstract);
CjsSchema.blue.inherit(IRoot)(IShaderConfigurer);
CjsSchema.exposure.interface("IShaderConfigurer")(IShaderConfigurer);
