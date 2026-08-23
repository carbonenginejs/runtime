// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { IEveSOFDataHullExtensionPlacement } from "./IEveSOFDataHullExtensionPlacement.js";
import { EveSOFDNADescriptor } from "../shared/EveSOFDNADescriptor.js";
import { EveSOFDataHullExtensionPlacementDistributionPlacement } from "./EveSOFDataHullExtensionPlacementDistributionPlacement.js";
import { vec3 } from "#math/vec3";

/** EveSOFDataHullExtensionPlacement (eve) - generated from schema shapeHash 9f4b8ceb.... */
@type.define({ className: "EveSOFDataHullExtensionPlacement", family: "eve" })
export class EveSOFDataHullExtensionPlacement extends IEveSOFDataHullExtensionPlacement
{

  /** m_distributionConditions (PIEveSOFDataHullExtensionPlacementDistributionVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveSOFDataHullExtensionPlacementDistribution")
  distributionConditions = [];

  /** m_extendsBoundingSphere (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  extendsBoundingSphere = true;

  /** m_extendsShieldEllipsoid (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  extendsShieldEllipsoid = true;

  /** m_isShared (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isShared = false;

  /** m_isInstanced (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  isInstanced = true;

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  enabled = true;

  /** m_distribution (EveSOFDataHullExtensionPlacementDistributionPlacementPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataHullExtensionPlacementDistributionPlacement")
  distribution = new EveSOFDataHullExtensionPlacementDistributionPlacement();

  /** m_descriptor (EveSOFDNADescriptorPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDNADescriptor")
  descriptor = new EveSOFDNADescriptor();

  /** m_locatorSetName (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  locatorSetName = "";

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_offset (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  offset = vec3.create();

}
