// Source: trinity/trinityal/dx11/Tr2PipelineStatsQueryALDx11.h
// Source: trinity/trinityal/dx11/Tr2PipelineStatsQueryALDx11.cpp
// Source: trinity/trinityal/include/Tr2PipelineStatsQueryAL.h
//
// The WebGL2 pipeline statistics query, which WebGL2 does not have: there is no
// counterpart to `D3D11_QUERY_PIPELINE_STATISTICS` in the API or in any
// extension. `Create` fails as dx11's does when the device refuses the query,
// every other call answers as dx11 does for a query that was never created,
// and a statistics record has no fields.

import { CjsSchema, meta } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { Tr2PipelineStatsDataALWebgl2 } from "./Tr2PipelineStatsDataALWebgl2.js";


/**
 * A pipeline statistics query on a WebGL2 device, which cannot be created.
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
   * @returns {boolean} False.
   */
  IsValid()
  {
    return false;
  }

  /**
   * dx11's answer for a query never created (`:40-51`).
   *
   * @returns {number} `E_INVALIDARG`.
   */
  Begin(_renderContext)
  {
    return ALResult.E_INVALIDARG;
  }

  /**
   * dx11's answer for a query never created (`:53-64`).
   *
   * @returns {number} `E_INVALIDARG`.
   */
  End(_renderContext)
  {
    return ALResult.E_INVALIDARG;
  }

  /**
   * dx11's answer for a query never created (`:66-77`).
   *
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
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /**
   * Describes the query for the device-resource registry, with dx11's keys.
   *
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
   * @param {string} name The name.
   * @returns {number} An `ALResult` value.
   */
  SetName(name)
  {
    this._name = name;
    return ALResult.S_OK;
  }
}

CjsSchema.define(Tr2PipelineStatsQueryALWebgl2, { className: "Tr2PipelineStatsQueryALWebgl2", carbon: "Tr2PipelineStatsQueryAL" });
