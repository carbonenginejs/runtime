import { exposure as be } from "#be";
// Source: trinity/trinity/Shader/Parameter/Tr2Vector2Parameter.h
// Source: trinity/trinity/Shader/Parameter/Tr2Vector2Parameter.cpp
import { IInitialize } from "#blue";
import { ITriEffectParameter } from "./ITriEffectParameter.js";
import { ITriReroutable } from "../../core/ITriReroutable.js";
import { num } from "#math/num";
import { vec2 } from "#math/vec2";
import { meta, type, blue } from "#schema";
import { FNV1_INITIAL, hashFnv1Floats, hashFnv1String } from "#utils/hash";


/**
 * Two-component float value for a named shader constant, with sRGB gamma
 * handling and optional rerouting into an external destination.
 */
@be.define("Tr2Vector2Parameter")
@be.inherit(ITriReroutable, IInitialize)
@be.mapInterface(ITriEffectParameter)
@be.mapInterface(ITriReroutable)
@be.mapInterface(IInitialize)
export class Tr2Vector2Parameter extends ITriEffectParameter
{
  @be.mapAttribute(be.PERSISTONLY)

  @type.vec2
  value = vec2.fromValues(1, 1);

  @be.mapAttribute(be.READ)
  @type.boolean
  usedByCurrentTechnique = false;

  @be.mapAttribute(be.READ)
  @type.boolean
  usedByCurrentEffect = false;

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.string
  name = "";

  /** m_isSrgb - shader-annotation driven; not Blue-exposed on vec2 in Carbon. */
  isSrgb = false;

  /** m_linearValue - gamma-to-linear mirror uploaded when isSrgb. */
  linearValue = vec2.fromValues(1, 1);

  #bindings = [];

  #reroutedValue = null;

  /** Blue MAP_PROPERTY "x"/"v1" - refreshes from the rerouted value on read. */
  @be.mapProperty()
  @type.float32
  get x()
  {
    this.#RefreshFromReroute();
    return this.value[0];
  }

  /**
   * Writes component 0 and marks the parameter dirty, so the next apply carries
   * the new value.
   */
  set x(component)
  {
    this.#setComponent(0, component);
  }

  /** Blue MAP_PROPERTY "y"/"v2". */
  @be.mapProperty()
  @type.float32
  get y()
  {
    this.#RefreshFromReroute();
    return this.value[1];
  }

  /**
   * Writes component 1 and marks the parameter dirty, so the next apply carries
   * the new value.
   */
  set y(component)
  {
    this.#setComponent(1, component);
  }

  /** Blue MAP_PROPERTY alias reading `x`. */
  @be.mapProperty()
  @type.float32
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
  @be.mapProperty()
  @type.float32
  get v2()
  {
    return this.y;
  }

  /** Blue MAP_PROPERTY alias writing `y`. */
  set v2(component)
  {
    this.y = component;
  }

  // Carbon's component utility methods (Tr2Vector2Parameter.cpp:265-334) are
  // what the Blue x/y properties above are built FROM; each is the same
  // refresh-from-reroute read or write-through-reroute-and-linear write.

  /** Carbon GetX (cpp:265-273): refresh from the reroute, then component 0. */

  @meta.implemented
  GetX()
  {
    return this.x;
  }

  /** Carbon GetY (cpp:283-291). */

  @meta.implemented
  GetY()
  {
    return this.y;
  }

  /** Carbon SetX (cpp:301-313): write, refresh the linear mirror, write through the reroute. */

  @meta.implemented
  SetX(x)
  {
    this.x = x;
  }

  /** Carbon SetY (cpp:323-334). */

  @meta.implemented
  SetY(y)
  {
    this.y = y;
  }

  /** The shader constant name this value binds to; empty until authored. */

  @meta.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: authored value bytes then name. */

  @meta.adapted
  GetHashValue(startingHash = FNV1_INITIAL)
  {
    return hashFnv1String(this.name, hashFnv1Floats(this.value, startingHash));
  }

  // Carbon returns `const Vector2&` - a reference the compiler forbids writing
  // through (Tr2Vector2Parameter.cpp). JavaScript has no const reference,
  // so returning this.value would hand a caller a live handle on the
  // parameter's own state, and a stray write would change the parameter
  // without marking it dirty or reaching the reroute destination. The caller
  // gets a copy: their own buffer when they supply one, a fresh one otherwise.

  /**
   * Refreshes from the reroute destination when one is set, then copies the
   * components into `out`, allocating only when the caller supplies nothing.
   *
   * Adapted: Carbon returns a const reference to its own value; JavaScript cannot express
   * that, so this copies rather than exposing internal state.
   */

  @meta.adapted
  GetValue(out)
  {
    this.#RefreshFromReroute();
    for (let i = 0; i < 2; i++)
    {
      out[i] = this.value[i];
    }
    return out;
  }

