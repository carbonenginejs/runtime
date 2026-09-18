// Historical Incarna hydration contract reviewed from complete Black records.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/**
 * Minimal persisted cell record used by historical Incarna interior scenes.
 *
 * This is an evidence-backed hydration shell, not a current Carbon class or a
 * claim of historical runtime behavior.
 */
@type.define({ className: "Tr2InteriorCell", family: "incarna" })
export class Tr2InteriorCell extends CjsModel
{

  /** Persisted unbounded-cell flag observed in reviewed historical records. */
  @edit.persist
  @type.boolean
  isUnbounded = false;

  /** Optional spherical-harmonic probe resource path. */
  @edit.persist
  @type.string
  shProbeResPath = "";

}
