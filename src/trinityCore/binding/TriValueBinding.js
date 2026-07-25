// Source: E:\carbonengine\trinity\trinity\TriValueBinding.h
// Source: E:\carbonengine\trinity\trinity\TriValueBinding.cpp
// Source: E:\carbonengine\trinity\trinity\TriValueBinding_Blue.cpp
import { carbon, CjsSchema, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";

@type.define({ className: "TriValueBinding", family: "trinityCore" })
export class TriValueBinding extends CjsModel
{

  #source = null;

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
  @io.notify
  @io.persist
  @type.string
  destinationAttribute = "";

  /** m_sourceAttribute (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  sourceAttribute = "";

  /** Carbon's persisted-only destination endpoint storage. */
  @io.persistOnly
  @type.model("IRoot")
  destinationObject = null;

  /** m_isEnabled (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  isEnabled = true;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** Carbon's persisted-only source endpoint storage. */
  @io.persistOnly
  @type.model("IRoot")
  sourceObject = null;

  /** m_offset (Vector4) [READWRITE, PERSIST] */
  @io.persist
  @type.vec4
  offset = vec4.create();

  /** m_copyValueCallable (BlueScriptCallback) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.rawStruct("BlueScriptCallback")
  copyValueCallable = null;

  /** m_scale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  scale = 1;

  /** m_isWeak (bool) [READ] */
  @io.read
  @type.boolean
  isWeak = false;

  @io.read
  @type.boolean
  isValid = false;

  @carbon.method
  @impl.adapted
  @impl.reason("Resolves Blue field metadata through JavaScript properties and supports the portable runtime's numeric, vector, boolean, and callback value families.")
  Initialize()
  {
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
    if (typeof this.copyValueCallable === "function")
    {
      this.#callbackReady = true;
      return;
    }

    const source = TriValueBinding.#ParseAttribute(this.sourceAttribute);
    const destination = TriValueBinding.#ParseAttribute(this.destinationAttribute);
    if (!source || !destination || !(source.name in sourceObject) || !(destination.name in destinationObject)) return;
    const sourceValue = sourceObject[source.name];
    const destinationValue = destinationObject[destination.name];
    if (!TriValueBinding.#CanUseOffset(sourceValue, source.offset) || !TriValueBinding.#CanUseOffset(destinationValue, destination.offset)) return;
    const sourceField = CjsSchema.getField(sourceObject.constructor, source.name);
    const destinationField = CjsSchema.getField(destinationObject.constructor, destination.name);
    const copyPlan = TriValueBinding.#CreateCopyPlan(
      TriValueBinding.#DescribeValue(sourceValue, sourceField),
      source.offset,
      TriValueBinding.#DescribeValue(destinationValue, destinationField),
      destination.offset
    );
    if (!copyPlan) return;

    this.#source = { name: source.name };
    this.#destination = { name: destination.name };
    this.#sourceOffset = source.offset;
    this.#destinationOffset = destination.offset;
    this.#copyPlan = copyPlan;
    this.#notifyDestination = destinationField ? destinationField.io?.notify === true : true;
    this.isValid = true;

    if (
      typeof destinationObject.RegisterBinding === "function" &&
      typeof destinationObject.GetDestination === "function"
    )
    {
      destinationObject.RegisterBinding(this);
      this.#reroutableDestination = this.isWeak && typeof WeakRef === "function"
        ? new WeakRef(destinationObject)
        : destinationObject;
      const rerouted = destinationObject.GetDestination();
      const destinationSize = Number(rerouted?.size ?? Number.POSITIVE_INFINITY);
      if (destinationSize >= copyPlan.requiredBytes)
      {
        this.#reroutedDestination = rerouted?.dest ?? rerouted;
      }
    }
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Copies portable JavaScript values and emits CjsModel notifications instead of invoking Carbon's native typed copy-function table.")
  CopyValue()
  {
    if (!this.isEnabled) return false;
    if (!this.isValid && !this.#callbackReady) this.Initialize();
    if (!this.isValid && !this.#callbackReady) return false;

    const sourceObject = this.GetCurrentSourceObject();
    const destinationObject = this.GetCurrentDestinationObject();
    if (!sourceObject || !destinationObject) return false;
    if (typeof this.copyValueCallable === "function")
    {
      this.copyValueCallable(sourceObject, destinationObject);
      return true;
    }

    const sourceValue = sourceObject[this.#source.name];
    const logicalDestination = destinationObject[this.#destination.name];
    const destinationValue = this.#reroutedDestination ?? logicalDestination;
    const changed = TriValueBinding.#ApplyCopyPlan(
      this.#copyPlan,
      destinationObject,
      this.#destination.name,
      sourceValue,
      destinationValue,
      this.scale,
      this.offset
    );
    if (
      changed &&
      this.#reroutedDestination !== null &&
      typeof destinationObject.IsRerouted === "function" &&
      !destinationObject.IsRerouted() &&
      this.#reroutedDestination !== logicalDestination &&
      this.#reroutedDestination &&
      typeof this.#reroutedDestination === "object" &&
      "value" in this.#reroutedDestination
    )
    {
      destinationObject[this.#destination.name] = this.#reroutedDestination.value;
    }
    if (changed && this.#notifyDestination)
    {
      TriValueBinding.#Notify(destinationObject, this.#destination.name, this);
    }
    return changed;
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
  GetDestinationAttributeName()
  {
    return this.destinationAttribute;
  }

  @carbon.method
  @impl.implemented
  SetSource(sourceAttribute, sourceObject)
  {
    this.#GetReroutableDestination()?.UnregisterBinding?.(this);
    this.#reroutableDestination = null;
    this.#reroutedDestination = null;
    this.isWeak = false;
    this.#sourceObjectWeak = null;
    this.sourceAttribute = String(sourceAttribute ?? "");
    this.sourceObject = sourceObject ?? null;
    this.isValid = false;
  }

  @carbon.method
  @impl.implemented
  SetDestination(destinationAttribute, destinationObject)
  {
    this.#GetReroutableDestination()?.UnregisterBinding?.(this);
    this.#reroutableDestination = null;
    this.#reroutedDestination = null;
    this.isWeak = false;
    this.#destinationObjectWeak = null;
    this.destinationAttribute = String(destinationAttribute ?? "");
    this.destinationObject = destinationObject ?? null;
    this.isValid = false;
  }

  @carbon.method
  @impl.implemented
  SetScale(scale)
  {
    this.scale = Number(scale);
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Uses WeakRef for Carbon's BlueWeakRef endpoints and returns validity as a JavaScript convenience.")
  CreateWeakBinding(source, sourceAttribute, destination, destinationAttribute, scale = 1, offset = [0, 0, 0, 0])
  {
    this.#GetReroutableDestination()?.UnregisterBinding?.(this);
    this.#reroutableDestination = null;
    if (
      !TriValueBinding.#IsReference(source) ||
      !TriValueBinding.#IsReference(destination)
    )
    {
      this.isValid = false;
      return false;
    }
    this.isWeak = true;
    this.sourceObject = null;
    this.destinationObject = null;
    this.#sourceObjectWeak = source && typeof WeakRef === "function" ? new WeakRef(source) : { deref: () => source };
    this.#destinationObjectWeak = destination && typeof WeakRef === "function" ? new WeakRef(destination) : { deref: () => destination };
    this.sourceAttribute = String(sourceAttribute ?? "");
    this.destinationAttribute = String(destinationAttribute ?? "");
    this.scale = Number(scale);
    for (let index = 0; index < 4; index++) this.offset[index] = Number(offset?.[index] ?? 0);
    this.Initialize();
    return this.isValid;
  }

  @carbon.method
  @impl.implemented
  IsValid()
  {
    return this.isValid;
  }

  @carbon.method
  @impl.implemented
  GetCurrentSourceObject()
  {
    return this.isWeak ? this.#sourceObjectWeak?.deref?.() ?? null : this.sourceObject;
  }

  @carbon.method
  @impl.implemented
  GetCurrentDestinationObject()
  {
    return this.isWeak ? this.#destinationObjectWeak?.deref?.() ?? null : this.destinationObject;
  }

  @carbon.method
  @impl.implemented
  GetSourceObject()
  {
    return this.GetCurrentSourceObject();
  }

  @carbon.method
  @impl.implemented
  SetSourceObject(sourceObject)
  {
    if (this.isWeak)
    {
      this.#sourceObjectWeak = sourceObject && typeof WeakRef === "function"
        ? new WeakRef(sourceObject)
        : { deref: () => sourceObject ?? null };
    }
    else
    {
      this.sourceObject = sourceObject ?? null;
    }
    this.Initialize();
  }

  @carbon.method
  @impl.implemented
  GetDestinationObject()
  {
    return this.GetCurrentDestinationObject();
  }

  @carbon.method
  @impl.implemented
  SetDestinationObject(destinationObject)
  {
    this.#GetReroutableDestination()?.UnregisterBinding?.(this);
    this.#reroutableDestination = null;
    if (this.isWeak)
    {
      this.#destinationObjectWeak = destinationObject && typeof WeakRef === "function"
        ? new WeakRef(destinationObject)
        : { deref: () => destinationObject ?? null };
    }
    else
    {
      this.destinationObject = destinationObject ?? null;
    }
    this.Initialize();
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Swaps the portable array or scalar-holder destination supplied by ITriReroutable instead of Carbon's raw byte pointer.")
  RerouteDestination(destination)
  {
    this.#reroutedDestination = destination ?? null;
  }

  #GetReroutableDestination()
  {
    return this.#reroutableDestination instanceof WeakRef
      ? this.#reroutableDestination.deref() ?? null
      : this.#reroutableDestination;
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

  static #CanUseOffset(value, offset)
  {
    return offset === -1 || (TriValueBinding.#IsArrayLike(value) && value.length > offset);
  }

  static #DescribeValue(value, field)
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
      kind === null && TriValueBinding.#IsArrayLike(value) ? Number(value.length) : 0
    );
    if (length)
    {
      return { category: "floatArray", kind: kind ?? "floatArray", length };
    }
    return null;
  }

  static #CreateCopyPlan(source, sourceOffset, destination, destinationOffset)
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
        requiredBytes: floatPair ? 1 : TriValueBinding.#ScalarBytes(destination.kind)
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
          requiredBytes: TriValueBinding.#ScalarBytes(destination.kind)
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

  static #ApplyCopyPlan(plan, object, name, source, destination, scale, offset)
  {
    switch (plan.kind)
    {
      case "scalar":
      {
        const next = TriValueBinding.#CastScalar(
          plan.destinationKind,
          Number(source) * scale + Number(offset[0] ?? 0)
        );
        return TriValueBinding.#WriteScalar(object, name, destination, next);
      }
      case "rawScalar":
        return TriValueBinding.#WriteScalar(object, name, destination, source);
      case "floatToBoolean":
        return TriValueBinding.#WriteScalar(object, name, destination, Boolean(source));
      case "componentToScalar":
      {
        const next = TriValueBinding.#CastScalar(
          plan.destinationKind,
          Number(source[plan.sourceOffset]) * scale + Number(offset[0] ?? 0)
        );
        return TriValueBinding.#WriteScalar(object, name, destination, next);
      }
      case "componentToComponent":
        return TriValueBinding.#WriteArrayComponent(
          destination,
          plan.destinationOffset,
          Number(source[plan.sourceOffset]) * scale + Number(offset[0] ?? 0)
        );
      case "scalarToComponent":
        return TriValueBinding.#WriteArrayComponent(
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
          changed = TriValueBinding.#WriteArrayComponent(
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
          changed = TriValueBinding.#WriteArrayComponent(
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
          changed = TriValueBinding.#WriteArrayComponent(
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
          changed = TriValueBinding.#WriteArrayComponent(destination, index, Number(source[index])) || changed;
        }
        return changed;
      }
      default:
        return false;
    }
  }

  static #WriteScalar(object, name, destination, value)
  {
    if (typeof destination === "function")
    {
      destination(value);
      return true;
    }
    if (TriValueBinding.#IsArrayLike(destination) && destination.length)
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

  static #WriteArrayComponent(destination, index, value)
  {
    if (!TriValueBinding.#IsArrayLike(destination) || destination.length <= index) return false;
    if (Object.is(destination[index], value)) return false;
    destination[index] = value;
    return true;
  }

  static #CastScalar(kind, value)
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

  static #ScalarBytes(kind)
  {
    if (["int8", "uint8", "boolean"].includes(kind)) return 1;
    if (["int16", "uint16"].includes(kind)) return 2;
    if (["float64", "int64", "uint64"].includes(kind)) return 8;
    return 4;
  }

  static #Notify(object, name, source)
  {
    if (typeof object.UpdateValues === "function") object.UpdateValues({ property: name, source });
    else if (typeof object.OnValueChanged === "function") object.OnValueChanged(name, object[name], source);
    else object.OnModified?.({ property: name, source });
  }

  static #IsArrayLike(value)
  {
    return Array.isArray(value) || ArrayBuffer.isView(value);
  }

  static #IsReference(value)
  {
    return value !== null && (typeof value === "object" || typeof value === "function");
  }

}
