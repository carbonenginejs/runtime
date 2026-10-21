// Source: trinity/trinity/Tr2ImpostorManager.h
import { vec3 } from "#math/vec3";
import { CjsSchema, meta } from "#schema";


/** Contract for an object that can be captured into an impostor atlas. */
export class ITr2ImpostorSource
{

  /** Writes the source's current local-to-world transform into `out`. */
  GetLocalToWorldTransform(_out) {}

  /** Collects the batches used to capture this source into an impostor. */
  GetImpostorBatches(_frustum, _batches) {}

  /** Scores how urgently a changed view hash should be recaptured. */
  GetRenderPriority(_oldHash, _newHash) {}

  /** Writes the source's current impostor bounding sphere into `out`. */
  GetImpostorBoundingSphere(_out) {}

  /** Writes the bounding sphere used for the previous impostor capture. */
  GetLastImpostorBoundingSphere(_out) {}
}

for (const method of [
  "GetLocalToWorldTransform",
  "GetImpostorBatches",
  "GetRenderPriority",
  "GetImpostorBoundingSphere",
  "GetLastImpostorBoundingSphere"
])
{
  CjsSchema.decorateMethod(ITr2ImpostorSource, method, meta.abstract);
}
CjsSchema.exposure.interface("ITr2ImpostorSource")(ITr2ImpostorSource);
