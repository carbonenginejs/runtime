// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Empty Carbon marker interface for hull locator-set list members (EveSOFData.h:1107-1111). */
@type.define({ className: "IEveSOFDataHullLocatorSet", family: "eve" })
export class IEveSOFDataHullLocatorSet extends CjsModel
{

}
