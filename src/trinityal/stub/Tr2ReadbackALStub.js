// Source: trinity/trinityal/stub/Tr2TextureALStub.h
// Source: trinity/trinityal/stub/Tr2TextureALStub.cpp
import { CjsSchema, meta, type } from "#schema";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult } from "../ALResult.js";

/** Carbon's immediately ready, independently copied CPU texture snapshot.
 *
 * Carbon: Tr2ReadbackAL (trinity/trinityal/stub/Tr2TextureALStub.h:14)
 */
export class Tr2ReadbackALStub extends Tr2DeviceResourceAL
{
  _data = null;
  _rowPitch = 0;

  /** Copies bytes instead of retaining a mutable texture mapping. */
  constructor(data, rowPitch)
  {
    super();
    this._data = data.slice();
    this._rowPitch = rowPitch;
  }

  /** Native stub copies complete during construction. */
  IsReady(_renderContext)
  {
    return true;
  }

  /** Native out-parameters become a borrowed mapping record. */
  Map(_renderContext)
  {
    return { result: ALResult.S_OK, data: this._data, pitch: this._rowPitch };
  }

  /** Releases copied bytes and the explicit device-resource registration. */
  Destroy()
  {
    this._data = null;
    super.Destroy();
  }

  /** Native stub readbacks contribute no description fields. */
  Describe(_description)
  {
  }

  /** Native readbacks are managed device resources. */
  GetMemoryClass()
  {
    return Tr2ALMemoryType.AL_MEMORY_MANAGED;
  }

  /** Mirrors the native nonempty CPU buffer check. */
  IsValid()
  {
    return this._data !== null && this._data.length !== 0;
  }
}

CjsSchema.decorateField(Tr2ReadbackALStub, "_data", type.uint8Array);
CjsSchema.decorateField(Tr2ReadbackALStub, "_rowPitch", type.uint32);
CjsSchema.decorateMethod(Tr2ReadbackALStub, "IsReady");
CjsSchema.decorateMethod(Tr2ReadbackALStub, "Map");
CjsSchema.decorateMethod(Tr2ReadbackALStub, "Destroy");
CjsSchema.decorateMethod(Tr2ReadbackALStub, "Describe");
CjsSchema.decorateMethod(Tr2ReadbackALStub, "GetMemoryClass");
CjsSchema.decorateMethod(Tr2ReadbackALStub, "IsValid");
CjsSchema.decorateMethod(Tr2ReadbackALStub, "IsReady", meta.implemented);
CjsSchema.decorateMethod(Tr2ReadbackALStub, "IsValid", meta.implemented);
CjsSchema.decorateMethod(Tr2ReadbackALStub, "Map", meta.adapted);
CjsSchema.decorateMethod(Tr2ReadbackALStub, "Destroy", meta.adapted);
CjsSchema.decorateMethod(Tr2ReadbackALStub, "Describe", meta.implemented);
CjsSchema.decorateMethod(Tr2ReadbackALStub, "GetMemoryClass", meta.implemented);
CjsSchema.meta.define("Tr2ReadbackALStub")(Tr2ReadbackALStub);
