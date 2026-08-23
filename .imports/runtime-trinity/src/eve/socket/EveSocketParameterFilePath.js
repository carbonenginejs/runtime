// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/SocketParameters/EveSocketParameter.h
// Hand-authored following the eve/socket generated pattern.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { EveSocketParameterString } from "./EveSocketParameterString.js";

/**
 * EveSocketParameterFilePath (eve/socket) - Carbon derives it from
 * EveSocketParameterString with no members of its own (only the editor
 * widget differs).
 */
@type.define({ className: "EveSocketParameterFilePath", family: "eve/socket" })
export class EveSocketParameterFilePath extends EveSocketParameterString
{
}
