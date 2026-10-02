// Source: trinity/trinity/TriValueBinding.h
// Source: trinity/trinity/TriValueBinding.cpp
// Source: trinity/trinity/TriValueBinding_Blue.cpp
import { CjsSchema, meta, types } from "#schema";
import { INotify } from "#blue/INotify";
import { ITr2ValueBinding } from "../../curves/ITr2ValueBinding.js";
import { vec4 } from "#math/vec4";

/**
 * Copies one attribute of a source object onto an attribute of a destination
 * object, applying a scale and per-component offset through a type-checked copy
 * plan built when the endpoints resolve.
 */
@meta.define({
  className: "TriValueBinding", family: "trinityCore"
})
@meta.carbon.inherit(ITr2ValueBinding)
export class TriValueBinding extends INotify
{
  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /**
   * Native readonly validity property.
   * @returns {boolean} Whether a copy plan exists.
   */
  @meta.property()
  @meta.edit.read
  @types.boolean
  @meta.impl.implemented
  get isValid()
  {
    return this.IsValid();
  }

  /** m_isWeak (bool) [READ] */
  @meta.edit.read
  @types.boolean
  isWeak = false;

  /** m_isEnabled (bool) [READWRITE] */
  @meta.edit.readwrite
  @types.boolean
  isEnabled = true;

  /** Native persisted endpoint storage; readers bypass the live setter. */
  @meta.member("sourceObject")
  @meta.edit.persistOnly
  @types.objectRef("IRoot")
  _sourceObject = null;

  // Native MAP_ATTRIBUTE storage and MAP_PROPERTY access remain separate.

  /**
   * Reads the current source endpoint, resolving a weak reference when used.
   * @returns {object|null} Binding result.
   */
  @meta.property()
  @meta.edit.readwrite
  @types.objectRef("IRoot")
  @meta.impl.implemented
  get sourceObject()
  {
    return this.GetCurrentSourceObject();
  }

  /**
   * Replaces the source endpoint through its binding setter.
   * @param {*} value Incoming value.
   * @returns {void} No return value.
   */
  @meta.impl.implemented
  set sourceObject(value)
  {
    this.SetSourceObject(value);
  }

  /** m_sourceAttribute (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  sourceAttribute = "";

  /** Native persisted endpoint storage; readers bypass the live setter. */
  @meta.member("destinationObject")
  @meta.edit.persistOnly
  @types.objectRef("IRoot")
  _destinationObject = null;

  // Native MAP_ATTRIBUTE storage and MAP_PROPERTY access remain separate.

  /**
   * Reads the current destination endpoint, resolving a weak reference when
   * used.
   * @returns {object|null} Binding result.
   */
  @meta.property()
  @meta.edit.readwrite
  @types.objectRef("IRoot")
  @meta.impl.implemented
  get destinationObject()
  {
    return this.GetCurrentDestinationObject();
  }

  /**
   * Replaces the destination endpoint through its binding setter.
   * @param {*} value Incoming value.
   * @returns {void} No return value.
   */
  @meta.impl.implemented
  set destinationObject(value)
  {
    this.SetDestinationObject(value);
  }

  /** m_destinationAttribute (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  destinationAttribute = "";

  /** m_scale (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  scale = 1;

  /** m_offset (Vector4) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.vec4
  offset = vec4.create();

  /** m_copyValueCallable (BlueScriptCallback) [READWRITE, NOTIFY] */
  @meta.edit.notify
  @meta.edit.readwrite
  @types.rawStruct("BlueScriptCallback")
  copyValueCallable = null;

  /** Runtime source state for the portable binding adapter. */
  _source = null;

  /** Runtime destination state for the portable binding adapter. */
  _destination = null;

  /** Runtime source offset state for the portable binding adapter. */
  _sourceOffset = -1;

  /** Runtime destination offset state for the portable binding adapter. */
  _destinationOffset = -1;

  /** Runtime source object weak state for the portable binding adapter. */
  _sourceObjectWeak = null;

  /** Runtime destination object weak state for the portable binding adapter. */
  _destinationObjectWeak = null;

  /** Runtime copy plan state for the portable binding adapter. */
  _copyPlan = null;

  /** Runtime callback ready state for the portable binding adapter. */
  _callbackReady = false;

  /** Runtime notify destination state for the portable binding adapter. */
  _notifyDestination = false;

