import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
import { blue } from "#schema";

/** Empty Carbon marker interface for hull locator-set list members (EveSOFData.h:1107-1111). */
@be.interface("IEveSOFDataHullLocatorSet")
@blue.inherit(IRoot)
export class IEveSOFDataHullLocatorSet extends IRoot
{

}
