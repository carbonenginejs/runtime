// Source: trinity/trinityal/dx11/Tr2PipelineStatsQueryALDx11.h
// Source: trinity/trinityal/dx11/Tr2PipelineStatsQueryALDx11.cpp
// Source: trinity/trinityal/include/Tr2PipelineStatsQueryAL.h
//
// The WebGL2 pipeline statistics query, which WebGL2 does not have: there is no
// counterpart to `D3D11_QUERY_PIPELINE_STATISTICS` in the API or in any
// extension. `Create` fails as dx11's does when the device refuses the query,
// every other call answers as dx11 does for a query that was never created,
// and a statistics record has no fields.

import { CjsSchema, meta, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { Tr2PipelineStatsDataALWebgl2 } from "./Tr2PipelineStatsDataALWebgl2.js";


/**
 * A pipeline statistics query on a WebGL2 device, which cannot be created.
 *
 * Carbon: Tr2PipelineStatsQueryAL (trinity/trinityal/dx11/Tr2PipelineStatsQueryALDx11.h:18)
 */
export class Tr2PipelineStatsQueryALWebgl2 extends Tr2DeviceResourceAL
{
  /** m_name */
  _name = "";

  /**
   * Refuses to create the query (`Tr2PipelineStatsQueryALDx11.cpp:21-33`):
   * `E_FAIL` either way: dx11 answers it for an invalid context and for a device
   * that refuses the query, and every WebGL2 device refuses this one.
   *
   * @adapted
   * @param {object} renderContext The primary context.
   * @returns {number} An `ALResult` value.
   */
  @meta.adapted
  Create(renderContext)
  {
    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_FAIL;

    return ALResult.E_FAIL;
  }

  /**
   * Whether the query was created: never.
   *
   * @notSupported
   * @returns {boolean} False.
   */
  IsValid()
  {
    return false;
  }

  /**
   * dx11's answer for a query never created (`:40-51`).
   *
   * @notSupported
   * @returns {number} `E_INVALIDARG`.
   */
  Begin(_renderContext)
  {
    return ALResult.E_INVALIDARG;
  }

  /**
   * dx11's answer for a query never created (`:53-64`).
   *
   * @notSupported
   * @returns {number} `E_INVALIDARG`.
   */
  End(_renderContext)
  {
    return ALResult.E_INVALIDARG;
  }

  /**
   * dx11's answer for a query never created (`:66-77`).
   *
   * @adapted
   * @returns {{result: number, data: Tr2PipelineStatsDataALWebgl2}} dx11's out argument comes back here.
   */
  @meta.adapted
  GetStats(_renderContext)
  {
    return { result: ALResult.E_INVALIDARG, data: new Tr2PipelineStatsDataALWebgl2() };
  }

  /**
   * How many values a statistics record holds: none on WebGL2 (dx11 answers
   * its fixed field table's size, `:79-82`).
   *
   * @adapted
   * @param {Array} _data A statistics record.
   * @returns {number} Zero.
   */
  @meta.adapted
  static GetValueCount(_data)
  {
    return 0;
  }

  /**
   * A value's label (`:84-87`); there are no values.
   *
   * @adapted
   * @param {Array} _data A statistics record.
   * @param {number} _index The value index.
   * @returns {string} The empty string.
   */
  @meta.adapted
  static GetLabel(_data, _index)
  {
    return "";
  }

  /**
   * A value's description (`:89-92`); there are no values.
   *
   * @adapted
   * @param {Array} _data A statistics record.
   * @param {number} _index The value index.
   * @returns {string} The empty string.
   */
  @meta.adapted
  static GetDescription(_data, _index)
  {
    return "";
  }

  /**
   * A value (`:94-97`); there are no values.
   *
   * @adapted
   * @param {Array} _data A statistics record.
   * @param {number} _index The value index.
   * @returns {number} Zero.
   */
  @meta.adapted
  static GetValue(_data, _index)
  {
    return 0;
  }

  /**
   * Which memory class this query occupies.
   *
   * @implemented
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Describes the query for the device-resource registry, with dx11's keys.
   *
   * @implemented
   * @param {object} description The record to fill.
   */
  Describe(description)
  {
    description.type = "Tr2PipelineStatsQueryAL";
    description.name = this._name;
  }

  /**
   * Names the query, kept for `Describe`.
   *
   * @adapted
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    this._name = name;
    return ALResult.S_OK;
  }
}

CjsSchema.decorateField(Tr2PipelineStatsQueryALWebgl2, "_name", type.string);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "Create");
// States against dx11/Tr2PipelineStatsQueryALDx11.cpp. WebGL2 has no pipeline-statistics query, so IsValid is always false and Begin/End return E_INVALIDARG, which is dx11's answer for a query that was never created (cpp Begin/End). GetMemoryClass and Describe are dx11's; SetName stores the name without a native label.
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "IsValid", meta.notSupported);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "Begin", meta.notSupported);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "End", meta.notSupported);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "GetStats");
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "GetValueCount");
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "GetLabel");
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "GetDescription");
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "GetValue");
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "GetMemoryClass", meta.implemented);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "Describe", meta.implemented);
CjsSchema.decorateMethod(Tr2PipelineStatsQueryALWebgl2, "SetName", meta.adapted);
CjsSchema.meta.define("Tr2PipelineStatsQueryALWebgl2")(Tr2PipelineStatsQueryALWebgl2);
