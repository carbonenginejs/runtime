import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { TriValueBinding as _TriValueBinding } from './TriValueBinding.js';

let _initProto, _initClass, _init_bindingDelay, _init_extra_bindingDelay, _init_destination, _init_extra_destination, _init_isDestinationValid, _init_extra_isDestinationValid, _init_name, _init_extra_name, _init_destinationObjectAttribute, _init_extra_destinationObjectAttribute, _init_destinationObjectPath, _init_extra_destinationObjectPath, _init_sourceObjectAttribute, _init_extra_sourceObjectAttribute, _init_sourceObjectPath, _init_extra_sourceObjectPath, _init_scale, _init_extra_scale, _init_source, _init_extra_source, _init_isSourceValid, _init_extra_isSourceValid, _init_binding, _init_extra_binding;
let _Tr2DynamicBinding;
new class extends _identity {
  static [class Tr2DynamicBinding extends CjsModel {
    static {
      ({
        e: [_init_bindingDelay, _init_extra_bindingDelay, _init_destination, _init_extra_destination, _init_isDestinationValid, _init_extra_isDestinationValid, _init_name, _init_extra_name, _init_destinationObjectAttribute, _init_extra_destinationObjectAttribute, _init_destinationObjectPath, _init_extra_destinationObjectPath, _init_sourceObjectAttribute, _init_extra_sourceObjectAttribute, _init_sourceObjectPath, _init_extra_sourceObjectPath, _init_scale, _init_extra_scale, _init_source, _init_extra_source, _init_isSourceValid, _init_extra_isSourceValid, _init_binding, _init_extra_binding, _initProto],
        c: [_Tr2DynamicBinding, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2DynamicBinding",
        family: "trinityCore"
      })], [[[io, io.persist, type, type.int32], 16, "bindingDelay"], [[io, io.read, void 0, type.objectRef("IRoot")], 16, "destination"], [[io, io.read, type, type.boolean], 16, "isDestinationValid"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.persist, type, type.string], 16, "destinationObjectAttribute"], [[io, io.notify, io, io.persist, type, type.string], 16, "destinationObjectPath"], [[io, io.notify, io, io.persist, type, type.string], 16, "sourceObjectAttribute"], [[io, io.notify, io, io.persist, type, type.string], 16, "sourceObjectPath"], [[io, io.notify, io, io.persist, type, type.float32], 16, "scale"], [[io, io.read, void 0, type.objectRef("IRoot")], 16, "source"], [[io, io.read, type, type.boolean], 16, "isSourceValid"], [[io, io.read, void 0, type.objectRef("TriValueBinding")], 16, "binding"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Resolves Carbon Blue paths through the portable JavaScript graph and accepts current frame time explicitly instead of reading BeOS.")], 18, "Link"], [[carbon, carbon.method, impl, impl.implemented], 18, "Unlink"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetOwner"], [[carbon, carbon.method, impl, impl.implemented], 18, "Update"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnSimClockRebase"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsDestinationValid"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsSourceValid"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Compares only Carbon's five NOTIFY fields because CjsModel's cooperative settle hook does not receive a Be::Var pointer.")], 18, "OnModified"]], 0, void 0, CjsModel));
    }
    #bindingTime = (_initProto(this), 0);
    #currentFrameTime = 0;
    #destinationRef = null;
    #lastLinkSignature = "";
    #owner = null;
    #sourceRef = null;
    bindingDelay = _init_bindingDelay(this, 0);
    destination = (_init_extra_bindingDelay(this), _init_destination(this, null));
    isDestinationValid = (_init_extra_destination(this), _init_isDestinationValid(this, false));
    name = (_init_extra_isDestinationValid(this), _init_name(this, ""));
    destinationObjectAttribute = (_init_extra_name(this), _init_destinationObjectAttribute(this, ""));
    destinationObjectPath = (_init_extra_destinationObjectAttribute(this), _init_destinationObjectPath(this, ""));
    sourceObjectAttribute = (_init_extra_destinationObjectPath(this), _init_sourceObjectAttribute(this, ""));
    sourceObjectPath = (_init_extra_sourceObjectAttribute(this), _init_sourceObjectPath(this, ""));
    scale = (_init_extra_sourceObjectPath(this), _init_scale(this, 1));
    source = (_init_extra_scale(this), _init_source(this, null));
    isSourceValid = (_init_extra_source(this), _init_isSourceValid(this, false));
    binding = (_init_extra_isSourceValid(this), _init_binding(this, null));
    constructor() {
      super(), _init_extra_binding(this);
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
    Link(currentFrameTime = undefined) {
      this.Unlink();
      if (currentFrameTime !== undefined) {
        this.#currentFrameTime = Number(currentFrameTime);
      }
      this.#lastLinkSignature = this.#GetLinkSignature();
      if (!this.#owner) {
        return false;
      }
      const roots = this.#owner.GetParameterMap?.() ?? {};
      const destination = _Tr2DynamicBinding.#ResolveReference(this.destinationObjectPath, roots);
      const source = _Tr2DynamicBinding.#ResolveReference(this.sourceObjectPath, roots);
      this.#destinationRef = _Tr2DynamicBinding.#MakeWeakRef(destination);
      this.#sourceRef = _Tr2DynamicBinding.#MakeWeakRef(source);
      this.isDestinationValid = !!destination;
      this.isSourceValid = !!source;
      if (source && destination) {
        this.binding = new _TriValueBinding();
        this.binding.CreateWeakBinding(source, this.sourceObjectAttribute, destination, this.destinationObjectAttribute, this.scale);
        this.#bindingTime = this.#currentFrameTime + this.bindingDelay / 1000;
        return true;
      }
      return false;
    }
    Unlink() {
      this.binding?.SetDestinationObject?.(null);
      this.binding = null;
      this.#sourceRef = null;
      this.#destinationRef = null;
      this.isSourceValid = false;
      this.isDestinationValid = false;
      this.#bindingTime = 0;
    }
    SetOwner(owner) {
      this.#owner = owner ?? null;
    }
    Update(time) {
      this.#currentFrameTime = Number(time);
      if (this.binding && this.#bindingTime <= this.#currentFrameTime) {
        return this.binding.CopyValue();
      }
      return false;
    }
    OnSimClockRebase(oldTime, newTime) {
      const adjustment = Number(newTime) - Number(oldTime);
      this.#bindingTime += adjustment;
      this.#currentFrameTime += adjustment;
    }
    IsDestinationValid() {
      this.isDestinationValid = !!this.destination;
      return this.isDestinationValid;
    }
    IsSourceValid() {
      this.isSourceValid = !!this.source;
      return this.isSourceValid;
    }
    OnModified(_options = {}) {
      const signature = this.#GetLinkSignature();
      if (signature !== this.#lastLinkSignature) {
        if (this.#owner) this.Link(this.#currentFrameTime);else {
          this.Unlink();
          this.#lastLinkSignature = signature;
        }
      }
      return true;
    }
    #GetLinkSignature() {
      return JSON.stringify([this.destinationObjectPath, this.destinationObjectAttribute, this.sourceObjectPath, this.sourceObjectAttribute, this.scale]);
    }
  }];
  #GetRoot(roots, name) {
    if (roots instanceof Map) return roots.get(name) ?? null;
    return roots && Object.prototype.hasOwnProperty.call(roots, name) ? roots[name] : null;
  }
  #GetListElement(value, selector) {
    const length = Array.isArray(value) ? value.length : Number(value?.GetSize?.());
    if (!Number.isInteger(length) || length < 0) return null;
    const at = index => Array.isArray(value) ? value[index] : value.GetAt?.(index);
    if (typeof selector === "number") {
      const index = selector < 0 ? selector + length : selector;
      return index >= 0 && index < length ? at(index) ?? null : null;
    }
    for (let index = 0; index < length; index++) {
      const element = at(index);
      if (typeof element?.name === "string" && element.name === selector) return element;
    }
    return null;
  }
  #ResolveReference(reference, roots) {
    const value = String(reference ?? "");
    const rootMatch = /^([A-Za-z_][A-Za-z_0-9]*)/.exec(value);
    if (!rootMatch) return null;
    let object = _Tr2DynamicBinding.#GetRoot(roots, rootMatch[1]);
    let offset = rootMatch[1].length;
    while (object && offset < value.length) {
      const remainder = value.slice(offset);
      const attribute = /^\.([A-Za-z_][A-Za-z_0-9]*)/.exec(remainder);
      if (attribute) {
        object = object && typeof object === "object" ? object[attribute[1]] ?? null : null;
        offset += attribute[0].length;
        continue;
      }
      const index = /^\[(-?[0-9]+)\]/.exec(remainder);
      if (index) {
        object = _Tr2DynamicBinding.#GetListElement(object, Number(index[1]));
        offset += index[0].length;
        continue;
      }
      const named = /^\["([^"]*)"\]/.exec(remainder);
      if (named) {
        object = _Tr2DynamicBinding.#GetListElement(object, named[1]);
        offset += named[0].length;
        continue;
      }
      return null;
    }
    return offset === value.length && _Tr2DynamicBinding.#IsReference(object) ? object : null;
  }
  #MakeWeakRef(value) {
    if (!value || typeof value !== "object" && typeof value !== "function") return null;
    return typeof WeakRef === "function" ? new WeakRef(value) : {
      deref: () => value
    };
  }
  #IsReference(value) {
    return value !== null && (typeof value === "object" || typeof value === "function");
  }
  constructor() {
    super(_Tr2DynamicBinding), _initClass();
  }
}();

export { _Tr2DynamicBinding as Tr2DynamicBinding };
//# sourceMappingURL=Tr2DynamicBinding.js.map
