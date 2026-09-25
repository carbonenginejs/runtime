// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Combines a geometry resource path with the decal index buffers used by a multi-hull decal. */
@type.define({ className: "EveSOFDataMultiHullDecalIndexBuffers", family: "eve" })
export class EveSOFDataMultiHullDecalIndexBuffers extends CjsModel
{

  /** m_indexBuffers (PEveSOFDataDecalIndexBufferVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataDecalIndexBuffer")
  indexBuffers = [];

  /** m_combinedGeometryResPath (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  combinedGeometryResPath = "";

}
