// Source: trinity/trinity/Include/ITr2InstanceData.h
import { CjsModel } from "#model";
import { CjsSchema, impl, type } from "#schema";


/** Contract for a provider of instance-stream data and layout metadata. */
export class ITr2InstanceData
{

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
