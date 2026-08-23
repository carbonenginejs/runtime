// Source: trinity/trinity/Tr2Model.h
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";

/** Named character model record grouping its Trinity mesh objects. */
@type.define({ className: "Tr2Model", family: "trinityCore" })
export class Tr2Model extends CjsModel
{

  /** m_meshes (PTr2MeshVector) [READ, PERSIST] */
  @io.persist
  @type.list("Tr2Mesh")
  meshes = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** Carbon method GetBoundingBoxInLocalSpace (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  GetBoundingBoxInLocalSpace(...args)
  {
    throw new Error("Tr2Model.GetBoundingBoxInLocalSpace is not implemented in CarbonEngineJS.");
  }

}
