import { CjsSchema } from "#schema/CjsSchema";

// Source: fsd/FsdSchema.h

/**
 * Alias table of a vector schema (FsdSchema.h:42-46).
 *
 * `aliases` maps a component name to its index, which Carbon narrows to
 * `uint8_t`.
 */
export class VectorSchemaAttributes
{
    /** @type {boolean} True when the schema declared `aliases`. */
    hasAliases = false;

    /** @type {Map<string, number>} Component index by alias name. */
    aliases = new Map();

    /** Registered name; `constructor.name` does not survive minification. */
    static className = "VectorSchemaAttributes";
}

export default VectorSchemaAttributes;

CjsSchema.meta.carbon("VectorSchemaAttributes")(VectorSchemaAttributes);
