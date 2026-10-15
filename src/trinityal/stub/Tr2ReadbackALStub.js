// Source: trinity/trinityal/stub/Tr2TextureALStub.h
// Source: trinity/trinityal/stub/Tr2TextureALStub.cpp
import { CjsSchema, blue, meta, type } from "#schema";
import { Tr2DeviceResourceAL } from "../Tr2DeviceResourceAL/index.js";
import { Tr2ALMemoryType } from "#consts/graphics";
import { ALResult } from "../ALResult.js";

/** Carbon's immediately ready, independently copied CPU texture snapshot. */
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
CjsSchema.decorateMethod(Tr2ReadbackALStub, "IsReady", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackALStub, "Map", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackALStub, "Destroy", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackALStub, "Describe", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackALStub, "GetMemoryClass", blue.method);
CjsSchema.decorateMethod(Tr2ReadbackALStub, "IsValid", blue.method);
CjsSchema.blue.define(Tr2ReadbackALStub, {
  className: "Tr2ReadbackALStub",
  donors: [ "Tr2ReadbackAL" ],
  methods: { IsReady: [meta.implemented], IsValid: [meta.implemented], Map: [meta.adapted],
    Destroy: [meta.adapted], Describe: [meta.implemented], GetMemoryClass: [meta.implemented] }
});
