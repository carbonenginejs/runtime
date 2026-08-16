import { CjsPickleFormat } from "../formats/pickle/index.js";
import { CjsSchemaBoundFormat } from "../formats/schemabound/index.js";
import { CjsSqliteFormat } from "../formats/sqlite/index.js";
import { CJS_STATIC_FAMILIES, CjsStaticFormat } from "../formats/static/index.js";

/**
 * Reads a client `.static` container of whichever family it holds.
 *
 * `.static` names a role rather than a format, and three unrelated containers
 * wear the extension, so identification and decoding are separate jobs done by
 * separate formats. `CjsStaticFormat` says which family the bytes hold and
 * decodes nothing; these functions take that answer to the format that owns the
 * family. Nothing routes on the extension, which proves nothing.
 *
 * This composition lives beside `CjsStaticFormat` rather than inside it. The
 * identification class dispatched to two other formats until 2026-08-15, which
 * made an identification format the routing table for two others; that is not
 * being undone. Routing is a separate module that happens to know all four.
 *
 * Nothing here is specific to one publisher or one export. Measured 2026-08-16
 * across three publishers at builds 3466501, 3466054 and 3466057: 45 `.static`
 * files on each, split 14 SQLite, 25 embedded-schema and 6 schema-companion,
 * with not one file unique to a publisher and not one that changes family
 * between them.
 */

const CACHE_TABLE = "cache";

/** Raises a family mismatch, naming what was found and what was wanted. */
function FamilyError(path, found, wanted, reason)
{
    const error = new TypeError(
        `${path} is a ${found} .static container, not a ${wanted} one.${reason ? ` ${reason}` : ""}`,
    );

    error.code = "CJS_STATIC_FORMAT_FAMILY_UNSUPPORTED";
    error.family = found;
    error.path = path;

    return error;
}

/**
 * Reads the SQLite family into records keyed by their container key.
 *
 * The record shape is the container's own: a `cache` table of `key`, `value`
 * and `time`, where every `value` is a JSON document.
 *
 * @param {Uint8Array|ArrayBuffer} bytes Container bytes.
 * @param {string} [path] Logical path, for error messages.
 * @returns {Promise<object>} Records keyed by their container key.
 */
export async function ReadStaticContainer(bytes, path = ".static input")
{
    const probe = await CjsStaticFormat.resolveType(bytes);

    if (probe.preferred !== CJS_STATIC_FAMILIES.SQLITE)
    {
        throw FamilyError(path, probe.preferred, CJS_STATIC_FAMILIES.SQLITE, probe.reason);
    }

    const tables = CjsSqliteFormat.readJSON(bytes, { tables: [ CACHE_TABLE ] });
    const rows = tables[CACHE_TABLE];

    if (!Array.isArray(rows))
    {
        const error = new TypeError(`${path} has no ${CACHE_TABLE} table.`);

        error.code = "CJS_STATIC_FORMAT_SHAPE_INVALID";
        error.path = path;
        throw error;
    }

    const records = {};

    for (const row of rows)
    {
        records[String(row.key)] = ParseRecord(row.value, row.key, path);
    }

    return records;
}

/**
 * Reads the family whose schema is embedded ahead of the payload.
 *
 * The framing is a `uint32` schema length, the schema as a protocol-0 pickle,
 * and then a payload in exactly the container `CjsSchemaBoundFormat` reads. It
 * is the same format as the `.schema` sibling family; only the schema's encoding
 * differs.
 *
 * **Slice the schema exactly.** Handing the whole file to a pickle reader fails,
 * but it fails on the payload's bytes long after the schema has parsed, so the
 * error names an opcode and points nowhere near the real boundary. That reading
 * is what left this family classified as a separate self-describing format for
 * as long as it was.
 *
 * @param {Uint8Array|ArrayBuffer} bytes Container bytes.
 * @param {string} [path] Logical path, for error messages.
 * @returns {object|Array} Decoded records.
 */
export function ReadEmbeddedSchemaContainer(bytes, path = ".static input")
{
    const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

    if (source.byteLength < 4)
    {
        const error = new TypeError(`${path} is too short to carry a schema length.`);

        error.code = "CJS_STATIC_FORMAT_SHAPE_INVALID";
        error.path = path;
        throw error;
    }

    const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
    const length = view.getUint32(0, true);

    if (length <= 0 || length + 4 > source.byteLength)
    {
        const error = new TypeError(`${path} does not begin with a usable schema length.`);

        error.code = "CJS_STATIC_FORMAT_SHAPE_INVALID";
        error.path = path;
        throw error;
    }

    return CjsSchemaBoundFormat.read(source.subarray(4 + length), {
        schema: CjsPickleFormat.read(source.subarray(4, 4 + length)),
    });
}

/**
 * Reads the family whose layout lives in a `.schema` sibling.
 *
 * The family check is worth keeping even though the caller already fetched a
 * `.schema` alongside the payload, because these bytes carry no signature at
 * all - given the wrong schema they decode into plausible nonsense rather than
 * failing, so the one cheap guard there is belongs in the path.
 *
 * @param {Uint8Array|ArrayBuffer} bytes Container bytes.
 * @param {Uint8Array|ArrayBuffer|string|object} schema The sibling `.schema`.
 * @param {string} [path] Logical path, for error messages.
 * @returns {Promise<object|Array>} Decoded records.
 */
export async function ReadSchemaBoundContainer(bytes, schema, path = ".static input")
{
    const probe = await CjsStaticFormat.resolveType(bytes);

    // The schema-bound family is the one with nothing to recognize, so it is
    // reported as `unknown` with `requires: "schema"` rather than named outright.
    if (probe.preferred !== CJS_STATIC_FAMILIES.UNKNOWN)
    {
        throw FamilyError(path, probe.preferred, "schema-bound", null);
    }

    return CjsSchemaBoundFormat.read(bytes, { schema });
}

/** Parses one stored JSON document, naming the record that failed. */
function ParseRecord(value, key, path)
{
    try
    {
        return JSON.parse(value);
    }
    catch (cause)
    {
        const error = new TypeError(`${path} record ${key} is not JSON.`, { cause });

        error.code = "CJS_STATIC_FORMAT_RECORD_INVALID";
        error.key = String(key);
        error.path = path;
        throw error;
    }
}
