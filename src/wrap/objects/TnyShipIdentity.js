import { meta, type } from "#schema";
import { TnySpaceObjectIdentity } from "./TnySpaceObjectIdentity.js";

/**
 * What a ship is: a space object's identity plus the skin it wears, either a
 * CCP skin or a SKINR design, never both. Ours, read-only.
 * @cjs
 */
@meta.define({ name: "TnyShipIdentity" })
@meta.exposureChainTo(TnySpaceObjectIdentity)
export class TnyShipIdentity extends TnySpaceObjectIdentity
{

    /**
     * A CCP skin, or null.
     * @type {TnySkinIdentity|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.object.ref("TnySkinIdentity")
    skin = null;

    /**
     * A SKINR design, or null.
     * @type {TnySkinrIdentity|null}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.object.ref("TnySkinrIdentity")
    skinr = null;

    /**
     * Stable identity for diagnostics and registration.
     * @type {string}
     * @cjs
     */
    static className = "TnyShipIdentity";

}
