// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Common Carbon interface for hull-extension placement conditions. */
@type.define({ className: "IEveSOFDataHullExtensionPlacementDistribution", family: "eve" })
export class IEveSOFDataHullExtensionPlacementDistribution extends CjsModel
{

  /** m_name (std::string); persisted by each concrete Blue class. */
  @type.string
  name = "";

}
