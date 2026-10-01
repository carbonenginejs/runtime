import { assertNonEmptyString, assertPlainObject } from "#utils/validation";

/**
 * CPU result contracts for injected ship-identity and raw SDE record getters.
 * Providers own normalization, joins, missing-row decisions and acquisition.
 * Validators return the original result without copying, filling or freezing it.
 */

/**
 * A resolved ship identity carrying DNA and the selected published-SKIN join.
 * Additional provider metadata is retained. All IDs are nonblank strings or
 * explicit nulls; numeric IDs are not coerced. A direct graphic may have no type.
 * Without a selected skin all three material IDs are null; a selected skin
 * supplies all three. SKINR generated-pattern results use a separate contract.
 *
 * @typedef {Object} IdentityResult
 * @property {string} dna
 * @property {string|null} typeID
 * @property {string} graphicID
 * @property {string|null} skinID
 * @property {string|null} skinMaterialID
 * @property {string|null} materialSetID
 * @property {string|null} graphicMaterialSetID
 */

/**
 * A raw type row with its provider-normalized ID. All other fields remain raw:
 * graphicID and name may be absent, and a name may be a string or language map.
 *
 * @typedef {Object} TypeRecord
 * @property {string} id Nonblank string ID.
 */

/**
 * A raw graphic row with its provider-normalized ID. SOF fields and graphicFile
 * are optional; the existence of a graphic row does not imply ship buildability.
 *
 * @typedef {Object} GraphicRecord
 * @property {string} id Nonblank string ID.
 */

/**
 * A raw published-SKIN row with its provider-normalized ID. Optional names,
 * types and foreign IDs retain their source values; this is not a resolved join.
 *
 * @typedef {Object} SkinRecord
 * @property {string} id Nonblank string ID.
 */

/**
 * Validates the required identity fields and returns the same result reference.
 * DNA must have hull, faction and race selections, rather than be a resource
 * path. Catalog names, modifier commands and material compatibility are checked
 * by SOF, not by this boundary. No provider fallback or ID normalization occurs.
 *
 * @param {unknown} value
 * @returns {IdentityResult}
 * @throws {TypeError} If the result has missing, malformed or inconsistent fields.
 */
export function validateIdentityResult(value)
{
    const result = assertPlainObject(value, "IdentityResult");
    assertDna(result.dna);
    assertNonEmptyString(result.graphicID, "IdentityResult.graphicID");
    if (result.typeID !== null)
    {
        assertNonEmptyString(result.typeID, "IdentityResult.typeID");
    }
    if (result.skinID !== null)
    {
        assertNonEmptyString(result.skinID, "IdentityResult.skinID");
    }

    for (const field of [ "skinMaterialID", "materialSetID", "graphicMaterialSetID" ])
    {
        if (result.skinID === null)
        {
            if (result[field] !== null)
            {
                throw new TypeError(`IdentityResult.${field} must be null when IdentityResult.skinID is null.`);
            }
        }
        else
        {
            assertNonEmptyString(result[field], `IdentityResult.${field}`);
        }
    }

    return result;
}

/**
 * Returns the same raw type row, or null for a provider-confirmed absent row.
 * Only the object shape and id are validated; optional/raw fields are preserved.
 * Undefined or malformed results throw rather than being treated as not found.
 *
 * @param {unknown} value
 * @returns {TypeRecord|null}
 * @throws {TypeError}
 */
export function validateTypeRecord(value)
{
    return validateRecord(value, "TypeRecord");
}

/**
 * Returns the same raw graphic row, or null for a provider-confirmed absent row.
 * No SOF fields are required and graphicFile is not interpreted as DNA.
 * Undefined or malformed results throw rather than being treated as not found.
 *
 * @param {unknown} value
 * @returns {GraphicRecord|null}
 * @throws {TypeError}
 */
export function validateGraphicRecord(value)
{
    return validateRecord(value, "GraphicRecord");
}

/**
 * Returns the same raw published-SKIN row, or null for a confirmed absent row.
 * No compatibility join is required; numeric foreign IDs and optional fields
 * remain untouched. Undefined or malformed results throw.
 *
 * @param {unknown} value
 * @returns {SkinRecord|null}
 * @throws {TypeError}
 */
export function validateSkinRecord(value)
{
    return validateRecord(value, "SkinRecord");
}

function validateRecord(value, label)
{
    if (value === null) return null;
    assertPlainObject(value, label);
    assertNonEmptyString(value.id, `${label}.id`);
    return value;
}

function assertDna(value)
{
    const dna = assertNonEmptyString(value, "IdentityResult.dna");
    const selections = dna.split(":", 3);
    // isDNA restricts catalog names to word characters/hyphens. This boundary
    // leaves their spelling, modular hulls and modifier interpretation to SOF.
    if (selections.length !== 3 || selections.some(part => part.trim() === "")
        || /^[a-z][a-z\d+.-]*:[\\/]/i.test(dna))
    {
        throw new TypeError("IdentityResult.dna must contain hull:faction:race selections, not a resource path.");
    }
}
