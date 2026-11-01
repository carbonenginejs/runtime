import { IRoot } from "../../../../blue/blueexposure/IRoot.js";
// Source: trinity/trinity/Include/ITr2InstanceData.h
import { CjsSchema, meta } from "#schema";


/** Contract for a provider of instance-stream data and layout metadata. */
export class ITr2InstanceData extends IRoot
{

  /**
   * Whether the provider's instance stream is ready for batch collection.
   *
   * @abstract
   */
  IsInstanceDataReady() {}

  /**
   * Returns one realized instance-buffer slice for a screen-size selection.
   *
   * @abstract
   */
  GetInstanceData(_bufferIndex, _screenSize) {}

  /**
   * Returns the vertex declaration for one instance buffer.
   *
   * @abstract
   */
  GetInstanceBufferVertexDeclaration(_bufferIndex) {}

  /**
   * Returns the local bounding box represented by one instance buffer.
   *
   * @abstract
   */
  GetInstanceBufferBoundingBox(_bufferIndex) {}
}

for (const method of [
  "IsInstanceDataReady",
  "GetInstanceData",
  "GetInstanceBufferVertexDeclaration",
  "GetInstanceBufferBoundingBox"
])
{
  CjsSchema.decorateMethod(ITr2InstanceData, method, meta.abstract);
}
CjsSchema.exposure.interface("ITr2InstanceData")(ITr2InstanceData);
