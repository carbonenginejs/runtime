// Source: trinity/trinityal/stub/Tr2PipelineStatsQueryALStub.cpp
import { CjsSchema, meta } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../../ALResult.js";


/**
 * Collects pipeline statistics over a bracketed span.
 *
 * Carbon's stub is the most permissive of the three: it is always valid and
 * every call succeeds, because there is nothing to allocate and no state worth
 * mispairing.
 *
 * Carbon: Tr2PipelineStatsQueryAL (trinity/trinityal/stub/Tr2PipelineStatsQueryALStub.h:16)
 */
export class Tr2PipelineStatsQueryALStub extends Tr2DeviceResourceAL
{
  /**
   * Creates the query.
   *
   * @implemented
   * @returns {number} An `ALResult`.
   */
  Create()
  {
    return ALResult.S_OK;
  }

  /**
   * @implemented
   * @returns {boolean} True, as Carbon's stub is always valid.
   */
  IsValid()
  {
    return true;
  }

  /**
   * Releases the query.
   *
   * @implemented
   */
  Destroy()
  {
    super.Destroy();
  }

  /**
   * @implemented
   * @returns {number} An `ALResult`.
   */
  Begin()
  {
    return ALResult.S_OK;
  }

  /**
   * @implemented
   * @returns {number} An `ALResult`.
   */
  End()
  {
    return ALResult.S_OK;
  }

  /**
   * The collected statistics.
   *
   * @adapted
   * @returns {object} `{ result, data }` with an empty data set.
   */
  GetStats()
  {
    return { result: ALResult.S_OK, data: [] };
  }

  /**
   * How many values a statistics set holds.
   *
   * @adapted
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
   * @adapted
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
   * @adapted
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
   * @adapted
   * @param {Array} data A statistics set.
   * @param {number} index Which value.
   * @returns {number} The value, zero when absent.
   */
  static GetValue(data, index)
  {
    return data?.[index]?.value ?? 0;
  }

  /**
   * @implemented
   * @returns {number} A `Tr2ALMemoryType`; MANAGED, not VIDEO, as Carbon has it.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }


  /**
   * Names the query for a debugger.
   *
   * @implemented
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
   * @implemented
   * @param {object} description Accumulator, keyed by name.
   */
  Describe(description)
  {
    description.type = "Tr2PipelineStatsQueryAL";
  }
}

// DECLARED AS A CALL, NOT A DECORATOR, for the reason recorded in
// Tr2BitmapDimensions.js: the layer is imported straight from source by its
// tests and raw Node cannot parse decorator syntax.
//
// The donor is NAMED rather than left to be derived from this class's name.
// Carbon calls every backend's class the same thing and carries the backend in
// the FILE name, because only one backend compiles at a time; we ship them
// together, so the backend moves onto the class name. That divergence is the
// author's to declare, never a checker's to guess.
// States against stub/Tr2PipelineStatsQueryALStub.cpp:9-70 and .h:35-38. GetStats is adapted: the Tr2PipelineStatsDataAL& comes back with the result as { result, data }. GetValueCount, GetLabel, GetDescription and GetValue are adapted: they read the data array (empty from the stub), where Carbon's stub returns 0 and empty strings without looking.
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "Create", meta.implemented);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "IsValid", meta.implemented);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "Destroy", meta.implemented);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "Begin", meta.implemented);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "End", meta.implemented);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "GetStats", meta.adapted);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "GetValueCount", meta.adapted);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "GetLabel", meta.adapted);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "GetDescription", meta.adapted);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "GetValue", meta.adapted);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "GetMemoryClass", meta.implemented);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "SetName", meta.implemented);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALStub, "Describe", meta.implemented);
CjsSchema.meta.define("Tr2PipelineStatsQueryALStub")(Tr2PipelineStatsQueryALStub);
