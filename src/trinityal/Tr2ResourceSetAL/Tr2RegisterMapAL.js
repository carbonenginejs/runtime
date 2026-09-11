// Source: trinity/trinityal/include/Tr2ResourceSetAL.h:23
// Source: trinity/trinityal/src/Tr2ResourceSetAL.cpp:27-144
import { impl } from "#schema";
import { ShaderType } from "#consts/render-context";

export const MAX_RESOURCES_IN_STAGE = 32;

/** Stage/register to dense resource index, with counts spanning all stages. */
export class Tr2RegisterMapAL
{
  static MAX_RESOURCES_IN_STAGE = MAX_RESOURCES_IN_STAGE;

  srvCount = 0;
  uavCount = 0;
  samplerCount = 0;
  srvs = Array.from({ length: ShaderType.SHADER_TYPE_COUNT }, () => new Uint8Array(MAX_RESOURCES_IN_STAGE).fill(255));
  uavs = Array.from({ length: ShaderType.SHADER_TYPE_COUNT }, () => new Uint8Array(MAX_RESOURCES_IN_STAGE).fill(255));
  samplers = Array.from({ length: ShaderType.SHADER_TYPE_COUNT }, () => new Uint8Array(MAX_RESOURCES_IN_STAGE).fill(255));

  /** JS adaptation: named selectors replace C++ constructor overloads. */
  constructor({ stage = null, signature = null, shaders = null, stages = [], signatures = [], copy = null } = {})
  {
    // Deterministic 255 replaces uninitialized default arrays. Carbon only
    // reads a category's arrays when its count is nonzero.
    if (copy)
    {
      this.srvCount = copy.srvCount;
      this.uavCount = copy.uavCount;
      this.samplerCount = copy.samplerCount;
      this.srvs = copy.srvs.map(row => row.slice());
      this.uavs = copy.uavs.map(row => row.slice());
      this.samplers = copy.samplers.map(row => row.slice());
      return;
    }
    if (signature)
    {
      stages = [ stage ];
      signatures = [ signature ];
    }
    else if (shaders)
    {
      stages = shaders.map(shader => shader.GetType());
      signatures = shaders.map(shader => shader.GetSignature());
    }
    for (let index = 0; index < signatures.length; index += 1)
    {
      // Input order, including duplicate registers, is intentional (:34-119).
      for (const register of (signatures[index]?.registers ?? []))
      {
        const shaderStage = stages[index];
        const slot = register.registerIndex;
        if (register.registerType & 32) this.srvs[shaderStage][slot] = this.srvCount++;
        else if (register.registerType & 64) this.uavs[shaderStage][slot] = this.uavCount++;
        else if (register.registerType === 1) this.samplers[shaderStage][slot] = this.samplerCount++;
      }
    }
  }

  /** Carbon's operator==; a struct method uses lower camel case. */
  @impl.adapted
  @impl.reason("JavaScript spells the C++ equality operator as a method.")
  equals(other)
  {
    for (const [ count, slots ] of [ [ "srvCount", "srvs" ], [ "uavCount", "uavs" ], [ "samplerCount", "samplers" ] ])
    {
      if (this[count] !== other[count]) return false;
      if (this[count] === 0) continue;
      for (let stage = 0; stage < ShaderType.SHADER_TYPE_COUNT; stage += 1)
      {
        for (let slot = 0; slot < MAX_RESOURCES_IN_STAGE; slot += 1)
        {
          if (this[slots][stage][slot] !== other[slots][stage][slot]) return false;
        }
      }
    }
    return true;
  }
}
