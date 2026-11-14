// Field flags: which declared fields readers, writers and the values interface see. Blue's readers and writers
// (IRootReader, IRootWriter) and the schema use these; they are not the values interface.


/**
 * Whether a declared field accepts an incoming value.
 *
 * The JS values import accepts WRITE, PERSIST and RPERSIST independently.
 * RPERSIST follows BlueTypes' load-only contract, including where the donor's
 * DictReader currently checks only PERSIST. This is a serialization service,
 * not BluePyWrap property access; unflagged declared fields retain JS support.
 *
 * @param {object} field
 * @returns {Boolean}
 */
export function isWritableField(field)
{
    if (field?.type?.runtimeOnly === true) return false;
    const edit = field?.edit;
    if (!edit) return true;
    if (edit.write || edit.persist || edit.rpersist || edit.persistOnly) return true;
    if (edit.read && !edit.write) return false;
    return true;
}


/**
 * Whether a declaration takes part in persistence and the values transport.
 *
 * A stored member always does. A property (Carbon's `MAP_PROPERTY*` row) does
 * only when it is PERSIST: `DictReader::FindEntry` matches a property only on
 * PERSIST (blue/src/DictReader.cpp:706), and `MAP_PROPERTY_PERSISTED` is the
 * only macro that sets it (BlueExposureMacrosPython.h:216-230). Readers and
 * writers reach a selected property through its accessors. An accessor with
 * flags and no property declaration is an attribute over the accessor path
 * (Tr2SkinnedObject_Blue.cpp:49-51 maps m_lod members) and takes part like a
 * stored member. A runtime-only declaration stays selected so it still claims
 * its exposed name; every reader and writer then skips it unread.
 *
 * @param {object} field Declared field metadata.
 * @returns {boolean} Whether readers and writers see the declaration.
 */
export function isTransportedDeclaration(field)
{
    return field?.role !== "property" || !field.property || field.edit?.persist === true || field.type?.runtimeOnly === true;
}


/**
 * Selects persisted output by PERSIST, not RPERSIST.
 * The unrestricted JS values view retains all declared fields.
 * @param {object} field Declared field metadata.
 * @param {object} options Values export options.
 * @returns {boolean} Whether this field belongs in the exported values.
 */
export function isExportableField(field, options = {})
{
    if (field?.type?.runtimeOnly === true) return false;
    // A round trip (clone) exports exactly what the import reads back: a
    // READ-only member is otherwise written, skipped on the way in, and any
    // anchor inside it leaves later `{ _ref }`s dangling.
    if (options.roundTrip && !isWritableField(field)) return false;
    const edit = field?.edit;
    const persist = edit?.persist || edit?.persistOnly;
    return !options.persistOnly || !!persist;
}
