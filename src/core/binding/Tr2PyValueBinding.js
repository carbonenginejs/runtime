// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2PyValueBinding.h
// Promoted to hand-maintained source 2026-07-23 (Carbon-verified property shell; schema trinityCore/Tr2PyValueBinding.json.).
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Tr2PyValueBinding (trinityCore) - generated from schema shapeHash 435f9fdc.... */
@type.define({ className: "Tr2PyValueBinding", family: "trinityCore" })
export class Tr2PyValueBinding extends CjsModel
{

  /** m_destinationAttribute (std::string) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.string
  destinationAttribute = "";

  /** m_sourceAttribute (std::string) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.string
  sourceAttribute = "";

  /** m_destinationObject (PyObject*) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.objectRef("PyObject")
  destinationObject = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_sourceObject (PyObject*) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.objectRef("PyObject")
  sourceObject = null;

  /** m_isValid (bool) [READ] */
  @io.read
  @type.boolean
  isValid = false;

  /**
   * Marks the binding valid only when both objects are present and both
   * attribute names are non-empty; no type checking is performed.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.isValid = (
      this.sourceObject !== null &&
      this.destinationObject !== null &&
      this.sourceAttribute.length !== 0 &&
      this.destinationAttribute.length !== 0
    );
  }

  /** Re-validates the binding after any field change. */
  @carbon.method
  @impl.implemented
  OnModified(_value = null)
  {
    this.Initialize();
    return true;
  }

  /**
   * Assigns the source attribute onto the destination attribute; does nothing
   * when the binding is invalid or the source does not carry the attribute.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Copies JavaScript object attributes in place of Carbon's Python C-API get/set calls.")
  CopyValue()
  {
    if (
      this.isValid &&
      (typeof this.sourceObject === "object" || typeof this.sourceObject === "function") &&
      this.sourceAttribute in this.sourceObject
    )
    {
      this.destinationObject[this.destinationAttribute] = this.sourceObject[this.sourceAttribute];
    }
  }

}