  /** Runtime reroutable destination state for the portable binding adapter. */
  _reroutableDestination = null;

  /** Runtime rerouted destination state for the portable binding adapter. */
  _reroutedDestination = null;

  /** Cached portable copy-plan validity; callback-only bindings remain invalid. */
  _isValid = false;

  /**
   * Resolves both endpoints, builds the copy plan and sets isValid; a callable
   * copyValueCallable short-circuits the whole plan, and an ITriReroutable
   * destination is registered with and its rerouted buffer cached when it is
   * large enough for the plan.
   * Adapted: Resolves Blue field metadata through JavaScript properties and supports the portable runtime's numeric, vector, boolean, and callback value families.
   * @returns {void} No return value.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Initialize()
  {
    this._GetReroutableDestination()?.UnregisterBinding(this);
    this._reroutableDestination = null;
    this._reroutedDestination = null;
    this._source = null;
    this._destination = null;
    this._sourceOffset = -1;
    this._destinationOffset = -1;
    this._copyPlan = null;
    this._callbackReady = false;
    this._notifyDestination = false;
    this._isValid = false;

    const sourceObject = this.GetCurrentSourceObject();
    const destinationObject = this.GetCurrentDestinationObject();
    if (!sourceObject || !destinationObject) return;
    if (typeof this.copyValueCallable === "function")
    {
      this._callbackReady = true;
      return;
    }

    const source = TriValueBinding._parseAttribute(this.sourceAttribute);
    const destination = TriValueBinding._parseAttribute(this.destinationAttribute);
    if (!source || !destination || !(source.name in sourceObject) || !(destination.name in destinationObject)) return;
    const sourceValue = sourceObject[source.name];
    const destinationValue = destinationObject[destination.name];
    if (!TriValueBinding._canUseOffset(sourceValue, source.offset) || !TriValueBinding._canUseOffset(destinationValue, destination.offset)) return;
    const sourceField = CjsSchema.getField(sourceObject.constructor, source.name);
    const destinationField = CjsSchema.getField(destinationObject.constructor, destination.name);
    const copyPlan = TriValueBinding._createCopyPlan(
      TriValueBinding._describeValue(sourceValue, sourceField),
      source.offset,
      TriValueBinding._describeValue(destinationValue, destinationField),
      destination.offset
    );
    if (!copyPlan) return;

    this._source = { name: source.name };
    this._destination = { name: destination.name };
    this._sourceOffset = source.offset;
    this._destinationOffset = destination.offset;
    this._copyPlan = copyPlan;
    this._notifyDestination = destinationField ? destinationField.edit?.notify === true : true;
    this._isValid = true;

    if (
      typeof destinationObject.RegisterBinding === "function" &&
      typeof destinationObject.GetDestination === "function"
    )
    {
      destinationObject.RegisterBinding(this);
      this._reroutableDestination = this.isWeak && typeof WeakRef === "function"
        ? new WeakRef(destinationObject)
        : destinationObject;
      const rerouted = destinationObject.GetDestination();
      const destinationSize = Number(rerouted?.size ?? Number.POSITIVE_INFINITY);
      if (destinationSize >= copyPlan.requiredBytes)
      {
        this._reroutedDestination = rerouted?.dest ?? rerouted;
      }
    }
  }

  /**
   * Runs the callback or the planned copy once, writing through the rerouted
   * buffer when one is installed and notifying the destination when its field
   * declares notify; returns whether any value actually changed.
   * Adapted: Copies portable JavaScript values and uses the existing JavaScript destination-notification adapter instead of invoking Carbon's native typed copy-function table.
   * @returns {boolean} Binding result.
   */
  @meta.carbon.method
  @meta.impl.adapted
  CopyValue()
  {
    if (!this.isEnabled) return false;
    if (!this._isValid && !this._callbackReady) this.Initialize();
    if (!this._isValid && !this._callbackReady) return false;

    const sourceObject = this.GetCurrentSourceObject();
    const destinationObject = this.GetCurrentDestinationObject();
    if (!sourceObject || !destinationObject) return false;
    if (typeof this.copyValueCallable === "function")
    {
      this.copyValueCallable(sourceObject, destinationObject);
      return true;
    }

    const sourceValue = sourceObject[this._source.name];
    const logicalDestination = destinationObject[this._destination.name];
    const destinationValue = this._reroutedDestination ?? logicalDestination;
    const changed = TriValueBinding._applyCopyPlan(
      this._copyPlan,
      destinationObject,
      this._destination.name,
      sourceValue,
      destinationValue,
      this.scale,
      this.offset
    );
    if (
      changed &&
      this._reroutedDestination !== null &&
      typeof destinationObject.IsRerouted === "function" &&
      !destinationObject.IsRerouted() &&
      this._reroutedDestination !== logicalDestination &&
      this._reroutedDestination &&
      typeof this._reroutedDestination === "object" &&
      "value" in this._reroutedDestination
    )
    {
      destinationObject[this._destination.name] = this._reroutedDestination.value;
    }
    if (changed && this._notifyDestination)
    {
      TriValueBinding._notify(destinationObject, this._destination.name, this);
    }
    return changed;
  }

