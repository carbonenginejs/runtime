// Source: E:\carbonengine\trinity\trinity\Shader\Parameter\Tr2Vector4Parameter.h
// Source: E:\carbonengine\trinity\trinity\Shader\Parameter\Tr2Vector4Parameter.cpp
import { num } from "@carbonenginejs/runtime-utils/num";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsVectorParameter } from "./CjsVectorParameter.js";


/**
 * Four-component float value for a named shader constant, with sRGB gamma
 * handling and optional rerouting into an external destination.
 */
@type.define({
  className: "Tr2Vector4Parameter",
  family: "shader"
})
export class Tr2Vector4Parameter extends CjsVectorParameter
{
  @io.persistOnly
  @type.vec4
  value = vec4.fromValues(1, 1, 1, 1);

  @io.read
  @type.boolean
  isSrgb = false;

  @io.read
  @type.boolean
  usedByCurrentTechnique = false;

  @io.read
  @type.boolean
  usedByCurrentEffect = false;

  @io.notify
  @io.persist
  @type.string
  name = "";

  linearValue = vec4.fromValues(1, 1, 1, 1);

  #bindings = [];

  #reroutedValue = null;

  /** Blue MAP_PROPERTY "x"/"v1" - refreshes from the rerouted value on read. */
  get x()
  {
    this.GetValue();
    return this.value[0];
  }

  set x(component)
  {
    this.#setComponent(0, component);
  }

  /** Blue MAP_PROPERTY "y"/"v2". */
  get y()
  {
    this.GetValue();
    return this.value[1];
  }

  set y(component)
  {
    this.#setComponent(1, component);
  }

  /** Blue MAP_PROPERTY "z"/"v3". */
  get z()
  {
    this.GetValue();
    return this.value[2];
  }

  set z(component)
  {
    this.#setComponent(2, component);
  }

  /** Blue MAP_PROPERTY "w"/"v4". */
  get w()
  {
    this.GetValue();
    return this.value[3];
  }

  set w(component)
  {
    this.#setComponent(3, component);
  }

  /** Blue MAP_PROPERTY alias reading `x`. */
  get v1()
  {
    return this.x;
  }

  /** Blue MAP_PROPERTY alias writing `x`. */
  set v1(component)
  {
    this.x = component;
  }

  /** Blue MAP_PROPERTY alias reading `y`. */
  get v2()
  {
    return this.y;
  }

  /** Blue MAP_PROPERTY alias writing `y`. */
  set v2(component)
  {
    this.y = component;
  }

  /** Blue MAP_PROPERTY alias reading `z`. */
  get v3()
  {
    return this.z;
  }

  /** Blue MAP_PROPERTY alias writing `z`. */
  set v3(component)
  {
    this.z = component;
  }

  /** Blue MAP_PROPERTY alias reading `w`. */
  get v4()
  {
    return this.w;
  }

  /** Blue MAP_PROPERTY alias writing `w`. */
  set v4(component)
  {
    this.w = component;
  }

  /** The shader constant name this value binds to; empty until authored. */
  @carbon.method
  @impl.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: authored value bytes then name. */
  @carbon.method
  @impl.adapted
  GetHashValue(startingHash = CjsVectorParameter.FNV1_INITIAL)
  {
    return CjsVectorParameter.hashFnv1String(this.name, CjsVectorParameter.hashFnv1Floats(this.value, startingHash));
  }

