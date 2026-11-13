// Source: trinity/trinityal/include/Tr2TextureAL.h
// Source: trinity/trinityal/src/Tr2TextureAL.cpp
import { CjsGraph } from "../../global/model/graph/CjsGraph.js";
import { CjsSchema, type } from "#schema";
import { ALResult } from "../ALResult.js";

/** An owned snapshot of a texture copy, independently retained until consumption. */
export class Tr2ReadbackAL
{
  _readback = null;

  /** Explicit ownership replaces native shared_ptr construction and copying. */
  constructor({ implementation = null, copy = null } = {})
  {
    this._readback = copy ? copy._readback : implementation ? { implementation, owners: 0 } : null;
    if (this._readback) this._readback.owners++;
  }

  /**
   * True only once this snapshot can be mapped without waiting.
   *
   * @implemented
   */
  IsReady(renderContext)
  {
    return this._readback !== null && this._readback.implementation.IsReady(renderContext);
  }

  /**
   * An empty, released, or device-lost readback is invalid.
   *
   * @implemented
   */
  IsValid()
  {
    return this._readback !== null && this._readback.implementation.IsValid();
  }

  /**
   * Returns native out-parameters as a mapping record. WebGPU returns a Promise
   * while pending because the browser cannot block; a ready mapping is immediate.
   * The bytes remain owned by this readback until its last owner releases it.
   *
   * @adapted
   */
  Map(renderContext)
  {
    return this.IsValid() ? this._readback.implementation.Map(renderContext)
      : { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };
  }

  /**
   * Ends this object, once: its C++ destruction, level by level.
   * @cjs Thin public entry. Carbon's class is not an IRoot, so it does not take IRoot's Destruct.
   * @param {*} [options] Handed to an OnDestruct, where a class below this one has one.
   * @returns {boolean} True if it ran; false on a second call.
   */
  Destruct(options)
  {
    return CjsGraph.destruct(this, options);
  }

  /**
   * Explicit release replaces shared_ptr destruction; other copies remain valid.
   *
   *
   * @adapted
   * Carbon: ~Tr2ReadbackAL (trinity/trinityal/dx11/Tr2TextureALDx11.cpp:338-341).
   * @adapted Existing JS cleanup runs through graph dispatch; ownership and callers are unchanged.
   */
  _Destructor()
  {
    const readback = this._readback;
    this._readback = null;
    if (readback && --readback.owners === 0) readback.implementation.Destroy();
  }
}



CjsSchema.decorateField(Tr2ReadbackAL, "_readback", type.rawStruct("TrinityALImpl::Tr2ReadbackAL"));
CjsSchema.decorateMethod(Tr2ReadbackAL, "IsReady");
CjsSchema.decorateMethod(Tr2ReadbackAL, "IsValid");
CjsSchema.decorateMethod(Tr2ReadbackAL, "Map");
CjsSchema.meta.define({ className: "Tr2ReadbackAL", carbon: "Tr2ReadbackAL", capabilities: [ "destruct" ] })(Tr2ReadbackAL);
