// Source: trinity/trinity/Eve/EveParticleSpringAttractor.h
// Source: trinity/trinity/Eve/EveParticleSpringAttractor_Blue.cpp
import { type } from "#schema";
import { Tr2ParticleSpring } from "../../../particle/force/Tr2ParticleSpring.js";


/**
 * Blue alias of Tr2ParticleSpring - Carbon registers the Eve name (from the
 * ...SpringAttractor source files) with zero attributes of its own and chains
 * the whole exposure to the Tr2 class.
 */
@type.define({ className: "EveParticleSpring", family: "eve" })
export class EveParticleSpring extends Tr2ParticleSpring
{
}
