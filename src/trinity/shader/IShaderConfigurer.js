import { IRoot } from "../../global/blueexposure/IRoot.js";
// Source: trinity/trinity/Shader/IShaderConfigurer.h:5-9
import { CjsSchema, meta } from "#schema";


/** Contract for an object whose shaders take named options, as Tr2ActionSetShaderOption sets them. */
export class IShaderConfigurer extends IRoot
{
  /**
   * Sets a named shader option.
   *
   * @abstract
   * @param {string} _name The option name.
   * @param {string} _value The option value.
   * @returns {void}
   */
  SetShaderOption(_name, _value) {}
}

CjsSchema.decorateMethod(IShaderConfigurer, "SetShaderOption", meta.abstract);
CjsSchema.exposure.inherit(IRoot)(IShaderConfigurer);
CjsSchema.exposure.interface("IShaderConfigurer")(IShaderConfigurer);
