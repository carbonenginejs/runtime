// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { IEveSOFDataHullExtensionPlacement } from "./IEveSOFDataHullExtensionPlacement.js";
import { EveSOFDNADescriptor } from "../shared/EveSOFDNADescriptor.js";
import { EveSOFDataHullExtensionPlacementDistributionPlacement } from "./EveSOFDataHullExtensionPlacementDistributionPlacement.js";
import { vec3 } from "#math/vec3";

/** Defines a concrete hull extension by DNA, locator, offset, distribution, conditions, and build flags. */
@blue.define("EveSOFDataHullExtensionPlacement")
export class EveSOFDataHullExtensionPlacement extends IEveSOFDataHullExtensionPlacement
{

  /** m_distributionConditions (PIEveSOFDataHullExtensionPlacementDistributionVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveSOFDataHullExtensionPlacementDistribution")
  distributionConditions = [];

  /** m_extendsBoundingSphere (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  extendsBoundingSphere = true;

  /** m_extendsShieldEllipsoid (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  extendsShieldEllipsoid = true;

  /** m_isShared (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  isShared = false;

  /** m_isInstanced (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  isInstanced = true;

  /** m_enabled (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  enabled = true;

  /** m_distribution (EveSOFDataHullExtensionPlacementDistributionPlacementPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataHullExtensionPlacementDistributionPlacement")
  distribution = new EveSOFDataHullExtensionPlacementDistributionPlacement();

  /** m_descriptor (EveSOFDNADescriptorPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDNADescriptor")
  descriptor = new EveSOFDNADescriptor();

  /** m_locatorSetName (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  locatorSetName = "";

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_offset (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  offset = vec3.create();

}
