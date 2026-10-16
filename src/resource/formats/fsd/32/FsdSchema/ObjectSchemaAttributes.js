import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdSchema.h
// Source: fsd/FsdSchema.cpp

/** @typedef {import("./FsdSchemaAttributes.js").FsdSchemaAttributes} FsdSchemaAttributes */

/**
 * Attribute schemas and binary layout of an object schema (FsdSchema.h:72-84,
 * FsdSchema.cpp:9-20).
 *
 * Carbon's `std::map` members become `Map`s. The bit masks in
 * `optionalValueLookups` are `uint64_t` in Carbon, so they are BigInts here.
 */
export class ObjectSchemaAttributes
{
    /** @type {Map<string, FsdSchemaAttributes>} Schema of each attribute, by name. */
    attributes = new Map();

    /** @type {Map<string, number>} Byte offset of each fixed-position attribute from the object start. */
    constantAttributeOffsets = new Map();

    /** @type {number} Byte offset of the optional-attribute bit field. */
    endOfFixedSizedData = 0;

    /** @type {Array<string>} Variable-offset attributes, in offset-table order. */
    attributesWithVariableOffset = [];

    /** @type {Map<string, bigint>} Presence bit of each optional attribute. */
    optionalValueLookups = new Map();

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "ObjectSchemaAttributes";
}

export default ObjectSchemaAttributes;

CjsSchema.blue.define(ObjectSchemaAttributes, { className: "ObjectSchemaAttributes" });
