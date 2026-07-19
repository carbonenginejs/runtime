// Source: trinity/trinity/Resources/Tr2LoadPrepareFence.h
// Dropped reference shape. CjsResMan.Wait replaces this native two-queue fence.
// Verify fields against format-carbon resources/Tr2LoadPrepareFence.json.
import { type } from "@carbonenginejs/core-types/schema";
import { CjsModel } from "@carbonenginejs/core-types/model";

/** Tr2LoadPrepareFence dropped reference shape (resources), schema shapeHash ff002907.... */
@type.define({ className: "Tr2LoadPrepareFence", family: "resources" })
export class Tr2LoadPrepareFence extends CjsModel
{

  /** m_resourceLoadCbId (CcpAtomic<uint32_t>) */
  @type.unknown
  resourceLoadCbId = 0;

  /** m_resourcePrepCbId (CcpAtomic<uint32_t>) */
  @type.unknown
  resourcePrepCbId = 0;

  /** m_reached (bool) */
  @type.boolean
  reached = true;

}
