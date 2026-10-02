// Native offsets belong to the registered item class, never declaration order.
import { CjsSchema } from "#schema";

/** Returns the registered class's explicit BlueStructureDefinition and defaults. */
export function structClassLayout(className)
{
    const Item = typeof className === "function" ? className : CjsSchema.GetConstructor(className);
    const definition = Item && CjsSchema.getSchema(Item).structureDefinition;
    if (!definition) throw new TypeError(`Black struct ${typeof className === "function" ? className.name : className} has no structureDefinition`);
    const defaults = CjsSchema.getDefaults(Item);
    for (const member of definition.members.slice(1))
    {
        if (defaults?.[member.name] === undefined) throw new TypeError(`Black struct ${definition.name}.${member.name} has no class default`);
    }
    return { ...definition, defaults };
}

/** Resolves a StructureList's item through schema metadata without domain imports. */
export function classStructureLayout(ownerClass, fieldName)
{
    const Owner = CjsSchema.GetConstructor(ownerClass);
    const declaration = Owner && CjsSchema.getSchema(Owner).members.find(member => member.name === fieldName);
    const itemType = declaration?.type?.itemType ?? (Owner && CjsSchema.getField(Owner, fieldName)?.type?.itemType);
    const itemName = typeof itemType === "string" || typeof itemType === "function" ? itemType : itemType?.className;
    if (!itemName) throw new TypeError(`Black struct ${ownerClass}.${fieldName} has no declared item class`);
    return structClassLayout(itemName);
}
