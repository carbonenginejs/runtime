// Source: trinity/trinity/Tr2ImpostorManager.h
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { CjsSchema, impl, type } from "#schema";


const ITR2_IMPOSTOR_SOURCE = Symbol.for("carbonenginejs.contract.ITr2ImpostorSource");


/** Camera directions used to decide when an impostor must be recaptured. */
@type.define({ className: "ITr2ImpostorSourceImpostorHash", family: "trinityCore" })
export class ITr2ImpostorSourceImpostorHash extends CjsModel
{
  @type.vec3
  viewDir = vec3.create();

  @type.vec3
  upDir = vec3.create();
}


/** Contract for an object that can be captured into an impostor atlas. */
export class ITr2ImpostorSource
{
  static [Symbol.hasInstance](value)
  {
    return value !== null && value !== undefined && value[ITR2_IMPOSTOR_SOURCE] === true;
  }

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

Object.defineProperty(ITr2ImpostorSource.prototype, ITR2_IMPOSTOR_SOURCE, { value: true });
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


/** Adds the ITr2ImpostorSource contract without replacing an existing base. */
export function withITr2ImpostorSource(Base)
{
  const Provider = class extends Base
  {
    GetLocalToWorldTransform(out)
    {
      return ITr2ImpostorSource.prototype.GetLocalToWorldTransform.call(this, out);
    }

    GetImpostorBatches(frustum, batches)
    {
      return ITr2ImpostorSource.prototype.GetImpostorBatches.call(this, frustum, batches);
    }

    GetRenderPriority(oldHash, newHash)
    {
      return ITr2ImpostorSource.prototype.GetRenderPriority.call(this, oldHash, newHash);
    }

    GetImpostorBoundingSphere(out)
    {
      return ITr2ImpostorSource.prototype.GetImpostorBoundingSphere.call(this, out);
    }

    GetLastImpostorBoundingSphere(out)
    {
      return ITr2ImpostorSource.prototype.GetLastImpostorBoundingSphere.call(this, out);
    }
  };

  Object.defineProperty(Provider.prototype, ITR2_IMPOSTOR_SOURCE, { value: true });
  for (const method of [
    "GetLocalToWorldTransform",
    "GetImpostorBatches",
    "GetRenderPriority",
    "GetImpostorBoundingSphere",
    "GetLastImpostorBoundingSphere"
  ])
  {
    CjsSchema.decorateMethod(Provider, method, impl.abstract);
  }
  return Provider;
}
