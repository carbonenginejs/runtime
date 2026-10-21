import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdDictOffsetLookup.h

/**
 * Where a dict value sits, from the dict's key footer
 * (FsdDictOffsetLookup.h:11-15).
 *
 * `offset` is relative to the dict's data start. `size` is -1 when the footer
 * records no sizes; Carbon stores it as `int32_t`.
 */
export class FooterOffsetSize
{
    /** @type {number} Value offset, as `uint32_t`. */
    offset = 0;

    /** @type {number} Value byte size, as `int32_t`; -1 when unknown. */
    size = 0;

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "FooterOffsetSize";
}

export default FooterOffsetSize;

CjsSchema.meta.carbon("FooterOffsetSize")(FooterOffsetSize);