  /**
   * Re-resolves the endpoints and copy plan after any field change.
   * @param {string|null} [_value] Changed member name.
   * @returns {boolean} Binding result.
   */
  @meta.carbon.method
  @meta.impl.implemented
  OnModified(_value = null)
  {
    this.Initialize();
    return true;
  }

  /**
   * The destination attribute string, including any .x/.r component suffix.
   * @returns {string} Binding result.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetDestinationAttributeName()
  {
    return this.destinationAttribute;
  }

  /**
   * Rebinds the source endpoint, drops weak and reroute state, and leaves the
   * binding invalid until the next Initialize.
   * Adapted: Normalizes JavaScript endpoint inputs, detaches any cached reroute and invalidates the copy plan; native SetSource only assigns its endpoint fields.
   * @param {string} sourceAttribute Source member name with an optional component.
   * @param {object|null} sourceObject Source endpoint.
   * @returns {void} No return value.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetSource(sourceAttribute, sourceObject)
  {
    this._GetReroutableDestination()?.UnregisterBinding(this);
    this._reroutableDestination = null;
    this._reroutedDestination = null;
    this.isWeak = false;
    this._sourceObjectWeak = null;
    this.sourceAttribute = String(sourceAttribute ?? "");
    this._sourceObject = sourceObject ?? null;
    this._isValid = false;
  }

  /**
   * Rebinds the destination endpoint, unregistering from any reroutable
   * destination, and leaves the binding invalid until the next Initialize.
   * Adapted: Normalizes JavaScript endpoint inputs, detaches any cached reroute and invalidates the copy plan; native SetDestination only assigns its endpoint fields.
   * @param {string} destinationAttribute Destination member name with an optional component.
   * @param {object|null} destinationObject Destination endpoint.
   * @returns {void} No return value.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetDestination(destinationAttribute, destinationObject)
  {
    this._GetReroutableDestination()?.UnregisterBinding(this);
    this._reroutableDestination = null;
    this._reroutedDestination = null;
    this.isWeak = false;
    this._destinationObjectWeak = null;
    this.destinationAttribute = String(destinationAttribute ?? "");
    this._destinationObject = destinationObject ?? null;
    this._isValid = false;
  }

  /**
   * Sets the multiplier applied to the source value before the offset is added.
   * Adapted: Normalizes the JavaScript argument to a number before assigning the native float multiplier.
   * @param {number} scale Source multiplier.
   * @returns {void} No return value.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetScale(scale)
  {
    this.scale = Number(scale);
  }

  /**
   * Binds both endpoints through WeakRef so the binding keeps neither object
   * alive, sets the scale and four-component offset, then initializes and
   * returns whether the result is valid.
   * Adapted: Uses WeakRef for Carbon's BlueWeakRef endpoints and returns validity as a JavaScript convenience.
   * @param {*} source Source value or endpoint.
   * @param {string} sourceAttribute Source member name with an optional component.
   * @param {*} destination Destination storage or endpoint.
   * @param {string} destinationAttribute Destination member name with an optional component.
   * @param {number} [scale] Source multiplier.
   * @param {ArrayLike|number} [offset] Component offset or four-component value offset.
   * @returns {boolean} Binding result.
   */
  @meta.carbon.method
  @meta.impl.adapted
  CreateWeakBinding(source, sourceAttribute, destination, destinationAttribute, scale = 1, offset = [0, 0, 0, 0])
  {
    this._GetReroutableDestination()?.UnregisterBinding(this);
    this._reroutableDestination = null;
    if (
      !TriValueBinding._isReference(source) ||
      !TriValueBinding._isReference(destination)
    )
    {
      this._isValid = false;
      return false;
    }
    this.isWeak = true;
    this._sourceObject = null;
    this._destinationObject = null;
    this._sourceObjectWeak = source && typeof WeakRef === "function" ? new WeakRef(source) : { deref: () => source };
    this._destinationObjectWeak = destination && typeof WeakRef === "function" ? new WeakRef(destination) : { deref: () => destination };
    this.sourceAttribute = String(sourceAttribute ?? "");
    this.destinationAttribute = String(destinationAttribute ?? "");
    this.scale = Number(scale);
    for (let index = 0; index < 4; index++) this.offset[index] = Number(offset?.[index] ?? 0);
    this.Initialize();
    return this._isValid;
  }

