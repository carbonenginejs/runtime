import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { type, blue, meta } from "#schema";

/** Common Carbon interface for hull-extension placement conditions. */
@be.interface("IEveSOFDataHullExtensionPlacementDistribution")
@blue.inherit(IRoot)
export class IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_name (std::string); persisted by each concrete Blue class. */
  @meta.readwrite
  @meta.persist
  @type.string
  name = "";

}
