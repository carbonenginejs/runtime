// Source: E:\carbonengine\trinity\trinity\Tr2DynamicBinding.h
// Source: E:\carbonengine\trinity\trinity\Tr2DynamicBinding.cpp
// Source: E:\carbonengine\trinity\trinity\Tr2DynamicBinding_Blue.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { TriValueBinding } from "./TriValueBinding.js";


@type.define({ className: "Tr2DynamicBinding", family: "trinityCore" })
export class Tr2DynamicBinding extends CjsModel
{
  #bindingTime = 0;

  #currentFrameTime = 0;

  #destinationRef = null;

  #lastLinkSignature = "";

  #owner = null;

  #sourceRef = null;

  @io.persist
  @type.int32
  bindingDelay = 0;

  @io.read
  @type.objectRef("IRoot")
  destination = null;

  @io.read
  @type.boolean
  isDestinationValid = false;

  @io.persist
  @type.string
  name = "";

  @io.notify
  @io.persist
  @type.string
  destinationObjectAttribute = "";

  @io.notify
  @io.persist
  @type.string
  destinationObjectPath = "";

  @io.notify
  @io.persist
  @type.string
  sourceObjectAttribute = "";

  @io.notify
  @io.persist
  @type.string
  sourceObjectPath = "";

  @io.notify
  @io.persist
  @type.float32
  scale = 1;

  @io.read
  @type.objectRef("IRoot")
  source = null;

  @io.read
  @type.boolean
  isSourceValid = false;

  @io.read
  @type.objectRef("TriValueBinding")
  binding = null;