  /**
   * Whether the last Initialize produced a usable copy plan.
   * @returns {boolean} Binding result.
   */
  @meta.carbon.method
  @meta.impl.implemented
  IsValid()
  {
    return this._isValid;
  }

  /**
   * Dereferences the source endpoint, honouring weak mode; null once a weakly
   * held source has been collected.
   * @returns {object|null} Binding result.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetCurrentSourceObject()
  {
    return this.isWeak ? this._sourceObjectWeak?.deref?.() ?? null : this._sourceObject;
  }

  /**
   * Dereferences the destination endpoint, honouring weak mode; null once a
   * weakly held destination has been collected.
   * @returns {object|null} Binding result.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetCurrentDestinationObject()
  {
    return this.isWeak ? this._destinationObjectWeak?.deref?.() ?? null : this._destinationObject;
  }

  /**
   * Carbon's second name for GetCurrentSourceObject.
   * @returns {object|null} Binding result.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetSourceObject()
  {
    return this.GetCurrentSourceObject();
  }

  /**
   * Rebinds the source object in place - weakly when the binding is weak - and
   * re-initializes, keeping the attribute names.
   * Adapted: Keeps the portable WeakRef or strong endpoint representation, normalizes nullish inputs, and rebuilds the copy plan.
   * @param {object|null} sourceObject Source endpoint.
   * @returns {void} No return value.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetSourceObject(sourceObject)
  {
    if (this.isWeak)
    {
      this._sourceObjectWeak = sourceObject && typeof WeakRef === "function"
        ? new WeakRef(sourceObject)
        : { deref: () => sourceObject ?? null };
    }
    else
    {
      this._sourceObject = sourceObject ?? null;
    }
    this.Initialize();
  }

  /**
   * Carbon's second name for GetCurrentDestinationObject.
   * @returns {object|null} Binding result.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetDestinationObject()
  {
    return this.GetCurrentDestinationObject();
  }

  /**
   * Rebinds the destination object in place - weakly when the binding is weak -
   * unregistering from any previous reroutable destination, and re-initializes.
   * Adapted: Keeps the portable WeakRef or strong endpoint representation, normalizes nullish inputs, detaches the old reroute and rebuilds the copy plan.
   * @param {object|null} destinationObject Destination endpoint.
   * @returns {void} No return value.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetDestinationObject(destinationObject)
  {
    this._GetReroutableDestination()?.UnregisterBinding(this);
    this._reroutableDestination = null;
    if (this.isWeak)
    {
      this._destinationObjectWeak = destinationObject && typeof WeakRef === "function"
        ? new WeakRef(destinationObject)
        : { deref: () => destinationObject ?? null };
    }
    else
    {
      this._destinationObject = destinationObject ?? null;
    }
    this.Initialize();
  }

  /**
   * Installs the buffer an ITriReroutable destination wants written instead of
   * its own field; null restores direct field writes.
   * Adapted: Swaps the portable array or scalar-holder destination supplied by ITriReroutable instead of Carbon's raw byte pointer.
   * @param {*} destination Destination storage or endpoint.
   * @returns {void} No return value.
   */
  @meta.carbon.method
  @meta.impl.adapted
  RerouteDestination(destination)
  {
    this._reroutedDestination = destination ?? null;
  }

  /**
   * Dereferences the registered reroutable destination, which is held weakly for
   * weak bindings.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @returns {object|null} Binding result.
   */
  @meta.impl.custom
  _GetReroutableDestination()
  {
    return this._reroutableDestination instanceof WeakRef
      ? this._reroutableDestination.deref() ?? null
      : this._reroutableDestination;
  }

