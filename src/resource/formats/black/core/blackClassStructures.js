// Native offsets belong to the registered item class, never declaration order.
import { CjsSchema } from "#schema";

/** Returns the registered class's explicit BlueStructureDefinition and defaults. */
export function structClassLayout(className)
{
    const Item = typeof className === "function" ? className : CjsSchema.GetConstructor(className);
    if (!Item) throw new TypeError(`Black struct item class ${className} is not registered (import its package)`);
    const definition = CjsSchema.getSchema(Item).structureDefinition;
    if (!definition) throw new TypeError(`Black struct ${CjsSchema.getClassName(Item)} has no structureDefinition`);
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
    // Layouts live on the classes, so an owner whose package was never imported is unregistered, not undeclared.
    if (!Owner) throw new TypeError(`Black struct ${ownerClass}.${fieldName}: class ${ownerClass} is not registered (import its package)`);
    const declaration = CjsSchema.getSchema(Owner).members.find(member => member.name === fieldName);
    const itemType = declaration?.type?.itemType ?? CjsSchema.getField(Owner, fieldName)?.type?.itemType;
    const itemName = typeof itemType === "string" || typeof itemType === "function" ? itemType : itemType?.className;
    if (!itemName) throw new TypeError(`Black struct ${ownerClass}.${fieldName} has no declared item class`);
    return structClassLayout(itemName);
}
