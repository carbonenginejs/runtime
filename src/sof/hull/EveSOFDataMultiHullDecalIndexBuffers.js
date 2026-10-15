// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Combines a geometry resource path with the decal index buffers used by a multi-hull decal. */
@blue.define("EveSOFDataMultiHullDecalIndexBuffers")
export class EveSOFDataMultiHullDecalIndexBuffers
{

  /** m_indexBuffers (PEveSOFDataDecalIndexBufferVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataDecalIndexBuffer")
  indexBuffers = [];

  /** m_combinedGeometryResPath (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.path("TriGeometryRes")
  combinedGeometryResPath = "";

}