  /**
   * Splits `field` or `field.x` into a name plus a component index (x/r zero
   * through w/a three); null for an empty name or an unrecognized suffix.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {string} attribute Member expression.
   * @returns {object|null} Binding result.
   */
  @meta.impl.custom
  static _parseAttribute(attribute)
  {
    const value = String(attribute ?? "");
    const dot = value.indexOf(".");
    if (dot === -1) return value ? { name: value, offset: -1 } : null;
    const offsets = { x: 0, r: 0, y: 1, g: 1, z: 2, b: 2, w: 3, a: 3 };
    const component = value.slice(dot + 1);
    return component.length === 1 && offsets[component] !== undefined ? { name: value.slice(0, dot), offset: offsets[component] } : null;
  }

  /**
   * Whether a component index is usable: either absent, or the value is
   * array-like and long enough to hold it.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {*} value Incoming value.
   * @param {ArrayLike|number} offset Component offset or four-component value offset.
   * @returns {boolean} Binding result.
   */
  @meta.impl.custom
  static _canUseOffset(value, offset)
  {
    return offset === -1 || (TriValueBinding._isArrayLike(value) && value.length > offset);
  }

  /**
   * Classifies a value as a scalar or a fixed-length float array from its schema
   * field kind, falling back to the runtime value's shape when the field is
   * unknown; null when neither applies.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {*} value Incoming value.
   * @param {object|null} field Schema field metadata.
   * @returns {object|null} Binding result.
   */
  @meta.impl.custom
  static _describeValue(value, field)
  {
    const kind = field?.type?.kind ?? null;
    if (kind === "boolean" || typeof value === "boolean")
    {
      return { category: "scalar", kind: "boolean" };
    }

    const scalarKinds = new Set([
      "int8", "uint8", "int16", "uint16", "int32", "uint32",
      "int64", "uint64", "float32", "float64"
    ]);
    if (scalarKinds.has(kind) || (kind === null && typeof value === "number"))
    {
      return { category: "scalar", kind: kind ?? "float32" };
    }

    const floatArrayLengths = {
      vec2: 2,
      vec3: 3,
      vec4: 4,
      quat: 4,
      color: 4,
      mat4: 16
    };
    const length = floatArrayLengths[kind] ?? (
      kind === null && TriValueBinding._isArrayLike(value) ? Number(value.length) : 0
    );
    if (length)
    {
      return { category: "floatArray", kind: kind ?? "floatArray", length };
    }
    return null;
  }

  /**
   * Chooses the copy strategy for a source/destination category pair, or null
   * when the types are incompatible; the plan also records the byte size a
   * rerouted destination buffer must provide.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {*} source Source value or endpoint.
   * @param {number} sourceOffset Source component offset, or -1.
   * @param {*} destination Destination storage or endpoint.
   * @param {number} destinationOffset Destination component offset, or -1.
   * @returns {object|null} Binding result.
   */
  @meta.impl.custom
  static _createCopyPlan(source, sourceOffset, destination, destinationOffset)
  {
    if (!source || !destination) return null;
    if (sourceOffset !== -1 && source.category !== "floatArray") return null;
    if (destinationOffset !== -1 && destination.category !== "floatArray") return null;

    if (source.category === "scalar" && destination.category === "scalar")
    {
      const same = source.kind === destination.kind;
      const floatPair = (
        (source.kind === "float32" && destination.kind === "float64") ||
        (source.kind === "float64" && destination.kind === "float32")
      );
      const floatToBoolean = source.kind === "float32" && destination.kind === "boolean";
      if (!same && !floatPair && !floatToBoolean) return null;
      return {
        kind: floatToBoolean
          ? "floatToBoolean"
          : (same && ["int64", "uint64"].includes(source.kind) ? "rawScalar" : "scalar"),
        destinationKind: destination.kind,
        requiredBytes: floatPair ? 1 : TriValueBinding._scalarBytes(destination.kind)
      };
    }

    if (source.category === "floatArray" && sourceOffset !== -1)
    {
      if (destination.category === "scalar" && ["float32", "float64"].includes(destination.kind))
      {
        return {
          kind: "componentToScalar",
          sourceOffset,
          destinationKind: destination.kind,
          requiredBytes: TriValueBinding._scalarBytes(destination.kind)
        };
      }
      if (destination.category === "floatArray" && destinationOffset !== -1)
      {
        return { kind: "componentToComponent", sourceOffset, destinationOffset, requiredBytes: 4 };
      }
      if (destination.category === "floatArray" && [3, 4].includes(destination.length))
      {
        return {
          kind: "broadcast",
          sourceOffset,
          count: destination.length,
          requiredBytes: destination.length * 4
        };
      }
      return null;
    }

    if (
      source.category === "scalar" &&
      source.kind === "float32" &&
      destination.category === "floatArray"
    )
    {
      if (destinationOffset !== -1)
      {
        return { kind: "scalarToComponent", destinationOffset, requiredBytes: 4 };
      }
      if ([3, 4].includes(destination.length))
      {
        return { kind: "broadcast", sourceOffset: -1, count: destination.length, requiredBytes: destination.length * 4 };
      }
      return null;
    }

    if (
      source.category === "floatArray" &&
      destination.category === "floatArray" &&
      destinationOffset === -1
    )
    {
      if (source.length === 16 && [3, 4].includes(destination.length))
      {
        return {
          kind: "matrixTranslation",
          count: destination.length,
          requiredBytes: destination.length * 4
        };
      }
      if ([2, 3, 4].includes(source.length) && [2, 3, 4].includes(destination.length))
      {
        const count = Math.min(source.length, destination.length);
        const requiredBytes = source.length <= destination.length
          ? ({ 2: 12, 3: 12, 4: 16 })[source.length]
          : destination.length * 4;
        return { kind: "vector", count, requiredBytes };
      }
      if (source.length === 16 && destination.length >= 16)
      {
        return { kind: "matrix", count: 16, requiredBytes: 64 };
      }
    }
    return null;
  }

