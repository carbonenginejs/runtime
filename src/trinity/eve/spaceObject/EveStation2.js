// Source: trinity/trinity/Eve/SpaceObject/EveStation2.h
import { meta } from "#schema";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";
import { IEveSpaceObject2 } from "../IEveSpaceObject2.js";

import { EveSpaceObject2 } from "./EveSpaceObject2.js";

/**
 * Concrete station space-object root. Carbon adds no Blue fields; its only
 * overrides are renderer-owned: GetBatches forwards to the base accumulator
 * and PrepareShaderData scales the ship shader data's y component by
 * activationStrength. Both stay with the per-object-data/render adapters.
 */
@meta.define({ className: "EveStation2", family: "eve/spaceObject" })
@meta.blue.interface(IEveSpaceObject2, ITr2Renderable)
@meta.blue.chainTo(EveSpaceObject2)
export class EveStation2 extends EveSpaceObject2
{

}

// EveStation2_Blue.cpp: native exposure.
