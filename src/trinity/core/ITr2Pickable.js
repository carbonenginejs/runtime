// Source: trinity/trinity/ITr2Renderable.h
import { CjsSchema, meta } from "#schema";

/** Native nominal picking contract, independent of the renderable contract. */
export class ITr2Pickable
{
  /** Resolves an area to the native root object represented by a hit. */
  GetID(_areaId)
  {
    throw new Error("ITr2Pickable.GetID must be implemented.");
  }

  /** Collects the geometry participating in a requested pick pass. */
  GetPickingBatches(_batches, _pickTypes, _perObjectData)
  {
    throw new Error("ITr2Pickable.GetPickingBatches must be implemented.");
  }
}

CjsSchema.blue.define(ITr2Pickable, {
  className: "ITr2Pickable",
  methods: { GetID: [meta.abstract], GetPickingBatches: [meta.abstract] }
});
