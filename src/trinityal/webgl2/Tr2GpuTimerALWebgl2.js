// Source: trinity/trinityal/dx11/Tr2GpuTimerALDx11.h
// Source: trinity/trinityal/dx11/Tr2GpuTimerALDx11.cpp
// Source: trinity/trinityal/include/Tr2GpuTimerAL.h
//
// The WebGL2 GPU timer, on `EXT_disjoint_timer_query_webgl2`.
//
// dx11 brackets the work with two timestamp queries inside a disjoint query and
// divides the difference by the disjoint query's frequency. Browsers that
// expose the extension at all rarely expose timestamps (a timestamp query
// counter of zero bits), so this times the work with one `TIME_ELAPSED_EXT`
// query instead, which answers the difference directly in nanoseconds, and
// reads the extension's `GPU_DISJOINT_EXT` flag where dx11 reads its disjoint
// query. dx11's `BEGIN_RECEIVED` state, between the two timestamps arriving,
// has nothing to stand for and is gone.
//
// - WITHOUT THE EXTENSION, which is common, `Create` fails as dx11's does when
//   the device refuses a query, and the timer stays invalid.
// - ONE ELAPSED-TIME QUERY MAY BE ACTIVE AT A TIME, where timestamps nest
//   freely; `Begin` while another timer is running answers false.

import { CjsSchema, impl } from "#schema";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";

/** dx11's `m_state` values (`Tr2GpuTimerALDx11.h:43-50`), without `BEGIN_RECEIVED`. */
const UNINITIALIZED = 0;
const READY = 1;
const BEGIN_ISSUED = 2;
const END_ISSUED = 3;


/**
 * A GPU timer on a WebGL2 device.
 */
export class Tr2GpuTimerALWebgl2 extends Tr2DeviceResourceAL
{
  /** m_beginQuery, m_endQuery and m_disjointQuery, as one elapsed-time query. */
  _query = null;

  /** The timer query extension. */
  _extension = null;

  /** m_lastTime: seconds, or -1 before a time has arrived. */
  _lastTime = -1;

  /** m_state */
  _state = UNINITIALIZED;

  /** The context the timer was created on. */
  _gl = null;

  /** m_name */
  _name = "";

  /**
   * Creates the timer (`Tr2GpuTimerALDx11.cpp:22-49`).
   *
   * @param {object} renderContext The primary context.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Create(renderContext)
  {
    this._Reset();

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_INVALIDCALL;

    const gl = al.GetWebgl2();
    const extension = gl.getExtension("EXT_disjoint_timer_query_webgl2");
    if (!extension) return ALResult.E_FAIL;

    const query = gl.createQuery();
    if (!query) return ALResult.E_OUTOFMEMORY;

    this._gl = gl;
    this._extension = extension;
    this._query = query;
    this._state = READY;
    return ALResult.S_OK;
  }

  /**
   * Starts timing (`:65-75`). False when not ready, or while another timer
   * is running; see the head comment.
   *
   * @param {object} _renderContext The context.
   * @returns {boolean} Whether timing started.
   */
  @impl.adapted
  Begin(_renderContext)
  {
    if (!this._query || this._state !== READY) return false;

    const gl = this._gl;
    const target = this._extension.TIME_ELAPSED_EXT;
    if (gl.getQuery(target, gl.CURRENT_QUERY)) return false;

    gl.beginQuery(target, this._query);
    this._state = BEGIN_ISSUED;
    return true;
  }

  /**
   * Stops timing (`:77-86`).
   *
   * @param {object} _renderContext The context.
   */
  @impl.adapted
  End(_renderContext)
  {
    if (!this._query || this._state !== BEGIN_ISSUED) return;

    this._gl.endQuery(this._extension.TIME_ELAPSED_EXT);
    this._state = END_ISSUED;
  }

  /**
   * The last measured time in seconds, collecting a new one if it has
   * arrived (`:88-145`). A disjoint period discards the measurement and keeps
   * the previous time, as dx11 does; -1 until a time has arrived.
   *
   * @param {object} _renderContext The context.
   * @returns {number} The time in seconds.
   */
  @impl.adapted
  GetTime(_renderContext)
  {
    if (!this._query || this._state !== END_ISSUED) return this._lastTime;

    const gl = this._gl;
    if (!gl.getQueryParameter(this._query, gl.QUERY_RESULT_AVAILABLE)) return this._lastTime;

    const nanoseconds = gl.getQueryParameter(this._query, gl.QUERY_RESULT);
    if (!gl.getParameter(this._extension.GPU_DISJOINT_EXT)) this._lastTime = Math.fround(nanoseconds / 1e9);

    this._state = READY;
    return this._lastTime;
  }

  /** Carbon's impl `Destroy` (`:51-58`), before the registry is left. */
  _Reset()
  {
    if (this._query) this._gl.deleteQuery(this._query);

    this._query = null;
    this._extension = null;
    this._gl = null;
    this._state = UNINITIALIZED;
    this._lastTime = -1;
  }

  /** Releases the timer and leaves the device-resource registry. */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether the timer was created.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._state !== UNINITIALIZED;
  }

  /**
   * Which memory class this timer occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_VIDEO;
  }

  /**
   * Describes the timer for the device-resource registry, with dx11's keys.
   *
   * @param {object} description The record to fill.
   */
  Describe(description)
  {
    description.type = "Tr2GpuTimerAL";
    description.name = this._name;
  }

  /**
   * Names the timer. WebGL has no debug names, so it is kept for `Describe`.
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

CjsSchema.define(Tr2GpuTimerALWebgl2, { className: "Tr2GpuTimerALWebgl2", carbon: "Tr2GpuTimerAL" });
