// Source: trinity/trinity/Tr2Model.h
import { meta } from "#schema";

/** Named character model record grouping its Trinity mesh objects. */
@meta.define({ className: "Tr2Model", family: "trinityCore" })
export class Tr2Model
{

  /** m_meshes (PTr2MeshVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("Tr2Mesh")
  meshes = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** Carbon method GetBoundingBoxInLocalSpace (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.notImplemented
  GetBoundingBoxInLocalSpace(...args)
  {
    throw new Error("Tr2Model.GetBoundingBoxInLocalSpace is not implemented in CarbonEngineJS.");
  }

}

meta.blue.interfaceTable({ interfaces: [Tr2Model], chainTo: null })(Tr2Model, { kind: "class" });
