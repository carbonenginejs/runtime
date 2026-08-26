// Source: trinity/trinity/Include/ITr2InstanceData.h
import { CjsModel } from "#model";
import { CjsSchema, impl, type } from "#schema";


const ITR2_INSTANCE_DATA = Symbol.for("carbonenginejs.contract.ITr2InstanceData");


/** One realized instance-buffer slice returned by an ITr2InstanceData provider. */
@type.define({ className: "ITr2InstanceDataInstanceData", family: "trinityCore" })
export class ITr2InstanceDataInstanceData extends CjsModel
{
  @type.rawStruct("Tr2BufferAL")
  buffer = null;

  @type.uint32
  offset = 0;

  @type.uint32
  stride = 0;

  @type.uint32
  count = 0;
}


/** Contract for a provider of instance-stream data and layout metadata. */
export class ITr2InstanceData
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_INSTANCE_DATA] === true;
  }

  /** Whether the provider's instance stream is ready for batch collection. */
  IsInstanceDataReady()
  {
    throw new Error("ITr2InstanceData.IsInstanceDataReady must be implemented by an instance-data provider.");
  }

  /** Returns one realized instance-buffer slice for a screen-size selection. */
  GetInstanceData(_bufferIndex, _screenSize)
  {
    throw new Error("ITr2InstanceData.GetInstanceData must be implemented by an instance-data provider.");
  }

  /** Returns the vertex declaration for one instance buffer. */
  GetInstanceBufferVertexDeclaration(_bufferIndex)
  {
    throw new Error("ITr2InstanceData.GetInstanceBufferVertexDeclaration must be implemented by an instance-data provider.");
  }

  /** Returns the local bounding box represented by one instance buffer. */
  GetInstanceBufferBoundingBox(_bufferIndex)
  {
    throw new Error("ITr2InstanceData.GetInstanceBufferBoundingBox must be implemented by an instance-data provider.");
  }
}

Object.defineProperty(ITr2InstanceData.prototype, ITR2_INSTANCE_DATA, { value: true });
for (const method of [
  "IsInstanceDataReady",
  "GetInstanceData",
  "GetInstanceBufferVertexDeclaration",
  "GetInstanceBufferBoundingBox"
])
{
  CjsSchema.decorateMethod(ITr2InstanceData, method, impl.abstract);
}
CjsSchema.define(ITr2InstanceData, { className: "ITr2InstanceData" });


/** Adds the ITr2InstanceData contract without replacing an existing base. */
export function withITr2InstanceData(Base)
{
  const Provider = class extends Base
  {
    IsInstanceDataReady()
    {
      return ITr2InstanceData.prototype.IsInstanceDataReady.call(this);
    }

    GetInstanceData(bufferIndex, screenSize)
    {
      return ITr2InstanceData.prototype.GetInstanceData.call(this, bufferIndex, screenSize);
    }

    GetInstanceBufferVertexDeclaration(bufferIndex)
    {
      return ITr2InstanceData.prototype.GetInstanceBufferVertexDeclaration.call(this, bufferIndex);
    }

    GetInstanceBufferBoundingBox(bufferIndex)
    {
      return ITr2InstanceData.prototype.GetInstanceBufferBoundingBox.call(this, bufferIndex);
    }
  };

  Object.defineProperty(Provider.prototype, ITR2_INSTANCE_DATA, { value: true });
  for (const method of [
    "IsInstanceDataReady",
    "GetInstanceData",
    "GetInstanceBufferVertexDeclaration",
    "GetInstanceBufferBoundingBox"
  ])
  {
    CjsSchema.decorateMethod(Provider, method, impl.abstract);
  }
  return Provider;
}
