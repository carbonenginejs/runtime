// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Common Carbon interface for hull-extension placement conditions. */
@type.define({ className: "IEveSOFDataHullExtensionPlacementDistribution", family: "eve" })
export class IEveSOFDataHullExtensionPlacementDistribution extends CjsModel
{

  /** m_name (std::string); persisted by each concrete Blue class. */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

}
