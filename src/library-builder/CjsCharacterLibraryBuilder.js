import { CjsCharacterDocumentLibrary } from "../library/CjsCharacterDocumentLibrary.js";

/** Builds a deterministic character-library document from caller-supplied JSON. */
export class CjsCharacterLibraryBuilder
{

    static schema = CjsCharacterDocumentLibrary.schema;

    static schemaVersion = CjsCharacterDocumentLibrary.schemaVersion;

    /** Builds one source-neutral library from keyed or named JSON documents. */
    static build(documents = {}, options = {})
    {
        return CjsCharacterDocumentLibrary.create(documents, options);
    }

    /** Builds from the single plain input object used by acquisition adapters. */
    static buildFromInputs(input = {})
    {
        if (!input || typeof input !== "object" || Array.isArray(input))
        {
            throw new TypeError("Character library builder input must be a plain object");
        }

        const {
            documents,
            ...options
        } = input;

        if (documents === undefined)
        {
            throw new TypeError("Character library builder input must define documents");
        }

        return this.build(documents, options);
    }

    /** Validates a source-document library without mutating it. */
    static validate(value)
    {
        return CjsCharacterDocumentLibrary.validate(value);
    }

    /** Stringifies a validated character library deterministically. */
    static stringify(value, options = {})
    {
        this.validate(value);
        return options.compact
            ? JSON.stringify(value)
            : JSON.stringify(value, null, 2);
    }

}

export default CjsCharacterLibraryBuilder;
