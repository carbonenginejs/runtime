// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { type, blue } from "#schema";

/** Common Carbon interface for hull-extension placement conditions. */
@blue.define("IEveSOFDataHullExtensionPlacementDistribution")
export class IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_name (std::string); persisted by each concrete Blue class. */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

}
