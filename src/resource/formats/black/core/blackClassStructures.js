// STRUCT-LIST LAYOUTS FROM THE RUNTIME'S OWN CLASSES.
//
// Explicit canonical raw-structure declarations supply their native layout
// directly. The item-class derivation below remains the legacy fallback.
//
// Carbon reads a structure list with its C++ BlueStructureDefinition (explicit
// offsets). The generated Black snapshot carries such layouts only where
// tools-core's resolution table supplies them; everything else stayed a raw
// blob. The decorated classes already declare each struct's members in
// Carbon's order with their types (Locator, Tr2CurveScalarKey, ...), so the
// layout is derived from them: members in declaration order, offsets by
// packing the types. An item class can declare byteSize for native trailing
// storage omitted from BlueStructureDefinition (Tr2SamplerOverride.sampler).
// Interior padding still requires explicit offsets; it is not inferred here.
//
// The class is found BY NAME through the schema registry, never imported:
// this format sits in the resource layer and must not reach Trinity. A class
// the host has not registered leaves the snapshot's layout (or the raw blob)
// in place, as before.
import { CjsSchema } from "#schema";
import { CjsBlackSchemaRegistry } from "./CjsBlackSchemaRegistry.js";

/** Schema field kinds -> the reader's member kind and its byte size. */
const MEMBER_KINDS = {
    // A BlueSharedString member is 8 bytes on the 64-bit writer: a u16
    // string-table index the reader patches, then padding
    // (Be::SHAREDSTRING_1, e.g. Tr2EffectParameterStructureDef, Tr2Effect.cpp:33-37).
    string: [ "string", 8 ],
    float32: [ "float32", 4 ],
    int8: [ "int8", 1 ],
    uint8: [ "uint8", 1 ],
    int16: [ "int16", 2 ],
    uint16: [ "uint16", 2 ],
    int32: [ "int32", 4 ],
    uint32: [ "uint32", 4 ],
    vec2: [ "vector2", 8 ],
    vec3: [ "vector3", 12 ],
    vec4: [ "vector4", 16 ],
    quat: [ "quaternion", 16 ],
    color: [ "color", 16 ]
};

const LAYOUTS = new Map();

/**
 * The layout for `ownerClass.fieldName`'s list items, derived from the
 * explicit canonical native layout or the registered item class. Returns null
 * when the owner, the field, the item class or
 * any member type is unknown.
 * Adapted: class byteSize supplies native sizeof when unexposed trailing
 * storage makes the stride larger than the persisted members. JavaScript
 * cannot infer the native ABI size from its object allocation.
 *
 * @param {string} ownerClass The owning Carbon class name.
 * @param {string} fieldName The list field.
 * Explicit raw-structure declarations are validated and returned unchanged;
 * they do not infer short-record boundaries or defaults from an item class.
 *
 * @returns {{name: string, size: number, members: object[], boundaries?: number[], defaults?: object}|null}
 */
export function classStructureLayout(ownerClass, fieldName)
{
    const Owner = CjsSchema.GetConstructor(ownerClass);
    const declaration = Owner ? CjsSchema.getSchema(Owner).members.find(member =>
        member.name === fieldName && (member.type?.runtimeOnly === true || member.edit?.persist)) : null;
    // Explicit native layouts own their offsets and stride, even when an item
    // class exists. Reuse canonical validation instead of repacking its fields.
    if (declaration?.type?.itemType?.kind === "rawStruct")
    {
        return CjsBlackSchemaRegistry.fromDeclaredType(declaration.type).black.structure;
    }

    // Only a found derived layout is cached: a class may register after an early read.
    const key = `${ownerClass}.${fieldName}`;
    if (LAYOUTS.has(key)) return LAYOUTS.get(key);

    let layout = null;
    // A list names its item class; an array of structs carries it on the item type.
    const itemType = Owner ? CjsSchema.getField(Owner, fieldName)?.type?.itemType : null;
    const itemName = typeof itemType === "string" ? itemType : itemType?.kind === "struct" ? itemType.className : null;
    const Item = typeof itemName === "string" ? CjsSchema.GetConstructor(itemName) : null;
    if (Item)
    {
        const members = [];
        const boundaries = [];
        let offset = 0;
        let known = true;
        // Persisted members only, as a BlueStructureDefinition lists them: a
        // runtime-only field would shift every later offset.
        for (const field of CjsSchema.getSchema(Item).fields.filter(entry => entry.edit?.persist && entry.type?.runtimeOnly !== true))
        {
            const kind = MEMBER_KINDS[field.type?.kind];
            if (!kind) { known = false; break; }
            members.push({ name: field.name, offset, type: kind[0] });
            offset += kind[1];
            boundaries.push(offset);
        }
        if (known && members.length)
        {
            const defaults = CjsSchema.getDefaults(Item);
            for (const member of members.slice(1))
            {
                // A short record leaves trailing members to their defaults, so
                // each must have one (a null would fail later, less clearly).
                if (defaults?.[member.name] === undefined) throw new TypeError(`Black struct ${itemName}.${member.name} has no class default`);
            }
            const size = Item.byteSize ?? offset;
            if (!Number.isInteger(size) || size < offset)
            {
                throw new RangeError(`Black struct ${itemName}.byteSize must contain all persisted members`);
            }
            layout = { name: itemName, size, members, boundaries, defaults };
        }
    }
    if (layout) LAYOUTS.set(key, layout);
    return layout;
}
