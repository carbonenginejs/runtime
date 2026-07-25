import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_destinationAttribute, _init_extra_destinationAttribute, _init_sourceAttribute, _init_extra_sourceAttribute, _init_destinationObject, _init_extra_destinationObject, _init_name, _init_extra_name, _init_sourceObject, _init_extra_sourceObject, _init_isValid, _init_extra_isValid;

/** Tr2PyValueBinding (trinityCore) - generated from schema shapeHash 435f9fdc.... */
let _Tr2PyValueBinding;
class Tr2PyValueBinding extends CjsModel {
  static {
    ({
      e: [_init_destinationAttribute, _init_extra_destinationAttribute, _init_sourceAttribute, _init_extra_sourceAttribute, _init_destinationObject, _init_extra_destinationObject, _init_name, _init_extra_name, _init_sourceObject, _init_extra_sourceObject, _init_isValid, _init_extra_isValid, _initProto],
      c: [_Tr2PyValueBinding, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2PyValueBinding",
      family: "trinityCore"
    })], [[[io, io.notify, io, io.persist, type, type.string], 16, "destinationAttribute"], [[io, io.notify, io, io.persist, type, type.string], 16, "sourceAttribute"], [[io, io.notify, io, io.readwrite, void 0, type.objectRef("PyObject")], 16, "destinationObject"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.notify, io, io.readwrite, void 0, type.objectRef("PyObject")], 16, "sourceObject"], [[io, io.read, type, type.boolean], 16, "isValid"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.implemented], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Copies JavaScript object attributes in place of Carbon's Python C-API get/set calls.")], 18, "CopyValue"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_isValid(this);
  }
  /** m_destinationAttribute (std::string) [READWRITE, NOTIFY, PERSIST] */
  destinationAttribute = (_initProto(this), _init_destinationAttribute(this, ""));

  /** m_sourceAttribute (std::string) [READWRITE, NOTIFY, PERSIST] */
  sourceAttribute = (_init_extra_destinationAttribute(this), _init_sourceAttribute(this, ""));

  /** m_destinationObject (PyObject*) [READWRITE, NOTIFY] */
  destinationObject = (_init_extra_sourceAttribute(this), _init_destinationObject(this, null));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_destinationObject(this), _init_name(this, ""));

  /** m_sourceObject (PyObject*) [READWRITE, NOTIFY] */
  sourceObject = (_init_extra_name(this), _init_sourceObject(this, null));

  /** m_isValid (bool) [READ] */
  isValid = (_init_extra_sourceObject(this), _init_isValid(this, false));
  Initialize() {
    this.isValid = this.sourceObject !== null && this.destinationObject !== null && this.sourceAttribute.length !== 0 && this.destinationAttribute.length !== 0;
  }
  OnModified(_value = null) {
    this.Initialize();
    return true;
  }
  CopyValue() {
    if (this.isValid && (typeof this.sourceObject === "object" || typeof this.sourceObject === "function") && this.sourceAttribute in this.sourceObject) {
      this.destinationObject[this.destinationAttribute] = this.sourceObject[this.sourceAttribute];
    }
  }
  static {
    _initClass();
  }
}

export { _Tr2PyValueBinding as Tr2PyValueBinding };
//# sourceMappingURL=Tr2PyValueBinding.js.map
