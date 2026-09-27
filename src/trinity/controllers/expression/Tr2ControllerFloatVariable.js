// Source: trinity/trinity/Controllers/Tr2ControllerFloatVariable.h
// Source: trinity/trinity/Controllers/Tr2ControllerFloatVariable.cpp
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { Type } from "../enums.js";


/**
 * One named float slot of a controller's variable set, mirroring its value into
 * the controller's packed expression buffer and raising its dirty bit whenever
 * it changes.
 *
 * Tr2Controller owns these slots in variables. During Link it assigns each slot
 * an index in its Float32Array expression buffer and assigns dirty bits to the
 * first 64 variables. Expressions consume that shared buffer rather than reading
 * the model fields individually. The controller clears both bindings on Unlink.
 *
 * CjsModel supplies schema-based value updates and modification notifications.
 * The authored name, defaultValue, variableType and enumValues persist; value is
 * runtime state initialized from defaultValue. This class mirrors values and
 * marks changes; it does not evaluate expressions or clear consumed dirty bits.
 * The destination storage remains caller-owned.
 */
@type.define({
  className: "Tr2ControllerFloatVariable",
  family: "controllers"
})
export class Tr2ControllerFloatVariable extends CjsModel
{
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.Tr2ControllerFloatVariable.Type")
  variableType = Type.FLOAT;

  @edit.readwrite
  @edit.persist
  @type.string
  enumValues = "";

  @edit.notify
  @edit.readwrite
  @type.float32
  value = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  defaultValue = 0;

  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  #destination = null;

  #destinationIndex = 0;

  #dirtyMaskDestination = null;

  #dirtyMask = 0n;

  /**
   * Initializes the runtime value from the authored default.
   *
   * Uses the model update path with events suppressed. Controller linking later
   * publishes the current value through SetDestinationBuffer.
   *
   * @returns {boolean} Always true after the model update succeeds.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.SetValues({ value: this.defaultValue }, { source: this, skipEvents: true });
    return true;
  }

  /**
   * Mirrors notified value changes to the bound destination and dirty mask.
   *
   * Writes the value before marking the dirty bit. Missing destinations are
   * ignored; errors from an installed destination callback propagate.
   *
   * @param {object} [_options={}] Unused model modification options.
   * @returns {boolean} Always true after both operations succeed.
   */
  @carbon.method
  @impl.implemented
  OnModified(_options = {})
  {
    this.#writeDestination();
    this.#markDirty();
    return true;
  }

  /**
   * Gets the authored variable name.
   *
   * @returns {string} Name used by the controller to expose this expression slot.
   */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Gets the current variable value.
   *
   * @returns {number} Current model value, without reading the destination back.
   */
  @carbon.method
  @impl.implemented
  GetValue()
  {
    return this.value;
  }

  /**
   * Sets the current value through the model modification path.
   *
   * The notify-enabled field invokes OnModified to publish the value and mark
   * its bit, including assignments of the same value. The returned change flag
   * reports field equality, not whether notification side effects occurred.
   *
   * @param {number} value New value for the float32 schema field.
   * @returns {boolean} Whether the model reports a changed field.
   */
  @carbon.method
  @impl.implemented
  SetValue(value)
  {
    return this.SetValues({ value }, { source: this, returnBoolean: true });
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
  @carbon.method
  @impl.adapted
  SetDestinationBuffer(buffer, index = 0)
  {
    this.#destination = buffer;
    this.#destinationIndex = index;
    this.#writeDestination();
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
  @carbon.method
  @impl.adapted
  SetDirtyMask(maskDestination, mask)
  {
    this.#dirtyMaskDestination = maskDestination;
    this.#dirtyMask = BigInt(mask);
  }

  /**
   * Writes the current value to the bound destination buffer.
   *
   * Calls a function destination, assigns a holder's value, or writes the selected
   * array slot. Does nothing when detached; destination failures propagate.
   *
   * @returns {void}
   */
  #writeDestination()
  {
    if (this.#destination)
    {
      if (typeof this.#destination === "function")
      {
        this.#destination(this.value);
      }
      else if ("value" in this.#destination)
      {
        this.#destination.value = this.value;
      }
      else
      {
        this.#destination[this.#destinationIndex] = this.value;
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
  #markDirty()
  {
    const destination = this.#dirtyMaskDestination;
    if (!destination)
    {
      return;
    }
    if (typeof destination.value === "bigint")
    {
      destination.value |= this.#dirtyMask;
      return;
    }
    destination.value = Number(BigInt(destination.value) | this.#dirtyMask);
  }

  static Type = Type;

}