  /**
   * Executes a copy plan, applying the scale and per-component offset, and
   * returns whether any component actually changed.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {object} plan Resolved portable copy plan.
   * @param {object} object Destination owner.
   * @param {string} name Member or root name.
   * @param {*} source Source value or endpoint.
   * @param {*} destination Destination storage or endpoint.
   * @param {number} scale Source multiplier.
   * @param {ArrayLike|number} offset Component offset or four-component value offset.
   * @returns {boolean} Binding result.
   */
  @meta.impl.custom
  static _applyCopyPlan(plan, object, name, source, destination, scale, offset)
  {
    switch (plan.kind)
    {
      case "scalar":
      {
        const next = TriValueBinding._castScalar(
          plan.destinationKind,
          Number(source) * scale + Number(offset[0] ?? 0)
        );
        return TriValueBinding._writeScalar(object, name, destination, next);
      }
      case "rawScalar":
        return TriValueBinding._writeScalar(object, name, destination, source);
      case "floatToBoolean":
        return TriValueBinding._writeScalar(object, name, destination, Boolean(source));
      case "componentToScalar":
      {
        const next = TriValueBinding._castScalar(
          plan.destinationKind,
          Number(source[plan.sourceOffset]) * scale + Number(offset[0] ?? 0)
        );
        return TriValueBinding._writeScalar(object, name, destination, next);
      }
      case "componentToComponent":
        return TriValueBinding._writeArrayComponent(
          destination,
          plan.destinationOffset,
          Number(source[plan.sourceOffset]) * scale + Number(offset[0] ?? 0)
        );
      case "scalarToComponent":
        return TriValueBinding._writeArrayComponent(
          destination,
          plan.destinationOffset,
          Number(source) * scale + Number(offset[0] ?? 0)
        );
      case "broadcast":
      {
        const value = plan.sourceOffset === -1 ? Number(source) : Number(source[plan.sourceOffset]);
        let changed = false;
        for (let index = 0; index < plan.count; index++)
        {
          changed = TriValueBinding._writeArrayComponent(
            destination,
            index,
            value * scale + Number(offset[index] ?? 0)
          ) || changed;
        }
        return changed;
      }
      case "matrixTranslation":
      {
        let changed = false;
        for (let index = 0; index < plan.count; index++)
        {
          changed = TriValueBinding._writeArrayComponent(
            destination,
            index,
            Number(source[12 + index]) * scale + Number(offset[index] ?? 0)
          ) || changed;
        }
        return changed;
      }
      case "vector":
      {
        let changed = false;
        for (let index = 0; index < plan.count; index++)
        {
          changed = TriValueBinding._writeArrayComponent(
            destination,
            index,
            Number(source[index]) * scale + Number(offset[index] ?? 0)
          ) || changed;
        }
        return changed;
      }
      case "matrix":
      {
        let changed = false;
        for (let index = 0; index < 16; index++)
        {
          changed = TriValueBinding._writeArrayComponent(destination, index, Number(source[index])) || changed;
        }
        return changed;
      }
      default:
        return false;
    }
  }

