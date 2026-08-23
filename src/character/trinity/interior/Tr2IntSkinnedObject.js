// Source: trinity/trinity/Interior/Tr2IntSkinnedObject.h
import { carbon, impl, io, type } from "#schema";
import { Tr2SkinnedObject } from "../trinityCore/Tr2SkinnedObject.js";

/**
 * Interior skinned-object specialization carrying bounds, depth, and
 * variable-store metadata.
 */
@type.define({ className: "Tr2IntSkinnedObject", family: "interior" })
export class Tr2IntSkinnedObject extends Tr2SkinnedObject
{

  /** m_boundingSphere[3] (float) [READ] */
  @io.read
  @type.float32
  boundingSphereRadius = 0;

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  depthOffset = 0;

  /** m_variableStore (Tr2VariableStorePtr) [READ] */
  @io.read
  @type.objectRef("Tr2VariableStore")
  variableStore = null;

  /** Carbon IInitialize hook populates the owner's LOD proxies. */
  @carbon.method
  @impl.adapted
  @impl.reason("Settles the owner through its cooperative proxy-identity synchronization hook.")
  Initialize()
  {
    this.OnModified();
    return true;
  }

  /** Carbon INotify hook delegates to Tr2SkinnedObject and accepts all changes. */
  @carbon.method
  @impl.adapted
  @impl.reason("The cooperative JS mutation hook receives an options bag rather than a Be::Var field handle.")
  OnModified(options = {})
  {
    super.OnModified(options);
    return true;
  }

  /** Carbon override delegates LOD selection to Tr2SkinnedObject. */
  @carbon.method
  @impl.implemented
  SetLOD(frustum)
  {
    return super.SetLOD(frustum);
  }

}
