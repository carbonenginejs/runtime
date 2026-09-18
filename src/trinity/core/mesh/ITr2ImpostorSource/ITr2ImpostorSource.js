// Source: trinity/trinity/Tr2ImpostorManager.h
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { CjsSchema, impl, type } from "#schema";


/** Contract for an object that can be captured into an impostor atlas. */
export class ITr2ImpostorSource
{

  /** Writes the source's current local-to-world transform into `out`. */
  GetLocalToWorldTransform(_out)
  {
    throw new Error("ITr2ImpostorSource.GetLocalToWorldTransform must be implemented by an impostor source.");
  }

  /** Collects the batches used to capture this source into an impostor. */
  GetImpostorBatches(_frustum, _batches)
  {
    throw new Error("ITr2ImpostorSource.GetImpostorBatches must be implemented by an impostor source.");
  }

  /** Scores how urgently a changed view hash should be recaptured. */
  GetRenderPriority(_oldHash, _newHash)
  {
    throw new Error("ITr2ImpostorSource.GetRenderPriority must be implemented by an impostor source.");
  }

  /** Writes the source's current impostor bounding sphere into `out`. */
  GetImpostorBoundingSphere(_out)
  {
    throw new Error("ITr2ImpostorSource.GetImpostorBoundingSphere must be implemented by an impostor source.");
  }

  /** Writes the bounding sphere used for the previous impostor capture. */
  GetLastImpostorBoundingSphere(_out)
  {
    throw new Error("ITr2ImpostorSource.GetLastImpostorBoundingSphere must be implemented by an impostor source.");
  }
}

for (const method of [
  "GetLocalToWorldTransform",
  "GetImpostorBatches",
  "GetRenderPriority",
  "GetImpostorBoundingSphere",
  "GetLastImpostorBoundingSphere"
])
{
  CjsSchema.decorateMethod(ITr2ImpostorSource, method, impl.abstract);
}
CjsSchema.define(ITr2ImpostorSource, { className: "ITr2ImpostorSource" });
