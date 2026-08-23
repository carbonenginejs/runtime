// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { EveSOFDNADescriptor } from "../shared/EveSOFDNADescriptor.js";
import { IEveSOFDataHullExtensionPlacementDistribution } from "./IEveSOFDataHullExtensionPlacementDistribution.js";

/** EveSOFDataHullExtensionPlacementDistributionParentMatch (eve) - generated from schema shapeHash 2afff7b6.... */
@type.define({ className: "EveSOFDataHullExtensionPlacementDistributionParentMatch", family: "eve" })
export class EveSOFDataHullExtensionPlacementDistributionParentMatch extends IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_parentDescriptor (EveSOFDNADescriptorPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDNADescriptor")
  parentDescriptor = new EveSOFDNADescriptor();

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

}
