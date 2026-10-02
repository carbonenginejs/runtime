// Source: trinity/trinity/Controllers/Tr2ControllerFloatVariable.h
// Source: trinity/trinity/Controllers/Tr2ControllerFloatVariable.cpp
// Source: trinity/trinity/Controllers/Tr2ControllerFloatVariable_Blue.cpp
import { meta } from "#schema";
import { IInitialize } from "#blue/IInitialize";
import { INotify } from "#blue/INotify";
import { Type } from "../enums.js";


/**
 * One named float slot of a controller's variable set, mirroring its value into
 * the controller's packed expression buffer and raising its dirty bit whenever
 * it changes.
 *
 * Tr2Controller owns these slots in variables. During Link it assigns each slot
 * an index in its Float32Array expression buffer and assigns dirty bits to the
 * first 64 variables. Expressions consume that shared buffer rather than reading
 * the authored fields individually. The controller clears both bindings on Unlink.
 *
 * The authored name, defaultValue, variableType and enumValues persist; value is
 * runtime state initialized from defaultValue. This class mirrors values and
 * marks changes; it does not evaluate expressions or clear consumed dirty bits.
 * The destination storage remains caller-owned.
 */
@meta.define({
  className: "Tr2ControllerFloatVariable",
  family: "controllers"
})
@meta.blue.inherit(INotify)
export class Tr2ControllerFloatVariable extends IInitialize
{
  /** Authored variable name. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Editor presentation type; runtime storage remains float32. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.Tr2ControllerFloatVariable.Type")
  variableType = Type.FLOAT;

  /** Current runtime value; changes notify but do not persist. */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.type.float32
  value = 0;

  /** Authored value assigned by Initialize without publishing. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  defaultValue = 0;

  /** Comma-separated editor value/name choices. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  enumValues = "";

  /** Caller-owned storage or callback for the live float. */
  _destination = null;

  /** Indexed destination slot used by the JavaScript pointer adapter. */
  _destinationIndex = 0;

  /** Caller-owned holder for the controller dirty mask. */
  _dirtyMaskDestination = null;

  /** Bits published by native value notifications and SetValue. */
  _dirtyMask = 0n;

  /**
   * Initializes the runtime value from the authored default.
   *
   * Carbon assigns only m_value (Tr2ControllerFloatVariable.cpp:17-20).
   * Controller linking later publishes it through SetDestinationBuffer.
   *
   * @returns {boolean} Always true.
   */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    this.value = this.defaultValue;
    return true;
  }

  /**
   * Mirrors notified value changes to the bound destination and dirty mask.
   *
   * Writes the value before marking the dirty bit. Missing destinations are
   * ignored; errors from an installed destination callback propagate.
   *
   * @param {string|null} _propertyName Unused modified member name.
   * @returns {boolean} Always true after both operations succeed.
   */
  @meta.blue.method
  @meta.implemented
  OnModified(_propertyName)
  {
    this._writeDestination();
    this._markDirty();
    return true;
  }

  /**
   * Gets the authored variable name.
   *
   * @returns {string} Name used by the controller to expose this expression slot.
   */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Gets the current variable value.
   *
   * @returns {number} Current value, without reading the destination back.
   */
  @meta.blue.method
  @meta.implemented
  GetValue()
  {
    return this.value;
  }

  /**
   * Sets the value, writes the bound destination, and marks its dirty bit.
   *
   * Carbon performs all three operations even for an equal value
   * (Tr2ControllerFloatVariable.cpp:46-56).
   *
   * @param {number} value New value for the float32 schema field.
   * @returns {void}
   */
  @meta.blue.method
  @meta.implemented
  SetValue(value)
  {
    this.value = value;
    this._writeDestination();
    this._markDirty();
  }

  /**
   * Binds a destination buffer slot and immediately writes the current value.
   *
   * Adapted: JavaScript has no float pointer, so the destination is an indexed
   * array, a writable value holder, or a callback receiving the current value.
   * A holder takes precedence over indexed access. Null detaches the destination.
   * This operation does not mark the dirty bit or take ownership of storage.
   *
   * @param {Array<number>|Float32Array|{value: number}|function(number): void|null} buffer Destination.
   * @param {number} [index=0] Slot used only for an indexed destination.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetDestinationBuffer(buffer, index = 0)
  {
    this._destination = buffer;
    this._destinationIndex = index;
    this._writeDestination();
  }

  /**
   * Binds a dirty-mask holder used when the variable changes.
   *
   * Adapted: a writable value holder replaces Carbon's uint64 pointer. BigInt
   * preserves all 64 controller bits; a number holder can lose integer precision
   * when the combined mask exceeds the safe integer range. Binding does not set
   * any bits. Null detaches the holder; mask is still converted to BigInt.
   *
   * @param {{value: bigint|number}|null} maskDestination Caller-owned mask holder.
   * @param {bigint|number} mask Bits to OR into the holder on modification.
   * @returns {void}
   * @throws {RangeError|TypeError} If mask cannot be converted to BigInt.
   */
  @meta.blue.method
  @meta.adapted
  SetDirtyMask(maskDestination, mask)
  {
    this._dirtyMaskDestination = maskDestination;
    this._dirtyMask = BigInt(mask);
  }

  /**
   * Writes the current value to the bound destination buffer.
   *
   * Calls a function destination, assigns a holder's value, or writes the selected
   * array slot. Does nothing when detached; destination failures propagate.
   *
   * @returns {void}
   */
  @meta.ours
  _writeDestination()
  {
    if (this._destination)
    {
      if (typeof this._destination === "function")
      {
        this._destination(this.value);
      }
      else if ("value" in this._destination)
      {
        this._destination.value = this.value;
      }
      else
      {
        this._destination[this._destinationIndex] = this.value;
      }
    }
  }

  /**
   * ORs the configured dirty bit into the bound dirty-mask holder.
   *
   * Preserves a bigint holder's type; converts the result back to number for a
   * number holder. Does nothing when detached and never clears existing bits.
   *
   * @returns {void}
   * @throws {RangeError|TypeError} If the holder value cannot convert to BigInt.
   */
  @meta.ours
  _markDirty()
  {
    const destination = this._dirtyMaskDestination;
    if (!destination)
    {
      return;
    }
    if (typeof destination.value === "bigint")
    {
      destination.value |= this._dirtyMask;
      return;
    }
    destination.value = Number(BigInt(destination.value) | this._dirtyMask);
  }

  /** Native presentation enum exposed for JavaScript callers. */
  static Type = Type;

}

// Native exposure ends at this concrete table (Tr2ControllerFloatVariable_Blue.cpp).
meta.blue.interfaceTable({
  interfaces: [Tr2ControllerFloatVariable, IInitialize, INotify],
  chainTo: null
})(Tr2ControllerFloatVariable);
