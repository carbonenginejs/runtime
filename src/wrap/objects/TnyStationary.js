import { meta } from "#schema";
import { EveStation2 } from "../../trinity/eve/spaceObject/EveStation2.js";
import { TnySpaceObject } from "./TnySpaceObject.js";

/**
 * A station or structure (EveStation2). Ours, after ccpwgl's TnyStationary.
 * @cjs
 */
@meta.define({ name: "TnyStationary" })
@meta.exposureChainTo(TnySpaceObject)
export class TnyStationary extends TnySpaceObject
{

    /**
     * Native class accepted by this wrapper.
     * @type {Function}
     * @cjs
     */
    static wrappedClass = EveStation2;

    /**
     * Stable identity for diagnostics and registration.
     * @type {string}
     * @cjs
     */
    static className = "TnyStationary";

}
