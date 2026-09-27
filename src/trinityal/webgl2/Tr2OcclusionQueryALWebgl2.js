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

import { CjsSchema, impl } from "#schema";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";


/**
 * An occlusion query on a WebGL2 device.
 */
export class Tr2OcclusionQueryALWebgl2 extends Tr2DeviceResourceAL
{
  /** `Tr2OcclusionQueryAL::WaitMode` (Tr2OcclusionQueryAL.h:18-22): whether `GetPixelCount` blocks for the result. */
  static WaitMode = Object.freeze({
    WAIT: 0,
    DO_NOT_WAIT: 1
  });

  /** m_query */
  _query = null;

  /** The context the query was created on. */
  _gl = null;

  /** m_name */
  _name = "";

  /**
   * Creates the query (`Tr2OcclusionQueryALDx11.cpp:21-33`).
   *
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
   * @param {object} renderContext The context.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
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
   * @param {object} renderContext The context.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
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
   * @param {object} renderContext The context.
   * @param {number} [_waitMode] A `WaitMode`; WebGL2 cannot wait.
   * @returns {{result: number, count: number}} dx11's out argument comes back here.
   */
  @impl.adapted
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

  /** Releases the query and leaves the device-resource registry. */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether the query was created.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._query !== null;
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
    description.type = "Tr2OcclusionQueryAL";
    description.name = this._name;
  }

  /**
   * Names the query. WebGL has no debug names, so it is kept for `Describe`.
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

CjsSchema.define(Tr2OcclusionQueryALWebgl2, { className: "Tr2OcclusionQueryALWebgl2", carbon: "Tr2OcclusionQueryAL" });
