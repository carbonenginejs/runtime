import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl, CjsSchema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';

let _initProto, _initClass, _init_destinationAttribute, _init_extra_destinationAttribute, _init_sourceAttribute, _init_extra_sourceAttribute, _init_destinationObject, _init_extra_destinationObject, _init_isEnabled, _init_extra_isEnabled, _init_name, _init_extra_name, _init_sourceObject, _init_extra_sourceObject, _init_offset, _init_extra_offset, _init_copyValueCallable, _init_extra_copyValueCallable, _init_scale, _init_extra_scale, _init_isWeak, _init_extra_isWeak, _init_isValid, _init_extra_isValid;

/**
 * Copies one attribute of a source object onto an attribute of a destination
 * object, applying a scale and per-component offset through a type-checked copy
 * plan built when the endpoints resolve.
 */
let _TriValueBinding;
new class extends _identity {
  static [class TriValueBinding extends CjsModel {
    static {
      ({
        e: [_init_destinationAttribute, _init_extra_destinationAttribute, _init_sourceAttribute, _init_extra_sourceAttribute, _init_destinationObject, _init_extra_destinationObject, _init_isEnabled, _init_extra_isEnabled, _init_name, _init_extra_name, _init_sourceObject, _init_extra_sourceObject, _init_offset, _init_extra_offset, _init_copyValueCallable, _init_extra_copyValueCallable, _init_scale, _init_extra_scale, _init_isWeak, _init_extra_isWeak, _init_isValid, _init_extra_isValid, _initProto],
        c: [_TriValueBinding, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriValueBinding",
        family: "trinityCore"
      })], [[[io, io.notify, io, io.persist, type, type.string], 16, "destinationAttribute"], [[io, io.notify, io, io.persist, type, type.string], 16, "sourceAttribute"], [[io, io.persistOnly, void 0, type.model("IRoot")], 16, "destinationObject"], [[io, io.readwrite, type, type.boolean], 16, "isEnabled"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persistOnly, void 0, type.model("IRoot")], 16, "sourceObject"], [[io, io.persist, type, type.vec4], 16, "offset"], [[io, io.notify, io, io.readwrite, void 0, type.rawStruct("BlueScriptCallback")], 16, "copyValueCallable"], [[io, io.persist, type, type.float32], 16, "scale"], [[io, io.read, type, type.boolean], 16, "isWeak"], [[io, io.read, type, type.boolean], 16, "isValid"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Resolves Blue field metadata through JavaScript properties and supports the portable runtime's numeric, vector, boolean, and callback value families.")], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Copies portable JavaScript values and emits CjsModel notifications instead of invoking Carbon's native typed copy-function table.")], 18, "CopyValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDestinationAttributeName"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSource"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDestination"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetScale"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Uses WeakRef for Carbon's BlueWeakRef endpoints and returns validity as a JavaScript convenience.")], 18, "CreateWeakBinding"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsValid"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurrentSourceObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCurrentDestinationObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSourceObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSourceObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDestinationObject"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetDestinationObject"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Swaps the portable array or scalar-holder destination supplied by ITriReroutable instead of Carbon's raw byte pointer.")], 18, "RerouteDestination"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_isValid(this);
    }
    #source = (_initProto(this), null);
    #destination = null;
    #sourceOffset = -1;
    #destinationOffset = -1;
    #sourceObjectWeak = null;
    #destinationObjectWeak = null;
    #copyPlan = null;
    #callbackReady = false;
    #notifyDestination = false;
    #reroutableDestination = null;
    #reroutedDestination = null;

    /** m_destinationAttribute (std::string) [READWRITE, PERSIST, NOTIFY] */
    destinationAttribute = _init_destinationAttribute(this, "");

    /** m_sourceAttribute (std::string) [READWRITE, PERSIST, NOTIFY] */
    sourceAttribute = (_init_extra_destinationAttribute(this), _init_sourceAttribute(this, ""));

    /** Carbon's persisted-only destination endpoint storage. */
    destinationObject = (_init_extra_sourceAttribute(this), _init_destinationObject(this, null));

    /** m_isEnabled (bool) [READWRITE] */
    isEnabled = (_init_extra_destinationObject(this), _init_isEnabled(this, true));

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = (_init_extra_isEnabled(this), _init_name(this, ""));

    /** Carbon's persisted-only source endpoint storage. */
    sourceObject = (_init_extra_name(this), _init_sourceObject(this, null));

    /** m_offset (Vector4) [READWRITE, PERSIST] */
    offset = (_init_extra_sourceObject(this), _init_offset(this, vec4.create()));

    /** m_copyValueCallable (BlueScriptCallback) [READWRITE, NOTIFY] */
    copyValueCallable = (_init_extra_offset(this), _init_copyValueCallable(this, null));

    /** m_scale (float) [READWRITE, PERSIST] */
    scale = (_init_extra_copyValueCallable(this), _init_scale(this, 1));

    /** m_isWeak (bool) [READ] */
    isWeak = (_init_extra_scale(this), _init_isWeak(this, false));
    isValid = (_init_extra_isWeak(this), _init_isValid(this, false));

    /**
     * Resolves both endpoints, builds the copy plan and sets isValid; a callable
     * copyValueCallable short-circuits the whole plan, and an ITriReroutable
     * destination is registered with and its rerouted buffer cached when it is
     * large enough for the plan.
     */
    Initialize() {
      this.#GetReroutableDestination()?.UnregisterBinding?.(this);
      this.#reroutableDestination = null;
      this.#reroutedDestination = null;
      this.#source = null;
      this.#destination = null;
      this.#sourceOffset = -1;
      this.#destinationOffset = -1;
      this.#copyPlan = null;
      this.#callbackReady = false;
      this.#notifyDestination = false;
      this.isValid = false;
      const sourceObject = this.GetCurrentSourceObject();
      const destinationObject = this.GetCurrentDestinationObject();
      if (!sourceObject || !destinationObject) return;
      if (typeof this.copyValueCallable === "function") {
        this.#callbackReady = true;
        return;
      }
      const source = _TriValueBinding.#ParseAttribute(this.sourceAttribute);
      const destination = _TriValueBinding.#ParseAttribute(this.destinationAttribute);
      if (!source || !destination || !(source.name in sourceObject) || !(destination.name in destinationObject)) return;
      const sourceValue = sourceObject[source.name];
      const destinationValue = destinationObject[destination.name];
      if (!_TriValueBinding.#CanUseOffset(sourceValue, source.offset) || !_TriValueBinding.#CanUseOffset(destinationValue, destination.offset)) return;
      const sourceField = CjsSchema.getField(sourceObject.constructor, source.name);
      const destinationField = CjsSchema.getField(destinationObject.constructor, destination.name);
      const copyPlan = _TriValueBinding.#CreateCopyPlan(_TriValueBinding.#DescribeValue(sourceValue, sourceField), source.offset, _TriValueBinding.#DescribeValue(destinationValue, destinationField), destination.offset);
      if (!copyPlan) return;
      this.#source = {
        name: source.name
      };
      this.#destination = {
        name: destination.name
      };
      this.#sourceOffset = source.offset;
      this.#destinationOffset = destination.offset;
      this.#copyPlan = copyPlan;
      this.#notifyDestination = destinationField ? destinationField.io?.notify === true : true;
      this.isValid = true;
      if (typeof destinationObject.RegisterBinding === "function" && typeof destinationObject.GetDestination === "function") {
        destinationObject.RegisterBinding(this);
        this.#reroutableDestination = this.isWeak && typeof WeakRef === "function" ? new WeakRef(destinationObject) : destinationObject;
        const rerouted = destinationObject.GetDestination();
        const destinationSize = Number(rerouted?.size ?? Number.POSITIVE_INFINITY);
        if (destinationSize >= copyPlan.requiredBytes) {
          this.#reroutedDestination = rerouted?.dest ?? rerouted;
        }
      }
    }

    /**
     * Runs the callback or the planned copy once, writing through the rerouted
     * buffer when one is installed and notifying the destination when its field
     * declares notify; returns whether any value actually changed.
     */
    CopyValue() {
      if (!this.isEnabled) return false;
      if (!this.isValid && !this.#callbackReady) this.Initialize();
      if (!this.isValid && !this.#callbackReady) return false;
      const sourceObject = this.GetCurrentSourceObject();
      const destinationObject = this.GetCurrentDestinationObject();
      if (!sourceObject || !destinationObject) return false;
      if (typeof this.copyValueCallable === "function") {
        this.copyValueCallable(sourceObject, destinationObject);
        return true;
      }
      const sourceValue = sourceObject[this.#source.name];
      const logicalDestination = destinationObject[this.#destination.name];
      const destinationValue = this.#reroutedDestination ?? logicalDestination;
      const changed = _TriValueBinding.#ApplyCopyPlan(this.#copyPlan, destinationObject, this.#destination.name, sourceValue, destinationValue, this.scale, this.offset);
      if (changed && this.#reroutedDestination !== null && typeof destinationObject.IsRerouted === "function" && !destinationObject.IsRerouted() && this.#reroutedDestination !== logicalDestination && this.#reroutedDestination && typeof this.#reroutedDestination === "object" && "value" in this.#reroutedDestination) {
        destinationObject[this.#destination.name] = this.#reroutedDestination.value;
      }
      if (changed && this.#notifyDestination) {
        _TriValueBinding.#Notify(destinationObject, this.#destination.name, this);
      }
      return changed;
    }

    /** Re-resolves the endpoints and copy plan after any field change. */
    OnModified(_value = null) {
      this.Initialize();
      return true;
    }

    /** The destination attribute string, including any .x/.r component suffix. */
    GetDestinationAttributeName() {
      return this.destinationAttribute;
    }

    /**
     * Rebinds the source endpoint, drops weak and reroute state, and leaves the
     * binding invalid until the next Initialize.
     */
    SetSource(sourceAttribute, sourceObject) {
      this.#GetReroutableDestination()?.UnregisterBinding?.(this);
      this.#reroutableDestination = null;
      this.#reroutedDestination = null;
      this.isWeak = false;
      this.#sourceObjectWeak = null;
      this.sourceAttribute = String(sourceAttribute ?? "");
      this.sourceObject = sourceObject ?? null;
      this.isValid = false;
    }

    /**
     * Rebinds the destination endpoint, unregistering from any reroutable
     * destination, and leaves the binding invalid until the next Initialize.
     */
    SetDestination(destinationAttribute, destinationObject) {
      this.#GetReroutableDestination()?.UnregisterBinding?.(this);
      this.#reroutableDestination = null;
      this.#reroutedDestination = null;
      this.isWeak = false;
      this.#destinationObjectWeak = null;
      this.destinationAttribute = String(destinationAttribute ?? "");
      this.destinationObject = destinationObject ?? null;
      this.isValid = false;
    }

    /** Sets the multiplier applied to the source value before the offset is added. */
    SetScale(scale) {
      this.scale = Number(scale);
    }

    /**
     * Binds both endpoints through WeakRef so the binding keeps neither object
     * alive, sets the scale and four-component offset, then initializes and
     * returns whether the result is valid.
     */
    CreateWeakBinding(source, sourceAttribute, destination, destinationAttribute, scale = 1, offset = [0, 0, 0, 0]) {
      this.#GetReroutableDestination()?.UnregisterBinding?.(this);
      this.#reroutableDestination = null;
      if (!_TriValueBinding.#IsReference(source) || !_TriValueBinding.#IsReference(destination)) {
        this.isValid = false;
        return false;
      }
      this.isWeak = true;
      this.sourceObject = null;
      this.destinationObject = null;
      this.#sourceObjectWeak = source && typeof WeakRef === "function" ? new WeakRef(source) : {
        deref: () => source
      };
      this.#destinationObjectWeak = destination && typeof WeakRef === "function" ? new WeakRef(destination) : {
        deref: () => destination
      };
      this.sourceAttribute = String(sourceAttribute ?? "");
      this.destinationAttribute = String(destinationAttribute ?? "");
      this.scale = Number(scale);
      for (let index = 0; index < 4; index++) this.offset[index] = Number(offset?.[index] ?? 0);
      this.Initialize();
      return this.isValid;
    }

    /** Whether the last Initialize produced a usable copy plan. */
    IsValid() {
      return this.isValid;
    }

    /**
     * Dereferences the source endpoint, honouring weak mode; null once a weakly
     * held source has been collected.
     */
    GetCurrentSourceObject() {
      return this.isWeak ? this.#sourceObjectWeak?.deref?.() ?? null : this.sourceObject;
    }

    /**
     * Dereferences the destination endpoint, honouring weak mode; null once a
     * weakly held destination has been collected.
     */
    GetCurrentDestinationObject() {
      return this.isWeak ? this.#destinationObjectWeak?.deref?.() ?? null : this.destinationObject;
    }

    /** Carbon's second name for GetCurrentSourceObject. */
    GetSourceObject() {
      return this.GetCurrentSourceObject();
    }

    /**
     * Rebinds the source object in place - weakly when the binding is weak - and
     * re-initializes, keeping the attribute names.
     */
    SetSourceObject(sourceObject) {
      if (this.isWeak) {
        this.#sourceObjectWeak = sourceObject && typeof WeakRef === "function" ? new WeakRef(sourceObject) : {
          deref: () => sourceObject ?? null
        };
      } else {
        this.sourceObject = sourceObject ?? null;
      }
      this.Initialize();
    }

    /** Carbon's second name for GetCurrentDestinationObject. */
    GetDestinationObject() {
      return this.GetCurrentDestinationObject();
    }

    /**
     * Rebinds the destination object in place - weakly when the binding is weak -
     * unregistering from any previous reroutable destination, and re-initializes.
     */
    SetDestinationObject(destinationObject) {
      this.#GetReroutableDestination()?.UnregisterBinding?.(this);
      this.#reroutableDestination = null;
      if (this.isWeak) {
        this.#destinationObjectWeak = destinationObject && typeof WeakRef === "function" ? new WeakRef(destinationObject) : {
          deref: () => destinationObject ?? null
        };
      } else {
        this.destinationObject = destinationObject ?? null;
      }
      this.Initialize();
    }

    /**
     * Installs the buffer an ITriReroutable destination wants written instead of
     * its own field; null restores direct field writes.
     */
    RerouteDestination(destination) {
      this.#reroutedDestination = destination ?? null;
    }

    /**
     * Dereferences the registered reroutable destination, which is held weakly for
     * weak bindings.
     */
    #GetReroutableDestination() {
      return this.#reroutableDestination instanceof WeakRef ? this.#reroutableDestination.deref() ?? null : this.#reroutableDestination;
    }

    /**
     * Splits `field` or `field.x` into a name plus a component index (x/r zero
     * through w/a three); null for an empty name or an unrecognized suffix.
     */

    /**
     * Whether a component index is usable: either absent, or the value is
     * array-like and long enough to hold it.
     */

    /**
     * Classifies a value as a scalar or a fixed-length float array from its schema
     * field kind, falling back to the runtime value's shape when the field is
     * unknown; null when neither applies.
     */

    /**
     * Chooses the copy strategy for a source/destination category pair, or null
     * when the types are incompatible; the plan also records the byte size a
     * rerouted destination buffer must provide.
     */

    /**
     * Executes a copy plan, applying the scale and per-component offset, and
     * returns whether any component actually changed.
     */

    /**
     * Writes a scalar through whichever destination shape applies - a setter
     * function, an array's first slot, a { value } holder, or the object's own
     * field - returning false when the value is already equal.
     */

    /**
     * Writes one array component, returning false when the index is out of range
     * or the value is unchanged.
     */

    /**
     * Truncates a number to the destination's integer or boolean kind; float kinds
     * pass through unchanged.
     */

    /**
     * Byte size of a scalar kind, used to size the rerouted-buffer requirement
     * recorded in the copy plan.
     */

    /**
     * Notifies the destination of the changed field through UpdateValues,
     * OnValueChanged or OnModified, whichever it implements.
     */

    /** Whether the value is an array or a typed-array view. */

    /** Whether a value can be held by WeakRef, i.e. an object or a function. */
  }];
  #ParseAttribute(attribute) {
    const value = String(attribute ?? "");
    const dot = value.indexOf(".");
    if (dot === -1) return value ? {
      name: value,
      offset: -1
    } : null;
    const offsets = {
      x: 0,
      r: 0,
      y: 1,
      g: 1,
      z: 2,
      b: 2,
      w: 3,
      a: 3
    };
    const component = value.slice(dot + 1);
    return component.length === 1 && offsets[component] !== undefined ? {
      name: value.slice(0, dot),
      offset: offsets[component]
    } : null;
  }
  #CanUseOffset(value, offset) {
    return offset === -1 || _TriValueBinding.#IsArrayLike(value) && value.length > offset;
  }
  #DescribeValue(value, field) {
    const kind = field?.type?.kind ?? null;
    if (kind === "boolean" || typeof value === "boolean") {
      return {
        category: "scalar",
        kind: "boolean"
      };
    }
    const scalarKinds = new Set(["int8", "uint8", "int16", "uint16", "int32", "uint32", "int64", "uint64", "float32", "float64"]);
    if (scalarKinds.has(kind) || kind === null && typeof value === "number") {
      return {
        category: "scalar",
        kind: kind ?? "float32"
      };
    }
    const floatArrayLengths = {
      vec2: 2,
      vec3: 3,
      vec4: 4,
      quat: 4,
      color: 4,
      mat4: 16
    };
    const length = floatArrayLengths[kind] ?? (kind === null && _TriValueBinding.#IsArrayLike(value) ? Number(value.length) : 0);
    if (length) {
      return {
        category: "floatArray",
        kind: kind ?? "floatArray",
        length
      };
    }
    return null;
  }
  #CreateCopyPlan(source, sourceOffset, destination, destinationOffset) {
    if (!source || !destination) return null;
    if (sourceOffset !== -1 && source.category !== "floatArray") return null;
    if (destinationOffset !== -1 && destination.category !== "floatArray") return null;
    if (source.category === "scalar" && destination.category === "scalar") {
      const same = source.kind === destination.kind;
      const floatPair = source.kind === "float32" && destination.kind === "float64" || source.kind === "float64" && destination.kind === "float32";
      const floatToBoolean = source.kind === "float32" && destination.kind === "boolean";
      if (!same && !floatPair && !floatToBoolean) return null;
      return {
        kind: floatToBoolean ? "floatToBoolean" : same && ["int64", "uint64"].includes(source.kind) ? "rawScalar" : "scalar",
        destinationKind: destination.kind,
        requiredBytes: floatPair ? 1 : _TriValueBinding.#ScalarBytes(destination.kind)
      };
    }
    if (source.category === "floatArray" && sourceOffset !== -1) {
      if (destination.category === "scalar" && ["float32", "float64"].includes(destination.kind)) {
        return {
          kind: "componentToScalar",
          sourceOffset,
          destinationKind: destination.kind,
          requiredBytes: _TriValueBinding.#ScalarBytes(destination.kind)
        };
      }
      if (destination.category === "floatArray" && destinationOffset !== -1) {
        return {
          kind: "componentToComponent",
          sourceOffset,
          destinationOffset,
          requiredBytes: 4
        };
      }
      if (destination.category === "floatArray" && [3, 4].includes(destination.length)) {
        return {
          kind: "broadcast",
          sourceOffset,
          count: destination.length,
          requiredBytes: destination.length * 4
        };
      }
      return null;
    }
    if (source.category === "scalar" && source.kind === "float32" && destination.category === "floatArray") {
      if (destinationOffset !== -1) {
        return {
          kind: "scalarToComponent",
          destinationOffset,
          requiredBytes: 4
        };
      }
      if ([3, 4].includes(destination.length)) {
        return {
          kind: "broadcast",
          sourceOffset: -1,
          count: destination.length,
          requiredBytes: destination.length * 4
        };
      }
      return null;
    }
    if (source.category === "floatArray" && destination.category === "floatArray" && destinationOffset === -1) {
      if (source.length === 16 && [3, 4].includes(destination.length)) {
        return {
          kind: "matrixTranslation",
          count: destination.length,
          requiredBytes: destination.length * 4
        };
      }
      if ([2, 3, 4].includes(source.length) && [2, 3, 4].includes(destination.length)) {
        const count = Math.min(source.length, destination.length);
        const requiredBytes = source.length <= destination.length ? {
          2: 12,
          3: 12,
          4: 16
        }[source.length] : destination.length * 4;
        return {
          kind: "vector",
          count,
          requiredBytes
        };
      }
      if (source.length === 16 && destination.length >= 16) {
        return {
          kind: "matrix",
          count: 16,
          requiredBytes: 64
        };
      }
    }
    return null;
  }
  #ApplyCopyPlan(plan, object, name, source, destination, scale, offset) {
    switch (plan.kind) {
      case "scalar":
        {
          const next = _TriValueBinding.#CastScalar(plan.destinationKind, Number(source) * scale + Number(offset[0] ?? 0));
          return _TriValueBinding.#WriteScalar(object, name, destination, next);
        }
      case "rawScalar":
        return _TriValueBinding.#WriteScalar(object, name, destination, source);
      case "floatToBoolean":
        return _TriValueBinding.#WriteScalar(object, name, destination, Boolean(source));
      case "componentToScalar":
        {
          const next = _TriValueBinding.#CastScalar(plan.destinationKind, Number(source[plan.sourceOffset]) * scale + Number(offset[0] ?? 0));
          return _TriValueBinding.#WriteScalar(object, name, destination, next);
        }
      case "componentToComponent":
        return _TriValueBinding.#WriteArrayComponent(destination, plan.destinationOffset, Number(source[plan.sourceOffset]) * scale + Number(offset[0] ?? 0));
      case "scalarToComponent":
        return _TriValueBinding.#WriteArrayComponent(destination, plan.destinationOffset, Number(source) * scale + Number(offset[0] ?? 0));
      case "broadcast":
        {
          const value = plan.sourceOffset === -1 ? Number(source) : Number(source[plan.sourceOffset]);
          let changed = false;
          for (let index = 0; index < plan.count; index++) {
            changed = _TriValueBinding.#WriteArrayComponent(destination, index, value * scale + Number(offset[index] ?? 0)) || changed;
          }
          return changed;
        }
      case "matrixTranslation":
        {
          let changed = false;
          for (let index = 0; index < plan.count; index++) {
            changed = _TriValueBinding.#WriteArrayComponent(destination, index, Number(source[12 + index]) * scale + Number(offset[index] ?? 0)) || changed;
          }
          return changed;
        }
      case "vector":
        {
          let changed = false;
          for (let index = 0; index < plan.count; index++) {
            changed = _TriValueBinding.#WriteArrayComponent(destination, index, Number(source[index]) * scale + Number(offset[index] ?? 0)) || changed;
          }
          return changed;
        }
      case "matrix":
        {
          let changed = false;
          for (let index = 0; index < 16; index++) {
            changed = _TriValueBinding.#WriteArrayComponent(destination, index, Number(source[index])) || changed;
          }
          return changed;
        }
      default:
        return false;
    }
  }
  #WriteScalar(object, name, destination, value) {
    if (typeof destination === "function") {
      destination(value);
      return true;
    }
    if (_TriValueBinding.#IsArrayLike(destination) && destination.length) {
      if (Object.is(destination[0], value)) return false;
      destination[0] = value;
      return true;
    }
    if (destination && typeof destination === "object" && "value" in destination && typeof destination.value === "number") {
      if (Object.is(destination.value, value)) return false;
      destination.value = value;
      return true;
    }
    if (Object.is(destination, value)) return false;
    object[name] = value;
    return true;
  }
  #WriteArrayComponent(destination, index, value) {
    if (!_TriValueBinding.#IsArrayLike(destination) || destination.length <= index) return false;
    if (Object.is(destination[index], value)) return false;
    destination[index] = value;
    return true;
  }
  #CastScalar(kind, value) {
    switch (kind) {
      case "boolean":
        return Boolean(value);
      case "int8":
        return value << 24 >> 24;
      case "uint8":
        return value & 0xff;
      case "int16":
        return value << 16 >> 16;
      case "uint16":
        return value & 0xffff;
      case "int32":
        return value | 0;
      case "uint32":
        return value >>> 0;
      default:
        return Number(value);
    }
  }
  #ScalarBytes(kind) {
    if (["int8", "uint8", "boolean"].includes(kind)) return 1;
    if (["int16", "uint16"].includes(kind)) return 2;
    if (["float64", "int64", "uint64"].includes(kind)) return 8;
    return 4;
  }
  #Notify(object, name, source) {
    if (typeof object.UpdateValues === "function") object.UpdateValues({
      property: name,
      source
    });else if (typeof object.OnValueChanged === "function") object.OnValueChanged(name, object[name], source);else object.OnModified?.({
      property: name,
      source
    });
  }
  #IsArrayLike(value) {
    return Array.isArray(value) || ArrayBuffer.isView(value);
  }
  #IsReference(value) {
    return value !== null && (typeof value === "object" || typeof value === "function");
  }
  constructor() {
    super(_TriValueBinding), _initClass();
  }
}();

export { _TriValueBinding as TriValueBinding };
//# sourceMappingURL=TriValueBinding.js.map