  /**
   * Writes a scalar through whichever destination shape applies - a setter
   * function, an array's first slot, a { value } holder, or the object's own
   * field - returning false when the value is already equal.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {object} object Destination owner.
   * @param {string} name Member or root name.
   * @param {*} destination Destination storage or endpoint.
   * @param {*} value Incoming value.
   * @returns {boolean} Binding result.
   */
  @meta.impl.custom
  static _writeScalar(object, name, destination, value)
  {
    if (typeof destination === "function")
    {
      destination(value);
      return true;
    }
    if (TriValueBinding._isArrayLike(destination) && destination.length)
    {
      if (Object.is(destination[0], value)) return false;
      destination[0] = value;
      return true;
    }
    if (
      destination &&
      typeof destination === "object" &&
      "value" in destination &&
      typeof destination.value === "number"
    )
    {
      if (Object.is(destination.value, value)) return false;
      destination.value = value;
      return true;
    }
    if (Object.is(destination, value)) return false;
    object[name] = value;
    return true;
  }

  /**
   * Writes one array component, returning false when the index is out of range
   * or the value is unchanged.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {*} destination Destination storage or endpoint.
   * @param {number} index Array component index.
   * @param {*} value Incoming value.
   * @returns {boolean} Binding result.
   */
  @meta.impl.custom
  static _writeArrayComponent(destination, index, value)
  {
    if (!TriValueBinding._isArrayLike(destination) || destination.length <= index) return false;
    if (Object.is(destination[index], value)) return false;
    destination[index] = value;
    return true;
  }

  /**
   * Truncates a number to the destination's integer or boolean kind; float kinds
   * pass through unchanged.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {string} kind Declared numeric kind.
   * @param {*} value Incoming value.
   * @returns {number|boolean} Binding result.
   */
  @meta.impl.custom
  static _castScalar(kind, value)
  {
    switch (kind)
    {
      case "boolean": return Boolean(value);
      case "int8": return value << 24 >> 24;
      case "uint8": return value & 0xff;
      case "int16": return value << 16 >> 16;
      case "uint16": return value & 0xffff;
      case "int32": return value | 0;
      case "uint32": return value >>> 0;
      default: return Number(value);
    }
  }

  /**
   * Byte size of a scalar kind, used to size the rerouted-buffer requirement
   * recorded in the copy plan.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {string} kind Declared numeric kind.
   * @returns {number} Binding result.
   */
  @meta.impl.custom
  static _scalarBytes(kind)
  {
    if (["int8", "uint8", "boolean"].includes(kind)) return 1;
    if (["int16", "uint16"].includes(kind)) return 2;
    if (["float64", "int64", "uint64"].includes(kind)) return 8;
    return 4;
  }

  /**
   * Notifies the destination of the changed field through UpdateValues,
   * OnValueChanged or OnModified, whichever it implements.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {object} object Destination owner.
   * @param {string} name Member or root name.
   * @param {*} source Source value or endpoint.
   * @returns {void} No return value.
   */
  @meta.impl.custom
  static _notify(object, name, source)
  {
    if (typeof object.UpdateValues === "function") object.UpdateValues({ property: name, source });
    else if (typeof object.OnValueChanged === "function") object.OnValueChanged(name, object[name], source);
    else object.OnModified?.(name);
  }

  /**
   * Whether the value is an array or a typed-array view.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {*} value Incoming value.
   * @returns {boolean} Binding result.
   */
  @meta.impl.custom
  static _isArrayLike(value)
  {
    return Array.isArray(value) || ArrayBuffer.isView(value);
  }

  /**
   * Whether a value can be held by WeakRef, i.e. an object or a function.
   * Custom: implements the existing portable value, path or endpoint adapter.
   * @param {*} value Incoming value.
   * @returns {boolean} Binding result.
   */
  @meta.impl.custom
  static _isReference(value)
  {
    return value !== null && (typeof value === "object" || typeof value === "function");
  }
}

// TriValueBinding_Blue.cpp: concrete self, binding, notify; EXPOSURE_END.
meta.carbon.interfaceTable({ interfaces: [TriValueBinding, ITr2ValueBinding, INotify], chainTo: null })(TriValueBinding, { kind: "class" });
