// Source: fsd/FsdSchema.h
// Source: fsd/FsdSchema.cpp
import { FsdSchemaAttributes } from "./FsdSchemaAttributes.js";

/**
 * Key, value and key-footer schemas of a dict schema (FsdSchema.h:58-70,
 * FsdSchema.cpp:22-37).
 *
 * Carbon's constructor allocates all three child schemas, so a dict schema
 * always has them, even before CreateDictSchema fills them. `indexBy` is
 * declared and initialised but CreateDictSchema never reads it.
 */
export class DictSchemaAttributes
{
    /** @type {boolean} The schema's `multiIndex` flag. */
    multiIndex = false;

    /** @type {boolean} The schema's `buildIndex` flag. */
    buildIndex = false;

    /** @type {string} Never set by Carbon; kept for shape. */
    indexBy = "";

    /** @type {FsdSchemaAttributes} Schema of the keys. */
    keySchema = new FsdSchemaAttributes();

    /** @type {FsdSchemaAttributes} Schema of the values. */
    valueSchema = new FsdSchemaAttributes();

    /** @type {FsdSchemaAttributes} Schema of the key footer: a list of key/offset objects. */
    keyFooterSchema = new FsdSchemaAttributes();

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "DictSchemaAttributes";
}

export default DictSchemaAttributes;