  constructor()
  {
    super();
    Object.defineProperty(this, "source", {
      configurable: true,
      enumerable: true,
      get: () => this.#sourceRef?.deref?.() ?? null
    });
    Object.defineProperty(this, "destination", {
      configurable: true,
      enumerable: true,
      get: () => this.#destinationRef?.deref?.() ?? null
    });
    this.#lastLinkSignature = this.#GetLinkSignature();
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Resolves Carbon Blue paths through the portable JavaScript graph and accepts current frame time explicitly instead of reading BeOS.")
  Link(currentFrameTime = undefined)
  {
    this.Unlink();
    if (currentFrameTime !== undefined)
    {
      this.#currentFrameTime = Number(currentFrameTime);
    }
    this.#lastLinkSignature = this.#GetLinkSignature();
    if (!this.#owner)
    {
      return false;
    }

    const roots = this.#owner.GetParameterMap?.() ?? {};
    const destination = Tr2DynamicBinding.#ResolveReference(this.destinationObjectPath, roots);
    const source = Tr2DynamicBinding.#ResolveReference(this.sourceObjectPath, roots);
    this.#destinationRef = Tr2DynamicBinding.#MakeWeakRef(destination);
    this.#sourceRef = Tr2DynamicBinding.#MakeWeakRef(source);
    this.isDestinationValid = !!destination;
    this.isSourceValid = !!source;

    if (source && destination)
    {
      this.binding = new TriValueBinding();
      this.binding.CreateWeakBinding(
        source,
        this.sourceObjectAttribute,
        destination,
        this.destinationObjectAttribute,
        this.scale
      );
      this.#bindingTime = this.#currentFrameTime + this.bindingDelay / 1000;
      return true;
    }
    return false;
  }

  @carbon.method
  @impl.implemented
  Unlink()
  {
    this.binding?.SetDestinationObject?.(null);
    this.binding = null;
    this.#sourceRef = null;
    this.#destinationRef = null;
    this.isSourceValid = false;
    this.isDestinationValid = false;
    this.#bindingTime = 0;
  }

  @carbon.method
  @impl.implemented
  SetOwner(owner)
  {
    this.#owner = owner ?? null;
  }

  @carbon.method
  @impl.implemented
  Update(time)
  {
    this.#currentFrameTime = Number(time);
    if (this.binding && this.#bindingTime <= this.#currentFrameTime)
    {
      return this.binding.CopyValue();
    }
    return false;
  }

  @carbon.method
  @impl.implemented
  OnSimClockRebase(oldTime, newTime)
  {
    const adjustment = Number(newTime) - Number(oldTime);
    this.#bindingTime += adjustment;
    this.#currentFrameTime += adjustment;
  }

  @carbon.method
  @impl.implemented
  IsDestinationValid()
  {
    this.isDestinationValid = !!this.destination;
    return this.isDestinationValid;
  }

  @carbon.method
  @impl.implemented
  IsSourceValid()
  {
    this.isSourceValid = !!this.source;
    return this.isSourceValid;
  }

  @carbon.method
  @impl.adapted
  @impl.reason("Compares only Carbon's five NOTIFY fields because CjsModel's cooperative settle hook does not receive a Be::Var pointer.")
  OnModified(_options = {})
  {
    const signature = this.#GetLinkSignature();
    if (signature !== this.#lastLinkSignature)
    {
      if (this.#owner) this.Link(this.#currentFrameTime);
      else
      {
        this.Unlink();
        this.#lastLinkSignature = signature;
      }
    }
    return true;
  }

  #GetLinkSignature()
  {
    return JSON.stringify([
      this.destinationObjectPath,
      this.destinationObjectAttribute,
      this.sourceObjectPath,
      this.sourceObjectAttribute,
      this.scale
    ]);
  }

  static #GetRoot(roots, name)
  {
    if (roots instanceof Map) return roots.get(name) ?? null;
    return roots && Object.prototype.hasOwnProperty.call(roots, name) ? roots[name] : null;
  }

  static #GetListElement(value, selector)
  {
    const length = Array.isArray(value) ? value.length : Number(value?.GetSize?.());
    if (!Number.isInteger(length) || length < 0) return null;
    const at = index => Array.isArray(value) ? value[index] : value.GetAt?.(index);
    if (typeof selector === "number")
    {
      const index = selector < 0 ? selector + length : selector;
      return index >= 0 && index < length ? at(index) ?? null : null;
    }
    for (let index = 0; index < length; index++)
    {
      const element = at(index);
      if (typeof element?.name === "string" && element.name === selector) return element;
    }
    return null;
  }

  static #ResolveReference(reference, roots)
  {
    const value = String(reference ?? "");
    const rootMatch = /^([A-Za-z_][A-Za-z_0-9]*)/.exec(value);
    if (!rootMatch) return null;
    let object = Tr2DynamicBinding.#GetRoot(roots, rootMatch[1]);
    let offset = rootMatch[1].length;

    while (object && offset < value.length)
    {
      const remainder = value.slice(offset);
      const attribute = /^\.([A-Za-z_][A-Za-z_0-9]*)/.exec(remainder);
      if (attribute)
      {
        object = object && typeof object === "object" ? object[attribute[1]] ?? null : null;
        offset += attribute[0].length;
        continue;
      }

      const index = /^\[(-?[0-9]+)\]/.exec(remainder);
      if (index)
      {
        object = Tr2DynamicBinding.#GetListElement(object, Number(index[1]));
        offset += index[0].length;
        continue;
      }

      const named = /^\["([^"]*)"\]/.exec(remainder);
      if (named)
      {
        object = Tr2DynamicBinding.#GetListElement(object, named[1]);
        offset += named[0].length;
        continue;
      }
      return null;
    }
    return offset === value.length && Tr2DynamicBinding.#IsReference(object) ? object : null;
  }

  static #MakeWeakRef(value)
  {
    if (!value || (typeof value !== "object" && typeof value !== "function")) return null;
    return typeof WeakRef === "function" ? new WeakRef(value) : { deref: () => value };
  }

  static #IsReference(value)
  {
    return value !== null && (typeof value === "object" || typeof value === "function");
  }
}
