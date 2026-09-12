// Source: trinity/trinity/Resources/Tr2LoadPrepareFence.h
// Dropped reference shape. CjsResMan.Wait replaces this native two-queue fence.
// Verify fields against format-carbon resources/Tr2LoadPrepareFence.json.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2LoadPrepareFence dropped reference shape (resources), schema shapeHash ff002907.... */
export class Tr2LoadPrepareFence extends CjsModel
{

  /** m_resourceLoadCbId (CcpAtomic<uint32_t>) */
  resourceLoadCbId = 0;

  /** m_resourcePrepCbId (CcpAtomic<uint32_t>) */
  resourcePrepCbId = 0;

  /** m_reached (bool) */
  reached = true;

}

CjsSchema.define(Tr2LoadPrepareFence, {
  className: "Tr2LoadPrepareFence", family: "resources",
  fields: {
    resourceLoadCbId: type.unknown,
    resourcePrepCbId: type.unknown,
    reached: type.boolean
  }
});
