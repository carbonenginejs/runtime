// Source: trinity/trinityal/stub/Tr2PipelineStatsQueryALStub.cpp
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../../ALResult.js";


/**
 * Collects pipeline statistics over a bracketed span.
 *
 * Carbon's stub is the most permissive of the three: it is always valid and
 * every call succeeds, because there is nothing to allocate and no state worth
 * mispairing.
 */
export class Tr2PipelineStatsQueryALStub extends Tr2DeviceResourceAL
{
  /**
   * Creates the query.
   *
   * @returns {number} An `ALResult`.
   */
  Create()
  {
    return ALResult.S_OK;
  }

  /** @returns {boolean} True, as Carbon's stub is always valid. */
  IsValid()
  {
    return true;
  }

  /** Releases the query. */
  Destroy()
  {
    super.Destroy();
  }

  /** @returns {number} An `ALResult`. */
  Begin()
  {
    return ALResult.S_OK;
  }

  /** @returns {number} An `ALResult`. */
  End()
  {
    return ALResult.S_OK;
  }

  /**
   * The collected statistics.
   *
   * @returns {object} `{ result, data }` with an empty data set.
   */
  GetStats()
  {
    return { result: ALResult.S_OK, data: [] };
  }

  /**
   * How many values a statistics set holds.
   *
   * @param {Array} data A statistics set.
   * @returns {number} The count.
   */
  static GetValueCount(data)
  {
    return data?.length ?? 0;
  }

  /**
   * One value's label.
   *
   * @param {Array} data A statistics set.
   * @param {number} index Which value.
   * @returns {string} The label, empty when absent.
   */
  static GetLabel(data, index)
  {
    return data?.[index]?.label ?? "";
  }

  /**
   * One value's description.
   *
   * @param {Array} data A statistics set.
   * @param {number} index Which value.
   * @returns {string} The description, empty when absent.
   */
  static GetDescription(data, index)
  {
    return data?.[index]?.description ?? "";
  }

  /**
   * One value.
   *
   * @param {Array} data A statistics set.
   * @param {number} index Which value.
   * @returns {number} The value, zero when absent.
   */
  static GetValue(data, index)
  {
    return data?.[index]?.value ?? 0;
  }

  /** @returns {number} A `Tr2ALMemoryType`; MANAGED, not VIDEO, as Carbon has it. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }


  /**
   * Names the query for a debugger.
   *
   * @param {string} _name The name Carbon would attach; the stub discards it.
   * @returns {number} An `ALResult` value; the stub keeps no name
   *   (`Tr2PipelineStatsQueryALStub.cpp:70-73`).
   */
  SetName(_name)
  {
    return ALResult.S_OK;
  }


  /**
   * Describes this query for a device inventory.
   *
   * THE ONE NON-EMPTY `Describe` IN CARBON'S STUB TREE. Every other stub
   * resource leaves the map untouched; this one writes its own type name
   * (`Tr2PipelineStatsQueryALStub.cpp:65-68`). Overridden here for that reason
   * alone - the base class no-op would otherwise be silently wrong.
   *
   * @param {object} description Accumulator, keyed by name.
   */
  Describe(description)
  {
    description.type = "Tr2PipelineStatsQueryAL";
  }
}
