// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { meta } from "#schema";

/** Common Carbon interface for hull-extension placement conditions. */
@meta.define({ className: "IEveSOFDataHullExtensionPlacementDistribution", family: "eve" })
export class IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_name (std::string); persisted by each concrete Blue class. */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

}
