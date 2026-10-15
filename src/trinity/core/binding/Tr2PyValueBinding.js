// Source: trinity/trinity/Tr2PyValueBinding.h
// Source: trinity/trinity/Tr2PyValueBinding.cpp
// Source: trinity/trinity/Tr2PyValueBinding_Blue.cpp
import { meta, type, blue } from "#schema";
import { INotify } from "#blue/INotify";
import { ITr2ValueBinding } from "../../curves/ITr2ValueBinding.js";

/** Copies named JavaScript attributes through the portable Python-value adapter. */
@blue.define("Tr2PyValueBinding")
@blue.inherit(ITr2ValueBinding)
@blue.interface(ITr2ValueBinding, INotify)
export class Tr2PyValueBinding extends INotify
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_isValid (bool) [READ] */
  @blue.read
  @type.boolean
  isValid = false;

  /** m_sourceObject (PyObject*) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.rootRef("PyObject")
  sourceObject = null;

  /** m_sourceAttribute (std::string) [READWRITE, NOTIFY, PERSIST] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.string
  sourceAttribute = "";

  /** m_destinationObject (PyObject*) [READWRITE, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @type.rootRef("PyObject")
  destinationObject = null;

  /** m_destinationAttribute (std::string) [READWRITE, NOTIFY, PERSIST] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.string
  destinationAttribute = "";

  /**
   * Marks the binding valid only when both objects are present and both
   * attribute names are non-empty; no type checking is performed.
   * Native private helper; deliberately does not expose IInitialize.
   * @returns {void}
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this.isValid = (
      this.sourceObject !== null &&
      this.destinationObject !== null &&
      this.sourceAttribute.length !== 0 &&
      this.destinationAttribute.length !== 0
    );
  }

  /**
   * Re-validates the binding after any field change.
   * @param {string|null} [_value=null] Changed member name.
   * @returns {boolean} True after revalidation.
   */
  @blue.method
  @meta.implemented
  OnModified(_value = null)
  {
    this.Initialize();
    return true;
  }

  /**
   * Assigns the source attribute onto the destination attribute; does nothing
   * when the binding is invalid or the source does not carry the attribute.
   * Adapted: Copies JavaScript object attributes in place of Carbon's Python C-API get/set calls.
   * @returns {void}
   */
  @blue.method
  @meta.adapted
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

// Carbon's own query table has no exposure chain.
