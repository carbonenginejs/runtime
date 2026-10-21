import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Combines a geometry resource path with the decal index buffers used by a multi-hull decal. */
@be.define("EveSOFDataMultiHullDecalIndexBuffers")
@blue.inherit(IRoot)
export class EveSOFDataMultiHullDecalIndexBuffers extends IRoot
{

  /** m_indexBuffers (PEveSOFDataDecalIndexBufferVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataDecalIndexBuffer")
  indexBuffers = [];

  /** m_combinedGeometryResPath (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.path("TriGeometryRes")
  combinedGeometryResPath = "";

}
