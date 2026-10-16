import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdDictOffsetLookup.h
// Source: fsd/FsdDictOffsetLookup.cpp
import { FsdList } from "../FsdList.js";
import { FsdDictOffsetLookup, OFFSET_LOOKUP_RESULT } from "./FsdDictOffsetLookup.js";

/** @typedef {import("../FsdSchema/FsdSchemaAttributes.js").FsdSchemaAttributes} FsdSchemaAttributes */
/** @typedef {import("./FooterOffsetSize.js").FooterOffsetSize} FooterOffsetSize */

/**
 * The index for any other key type
 * (FsdDictOffsetLookup.h:70-80, FsdDictOffsetLookup.cpp:180-199).
 *
 * Carbon wraps the footer in an {@link FsdList} and never searches it: every
 * lookup reports an invalid key and `Contains` is always false, so a dict
 * keyed by `unicode`, `float` or anything but int and string cannot be read
 * (CE-120). The port keeps that.
 */
export class SlowBinarySearchOffsetLookup extends FsdDictOffsetLookup
{
    /** @type {FsdList|null} The key footer as a list. */
    _list = null;

    /**
     * Wrap the footer.
     *
     * @param {Uint8Array} footerData The dict's key footer.
     * @param {FsdSchemaAttributes} s The key footer's list schema.
     * @param {boolean} hasSize True when entries carry a size; unused.
     */
    constructor(footerData, s, hasSize)
    {
        super();
        this._list = FsdList.createFsdList(footerData, 0, s, "offsetFooter");
    }

    /**
     * Always fail (FsdDictOffsetLookup.cpp:190-193).
     *
     * @param {unknown} key Lookup key; unused.
     * @param {FooterOffsetSize} fos Left unchanged.
     * @returns {number} Always OFFSET_LOOKUP_ERROR_INVALID_KEY.
     */
    GetOffsetAndSize(key, fos)
    {
        return OFFSET_LOOKUP_RESULT.OFFSET_LOOKUP_ERROR_INVALID_KEY;
    }

    /**
     * Always report absence (FsdDictOffsetLookup.cpp:195-199).
     *
     * @param {unknown} key Lookup key; unused.
     * @returns {boolean} Always false.
     */
    Contains(key)
    {
        return false;
    }

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "SlowBinarySearchOffsetLookup";
}

export default SlowBinarySearchOffsetLookup;

CjsSchema.blue.define(SlowBinarySearchOffsetLookup, { className: "SlowBinarySearchOffsetLookup" });
