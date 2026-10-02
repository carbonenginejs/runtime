// Source: trinity/trinity/Tr2ExternalParameter.h
// Source: trinity/trinity/Tr2ExternalParameter.cpp
// Source: trinity/trinity/Tr2ExternalParameter_Blue.cpp
import { CjsSchema, meta, types } from "#schema";
import { IInitialize } from "#blue/IInitialize";
import { INotify } from "#blue/INotify";
import { TriValueBinding } from "./TriValueBinding.js";

/**
 * A named handle onto one attribute - optionally one vector component - of
 * another object, exposing it for type-checked reads and writes.
 */
@meta.define({ className: "Tr2ExternalParameter", family: "trinityCore" })
@meta.carbon.inherit(INotify)
export class Tr2ExternalParameter extends IInitialize
{

  /** Resolved destination member name; rebuilt by Initialize. */
  _destinationName = "";

  /** Resolved component offset, or -1 for the complete member. */
  _destinationOffset = -1;

  /** Cached schema field or portable plain-object entry. */
  _destinationEntry = null;

  /** Cached portable value category used for conversion. */
  _destinationType = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /** m_destinationObject (IRootPtr) [READWRITE, PERSIST, NOTIFY] */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.objectRef("IRoot")
  destinationObject = null;

  /** m_destinationAttribute (std::string) [READWRITE, PERSIST, NOTIFY] */
  @meta.edit.notify
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  destinationAttribute = "";

  /** m_valid (bool) [READ] */
  @meta.edit.read
  @types.boolean
  valid = false;

  /**
   * Carbon method GetValue (MAP_METHOD_AND_WRAP).
   * Adapted: Returns a defensive JavaScript value copy in place of Carbon's BlueScriptValue conversion.
   * @returns {*} Defensive copy for arrays, otherwise the bound value.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetValue()
  {
    if (!this.valid) this.Initialize();
    if (!this.valid) throw new Error("invalid binding");
    const value = this.destinationObject[this._destinationName];
    if (this._destinationOffset !== -1) return value[this._destinationOffset];
    if (ArrayBuffer.isView(value)) return value.slice();
    if (Array.isArray(value)) return value.slice();
    return value;
  }

  /**
   * Carbon method SetValue (MAP_METHOD_AND_WRAP).
   * Adapted: Validates and converts portable schema values before assignment instead of using Carbon's Python Blue conversion bridge.
   * @param {*} value Value to convert and assign.
   * @returns {boolean} True after assignment and notification.
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetValue(value)
  {
    if (!this.valid) this.Initialize();
    if (!this.valid) throw new Error("invalid binding");
    const current = this.destinationObject[this._destinationName];
    const converted = Tr2ExternalParameter._convertValue(
      value,
      current,
      this._destinationType,
      this._destinationOffset
    );
    if (!converted.valid) throw new TypeError(converted.message);

    if (this._destinationOffset !== -1)
    {
      current[this._destinationOffset] = converted.value;
    }
    else if (ArrayBuffer.isView(current))
    {
      current.set(converted.value);
    }
    else if (Array.isArray(current))
    {
      for (let index = 0; index < current.length; index++) current[index] = converted.value[index];
    }
    else
    {
      this.destinationObject[this._destinationName] = converted.value;
    }
    Tr2ExternalParameter._notify(this.destinationObject, this._destinationName, this);
    return true;
  }

  /**
   * Resolves destinationAttribute against the destination object, caching the
   * schema field, component offset and value category; an unresolvable attribute
   * leaves valid false and still returns true.
   * Adapted: Resolves Carbon Blue entries through CjsSchema with a narrow plain-object fallback for portable graph adapters.
   * @returns {boolean} True, including when the destination is invalid.
   */
  @meta.carbon.method
  @meta.impl.adapted
  Initialize()
  {
    this.valid = false;
    this._destinationName = "";
    this._destinationOffset = -1;
    this._destinationEntry = null;
    this._destinationType = null;
    if (!this.destinationObject || !this.destinationAttribute) return true;
    const parsed = Tr2ExternalParameter._parseAttribute(this.destinationAttribute);
    if (!parsed || !(parsed.name in this.destinationObject)) return true;
    const value = this.destinationObject[parsed.name];
    const field = CjsSchema.getField(this.destinationObject.constructor, parsed.name);
    const valueType = Tr2ExternalParameter._describeValue(value, field);
    if (!valueType) return true;
    if (
      parsed.offset !== -1 &&
      (valueType.category !== "floatArray" || valueType.length <= parsed.offset)
    )
    {
      return true;
    }
    this._destinationName = parsed.name;
    this._destinationOffset = parsed.offset;
    this._destinationEntry = field ?? {
      name: parsed.name,
      type: { kind: valueType.kind }
    };
    this._destinationType = valueType;
    this.valid = true;
    return true;
  }

