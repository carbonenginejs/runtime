// Source: trinity/trinityal/dx11/Tr2OcclusionQueryALDx11.h
// Source: trinity/trinityal/dx11/Tr2OcclusionQueryALDx11.cpp
// Source: trinity/trinityal/include/Tr2OcclusionQueryAL.h
//
// The WebGL2 occlusion query, on `ANY_SAMPLES_PASSED`.
//
// Two things WebGL2 cannot give, and what stands in:
//
// - A PIXEL COUNT. dx11's `D3D11_QUERY_OCCLUSION` counts samples; WebGL2 only
//   answers whether any sample passed. `GetPixelCount` reports 1 for "some"
//   and 0 for "none", so a caller testing visibility is served and a caller
//   weighting by coverage is not.
// - WAITING. A query result only becomes available once control returns to
//   the browser's event loop (WebGL 2.0 specification, section 5.27), so
//   `WAIT` cannot block: both wait modes answer `S_FALSE` until the result is
//   there, which is dx11's answer for a result not yet ready.
//
// WebGL2 also allows one active query per target, where D3D11 nests them; a
// `Begin` while another occlusion query is active is refused.

import { CjsSchema, meta, type } from "#schema";
import { Tr2ALMemoryType } from "#consts/graphics";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";
import { Tr2OcclusionQueryAL } from "../Tr2OcclusionQueryAL/Tr2OcclusionQueryAL.js";


/**
 * An occlusion query on a WebGL2 device.
 *
 * Carbon: Tr2OcclusionQueryAL (trinity/trinityal/dx11/Tr2OcclusionQueryALDx11.h:16)
 */
export class Tr2OcclusionQueryALWebgl2 extends Tr2DeviceResourceAL
{
  /** `Tr2OcclusionQueryAL::WaitMode`, declared on the handle (`Tr2OcclusionQueryAL.h:20-24`). */
  static WaitMode = Tr2OcclusionQueryAL.WaitMode;

  /** m_query */
  _query = null;

  /** The context the query was created on. */
  _gl = null;

  /** m_name */
  _name = "";

  /**
   * Creates the query (`Tr2OcclusionQueryALDx11.cpp:21-33`).
   *
   * @implemented
   * @param {object} renderContext The primary context.
   * @returns {number} An `ALResult` value.
   */
  Create(renderContext)
  {
    this._Reset();

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_FAIL;

    const gl = al.GetWebgl2();
    this._query = gl.createQuery();
    if (!this._query) return ALResult.E_OUTOFMEMORY;

    this._gl = gl;
    return ALResult.S_OK;
  }

  /**
   * Begins counting (`:53-65`). Refused while another occlusion query is
   * active, which WebGL2 does not allow; see the head comment.
   *
   * @adapted
   * @param {object} renderContext The context.
   * @returns {number} An `ALResult` value.
   */
  @meta.adapted
  Begin(renderContext)
  {
    if (!this._query) return ALResult.E_INVALIDARG;

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_FAIL;

    const gl = this._gl;
    if (gl.getQuery(gl.ANY_SAMPLES_PASSED, gl.CURRENT_QUERY)) return ALResult.E_INVALIDCALL;

    gl.beginQuery(gl.ANY_SAMPLES_PASSED, this._query);
    return ALResult.S_OK;
  }

  /**
   * Ends counting (`:71-83`).
   *
   * @adapted
   * @param {object} renderContext The context.
   * @returns {number} An `ALResult` value.
   */
  @meta.adapted
  End(renderContext)
  {
    if (!this._query) return ALResult.E_INVALIDARG;

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_FAIL;

    const gl = this._gl;
    if (gl.getQuery(gl.ANY_SAMPLES_PASSED, gl.CURRENT_QUERY) !== this._query) return ALResult.E_INVALIDCALL;

    gl.endQuery(gl.ANY_SAMPLES_PASSED);
    return ALResult.S_OK;
  }

  /**
   * The query's result (`:90-107`): 1 if any sample passed, else 0, and
   * `S_FALSE` while it is not yet available, whatever the wait mode. See the
   * head comment.
   *
   * @adapted
   * @param {object} renderContext The context.
   * @param {number} [_waitMode] A `WaitMode`; WebGL2 cannot wait.
   * @returns {{result: number, count: number}} dx11's out argument comes back here.
   */
  @meta.adapted
  GetPixelCount(renderContext, _waitMode = Tr2OcclusionQueryALWebgl2.WaitMode.WAIT)
  {
    if (!this._query) return { result: ALResult.E_INVALIDARG, count: 0 };

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return { result: ALResult.E_FAIL, count: 0 };

    const gl = this._gl;
    if (!gl.getQueryParameter(this._query, gl.QUERY_RESULT_AVAILABLE)) return { result: ALResult.S_FALSE, count: 0 };

    return { result: ALResult.S_OK, count: gl.getQueryParameter(this._query, gl.QUERY_RESULT) ? 1 : 0 };
  }

  /** Carbon's impl `Destroy` (`:44-47`), before the registry is left. */
  _Reset()
  {
    if (this._query) this._gl.deleteQuery(this._query);

    this._query = null;
    this._gl = null;
  }

  /**
   * Releases the query and leaves the device-resource registry.
   *
   * @implemented
   */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether the query was created.
   *
   * @implemented
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._query !== null;
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
    description.type = "Tr2OcclusionQueryAL";
    description.name = this._name;
  }

  /**
   * Names the query. WebGL has no debug names, so it is kept for `Describe`.
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

CjsSchema.decorateField(Tr2OcclusionQueryALWebgl2, "_name", type.string);
// States against dx11/Tr2OcclusionQueryALDx11.cpp (Create, Destroy, IsValid, Describe, SetName) and .h (GetMemoryClass). Create makes a GL query where dx11 makes a D3D11_QUERY_OCCLUSION. Donor: the dx11 body of the same Carbon class. Destroy/IsValid/GetMemoryClass/Describe are the same contract on GL objects; SetName stores the name but sets no native debug label, which WebGL has no call for.
CjsSchema.decorateMethod(Tr2OcclusionQueryALWebgl2, "Create", meta.implemented);
CjsSchema.decorateMethod(Tr2OcclusionQueryALWebgl2, "Begin");
CjsSchema.decorateMethod(Tr2OcclusionQueryALWebgl2, "End");
CjsSchema.decorateMethod(Tr2OcclusionQueryALWebgl2, "GetPixelCount");
CjsSchema.decorateMethod(Tr2OcclusionQueryALWebgl2, "Destroy", meta.implemented);
CjsSchema.decorateMethod(Tr2OcclusionQueryALWebgl2, "IsValid", meta.implemented);
CjsSchema.decorateMethod(Tr2OcclusionQueryALWebgl2, "GetMemoryClass", meta.implemented);
CjsSchema.decorateMethod(Tr2OcclusionQueryALWebgl2, "Describe", meta.implemented);
CjsSchema.decorateMethod(Tr2OcclusionQueryALWebgl2, "SetName", meta.adapted);
CjsSchema.meta.define("Tr2OcclusionQueryALWebgl2")(Tr2OcclusionQueryALWebgl2);
