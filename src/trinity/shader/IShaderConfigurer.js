// Source: trinity/trinity/Shader/IShaderConfigurer.h:5-9
import { CjsSchema, meta } from "#schema";


/** Contract for an object whose shaders take named options, as Tr2ActionSetShaderOption sets them. */
export class IShaderConfigurer
{
  /**
   * Sets a named shader option.
   * @param {string} _name The option name.
   * @param {string} _value The option value.
   * @returns {void}
   */
  SetShaderOption(_name, _value)
  {
    throw new Error("IShaderConfigurer.SetShaderOption must be implemented by a shader configurer.");
  }
}

CjsSchema.decorateMethod(IShaderConfigurer, "SetShaderOption", meta.abstract);
CjsSchema.blue.define(IShaderConfigurer, { className: "IShaderConfigurer" });