  /**
   * Re-resolves the cached destination entry after any field change.
   * @param {string|null} [_value=null] Changed member name.
   * @returns {boolean} True after resolving the destination.
   */
  @meta.carbon.method
  @meta.impl.implemented
  OnModified(_value = null)
  {
    this.Initialize();
    return true;
  }

  /**
   * The parameter's exposed name.
   * @returns {string} Exposed name.
   */
  @meta.carbon.method
  @meta.impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Sets the exposed name, coercing null to an empty string.
   * Adapted: Normalizes JavaScript inputs to a string, including null to an empty name, before assignment.
   * @param {*} name Name normalized by the portable string adapter.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Rebinds the destination object and immediately re-resolves the cached entry,
   * where Carbon defers that to its notify lifecycle.
   * Adapted: Normalizes a nullish object and eagerly rebuilds the portable entry cache; Carbon assigns the pointer and uses its notify lifecycle.
   * @param {object|null} destinationObject Destination owner.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetDestinationObject(destinationObject)
  {
    this.destinationObject = destinationObject ?? null;
    this.Initialize();
  }

  /**
   * Rebinds the destination attribute and immediately re-resolves the cached
   * entry.
   * Adapted: Normalizes the attribute to a string and eagerly rebuilds the portable entry cache; Carbon assigns the string and uses its notify lifecycle.
   * @param {*} destinationAttribute Member name with an optional component.
   * @returns {void}
   */
  @meta.carbon.method
  @meta.impl.adapted
  SetDestinationAttribute(destinationAttribute)
  {
    this.destinationAttribute = String(destinationAttribute ?? "");
    this.Initialize();
  }

  /**
   * Whether the destination attribute currently resolves to a supported value
   * shape.
   * @returns {boolean} Whether the destination resolved.
   */
  @meta.carbon.method
  @meta.impl.implemented
  IsValid()
  {
    return this.valid;
  }

  /**
   * The live value of the bound attribute, re-resolving first if needed; null
   * when the binding cannot be resolved. Array values are the destination's own
   * buffers, not copies.
   * Adapted: Returns the portable field value instead of Carbon's raw Be::Var pointer.
   * @returns {*} Live destination value, or null.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetDestination()
  {
    if (!this.valid) this.Initialize();
    return this.valid ? this.destinationObject[this._destinationName] : null;
  }

  /**
   * The cached schema field metadata plus the component offset, or null while
   * invalid; stands in for Carbon's Be::VarEntry pointer.
   * Adapted: Returns CjsSchema field metadata plus the component offset instead of Carbon's Be::VarEntry pointer.
   * @returns {object|null} Portable field metadata and component offset.
   */
  @meta.carbon.method
  @meta.impl.adapted
  GetDestinationEntry()
  {
    return this.valid ? { ...this._destinationEntry, offset: this._destinationOffset } : null;
  }

  /**
   * Creates a TriValueBinding already pointed at this parameter's destination
   * endpoint, leaving the source for the caller to set.
   * Adapted: Constructs the maintained portable TriValueBinding rather than a native Blue instance.
   * @returns {TriValueBinding} Binding with its destination assigned.
   */
  @meta.carbon.method
  @meta.impl.adapted
  CreateBinding()
  {
    const binding = new TriValueBinding();
    binding.SetDestination(this.destinationAttribute, this.destinationObject);
    return binding;
  }

  /**
   * Classifies the destination value as boolean, string, number, fixed-length
   * float array or object reference, preferring the schema field kind over the
   * runtime value's shape.
   * Custom: classifies the existing JavaScript value adapter.
   * @param {*} value Current member value.
   * @param {object|null} field Declared schema field.
   * @returns {object|null} Portable value category.
   */
  @meta.impl.custom
  static _describeValue(value, field)
  {
    const kind = field?.type?.kind ?? null;
    if (kind === "boolean" || (kind === null && typeof value === "boolean"))
    {
      return { category: "boolean", kind: "boolean" };
    }
    // Carbon binds any member (Tr2ExternalParameter.cpp:88-108); path and
    // expression fields are strings too. SOF's banner parameters bind a
    // TriTextureParameter's path-typed resourcePath.
    if (kind === "string" || kind === "path" || kind === "expression" || (kind === null && typeof value === "string"))
    {
      return { category: "string", kind: "string" };
    }
    const numericKinds = new Set([
      "int8", "uint8", "int16", "uint16", "int32", "uint32",
      "int64", "uint64", "float32", "float64"
    ]);
    if (numericKinds.has(kind) || (kind === null && typeof value === "number"))
    {
      return { category: "number", kind: kind ?? "float32" };
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
      kind === null && Tr2ExternalParameter._isArrayLike(value) ? Number(value.length) : 0
    );
    if (length)
    {
      return { category: "floatArray", kind: kind ?? "floatArray", length };
    }
    if (
      ["objectRef", "model"].includes(kind) ||
      (kind === null && (value === null || typeof value === "object"))
    )
    {
      return { category: "object", kind: kind ?? "objectRef" };
    }
    return null;
  }

