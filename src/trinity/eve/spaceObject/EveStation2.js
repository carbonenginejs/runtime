// Source: trinity/trinity/Eve/SpaceObject/EveStation2.h
import { type } from "#schema";
import { EveSpaceObject2 } from "./EveSpaceObject2.js";

/**
 * Concrete station space-object root. Carbon adds no Blue fields; its only
 * overrides are renderer-owned: GetBatches forwards to the base accumulator
 * and PrepareShaderData scales the ship shader data's y component by
 * activationStrength. Both stay with the per-object-data/render adapters.
 */
@type.define({ className: "EveStation2", family: "eve/spaceObject" })
export class EveStation2 extends EveSpaceObject2
{

}
