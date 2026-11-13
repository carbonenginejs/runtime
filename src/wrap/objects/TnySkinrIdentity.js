import { meta, type } from "#schema";
import { CjsBlueGraph } from "../../blue/formats/graph/CjsBlueGraph.js";
import { ICjsGraphRoot } from "../../global/model/graph/ICjsGraphRoot.js";

/**
 * A SKINR design a ship wears, read-only. Ours. Its look (pattern and mesh
 * colours) is DNA and values, not identity. Null where it is not known.
 * @cjs
 */
@meta.define({ className: "TnySkinrIdentity" })
@meta.exposureChainTo(ICjsGraphRoot)
export class TnySkinrIdentity extends ICjsGraphRoot
{

    /**
     * The design's name.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.string
    name = null;

    /**
     * Who designed it.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.string
    author = null;

    /**
     * The design line it belongs to.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.string
    line = null;

    /**
     * Who sells it.
     * @type {string|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.string
    seller = null;

    /**
     * Stable identity for diagnostics and registration.
     * @type {string}
     * @cjs
     */
    static className = "TnySkinrIdentity";

}

CjsBlueGraph.define(TnySkinrIdentity, "TnySkinrIdentity");
