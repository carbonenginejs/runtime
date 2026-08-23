import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { num } from '@carbonenginejs/runtime-utils/num';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsVectorParameter } from './CjsVectorParameter.js';

let _initProto, _initClass, _init_value, _init_extra_value, _init_isSrgb, _init_extra_isSrgb, _init_usedByCurrentTechnique, _init_extra_usedByCurrentTechnique, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_name, _init_extra_name;

/**
 * Four-component float value for a named shader constant, with sRGB gamma
 * handling and optional rerouting into an external destination.
 */
let _Tr2Vector4Parameter;
class Tr2Vector4Parameter extends CjsVectorParameter {
  static {
    ({
      e: [_init_value, _init_extra_value, _init_isSrgb, _init_extra_isSrgb, _init_usedByCurrentTechnique, _init_extra_usedByCurrentTechnique, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_name, _init_extra_name, _initProto],
      c: [_Tr2Vector4Parameter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Vector4Parameter",
      family: "shader"
    })], [[[io, io.persistOnly, type, type.vec4], 16, "value"], [[io, io.read, type, type.boolean], 16, "isSrgb"], [[io, io.read, type, type.boolean], 16, "usedByCurrentTechnique"], [[io, io.read, type, type.boolean], 16, "usedByCurrentEffect"], [[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHashValue"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns a const reference to its own value; JavaScript cannot express that, so this copies rather than exposing internal state.")], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsRerouted"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetDestination"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDestination"], [[carbon, carbon.method, impl, impl.adapted], 18, "RegisterBinding"], [[carbon, carbon.method, impl, impl.adapted], 18, "UnregisterBinding"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildEffectHandles"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyValueToEffect"]], 0, void 0, CjsVectorParameter));
  }
  value = (_initProto(this), _init_value(this, vec4.fromValues(1, 1, 1, 1)));
  isSrgb = (_init_extra_value(this), _init_isSrgb(this, false));
  usedByCurrentTechnique = (_init_extra_isSrgb(this), _init_usedByCurrentTechnique(this, false));
  usedByCurrentEffect = (_init_extra_usedByCurrentTechnique(this), _init_usedByCurrentEffect(this, false));
  name = (_init_extra_usedByCurrentEffect(this), _init_name(this, ""));
  linearValue = (_init_extra_name(this), vec4.fromValues(1, 1, 1, 1));
  #bindings = [];
  #reroutedValue = null;

  /** Blue MAP_PROPERTY "x"/"v1" - refreshes from the rerouted value on read. */
  get x() {
    this.#RefreshFromReroute();
    return this.value[0];
  }

  /**
   * Writes component 0 and marks the parameter dirty, so the next apply carries
   * the new value.
   */
  set x(component) {
    this.#setComponent(0, component);
  }

  /** Blue MAP_PROPERTY "y"/"v2". */
  get y() {
    this.#RefreshFromReroute();
    return this.value[1];
  }

  /**
   * Writes component 1 and marks the parameter dirty, so the next apply carries
   * the new value.
   */
  set y(component) {
    this.#setComponent(1, component);
  }

  /** Blue MAP_PROPERTY "z"/"v3". */
  get z() {
    this.#RefreshFromReroute();
    return this.value[2];
  }

  /**
   * Writes component 2 and marks the parameter dirty, so the next apply carries
   * the new value.
   */
  set z(component) {
    this.#setComponent(2, component);
  }

  /** Blue MAP_PROPERTY "w"/"v4". */
  get w() {
    this.#RefreshFromReroute();
    return this.value[3];
  }

  /**
   * Writes component 3 and marks the parameter dirty, so the next apply carries
   * the new value.
   */
  set w(component) {
    this.#setComponent(3, component);
  }

  /** Blue MAP_PROPERTY alias reading `x`. */
  get v1() {
    return this.x;
  }

  /** Blue MAP_PROPERTY alias writing `x`. */
  set v1(component) {
    this.x = component;
  }

  /** Blue MAP_PROPERTY alias reading `y`. */
  get v2() {
    return this.y;
  }

  /** Blue MAP_PROPERTY alias writing `y`. */
  set v2(component) {
    this.y = component;
  }

  /** Blue MAP_PROPERTY alias reading `z`. */
  get v3() {
    return this.z;
  }

  /** Blue MAP_PROPERTY alias writing `z`. */
  set v3(component) {
    this.z = component;
  }

  /** Blue MAP_PROPERTY alias reading `w`. */
  get v4() {
    return this.w;
  }

  /** Blue MAP_PROPERTY alias writing `w`. */
  set v4(component) {
    this.w = component;
  }

  /** The shader constant name this value binds to; empty until authored. */
  GetParameterName() {
    return this.name;
  }

  /** Content hash: authored value bytes then name. */
  GetHashValue(startingHash = CjsVectorParameter.FNV1_INITIAL) {
    return CjsVectorParameter.hashFnv1String(this.name, CjsVectorParameter.hashFnv1Floats(this.value, startingHash));
  }

  // Carbon returns `const Vector4&` - a reference the compiler forbids writing
  // through (Tr2Vector4Parameter.cpp:56-67). JavaScript has no const reference,
  // so returning this.value would hand a caller a live handle on the
  // parameter's own state, and a stray write would change the parameter
  // without marking it dirty or reaching the reroute destination. The caller
  // gets a copy: their own buffer when they supply one, a fresh one otherwise.

  /**
   * Refreshes from the reroute destination when one is set, then copies the
   * components into `out`, allocating only when the caller supplies nothing.
   */
  GetValue(out = vec4.create()) {
    this.#RefreshFromReroute();
    return CjsVectorParameter.copyNumberArray(out, this.value, 4);
  }

  /** Pulls the reroute destination into the stored value, without copying it out. */
  #RefreshFromReroute() {
    if (this.#reroutedValue) {
      CjsVectorParameter.readVectorDestination(this.#reroutedValue, this.value, 4);
    }
    return this.value;
  }

  /**
   * Copies four components in, refreshes the linear mirror and writes through to
   * the reroute destination when one is set.
   */
  SetValue(value) {
    CjsVectorParameter.copyNumberArray(this.value, value, 4);
    this.#updateLinearValue();
    if (this.#reroutedValue) {
      CjsVectorParameter.writeVectorDestination(this.#reroutedValue, this.value, 4);
    }
  }

  /**
   * Whether reads and writes go through an external destination; an sRGB
   * constant is never rerouted, because its value must be gamma-converted before
   * upload.
   */
  IsRerouted() {
    return !this.isSrgb && this.#reroutedValue !== null;
  }

  /**
   * Points the parameter at an external destination and seeds it with the current value; a target smaller than 16 bytes, not writable as four components, or belonging to an sRGB constant clears the reroute instead. Registered bindings are notified of the effective destination either way.
   * @param size destination capacity in bytes, not components
   */
  SetDestination(dest, size = 16) {
    if (size >= 16 && !this.isSrgb && CjsVectorParameter.isVectorDestination(dest, 4)) {
      this.#reroutedValue = dest;
      CjsVectorParameter.writeVectorDestination(dest, this.value, 4);
    } else {
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
  GetDestination() {
    return {
      dest: this.#reroutedValue ?? this.value,
      size: 16
    };
  }

  /**
   * Adds a binding to be notified whenever the destination is repointed;
   * duplicates are ignored.
   */
  RegisterBinding(binding) {
    CjsVectorParameter.registerBinding(this.#bindings, binding);
  }

  /** Stops notifying a binding; unknown bindings are ignored. */
  UnregisterBinding(binding) {
    CjsVectorParameter.unregisterBinding(this.#bindings, binding);
  }

  /**
   * Re-resolves usage and the sRGB flag from the shader's reflected constant,
   * dropping the reroute when the shader is gone or the constant turns out to be
   * sRGB. Reads reflection metadata only; no GPU handle is bound.
   */
  RebuildEffectHandles(effectRes) {
    this.isSrgb = false;
    if (!effectRes && this.#reroutedValue) {
      this.SetDestination(null, 0);
    }
    const constant = this.name ? CjsVectorParameter.getEffectConstant(effectRes, this.name) : null;
    const used = !!constant;
    this.usedByCurrentEffect = used;
    this.usedByCurrentTechnique = used;
    this.isSrgb = CjsVectorParameter.getConstantIsSrgb(constant);
    if (this.isSrgb) {
      this.SetDestination(null, 0);
    }
    this.#updateLinearValue();
  }

  /**
   * Seeds an existing reroute destination with the current value and refreshes
   * the linear mirror; always returns true.
   */
  Initialize() {
    if (this.#reroutedValue) {
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
  CopyValueToEffect(_inputType, out) {
    const source = this.#reroutedValue ?? (this.isSrgb ? this.linearValue : this.value);
    CjsVectorParameter.writeVectorDestination(out, source, 4);
  }

  /**
   * Refreshes the linear mirror: a plain copy when not sRGB, otherwise
   * gamma-to-linear on the first three components with alpha passed through
   * unchanged.
   */
  #updateLinearValue() {
    if (!this.isSrgb) {
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
  #setComponent(index, component) {
    this.value[index] = Number(component);
    this.SetValue(this.value);
  }

  /** JS convenience: raw values this parameter class claims for map-form inference. */
  static isValue(value) {
    return CjsVectorParameter.isNumberArrayValue(value, 4);
  }
  static {
    _initClass();
  }
}

export { _Tr2Vector4Parameter as Tr2Vector4Parameter };
//# sourceMappingURL=Tr2Vector4Parameter.js.map