  /**
   * Validates an incoming value against the destination category and converts
   * it, returning { valid, value } or { valid, message }; a component write only
   * accepts a finite number.
   * Custom: preserves portable value conversion and validation.
   * @param {*} value Incoming value.
   * @param {*} current Current member value.
   * @param {object|null} destinationType Resolved category.
   * @param {number} offset Component offset or -1.
   * @returns {object} Conversion result or failure message.
   */
  @meta.impl.custom
  static _convertValue(value, current, destinationType, offset)
  {
    if (offset !== -1)
    {
      return typeof value === "number" && Number.isFinite(value)
        ? { valid: true, value: Number(value) }
        : { valid: false, message: "float value expected" };
    }

    switch (destinationType?.category)
    {
      case "boolean":
        return typeof value === "boolean"
          ? { valid: true, value }
          : { valid: false, message: "incompatible type" };
      case "string":
        return typeof value === "string"
          ? { valid: true, value }
          : { valid: false, message: "incompatible type" };
      case "number":
        return typeof value === "number" && Number.isFinite(value)
          ? { valid: true, value: Tr2ExternalParameter._castNumber(destinationType.kind, value) }
          : { valid: false, message: "incompatible type" };
      case "floatArray":
      {
        if (
          !Tr2ExternalParameter._isArrayLike(value) ||
          value.length !== destinationType.length
        )
        {
          return { valid: false, message: "incompatible type" };
        }
        const converted = new Array(destinationType.length);
        for (let index = 0; index < destinationType.length; index++)
        {
          if (typeof value[index] !== "number" || !Number.isFinite(value[index]))
          {
            return { valid: false, message: "incompatible type" };
          }
          converted[index] = Number(value[index]);
        }
        return { valid: true, value: converted };
      }
      case "object":
        return value === null || typeof value === "object" || typeof value === "function"
          ? { valid: true, value }
          : { valid: false, message: "incompatible type" };
      default:
        return Object.is(value, current)
          ? { valid: true, value }
          : { valid: false, message: "incompatible type" };
    }
  }

  /**
   * Truncates a number to the destination's integer kind; float kinds pass
   * through unchanged.
   * Custom: adapts integer storage to JavaScript numbers.
   * @param {string} kind Declared numeric kind.
   * @param {number} value Incoming number.
   * @returns {number} Converted number.
   */
  @meta.impl.custom
  static _castNumber(kind, value)
  {
    switch (kind)
    {
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
   * Splits `field` or `field.x` into a name plus a component index (x/r zero
   * through w/a three); null for an empty name or an unrecognized suffix.
   * Custom: parses the portable component-name adapter.
   * @param {*} attribute Destination member expression.
   * @returns {object|null} Member name and component offset.
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
   * Whether the value is an array or a typed-array view.
   * Custom: recognizes JavaScript array storage.
   * @param {*} value Candidate array.
   * @returns {boolean} Whether array storage is present.
   */
  @meta.impl.custom
  static _isArrayLike(value)
  {
    return Array.isArray(value) || ArrayBuffer.isView(value);
  }

  /**
   * Notifies the destination of the changed field through UpdateValues,
   * OnValueChanged or OnModified, whichever it implements.
   * Custom: preserves the existing JavaScript destination-notification adapter.
   * @param {object} object Destination owner.
   * @param {string} name Changed member name.
   * @param {Tr2ExternalParameter} source Source parameter.
   * @returns {void}
   */
  @meta.impl.custom
  static _notify(object, name, source)
  {
    if (typeof object.UpdateValues === "function") object.UpdateValues({ property: name, source });
    else if (typeof object.OnValueChanged === "function") object.OnValueChanged(name, object[name], source);
    else object.OnModified?.(name);
  }

}

// Carbon's own query table has no exposure chain.
meta.carbon.interfaceTable({ interfaces: [Tr2ExternalParameter, IInitialize, INotify], chainTo: null })(Tr2ExternalParameter, { kind: "class" });
