// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Empty Carbon marker interface for hull-extension placement list members (EveSOFData.h:1911-1915). */
@type.define({ className: "IEveSOFDataHullExtensionPlacement", family: "eve" })
export class IEveSOFDataHullExtensionPlacement extends CjsModel
{

}
