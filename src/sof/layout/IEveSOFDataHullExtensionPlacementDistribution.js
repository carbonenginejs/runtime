// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { edit, type } from "#schema";

/** Common Carbon interface for hull-extension placement conditions. */
@type.define({ className: "IEveSOFDataHullExtensionPlacementDistribution", family: "eve" })
export class IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_name (std::string); persisted by each concrete Blue class. */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

}
