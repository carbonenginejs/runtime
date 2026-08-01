// Historical Incarna hydration contract inferred from pinned Black assets.
// Representative source: res:/graphics/interior/charactercreation/customization.black
import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/**
 * Minimal persisted cell record used by historical Incarna interior scenes.
 *
 * This is an evidence-backed hydration shell, not a current Carbon class or a
 * claim of historical runtime behavior.
 */
@type.define({ className: "Tr2InteriorCell", family: "incarna" })
export class Tr2InteriorCell extends CjsModel
{

  /** Observed in all four decoded character-creation scene graphs. */
  @io.persist
  @type.boolean
  isUnbounded = false;

  /** Optional spherical-harmonic probe resource path. */
  @io.persist
  @type.string
  shProbeResPath = "";

}
