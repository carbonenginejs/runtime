// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";

/** Combines a geometry resource path with the decal index buffers used by a multi-hull decal. */
@type.define({ className: "EveSOFDataMultiHullDecalIndexBuffers", family: "eve" })
export class EveSOFDataMultiHullDecalIndexBuffers
{

  /** m_indexBuffers (PEveSOFDataDecalIndexBufferVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveSOFDataDecalIndexBuffer")
  indexBuffers = [];

  /** m_combinedGeometryResPath (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  combinedGeometryResPath = "";

}
