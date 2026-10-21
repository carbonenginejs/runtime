import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/ITr2Renderable.h
import { CjsSchema, blue } from "#schema";

/** Native nominal picking contract, independent of the renderable contract. */
export class ITr2Pickable extends IRoot
{
  /**
   * Carbon's pure virtual `IRoot* GetID( uint16_t areaId )` (ITr2Renderable.h:91):
   * the root object a hit on an area represents.
   *
   * @param {number} _areaId The picked area.
   * @returns {object|null} The represented object.
   */
  GetID(_areaId) {}

  /**
   * Carbon's pure virtual `GetPickingBatches( ITriRenderBatchAccumulator*
   * batches, Tr2PickTypes pickTypes, const Tr2PerObjectData* perObjectData )`
   * (ITr2Renderable.h:92): the geometry taking part in a pick pass.
   *
   * @param {ITriRenderBatchAccumulator} _batches Receives the batches.
   * @param {number} _pickTypes Requested pick types.
   * @param {object} _perObjectData The object's per-object data.
   */
  GetPickingBatches(_batches, _pickTypes, _perObjectData) {}
}

CjsSchema.decorateMethod(ITr2Pickable, "GetID", blue.abstract);
CjsSchema.decorateMethod(ITr2Pickable, "GetPickingBatches", blue.abstract);
CjsSchema.exposure.interface("ITr2Pickable")(ITr2Pickable);
