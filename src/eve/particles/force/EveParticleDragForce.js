// Source: E:\carbonengine\trinity\trinity\Eve\EveParticleDragForce.h
// Source: E:\carbonengine\trinity\trinity\Eve\EveParticleDragForce_Blue.cpp
import { type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2ParticleDragForce } from "../../../particle/Tr2ParticleDragForce.js";


/**
 * Blue alias of Tr2ParticleDragForce - Carbon registers the Eve name with
 * zero attributes of its own and chains the whole exposure to the Tr2 class.
 */
@type.define({ className: "EveParticleDragForce", family: "eve" })
export class EveParticleDragForce extends Tr2ParticleDragForce
{
}
