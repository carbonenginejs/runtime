import { CjsModel } from "./CjsModel.js";

export function asArray(value)
{
    if (!value) return [];
    if (value instanceof Map) return Array.from(value.values());
    return Array.isArray(value) ? value : [value];
}

export function firstDefined(...values)
{
    for (const value of values)
    {
        if (value !== undefined && value !== null) return value;
    }
    return null;
}

export function getField(object, ...names)
{
    if (!object) return null;
    for (const name of names)
    {
        if (Object.prototype.hasOwnProperty.call(object, name)) return object[name];
    }
    return null;
}

export function objectFromMap(map)
{
    return Object.fromEntries(map.entries());
}

export function collectionValues(value)
{
    if (!value) return [];
    if (value instanceof Map) return Array.from(value.values());
    if (Array.isArray(value)) return value;
    if (typeof value === "object") return Object.values(value);
    return [value];
}

export function clonePlain(value)
{
    if (value instanceof CjsModel) return value.GetValues();
    if (ArrayBuffer.isView(value)) return Array.from(value);
    if (value instanceof Map) return new Map(Array.from(value.entries()).map(([key, item]) => [key, clonePlain(item)]));
    if (Array.isArray(value)) return value.map(clonePlain);
    if (value && typeof value === "object")
    {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clonePlain(item)]));
    }
    return value;
}
