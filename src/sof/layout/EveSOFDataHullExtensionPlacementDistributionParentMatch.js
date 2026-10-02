// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { EveSOFDNADescriptor } from "../shared/EveSOFDNADescriptor.js";
import { IEveSOFDataHullExtensionPlacementDistribution } from "./IEveSOFDataHullExtensionPlacementDistribution.js";

/** Matches a parent DNA descriptor as a condition for a hull-extension placement. */
@meta.define({ className: "EveSOFDataHullExtensionPlacementDistributionParentMatch", family: "eve" })
export class EveSOFDataHullExtensionPlacementDistributionParentMatch extends IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_parentDescriptor (EveSOFDNADescriptorPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.objectRef("EveSOFDNADescriptor")
  parentDescriptor = new EveSOFDNADescriptor();

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

}
