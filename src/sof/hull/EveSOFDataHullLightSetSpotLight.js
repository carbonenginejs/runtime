// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { quat } from "#math/quat";
import { EveSOFDataHullLightSetItem } from "./EveSOFDataHullLightSetItem.js";

/** Extends a hull light item with rotation and inner and outer cone angles for spot-light emission. */
// Carbon derives this from EveSOFDataHullLightSetItem (EveSOFData.h:
// 1422-1429) and maps the full base surface (including lightColor) plus
// rotation, innerAngle, and outerAngle (EveSOFData_Blue.cpp:1096-1114).
@type.define({ className: "EveSOFDataHullLightSetSpotLight", family: "eve" })
export class EveSOFDataHullLightSetSpotLight extends EveSOFDataHullLightSetItem
{

  /** m_data.rotation (Quaternion) [READWRITE, PERSIST] */
  @edit.persist
  @type.quat
  rotation = quat.create();

  /** m_data.innerAngle (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  innerAngle = 0;

  /** m_data.outerAngle (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  outerAngle = 0;

}
