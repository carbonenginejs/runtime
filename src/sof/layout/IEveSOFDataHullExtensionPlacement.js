import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { blue } from "#schema";

/** Empty Carbon marker interface for hull-extension placement list members (EveSOFData.h:1911-1915). */
@be.interface("IEveSOFDataHullExtensionPlacement")
@blue.inherit(IRoot)
export class IEveSOFDataHullExtensionPlacement extends IRoot
{

}
