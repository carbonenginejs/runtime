// Historical Incarna hydration contract reviewed from complete Black records.
import { meta, type, blue } from "#schema";

/**
 * Minimal persisted cell record used by historical Incarna interior scenes.
 *
 * This is an evidence-backed hydration shell, not a current Carbon class or a
 * claim of historical runtime behavior. Carbon's only mention of the name is
 * the comment in Tr2InteriorPlaceable.h:36 ("inhabit one or more
 * Tr2InteriorCells"); no Carbon header declares it, so its fields come from
 * the reviewed records, not from a port.
 */
@meta.define("Tr2InteriorCell")
export class Tr2InteriorCell
{

  /** Persisted unbounded-cell flag observed in reviewed historical records. */
  @blue.persist
  @type.boolean
  isUnbounded = false;

  /** Optional spherical-harmonic probe resource path. */
  @blue.persist
  @type.path
  shProbeResPath = "";

}
