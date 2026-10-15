// Source: trinity/trinity/Eve/EveParticleDirectForce.h
// Source: trinity/trinity/Eve/EveParticleDirectForce_Blue.cpp
import { blue } from "#schema";
import { Tr2ParticleDirectForce } from "../../../particle/force/Tr2ParticleDirectForce.js";


/**
 * Blue alias of Tr2ParticleDirectForce - Carbon registers the Eve name with
 * zero attributes of its own and chains the whole exposure to the Tr2 class.
 */
@blue.define("EveParticleDirectForce")
export class EveParticleDirectForce extends Tr2ParticleDirectForce
{
}
