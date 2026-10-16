import { CjsSchema } from "#schema/CjsSchema";

import { CjsFsd64SchemaDecoder } from "./CjsFsd64SchemaDecoder.js";

/**
 * Base class for file-specific readers defined by JSON-shaped JavaScript layouts.
 */
export class CjsFsd64SchemaReader
{
    /**
     * Decodes bytes to the existing private Map-based reader representation.
     *
     * @param {ArrayBuffer|ArrayBufferView} bytes Container bytes.
     * @returns {Map<(number|string|bigint), unknown>|Object<string, unknown>} The decoded root.
     */
    Read(bytes)
    {
        return CjsFsd64SchemaDecoder.read(bytes, this.constructor.getFsdSchema());
    }

    /**
     * Decodes bytes to a plain JSON-compatible value with lossless identities.
     *
     * @param {ArrayBuffer|ArrayBufferView} bytes Container bytes.
     * @returns {Object<string, unknown>} The plain decoded value.
     */
    ReadJSON(bytes)
    {
        return CjsFsd64SchemaDecoder.readJSON(bytes, this.constructor.getFsdSchema());
    }

    /**
     * Returns the binary-layout schema owned by a reader class: the same
     * validated JSON-shaped object on every call, defined inline on the
     * subclass (a caller-supplied table schema) with no backing property.
     * The explicit getFsdSchema name distinguishes binary layout data from
     * runtime class metadata.
     *
     * @returns {import("./CjsFsd64SchemaDecoder.js").CjsFsdSchema} The class's schema.
     * @throws {Error} On the base class, which defines no schema.
     */
    static getFsdSchema()
    {
        throw new Error("FSD schema reader must define static getFsdSchema().");
    }

    /**
     * Bind one inline schema to a subclass-owned getFsdSchema function.
     *
     * @param {import("./CjsFsd64SchemaDecoder.js").CjsFsdSchema} schema Schema to return.
     * @returns {function(): import("./CjsFsd64SchemaDecoder.js").CjsFsdSchema} A function returning the schema.
     */
    static bindFsdSchema(schema)
    {
        return () => schema;
    }

    /**
     * Returns the logical resource path declared by the schema.
     *
     * @returns {string} The schema path.
     */
    static get path()
    {
        return this.getFsdSchema().path;
    }

    /**
     * Returns the binary schema identity declared by the schema.
     *
     * @returns {string} The schema identity.
     */
    static get schemaID()
    {
        return this.getFsdSchema().schemaID;
    }

}

export default CjsFsd64SchemaReader;

CjsSchema.meta.define(CjsFsd64SchemaReader, { className: "CjsFsd64SchemaReader" });