  /** Pulls the reroute destination into the stored value, without copying it out. */
  #RefreshFromReroute()
  {
    if (this.#reroutedValue)
    {
      for (let i = 0; i < 2; i++)
      {
        this.value[i] = this.#reroutedValue[i];
      }
    }
    return this.value;
  }

  /**
   * Copies two components in, refreshes the linear mirror and writes through to
   * the reroute destination when one is set.
   */

  @meta.implemented
  SetValue(value)
  {
    for (let i = 0; i < 2; i++)
    {
      this.value[i] = value[i];
    }
    this.#updateLinearValue();
    if (this.#reroutedValue)
    {
      for (let i = 0; i < 2; i++)
      {
        this.#reroutedValue[i] = this.value[i];
      }
    }
  }

  /**
   * Whether reads and writes go through an external destination; an sRGB
   * constant is never rerouted, because its value must be gamma-converted before
   * upload.
   */

  @meta.implemented
  IsRerouted()
  {
    return !this.isSrgb && this.#reroutedValue !== null;
  }

  /**
   * Points the parameter at an external destination and seeds it with the current value; a target smaller than 8 bytes, not writable as two components, or belonging to an sRGB constant clears the reroute instead. Registered bindings are notified of the effective destination either way.
   * @param size destination capacity in bytes, not components
   */

  @meta.adapted
  SetDestination(dest, size = 8)
  {
    if (size >= 8 && !this.isSrgb)
    {
      this.#reroutedValue = dest;
      for (let i = 0; i < 2; i++)
      {
        dest[i] = this.value[i];
      }
    }
    else
    {
      this.#reroutedValue = null;
      this.#updateLinearValue();
    }
    // Carbon notifies each binding of the effective destination (Tr2Vector2Parameter.cpp:131).
    for (const binding of this.#bindings)
    {
      binding.RerouteDestination(this.GetDestination().dest);
    }
  }

  /**
   * The array an upload should read - the reroute target when set, otherwise the
   * parameter's own value - paired with its 8-byte size. The array is borrowed,
   * not copied.
   */

  @meta.adapted
  GetDestination()
  {
    return {
      dest: this.#reroutedValue ?? this.value,
      size: 8
    };
  }

  /**
   * Adds a binding to be notified whenever the destination is repointed;
   * duplicates are ignored.
   */

  @meta.adapted
  RegisterBinding(binding)
  {
    // Carbon push_back (Tr2Vector2Parameter.cpp:186).
    this.#bindings.push(binding);
  }

  /** Stops notifying a binding; unknown bindings are ignored. */

  @meta.adapted
  UnregisterBinding(binding)
  {
    // Carbon erases the first match (Tr2Vector2Parameter.cpp:201).
    const index = this.#bindings.indexOf(binding);
    if (index >= 0)
    {
      this.#bindings.splice(index, 1);
    }
  }

  /**
   * Re-resolves usage and the sRGB flag from the shader's reflected constant,
   * dropping the reroute when the shader is gone or the constant turns out to be
   * sRGB. Reads reflection metadata only; no GPU handle is bound.
   */

  @meta.adapted
  RebuildEffectHandles(effectRes)
  {
    this.isSrgb = false;
    if (!effectRes && this.#reroutedValue)
    {
      this.SetDestination(null, 0);
    }
    // Tr2Vector2Parameter.cpp:223-253
    const constant = this.name && effectRes ? effectRes.GetConstant(this.name) : null;
    const used = !!constant;
    this.usedByCurrentEffect = used;
    this.usedByCurrentTechnique = used;
    this.isSrgb = constant ? constant.isSRGB : false;
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

  @meta.implemented
  Initialize()
  {
    if (this.#reroutedValue)
    {
      for (let i = 0; i < 2; i++)
      {
        this.#reroutedValue[i] = this.value[i];
      }
    }
    this.#updateLinearValue();
    return true;
  }

  /**
   * Writes the two components an upload should use into the caller's
   * destination: the authored value while rerouted, otherwise the
   * gamma-converted linear mirror for an sRGB constant.
   * Carbon declaration: Tr2Vector2Parameter::CopyValueToEffect (trinity/trinity/Shader/Parameter/Tr2Vector2Parameter.h:41).
   */
  @meta.adapted
  CopyValueToEffect(_inputType, out)
  {
    if (this.#reroutedValue)
    {
      for (let i = 0; i < 2; i++)
      {
        out[i] = this.value[i];
      }
      return;
    }
    const source = this.isSrgb ? this.linearValue : this.value;
    for (let i = 0; i < 2; i++)
    {
      out[i] = source[i];
    }
  }

  /**
   * Refreshes the linear mirror: a plain copy when not sRGB, otherwise
   * gamma-to-linear on both components.
   */
  #updateLinearValue()
  {
    if (!this.isSrgb)
    {
      for (let i = 0; i < 2; i++)
      {
        this.linearValue[i] = this.value[i];
      }
      return;
    }
    this.linearValue[0] = num.gammaToLinearCarbon(this.value[0]);
    this.linearValue[1] = num.gammaToLinearCarbon(this.value[1]);
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
    return (Array.isArray(value) || ArrayBuffer.isView(value)) && value.length === 2 && Array.prototype.every.call(value, component => typeof component === "number");
  }

}

// Exact identities from Tr2Vector2Parameter_Blue.cpp; no exposure chain.
