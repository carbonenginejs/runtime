// Source: trinity/trinityal/dx11/Tr2FenceALDx11.h
// Source: trinity/trinityal/dx11/Tr2FenceALDx11.cpp
// Source: trinity/trinityal/include/Tr2FenceAL.h
//
// The WebGL2 fence: dx11's event query (`D3D11_QUERY_EVENT`) is a sync object
// (`fenceSync`), put into the command stream at `PutFence` and polled at
// `IsReached`.
//
// WEBGL2 CANNOT WAIT ON ONE. A sync object only becomes signalled once control
// returns to the browser's event loop (WebGL 2.0 specification, section 5.27),
// and `clientWaitSync` may not block, so dx11's `Wait` - poll until the query
// answers - would spin for ever. `Wait` finishes the context instead
// (`gl.finish`), which returns once every command, the fence included, has
// completed, and then records the fence as passed.

import { CjsSchema, impl } from "#schema";
import { Tr2ALMemoryType, Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { ALResult } from "../ALResult.js";
import { RenderContextALOf } from "../renderContextAL.js";


/**
 * A GPU fence on a WebGL2 device.
 */
export class Tr2FenceALWebgl2 extends Tr2DeviceResourceAL
{
  /** m_query: the sync object of the last `PutFence`, or null before one. */
  _sync = null;

  /** Whether `Create` succeeded; dx11 answers this with the query's existence. */
  _isValid = false;

  /** Whether `Wait` has finished the context since the last `PutFence`. */
  _finished = false;

  /** The context the fence was created on. */
  _gl = null;

  /** m_name */
  _name = "";

  /**
   * Creates the fence (`Tr2FenceALDx11.cpp:21-31`). dx11 creates its event
   * query here; a sync object exists only once put, so WebGL2 creates nothing
   * until `PutFence`.
   *
   * @param {object} renderContext The primary context.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Create(renderContext)
  {
    this._Reset();

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_FAIL;

    this._gl = al.GetWebgl2();
    this._isValid = true;
    return ALResult.S_OK;
  }

  /**
   * Puts the fence into the command stream (`:43-54`), replacing any earlier
   * one, as ending a D3D query again re-issues it.
   *
   * @param {object} renderContext The context.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  PutFence(renderContext)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_FAIL;

    const gl = this._gl;
    if (this._sync) gl.deleteSync(this._sync);

    this._sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    this._finished = false;

    return this._sync ? ALResult.S_OK : ALResult.E_FAIL;
  }

  /**
   * Whether the GPU has passed the fence (`:56-69`), without flushing. A
   * fence never put has nothing outstanding and answers true.
   *
   * @param {object} renderContext The context.
   * @returns {{result: number, isReached: boolean}} dx11's out argument comes back here.
   */
  @impl.adapted
  IsReached(renderContext)
  {
    if (!this.IsValid()) return { result: ALResult.E_INVALIDCALL, isReached: false };

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return { result: ALResult.E_FAIL, isReached: false };

    if (!this._sync || this._finished) return { result: ALResult.S_OK, isReached: true };

    const gl = this._gl;
    return { result: ALResult.S_OK, isReached: gl.getSyncParameter(this._sync, gl.SYNC_STATUS) === gl.SIGNALED };
  }

  /**
   * Waits until the GPU has passed the fence (`:71-89`). WebGL2 cannot wait on
   * a sync object; this finishes the context, which is the same wait taken
   * over every command rather than up to the fence. See the head comment.
   *
   * @param {object} renderContext The context.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  Wait(renderContext)
  {
    if (!this.IsValid()) return ALResult.E_INVALIDCALL;

    const al = RenderContextALOf(renderContext);
    if (!al || !al.IsValid()) return ALResult.E_FAIL;

    if (this._sync && !this._finished)
    {
      this._gl.finish();
      this._finished = true;
    }

    return ALResult.S_OK;
  }

  /** Carbon's impl `Destroy` (`:33-36`), before the registry is left. */
  _Reset()
  {
    if (this._sync) this._gl.deleteSync(this._sync);

    this._sync = null;
    this._isValid = false;
    this._finished = false;
    this._gl = null;
  }

  /** Releases the fence and leaves the device-resource registry. */
  Destroy()
  {
    this._Reset();
    super.Destroy();
  }

  /**
   * Whether the fence was created.
   *
   * @returns {boolean} True once created.
   */
  IsValid()
  {
    return this._isValid;
  }

  /**
   * Which memory class this fence occupies.
   *
   * @returns {number} A `Tr2ALMemoryType` value.
   */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_VIDEO;
  }

  /**
   * Describes the fence for the device-resource registry, with dx11's keys.
   *
   * @param {object} description The record to fill.
   */
  Describe(description)
  {
    description.type = "Tr2FenceAL";
    description.name = this._name;
  }

  /**
   * Names the fence. WebGL has no debug names, so it is kept for `Describe`.
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

CjsSchema.define(Tr2FenceALWebgl2, { className: "Tr2FenceALWebgl2", carbon: "Tr2FenceAL" });
