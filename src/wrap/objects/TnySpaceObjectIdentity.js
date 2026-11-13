import { meta, type } from "#schema";
import { CjsBlueGraph } from "../../blue/formats/graph/CjsBlueGraph.js";
import { ICjsGraphRoot } from "../../global/model/graph/ICjsGraphRoot.js";

/**
 * What a space object is, filled in by the library and read-only to a UI:
 * separate from the user's writable `name`. Ours. Null where it is not known.
 * @cjs
 */
@meta.define({ className: "TnySpaceObjectIdentity" })
@meta.exposureChainTo(ICjsGraphRoot)
export class TnySpaceObjectIdentity extends ICjsGraphRoot
{

    /**
     * The DNA the object was built from.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.string
    dna = null;

    /**
     * The SDE type ID.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.int32
    typeID = null;

    /**
     * The SDE type name.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.string
    typeName = null;

    /**
     * The SDE graphic ID.
     * @type {number|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.int32
    graphicID = null;

    /**
     * The SOF hull.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.string
    hull = null;

    /**
     * The SOF faction.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.string
    faction = null;

    /**
     * The SOF race.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.string
    race = null;

    /**
     * Stable identity for diagnostics and registration.
     * @type {string}
     * @cjs
     */
    static className = "TnySpaceObjectIdentity";

}

CjsBlueGraph.define(TnySpaceObjectIdentity, "TnySpaceObjectIdentity");
