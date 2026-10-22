import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern.
import { IEveSocketParameter } from "./IEveSocketParameter.js";
import { EveSocketParameterString } from "./EveSocketParameterString.js";

/**
 * Specializes the string socket parameter for authored file paths while
 * retaining the same binding and restoration behavior. Carbon derives it from
 * EveSocketParameterString without adding members; only the editor widget
 * differs.
 */
@be.define("EveSocketParameterFilePath")
@be.mapInterface(IEveSocketParameter)
@be.mapMethodAndWrap([ "Used", "SetValueToDefault" ])
@be.mapAttribute(be.READWRITE | be.PERSIST, "name")
@be.mapAttribute(be.READWRITE | be.PERSIST, "value")
export class EveSocketParameterFilePath extends EveSocketParameterString
{
}
