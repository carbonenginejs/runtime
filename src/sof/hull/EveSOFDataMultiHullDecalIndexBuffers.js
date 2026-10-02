// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";

/** Combines a geometry resource path with the decal index buffers used by a multi-hull decal. */
@meta.define({ className: "EveSOFDataMultiHullDecalIndexBuffers", family: "eve" })
export class EveSOFDataMultiHullDecalIndexBuffers
{

  /** m_indexBuffers (PEveSOFDataDecalIndexBufferVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataDecalIndexBuffer")
  indexBuffers = [];

  /** m_combinedGeometryResPath (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  combinedGeometryResPath = "";

}