  /**
   * Refreshes from the reroute destination when one is set, then copies four components out.
   * @param out defaults to the parameter's own value array, so a caller passing nothing gets a live reference rather than a copy
   */
  @carbon.method
  @impl.implemented
  GetValue(out = this.value)
  {
    if (this.#reroutedValue)
    {
      CjsVectorParameter.readVectorDestination(this.#reroutedValue, this.value, 4);
    }
    return CjsVectorParameter.copyNumberArray(out, this.value, 4);
  }

  /**
   * Copies four components in, refreshes the linear mirror and writes through to
   * the reroute destination when one is set.
   */
  @carbon.method
  @impl.implemented
  SetValue(value)
  {
    CjsVectorParameter.copyNumberArray(this.value, value, 4);
    this.#updateLinearValue();
    if (this.#reroutedValue)
    {
      CjsVectorParameter.writeVectorDestination(this.#reroutedValue, this.value, 4);
    }
  }

  /**
   * Whether reads and writes go through an external destination; an sRGB
   * constant is never rerouted, because its value must be gamma-converted before
   * upload.
   */
  @carbon.method
  @impl.implemented
  IsRerouted()
  {
    return !this.isSrgb && this.#reroutedValue !== null;
  }

  /**
   * Points the parameter at an external destination and seeds it with the current value; a target smaller than 16 bytes, not writable as four components, or belonging to an sRGB constant clears the reroute instead. Registered bindings are notified of the effective destination either way.
   * @param size destination capacity in bytes, not components
   */
  @carbon.method
  @impl.adapted
  SetDestination(dest, size = 16)
  {
    if (size >= 16 && !this.isSrgb && CjsVectorParameter.isVectorDestination(dest, 4))
    {
      this.#reroutedValue = dest;
      CjsVectorParameter.writeVectorDestination(dest, this.value, 4);
    }
    else
    {
      this.#reroutedValue = null;
      this.#updateLinearValue();
    }
    CjsVectorParameter.notifyBindings(this.#bindings, this.GetDestination().dest);
  }

  /**
   * The array an upload should read - the reroute target when set, otherwise the
   * parameter's own value - paired with its 16-byte size. The array is borrowed,
   * not copied.
   */
  @carbon.method
  @impl.adapted
  GetDestination()
  {
    return {
      dest: this.#reroutedValue ?? this.value,
      size: 16
    };
  }

  /**
   * Adds a binding to be notified whenever the destination is repointed;
   * duplicates are ignored.
   */
  @carbon.method
  @impl.adapted
  RegisterBinding(binding)
  {
    CjsVectorParameter.registerBinding(this.#bindings, binding);
  }

  /** Stops notifying a binding; unknown bindings are ignored. */
  @carbon.method
  @impl.adapted
  UnregisterBinding(binding)
  {
    CjsVectorParameter.unregisterBinding(this.#bindings, binding);
  }

  /**
   * Re-resolves usage and the sRGB flag from the shader's reflected constant,
   * dropping the reroute when the shader is gone or the constant turns out to be
   * sRGB. Reads reflection metadata only; no GPU handle is bound.
   */
  @carbon.method
  @impl.adapted
  RebuildEffectHandles(effectRes)
  {
    this.isSrgb = false;
    if (!effectRes && this.#reroutedValue)
    {
      this.SetDestination(null, 0);
    }
    const constant = this.name ? CjsVectorParameter.getEffectConstant(effectRes, this.name) : null;
    const used = !!constant;
    this.usedByCurrentEffect = used;
    this.usedByCurrentTechnique = used;
    this.isSrgb = CjsVectorParameter.getConstantIsSrgb(constant);
    if (this.isSrgb)
    {
      this.SetDestination(null, 0);
    }
    this.#updateLinearValue();
  }

  /**
   * Seeds an existing reroute destination with the current value and refreshes
   * the linear mirror; always returns true.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    if (this.#reroutedValue)
    {
      CjsVectorParameter.writeVectorDestination(this.#reroutedValue, this.value, 4);
    }
    this.#updateLinearValue();
    return true;
  }

  /**
   * Writes the four components an upload should use - the rerouted value, or the
   * gamma-converted linear mirror for an sRGB constant - into the caller's
   * destination.
   */
  @carbon.method
  @impl.adapted
  CopyValueToEffect(_inputType, out)
  {
    const source = this.#reroutedValue ?? (this.isSrgb ? this.linearValue : this.value);
    CjsVectorParameter.writeVectorDestination(out, source, 4);
  }

  /**
   * Refreshes the linear mirror: a plain copy when not sRGB, otherwise
   * gamma-to-linear on the first three components with alpha passed through
   * unchanged.
   */
  #updateLinearValue()
  {
    if (!this.isSrgb)
    {
      CjsVectorParameter.copyNumberArray(this.linearValue, this.value, 4);
      return;
    }
    this.linearValue[0] = num.gammaToLinear(this.value[0]);
    this.linearValue[1] = num.gammaToLinear(this.value[1]);
    this.linearValue[2] = num.gammaToLinear(this.value[2]);
    this.linearValue[3] = this.value[3];
  }

  /**
   * Assigns one component in place and re-runs SetValue so the linear mirror and
   * any reroute stay in sync.
   */
  #setComponent(index, component)
  {
    this.value[index] = Number(component);
    this.SetValue(this.value);
  }

  /** JS convenience: raw values this parameter class claims for map-form inference. */
  static isValue(value)
  {
    return CjsVectorParameter.isNumberArrayValue(value, 4);
  }

}
