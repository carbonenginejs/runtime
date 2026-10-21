import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { EveSOFDNADescriptor } from "../shared/EveSOFDNADescriptor.js";
import { IEveSOFDataHullExtensionPlacementDistribution } from "./IEveSOFDataHullExtensionPlacementDistribution.js";

/** Matches a parent DNA descriptor as a condition for a hull-extension placement. */
@be.define("EveSOFDataHullExtensionPlacementDistributionParentMatch")
@be.mapInterface(IEveSOFDataHullExtensionPlacementDistribution)
export class EveSOFDataHullExtensionPlacementDistributionParentMatch extends IEveSOFDataHullExtensionPlacementDistribution
{

  /** m_parentDescriptor (EveSOFDNADescriptorPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("EveSOFDNADescriptor")
  parentDescriptor = new EveSOFDNADescriptor();

  /** m_name (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

}
