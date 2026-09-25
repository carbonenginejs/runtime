// Source: trinity/trinity/Interior/Tr2IntSkinnedObject.h
import { carbon, impl, edit, type } from "#schema";
import { Tr2SkinnedObject } from "../trinityCore/Tr2SkinnedObject.js";

/**
 * Interior skinned-object specialization carrying bounds, depth, and
 * variable-store metadata.
 */
@type.define({ className: "Tr2IntSkinnedObject", family: "interior" })
export class Tr2IntSkinnedObject extends Tr2SkinnedObject
{

  /** m_boundingSphere[3] (float) [READ] */
  @edit.read
  @type.float32
  boundingSphereRadius = 0;

  /** m_depthOffset (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  depthOffset = 0;

  /** m_variableStore (Tr2VariableStorePtr) [READ] */
  @edit.read
  @type.objectRef("Tr2VariableStore")
  variableStore = null;

  /** Carbon IInitialize hook populates the owner's LOD proxies. */
  @carbon.method
  @impl.adapted
  @impl.reason("JS exposes the native protected LOD member as lod; the owner model accessors alias its proxy storage.")
  Initialize()
  {
    this.lod.PopulateLods();
    return true;
  }

  /** Carbon INotify hook delegates to Tr2SkinnedObject and accepts all changes. */
  @carbon.method
  @impl.adapted
  @impl.reason("Exposed owner *DetailModel names map to the native LOD helper proxy members.")
  OnModified(propertyName)
  {
    if (super.OnModified(propertyName)) return true;
    this.lod.OnModified(propertyName);
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
