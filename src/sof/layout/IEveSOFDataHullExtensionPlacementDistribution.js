import { exposure as be } from "#be";
import { IRoot } from "../../global/blueexposure/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { type, blue, meta } from "#schema";

/** Common Carbon interface for hull-extension placement conditions. */
@be.interface("IEveSOFDataHullExtensionPlacementDistribution")
@be.inherit(IRoot)
export class IEveSOFDataHullExtensionPlacementDistribution extends IRoot
{

  /** m_name (std::string); persisted by each concrete Blue class. */
  @meta.mapAttribute(meta.READWRITE | meta.PERSIST)

  @type.string
  name = "";

}
