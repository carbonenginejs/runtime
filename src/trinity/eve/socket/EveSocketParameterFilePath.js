// Source: trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern.
import { type } from "#schema";
import { EveSocketParameterString } from "./EveSocketParameterString.js";

/**
 * Specializes the string socket parameter for authored file paths while
 * retaining the same binding and restoration behavior. Carbon derives it from
 * EveSocketParameterString without adding members; only the editor widget
 * differs.
 */
@type.define({ className: "EveSocketParameterFilePath", family: "eve/socket" })
export class EveSocketParameterFilePath extends EveSocketParameterString
{
}
