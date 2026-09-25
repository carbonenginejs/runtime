import { CjsFsd64SchemaDecoder } from "./CjsFsd64SchemaDecoder.js";

/**
 * Base class for file-specific readers defined by JSON-shaped JavaScript layouts.
 */
export class CjsFsd64SchemaReader
{
    /**
     * Decodes bytes to the existing private Map-based reader representation.
     */
    Read(bytes)
    {
        return CjsFsd64SchemaDecoder.read(bytes, this.constructor.getFsdSchema());
    }

    /**
     * Decodes bytes to a plain JSON-compatible value with lossless identities.
     */
    ReadJSON(bytes)
    {
        return CjsFsd64SchemaDecoder.readJSON(bytes, this.constructor.getFsdSchema());
    }

    /**
     * Returns the binary-layout schema owned by a reader class: the same
     * validated JSON-shaped object on every call, defined inline on the
     * subclass (for example `CjsFsd64SchemaRaces`) with no backing property.
     * Named `getFsdSchema` so `schema`/`getSchema` stay free for the
     * `CjsModel` schema namespace.
     */
    static getFsdSchema()
    {
        throw new Error("FSD schema reader must define static getFsdSchema().");
    }

    /** Bind one inline schema to a subclass-owned getFsdSchema function. */
    static bindFsdSchema(schema)
    {
        return () => schema;
    }

    /** Returns the logical resource path declared by the schema. */
    static get path()
    {
        return this.getFsdSchema().path;
    }

    /** Returns the binary schema identity declared by the schema. */
    static get schemaID()
    {
        return this.getFsdSchema().schemaID;
    }

}

export default CjsFsd64SchemaReader;
