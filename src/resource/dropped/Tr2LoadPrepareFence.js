// Source: trinity/trinity/Resources/Tr2LoadPrepareFence.h
// Dropped reference shape. BlueResMan.Wait replaces this native two-queue fence.
// Verify fields against format-carbon resources/Tr2LoadPrepareFence.json.
import { CjsSchema, type } from "#schema";

/** Retained-only reference shape mirroring Carbon's two-queue load/prepare fence helper, superseded by `BlueResMan.Wait()`, which waits until both resMan queues are empty. */
export class Tr2LoadPrepareFence
{

  /** m_resourceLoadCbId (CcpAtomic<uint32_t>) */
  resourceLoadCbId = 0;

  /** m_resourcePrepCbId (CcpAtomic<uint32_t>) */
  resourcePrepCbId = 0;

  /** m_reached (bool) */
  reached = true;

}

CjsSchema.define(Tr2LoadPrepareFence, {
  className: "Tr2LoadPrepareFence",
  fields: {
    resourceLoadCbId: type.unknown,
    resourcePrepCbId: type.unknown,
    reached: type.boolean
  }
});
