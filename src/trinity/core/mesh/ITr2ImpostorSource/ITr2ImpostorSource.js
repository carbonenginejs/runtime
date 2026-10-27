import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2ImpostorManager.h
import { vec3 } from "#math/vec3";
import { meta } from "#schema";
/** Contract for an object that can be captured into an impostor atlas. */
@be.interface("ITr2ImpostorSource")
export class ITr2ImpostorSource
{

  /** Writes the source's current local-to-world transform into `out`. */
  @meta.abstract
  GetLocalToWorldTransform(_out) {}

  /** Collects the batches used to capture this source into an impostor. */
  @meta.abstract
  GetImpostorBatches(_frustum, _batches) {}

  /** Scores how urgently a changed view hash should be recaptured. */
  @meta.abstract
  GetRenderPriority(_oldHash, _newHash) {}

  /** Writes the source's current impostor bounding sphere into `out`. */
  @meta.abstract
  GetImpostorBoundingSphere(_out) {}

  /** Writes the bounding sphere used for the previous impostor capture. */
  @meta.abstract
  GetLastImpostorBoundingSphere(_out) {}
}
