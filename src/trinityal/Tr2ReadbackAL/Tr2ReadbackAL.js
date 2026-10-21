// Source: trinity/trinityal/include/Tr2TextureAL.h
// Source: trinity/trinityal/src/Tr2TextureAL.cpp
import { CjsSchema, meta, blue, type } from "#schema";
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

  /** True only once this snapshot can be mapped without waiting. */
  IsReady(renderContext)
  {
    return this._readback !== null && this._readback.implementation.IsReady(renderContext);
  }

  /** An empty, released, or device-lost readback is invalid. */
  IsValid()
  {
    return this._readback !== null && this._readback.implementation.IsValid();
  }

  /**
   * Returns native out-parameters as a mapping record. WebGPU returns a Promise
   * while pending because the browser cannot block; a ready mapping is immediate.
   * The bytes remain owned by this readback until its last owner releases it.
   */
  Map(renderContext)
  {
    return this.IsValid() ? this._readback.implementation.Map(renderContext)
      : { result: ALResult.E_INVALIDCALL, data: null, pitch: 0 };
  }

  /**
   * Explicit release replaces shared_ptr destruction; other copies remain valid.
   *
   * Temporary destructor stand-in: exists because teardown is required before
   * the lifecycle (Destructor) pattern exists. NOT the final mechanism; do not
   * copy this as a pattern. Replaced by the lifecycle API after the IRoot pilot.
   */
  Destruct()
  {
    const readback = this._readback;
    this._readback = null;
    if (readback && --readback.owners === 0) readback.implementation.Destroy();
  }
}



CjsSchema.decorateField(Tr2ReadbackAL, "_readback", type.unknown);
CjsSchema.decorateMethod(Tr2ReadbackAL, "IsReady", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackAL, "IsValid", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackAL, "Map", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackAL, "IsReady", meta.implemented);
CjsSchema.decorateMethod(Tr2ReadbackAL, "IsValid", meta.implemented);
CjsSchema.decorateMethod(Tr2ReadbackAL, "Map", meta.adapted);
CjsSchema.decorateMethod(Tr2ReadbackAL, "Destruct", meta.adapted);
CjsSchema.meta.carbon("Tr2ReadbackAL")(Tr2ReadbackAL);
