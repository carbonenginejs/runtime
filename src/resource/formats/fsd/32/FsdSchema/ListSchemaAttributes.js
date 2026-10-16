import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdSchema.h
// Source: fsd/FsdSchema.cpp

/** @typedef {import("./FsdSchemaAttributes.js").FsdSchemaAttributes} FsdSchemaAttributes */

/**
 * Item schema and fixed length of a list schema (FsdSchema.h:48-56,
 * FsdSchema.cpp:40-49).
 *
 * A list with `length` in its schema stores no count; `fixedSized` and
 * `listSize` carry it instead.
 */
export class ListSchemaAttributes
{
    /** @type {FsdSchemaAttributes|null} Schema of every item. */
    listItemSchema = null;

    /** @type {boolean} True when the schema declared `length`. */
    fixedSized = false;

    /** @type {number} The declared length, as `uint32_t`. */
    listSize = 0;

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "ListSchemaAttributes";
}

export default ListSchemaAttributes;

CjsSchema.blue.define(ListSchemaAttributes, { className: "ListSchemaAttributes" });
