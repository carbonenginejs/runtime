// Source: E:\carbonengine\trinity\trinity\Controllers\Tr2ControllerFloatVariable.h
// Source: E:\carbonengine\trinity\trinity\Controllers\Tr2ControllerFloatVariable.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { Type } from "../enums.js";


/**
 * One named float slot of a controller's variable set, mirroring its value into
 * the controller's packed expression buffer and raising its dirty bit whenever
 * it changes.
 */
@type.define({
  className: "Tr2ControllerFloatVariable",
  family: "controllers"
})
export class Tr2ControllerFloatVariable extends CjsModel
{
  @io.persist
  @type.int32
  @schema.enum("Type")
  variableType = Type.FLOAT;

  @io.persist
  @type.string
  enumValues = "";

  @io.notify
  @io.always
  @io.readwrite
  @type.float32
  value = 0;

  @io.persist
  @type.float32
  defaultValue = 0;

  @io.persist
  @type.string
  name = "";

  #destination = null;

  #destinationIndex = 0;

  #dirtyMaskDestination = null;

  #dirtyMask = 0n;

  /**
   * Initializes the runtime value from the authored default.
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
   */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /**
   * Gets the current variable value.
   */
  @carbon.method
  @impl.implemented
  GetValue()
  {
    return this.value;
  }

  /**
   * Sets the current value and mirrors it to any bound destination.
   */
  @carbon.method
  @impl.implemented
  SetValue(value)
  {
    return this.SetValues({ value }, { source: this, returnBoolean: true });
  }

  /**
   * Binds a destination buffer slot and immediately writes the current value.
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
