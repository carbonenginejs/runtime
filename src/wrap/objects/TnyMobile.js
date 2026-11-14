import { meta, type } from "#schema";
import { BlueList } from "#blue";
import { EveMobile } from "../../trinity/eve/spaceObject/EveMobile.js";
import { TnySpaceObject } from "./TnySpaceObject.js";
import { TnySlot } from "./TnySlot.js";

/**
 * A space object that moves (EveMobile): adds its weapon slots. Ours, after
 * ccpwgl's TnyMobile. Slots are hull facts, found once from its locators.
 * @cjs
 */
@meta.define({ name: "TnyMobile" })
@meta.exposureChainTo(TnySpaceObject)
export class TnyMobile extends TnySpaceObject
{

    /**
     * The weapon slots (TnySlot) the hull's locators define; empty when it has none.
     * @type {BlueList}
     * @cjs
     */
    @meta.mapAttribute(meta.READ)
    @type.list("TnySlot")
    slots = new BlueList(TnySlot, { className: "TnySlot" });

    /**
     * Finds the slots once, then the rest.
     * @param {string|null} dna SOF DNA, or null when unknown.
     * @cjs
     */
    _Discover(dna)
    {
        super._Discover(dna);
        if (this.slots.length === 0) for (const slot of TnySlot.discover(this)) this.slots.Append(slot);
    }

    /**
     * Adds "weapons" when the hull has slots.
     * @returns {string[]}
     * @cjs
     */
    _Interfaces()
    {
        return this.slots.length ? [ ...super._Interfaces(), "weapons" ] : super._Interfaces();
    }

    /**
     * Detaches the slots too.
     * @cjs
     * @param {object} [options] What Destruct was given.
     * @returns {boolean} What the parent's OnDestruct answers.
     */
    OnDestruct(options)
    {
        for (const slot of this.slots) slot.Destruct();
        return super.OnDestruct(options);
    }

    /**
     * Native class accepted by this wrapper.
     * @type {Function}
     * @cjs
     */
    static wrappedClass = EveMobile;

    /**
     * Stable identity for diagnostics and registration.
     * @type {string}
     * @cjs
     */
    static className = "TnyMobile";

}
