import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2ImpostorManager.h
import { vec3 } from "#math/vec3";

/** Contract for an object that can be captured into an impostor atlas. */
@be.interface("ITr2ImpostorSource")
export class ITr2ImpostorSource
{

  /** Writes the source's current local-to-world transform into `out`. */
  @be.abstract
  GetLocalToWorldTransform(transform) {}

  /** Collects the batches used to capture this source into an impostor. */
  @be.abstract
  GetImpostorBatches(frustum, TriBatchType, batches) {}

  /** Scores how urgently a changed view hash should be recaptured. */
  @be.abstract
  GetRenderPriority(oldHash, newHash) {}

  /** Writes the source's current impostor bounding sphere into `out`. */
  @be.abstract
  GetImpostorBoundingSphere(sphere) {}

  /** Writes the bounding sphere used for the previous impostor capture. */
  @be.abstract
  GetLastImpostorBoundingSphere(sphere) {}
}
