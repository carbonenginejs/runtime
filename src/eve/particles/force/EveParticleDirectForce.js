// Source: E:\carbonengine\trinity\trinity\Eve\EveParticleDirectForce.h
// Source: E:\carbonengine\trinity\trinity\Eve\EveParticleDirectForce_Blue.cpp
import { type } from "@carbonenginejs/runtime-utils/schema";
import { Tr2ParticleDirectForce } from "../../../particle/Tr2ParticleDirectForce.js";


/**
 * Blue alias of Tr2ParticleDirectForce - Carbon registers the Eve name with
 * zero attributes of its own and chains the whole exposure to the Tr2 class.
 */
@type.define({ className: "EveParticleDirectForce", family: "eve" })
export class EveParticleDirectForce extends Tr2ParticleDirectForce
{
}
