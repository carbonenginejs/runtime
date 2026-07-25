// Source: E:\carbonengine\trinity\trinity\Tr2ExternalParameter.h
// Source: E:\carbonengine\trinity\trinity\Tr2ExternalParameter.cpp
// Source: E:\carbonengine\trinity\trinity\Tr2ExternalParameter_Blue.cpp
import { carbon, CjsSchema, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { TriValueBinding } from "./TriValueBinding.js";

@type.define({ className: "Tr2ExternalParameter", family: "trinityCore" })
export class Tr2ExternalParameter extends CjsModel
{

  #destinationName = "";

  #destinationOffset = -1;

  #destinationEntry = null;

  #destinationType = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_destinationObject (IRootPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("IRoot")
  destinationObject = null;

  /** m_destinationAttribute (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  destinationAttribute = "";

  /** m_valid (bool) [READ] */
  @io.read
  @type.boolean
  valid = false;

  /** Carbon method GetValue (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Returns a defensive JavaScript value copy in place of Carbon's BlueScriptValue conversion.")
  GetValue()
  {
    if (!this.valid) this.Initialize();
    if (!this.valid) throw new Error("invalid binding");
    const value = this.destinationObject[this.#destinationName];
    if (this.#destinationOffset !== -1) return value[this.#destinationOffset];
    if (ArrayBuffer.isView(value)) return value.slice();
    if (Array.isArray(value)) return value.slice();
    return value;
  }

  /** Carbon method SetValue (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Validates and converts portable schema values before assignment instead of using Carbon's Python Blue conversion bridge.")
  SetValue(value)
  {
    if (!this.valid) this.Initialize();
    if (!this.valid) throw new Error("invalid binding");
    const current = this.destinationObject[this.#destinationName];
    const converted = Tr2ExternalParameter.#ConvertValue(
      value,
      current,
      this.#destinationType,
      this.#destinationOffset
    );
    if (!converted.valid) throw new TypeError(converted.message);

    if (this.#destinationOffset !== -1)
    {
      current[this.#destinationOffset] = converted.value;
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
      this.destinationObject[this.#destinationName] = converted.value;
    }
    Tr2ExternalParameter.#Notify(this.destinationObject, this.#destinationName, this);
    return true;
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Resolves Carbon Blue entries through CjsSchema with a narrow plain-object fallback for portable graph adapters.")
  Initialize()
  {
    this.valid = false;
    this.#destinationName = "";
    this.#destinationOffset = -1;
    this.#destinationEntry = null;
    this.#destinationType = null;
    if (!this.destinationObject || !this.destinationAttribute) return true;
    const parsed = Tr2ExternalParameter.#ParseAttribute(this.destinationAttribute);
    if (!parsed || !(parsed.name in this.destinationObject)) return true;
    const value = this.destinationObject[parsed.name];
    const field = CjsSchema.getField(this.destinationObject.constructor, parsed.name);
    const valueType = Tr2ExternalParameter.#DescribeValue(value, field);
    if (!valueType) return true;
    if (
      parsed.offset !== -1 &&
      (valueType.category !== "floatArray" || valueType.length <= parsed.offset)
    )
    {
      return true;
    }
    this.#destinationName = parsed.name;
    this.#destinationOffset = parsed.offset;
    this.#destinationEntry = field ?? {
      name: parsed.name,
      type: Object.freeze({ kind: valueType.kind })
    };
    this.#destinationType = valueType;
    this.valid = true;
    return true;
  }

  @carbon.method
  @impl.implemented
  OnModified(_value = null)
  {
    this.Initialize();
    return true;
  }

  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Eagerly rebuilds the portable entry cache; Carbon performs the same rebuild through its notify lifecycle.")
  SetDestinationObject(destinationObject)
  {
    this.destinationObject = destinationObject ?? null;
    this.Initialize();
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Eagerly rebuilds the portable entry cache; Carbon performs the same rebuild through its notify lifecycle.")
  SetDestinationAttribute(destinationAttribute)
  {
    this.destinationAttribute = String(destinationAttribute ?? "");
    this.Initialize();
  }

  @carbon.method
  @impl.implemented
  IsValid()
  {
    return this.valid;
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Returns the portable field value instead of Carbon's raw Be::Var pointer.")
  GetDestination()
  {
    if (!this.valid) this.Initialize();
    return this.valid ? this.destinationObject[this.#destinationName] : null;
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Returns CjsSchema field metadata plus the component offset instead of Carbon's Be::VarEntry pointer.")
  GetDestinationEntry()
  {
    return this.valid ? { ...this.#destinationEntry, offset: this.#destinationOffset } : null;
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Constructs the maintained portable TriValueBinding rather than a native Blue instance.")
  CreateBinding()
  {
    const binding = new TriValueBinding();
    binding.SetDestination(this.destinationAttribute, this.destinationObject);
    return binding;
  }

  static #DescribeValue(value, field)
  {
    const kind = field?.type?.kind ?? null;
    if (kind === "boolean" || (kind === null && typeof value === "boolean"))
    {
      return { category: "boolean", kind: "boolean" };
    }
    if (kind === "string" || (kind === null && typeof value === "string"))
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
      kind === null && Tr2ExternalParameter.#IsArrayLike(value) ? Number(value.length) : 0
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

  static #ConvertValue(value, current, destinationType, offset)
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
          ? { valid: true, value: Tr2ExternalParameter.#CastNumber(destinationType.kind, value) }
          : { valid: false, message: "incompatible type" };
      case "floatArray":
      {
        if (
          !Tr2ExternalParameter.#IsArrayLike(value) ||
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

  static #CastNumber(kind, value)
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

  static #ParseAttribute(attribute)
  {
    const value = String(attribute ?? "");
    const dot = value.indexOf(".");
    if (dot === -1) return value ? { name: value, offset: -1 } : null;
    const offsets = { x: 0, r: 0, y: 1, g: 1, z: 2, b: 2, w: 3, a: 3 };
    const component = value.slice(dot + 1);
    return component.length === 1 && offsets[component] !== undefined ? { name: value.slice(0, dot), offset: offsets[component] } : null;
  }

  static #IsArrayLike(value)
  {
    return Array.isArray(value) || ArrayBuffer.isView(value);
  }

  static #Notify(object, name, source)
  {
    if (typeof object.UpdateValues === "function") object.UpdateValues({ property: name, source });
    else if (typeof object.OnValueChanged === "function") object.OnValueChanged(name, object[name], source);
    else object.OnModified?.({ property: name, source });
  }

}
