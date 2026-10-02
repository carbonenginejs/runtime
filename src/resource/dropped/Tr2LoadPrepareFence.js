// Source: trinity/trinity/Resources/Tr2LoadPrepareFence.h
// Dropped reference shape. CjsResMan.Wait replaces this native two-queue fence.
// Verify fields against format-carbon resources/Tr2LoadPrepareFence.json.
import { CjsSchema, meta } from "#schema";

/** Retained-only reference shape mirroring Carbon's two-queue load/prepare fence helper, superseded by the snapshot-fence contract owned by `CjsResMan.Wait()`. */
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
  className: "Tr2LoadPrepareFence", family: "resources",
  fields: {
    resourceLoadCbId: meta.type.unknown,
    resourcePrepCbId: meta.type.unknown,
    reached: meta.type.boolean
  }
});
