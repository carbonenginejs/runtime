import { meta, type } from "#schema";
import { ICjsGraphRoot } from "../../global/model/graph/ICjsGraphRoot.js";

/**
 * A CCP skin a ship wears, read-only. Ours. Null where it is not known.
 * @cjs
 */
@meta.define({ name: "TnySkinIdentity" })
@meta.exposureChainTo(ICjsGraphRoot)
export class TnySkinIdentity extends ICjsGraphRoot
{

    /**
     * The SDE skin ID.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.int32
    skinID = null;

    /**
     * The skin's name.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.string
    name = null;

    /**
     * The SOF material set it applies.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.string
    material = null;

    /**
     * Stable identity for diagnostics and registration.
     * @type {string}
     * @cjs
     */
    static className = "TnySkinIdentity";

}
