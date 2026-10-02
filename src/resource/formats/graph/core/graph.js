// Our graph grammar; no Carbon reader/writer or values-transport implementation is reused.
import { CjsSchema } from "../../../../global/schema/CjsSchema.js";
// These leaves hold canonical schema registrations and schema-installed interface declarations.
import { getClassRegistration } from "../../../../global/blue/classes/registry.js";
import { mappedInterfaces } from "../../../../global/compose/interface.js";
import { dataType, isRecord, memberPath, put } from "./dataTypes.js";

const RESERVED = new Set(["_type", "_id", "_ref", "__bluemetadata__"]);
const OBJECTS = new Set(["objectRef", "model", "weakRef", "struct", "rawStruct"]);

/** The canonical stored member projection; never use the lossy compatibility fields bag. */
function declarations(Constructor)
{
    const members = new Map();
    for (const member of CjsSchema.getSchema(Constructor).members)
    {
        if (RESERVED.has(member.name)) throw new TypeError(`Reserved member '${member.name}'`);
        if (!members.has(member.name)) members.set(member.name, member);
    }
    return members;
}

/** Read interface metadata, never infer exposure from the presence of a method. */
function mapped(instance, name)
{
    for (const Interface of mappedInterfaces(instance.constructor))
    {
        if (CjsSchema.getClassName(Interface) === name) return true;
    }
    return false;
}

/** A stored member must be data, including when its exposed name differs from its key. */
function storage(instance, field)
{
    const descriptor = Object.getOwnPropertyDescriptor(instance, field.key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) throw new TypeError(`Stored member '${field.name}' is not own data`);
    if (field.index === undefined) return { target: instance, key: field.key, value: descriptor.value };
    const value = descriptor.value;
    if ((!Array.isArray(value) && !ArrayBuffer.isView(value)) || field.index >= value.length)
    {
        throw new TypeError(`Invalid indexed member '${field.name}'`);
    }
    return { target: value, key: field.index, value: value[field.index] };
}

/** Resolve declaration shorthand without turning missing types into inferred values. */
function descriptor(type, field)
{
    if (typeof type === "function") type = { kind: "objectRef", className: CjsSchema.getClassName(type) };
    if (typeof type === "string" && getClassRegistration(type)) type = { kind: "objectRef", className: type };
    return dataType(type, field);
}

/** Snapshot a declared Array or native IList through its native read surface. */
function listValues(value)
{
    if (Array.isArray(value)) return value;
    if (value && mapped(value, "IList"))
    {
        const result = [];
        for (let index = 0; index < value.GetSize(); index++) result.push(value.GetAt(index));
        return result;
    }
    throw new TypeError("Expected declared array or IList");
}

/** Plain map storage is data; inspecting it must never invoke a getter. */
function mapEntries(value)
{
    if (value instanceof Map) return [...value];
    if (!isRecord(value)) throw new TypeError("Expected string-keyed Map");
    return Object.keys(value).map(key =>
    {
        const property = Object.getOwnPropertyDescriptor(value, key);
        if (!Object.hasOwn(property, "value")) throw new TypeError(`Map entry '${key}' is not own data`);
        return [key, property.value];
    });
}

/** Grammar positions come from declarations when available; Map keys are never metadata. */
function graphPosition(type)
{
    if (typeof type === "string") return getClassRegistration(type) ? "objectRef" : type;
    if (typeof type === "function") return "objectRef";
    return type?.kind;
}

/** Follow collection values or declared members without interpreting data-record keys as IDs. */
function childType(value, key, type)
{
    const kind = graphPosition(type);
    if (kind === "map") return type.valueType;
    if (["array", "list", "set"].includes(kind)) return type.itemType;
    if (isRecord(value) && typeof value._type === "string" && (!kind || OBJECTS.has(kind)))
    {
        const registration = getClassRegistration(value._type);
        if (registration)
        {
            for (const field of declarations(registration.type).values())
            {
                const aliases = field.aliases ?? field.alias ?? [];
                if (field.name === key || (Array.isArray(aliases) ? aliases : [aliases]).includes(key)) return field.type;
            }
        }
    }
    return undefined;
}

/** Check graph identity grammar before touching a live destination. Duplicate IDs are fatal. */
export function discover(root)
{
    const rootType = root && Object.getOwnPropertyDescriptor(root, "_type");
    if (!isRecord(root) || !rootType || typeof rootType.value !== "string" || !rootType.value || Object.hasOwn(root, "_ref"))
    {
        throw new TypeError("/root: expected a class definition with _type");
    }
    const ids = new Map();
    const active = new Set();
    const visit = (value, path, type) =>
    {
        if (value === null || typeof value !== "object" || ArrayBuffer.isView(value)) return;
        if (!isRecord(value) && !Array.isArray(value)) throw new TypeError(`${path}: expected plain values`);
        if (active.has(value)) throw new TypeError(`${path}: wire cycles require _id/_ref`);
        active.add(value);
        for (const [key, property] of Object.entries(Object.getOwnPropertyDescriptors(value)))
        {
            if (!Object.hasOwn(property, "value")) throw new TypeError(`${memberPath(path, key)}: wire accessor is not data`);
        }
        const kind = graphPosition(type);
        const graphObject = !kind || OBJECTS.has(kind);
        if (graphObject && Object.hasOwn(value, "_ref"))
        {
            if (Object.keys(value).length !== 1 || !Number.isSafeInteger(value._ref) || value._ref <= 0)
            {
                throw new TypeError(`${path}: invalid _ref`);
            }
        }
        else
        {
            if (graphObject && Object.hasOwn(value, "_type") && (typeof value._type !== "string" || !value._type))
            {
                throw new TypeError(`${path}: invalid _type`);
            }
            if (graphObject && Object.hasOwn(value, "_id"))
            {
                if (!value._type || !Number.isSafeInteger(value._id) || value._id <= 0) throw new TypeError(`${path}: invalid _id`);
                if (ids.has(value._id)) throw new TypeError(`${path}: duplicate _id ${value._id}`);
                ids.set(value._id, value);
            }
            for (const key of Object.keys(value))
            {
                const property = Object.getOwnPropertyDescriptor(value, key);
                if (!Object.hasOwn(property, "value")) throw new TypeError(`${memberPath(path, key)}: wire accessor is not data`);
                if (kind !== "custom") visit(property.value, memberPath(path, key), childType(value, key, type));
            }
        }
        active.delete(value);
    };
    visit(root, "/root");
    return ids;
}

/** Readable plain graph copy; missing references are local member reports. */
export function plainGraph(root, reports, transform = value => value)
{
    const ids = discover(root);
    const copy = (value, path, type) =>
    {
        if (value === null || typeof value !== "object")
        {
            if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("Non-finite JSON value");
            if (!["string", "number", "boolean"].includes(typeof value) && value !== null) throw new TypeError("Expected JSON value");
            return value;
        }
        const transformed = transform(value, path);
        if (transformed !== value) return transformed;
        if (ArrayBuffer.isView(value)) throw new TypeError("Typed values require an explicit binary payload or declared runtime input");
        const kind = graphPosition(type);
        if ((!kind || OBJECTS.has(kind)) && Object.hasOwn(value, "_ref") && !ids.has(value._ref)) throw new TypeError(`Missing reference ${value._ref}`);
        const result = Array.isArray(value) ? [] : {};
        for (const key of Object.keys(value))
        {
            const childPath = memberPath(path, key);
            try { put(result, key, copy(value[key], childPath, childType(value, key, type))); }
            catch (error)
            {
                reports.push({ path: childPath, message: error.message });
                // A positional array cannot silently change length or item meaning.
                if (Array.isArray(value)) throw error;
            }
        }
        return result;
    };
    return copy(root, "/root");
}

/** A strict save never returns bytes after a reported member failure. */
export function throwReports(reports)
{
    if (!reports.length) return;
    const error = new TypeError(`${reports[0].path}: ${reports[0].message}`);
    error.reports = reports;
    throw error;
}

/** Encode a registered graph using this format's data-type and custom handlers. */
export function writeGraph(root, handlers, options = {})
{
    const reports = [];
    const strong = new Set();
    const embedded = new Set();
    const activeEmbedded = new Set();
    const ids = new Map();
    const written = new Map();
    let nextId = 1;
    const report = (path, error) => reports.push({ path, message: error.message });
    const fields = Constructor => [...declarations(Constructor).values()].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    const selected = field => !field.type?.runtimeOnly && (field.edit?.persist || field.edit?.persistOnly);
    const scanValue = (value, type, path) =>
    {
        if (value == null || type.kind === "weakRef" || type.runtimeOnly) return;
        if (OBJECTS.has(type.kind)) scan(value, path, type);
        else if (["array", "list", "set", "map"].includes(type.kind))
        {
            const itemType = descriptor(type.valueType ?? type.itemType);
            const items = type.kind === "map" ? mapEntries(value).map(([, item]) => item)
                : type.kind === "set" ? value.values() : listValues(value);
            let index = 0;
            for (const item of items) scanValue(item, itemType, memberPath(path, index++));
        }
    };
    const scan = (instance, path, type = { kind: "objectRef" }) =>
    {
        const Constructor = storageClass(instance, type);
        if (!Constructor || !CjsSchema.getClassName(Constructor)) throw new TypeError("Unknown registered class");
        const isEmbedded = type.kind === "struct" || type.kind === "rawStruct";
        const set = isEmbedded ? embedded : strong;
        if (set.has(instance)) return;
        set.add(instance);
        for (const field of fields(Constructor))
        {
            if (!selected(field)) continue;
            const childPath = memberPath(path, field.name);
            try { scanValue(storage(instance, field).value, descriptor(field.type, field), childPath); }
            catch (error) { report(childPath, error); }
        }
    };
    const idFor = instance =>
    {
        if (!ids.has(instance)) ids.set(instance, nextId++);
        const id = ids.get(instance);
        if (written.has(instance)) written.get(instance)._id = id;
        return id;
    };
    const object = (instance, type, path, isRoot = false) =>
    {
        if (instance === null && !isRoot && type.kind !== "struct") return null;
        const Constructor = storageClass(instance, type);
        if (!Constructor || !CjsSchema.getClassName(Constructor)) throw new TypeError("Unknown registered class");
        if (Constructor === instance.constructor) checkClass(instance, type);
        if (type.kind === "weakRef")
        {
            if (!strong.has(instance) || embedded.has(instance)) throw new TypeError("Weak reference target is outside the strong graph");
            return { _ref: idFor(instance) };
        }
        const isEmbedded = type.kind === "struct" || type.kind === "rawStruct";
        if (!isEmbedded && embedded.has(instance)) throw new TypeError("Reference into embedded storage is unsupported");
        if (!isEmbedded && written.has(instance)) return { _ref: idFor(instance) };
        if (isEmbedded && activeEmbedded.has(instance)) throw new TypeError("Embedded storage cannot contain a cycle");
        if (isEmbedded) activeEmbedded.add(instance);
        const out = { _type: CjsSchema.getClassName(Constructor) };
        if (!isEmbedded)
        {
            written.set(instance, out);
            if (ids.has(instance)) out._id = ids.get(instance);
        }
        for (const field of fields(Constructor))
        {
            if (!selected(field)) continue;
            const childPath = memberPath(path, field.name);
            try { put(out, field.name, value(storage(instance, field).value, descriptor(field.type, field), childPath)); }
            catch (error) { report(childPath, error); }
        }
        const metadata = Object.getOwnPropertyDescriptor(instance, "__bluemetadata__");
        if (metadata && Object.hasOwn(metadata, "value")) out.__bluemetadata__ = metadataValue(metadata.value);
        if (isEmbedded) activeEmbedded.delete(instance);
        return out;
    };
    const value = (input, type, path) =>
    {
        if (type.runtimeOnly) throw new TypeError("Runtime-only data cannot be transported");
        if (OBJECTS.has(type.kind))
        {
            if (type.kind === "rawStruct" && !hasStructure(type)) throw new TypeError("Opaque rawStruct requires a custom handler");
            return object(input, type, path);
        }
        if (["array", "list", "set"].includes(type.kind))
        {
            if (type.kind === "set" && !(input instanceof Set)) throw new TypeError("Expected Set");
            const result = [];
            let index = 0;
            for (const item of type.kind === "set" ? input : listValues(input))
            {
                result.push(value(item, descriptor(type.itemType), memberPath(path, index++)));
            }
            return result;
        }
        if (type.kind === "map")
        {
            if (!(input instanceof Map) && !isRecord(input)) throw new TypeError("Expected string-keyed Map");
            const entries = mapEntries(input);
            if (entries.some(([key]) => typeof key !== "string")) throw new TypeError("Map keys must be strings");
            entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
            const result = {};
            for (const [key, item] of entries) put(result, key, value(item, descriptor(type.valueType), memberPath(path, key)));
            return result;
        }
        return handle(input, type, path, handlers, options, true);
    };
    scan(root, "/root");
    throwReports(reports);
    const result = object(root, { kind: "objectRef" }, "/root", true);
    throwReports(reports);
    discover(result);
    return result;
}

/** Validate an object against a declared class, including declared interface lineage. */
function checkClass(instance, type)
{
    if (!type.className) return;
    const Constructor = typeof type.className === "function" ? type.className : CjsSchema.GetConstructor(type.className);
    if (!Constructor || !CjsSchema.cast(instance, Constructor)) throw new TypeError(`Class does not satisfy '${typeof type.className === "string" ? type.className : CjsSchema.getClassName(Constructor)}'`);
}

/** Native struct declarations, not inline layout bags, authorize logical struct transport. */
function hasStructure(type)
{
    const Constructor = typeof type.className === "function" ? type.className : CjsSchema.GetConstructor(type.className);
    return Constructor && CjsSchema.getSchema(Constructor).structureDefinition;
}

/** Native decoders may return plain struct records; only a declared class layout authorizes them. */
function storageClass(instance, type)
{
    if (isRecord(instance) && ["struct", "rawStruct"].includes(type.kind) && hasStructure(type))
    {
        return typeof type.className === "function" ? type.className : CjsSchema.GetConstructor(type.className);
    }
    return instance?.constructor;
}

/** Dispatch a storage value, failing explicitly when a format has not opted into a custom type. */
function handle(value, type, path, handlers, options, writing)
{
    const context = { writing, path, options };
    if (type.kind === "custom")
    {
        const name = type.name ?? type.customName;
        const handler = options.customHandlers?.[name];
        if (!handler || typeof handler.read !== "function" || typeof handler.write !== "function")
        {
            throw new TypeError(`Missing custom handler '${name}'`);
        }
        return writing ? handler.write(value, context) : handler.read(value, context);
    }
    const handler = handlers.get(type.kind);
    if (!handler) throw new TypeError(`Missing handler for data type '${type.kind}'`);
    return handler(value, type, context);
}

/** Blue metadata is explicitly declared string data, never an arbitrary state bag. */
function metadataValue(value)
{
    if (!isRecord(value)) throw new TypeError("Expected string metadata record");
    const out = {};
    for (const key of Object.keys(value).sort())
    {
        const property = Object.getOwnPropertyDescriptor(value, key);
        if (!Object.hasOwn(property, "value") || typeof property.value !== "string") throw new TypeError("Metadata values must be strings");
        put(out, key, property.value);
    }
    return out;
}

/** Decode through declaration factories with member-local failures and operation-local identity. */
export function readGraph(root, handlers, options = {})
{
    const ids = discover(root);
    const reports = [];
    const instances = new Map();
    const created = new Set();
    const dependencies = new Map();
    const objectPaths = new Map();
    const weakTokens = new WeakMap();
    const pendingFields = [];
    const report = (path, error) => { if (!error.reported) reports.push({ path, message: error.message }); };
    const visitValues = (value, visit, seen = new Set()) =>
    {
        if (!value || typeof value !== "object" || ArrayBuffer.isView(value) || seen.has(value)) return;
        seen.add(value);
        if (weakTokens.has(value) || dependencies.has(value)) { visit(value); return; }
        if (Array.isArray(value) || value instanceof Set)
        {
            for (const item of value) visitValues(item, visit, seen);
        }
        else if (value instanceof Map)
        {
            for (const item of value.values()) visitValues(item, visit, seen);
        }
        else if (isRecord(value)) for (const item of Object.values(value)) visitValues(item, visit, seen);
    };
    const assign = (instance, field, slot, converted) =>
    {
        if (slot.value && mapped(slot.value, "IList") && ["list", "array"].includes(field.type.kind))
        {
            const previous = Array.from(listValues(slot.value));
            const replace = items =>
            {
                if (slot.value.Remove(-1) === false) throw new TypeError("IList rejected clear");
                for (const item of items)
                {
                    if (slot.value.Append(item) === false) throw new TypeError("IList rejected item");
                }
            };
            try { replace(converted); }
            catch (error)
            {
                try { replace(previous); }
                catch (restoreError)
                {
                    throw new TypeError(`${error.message}; IList could not restore previous values: ${restoreError.message}`);
                }
                throw error;
            }
        }
        else if (ArrayBuffer.isView(slot.value) && ArrayBuffer.isView(converted)
            && slot.value.constructor === converted.constructor && slot.value.length === converted.length) slot.value.set(converted);
        else slot.target[slot.key] = converted;
        visitValues(converted, child => { if (dependencies.has(child)) dependencies.get(instance).add(child); });
        if (field.edit?.notify && !mapped(instance, "IInitialize") && mapped(instance, "INotify")) instance.OnModified(field.name);
    };
    const object = (source, type, path, existing = null, collectionItem = false) =>
    {
        if (source === null && type.kind !== "struct") return null;
        if (!isRecord(source)) throw new TypeError("Expected class definition or reference");
        const isEmbedded = type.kind === "struct" || type.kind === "rawStruct";
        if (isEmbedded && (Object.hasOwn(source, "_ref") || Object.hasOwn(source, "_id"))) throw new TypeError("Embedded storage cannot carry identity markers");
        if (Object.hasOwn(source, "_ref"))
        {
            const target = ids.get(source._ref);
            if (!target) throw new TypeError(`Missing reference ${source._ref}`);
            if (type.kind === "weakRef")
            {
                const token = {};
                weakTokens.set(token, { source: target, type, path });
                return token;
            }
            return object(target, { ...type, kind: "objectRef" }, path);
        }
        if (type.kind === "weakRef") throw new TypeError("Weak reference requires _ref or null");
        let instance = instances.get(source);
        if (instance)
        {
            checkClass(instance, type);
            return instance;
        }
        const registration = getClassRegistration(source._type);
        if (!registration) throw new TypeError(`Unknown class '${source._type}'`);
        if (isEmbedded)
        {
            // Collection members commit together; never mutate old struct slots while decoding candidates.
            if (collectionItem) existing = registration.createFn();
            if (!existing || storageClass(existing, type) !== registration.type) throw new TypeError("Embedded class does not match existing storage");
            instance = existing;
        }
        else
        {
            instance = registration.createFn();
            if (!instance || typeof instance !== "object" || typeof instance.then === "function") throw new TypeError(`Factory refused '${source._type}'`);
            created.add(instance);
        }
        if (!isEmbedded || !isRecord(instance)) checkClass(instance, type);
        instances.set(source, instance);
        dependencies.set(instance, new Set());
        objectPaths.set(instance, path);
        const members = declarations(registration.type);
        const names = new Map(members);
        for (const field of members.values())
        {
            const aliases = field.aliases ?? field.alias ?? [];
            for (const alias of Array.isArray(aliases) ? aliases : [aliases]) if (!names.has(alias)) names.set(alias, field);
        }
        for (const key of Object.keys(source))
        {
            if (RESERVED.has(key)) continue;
            const pathToMember = memberPath(path, key);
            try
            {
                const field = names.get(key);
                if (!field) throw new TypeError(`Unknown member '${source._type}.${key}'`);
                if (field.type?.runtimeOnly) throw new TypeError("Runtime-only member");
                if (!(field.edit?.write || field.edit?.persist || field.edit?.persistOnly || field.edit?.rpersist)) throw new TypeError("Member is not writable or persistent");
                if (key !== field.name && Object.hasOwn(source, field.name)) continue;
                const slot = storage(instance, field);
                const converted = value(source[key], descriptor(field.type, field), pathToMember, slot.value);
                let hasWeak = false;
                visitValues(converted, child => { if (weakTokens.has(child)) hasWeak = true; });
                if (hasWeak) pendingFields.push({ instance, field, slot, converted, path: pathToMember });
                else assign(instance, field, slot, converted);
            }
            catch (error) { report(pathToMember, error); }
        }
        if (Object.hasOwn(source, "__bluemetadata__"))
        {
            try { Object.defineProperty(instance, "__bluemetadata__", { value: metadataValue(source.__bluemetadata__), writable: true, configurable: true }); }
            catch (error) { report(memberPath(path, "__bluemetadata__"), error); }
        }
        return instance;
    };
    const value = (input, type, path, existing, collectionItem = false) =>
    {
        if (type.runtimeOnly) throw new TypeError("Runtime-only data");
        if (OBJECTS.has(type.kind))
        {
            if (type.kind === "rawStruct" && !hasStructure(type)) throw new TypeError("Opaque rawStruct requires a custom handler");
            return object(input, type, path, existing, collectionItem);
        }
        if (["array", "list", "set"].includes(type.kind))
        {
            if (!Array.isArray(input)) throw new TypeError("Expected array");
            const items = [];
            const itemType = descriptor(type.itemType);
            const omitFailed = type.kind !== "set" && ["objectRef", "model"].includes(itemType.kind);
            let failed = false;
            for (let index = 0; index < input.length; index++)
            {
                const itemPath = memberPath(path, index);
                try { items.push(value(input[index], itemType, itemPath, Array.isArray(existing) ? existing[index] : null, true)); }
                catch (error) { report(itemPath, error); failed = true; }
            }
            if (failed && !omitFailed)
            {
                const error = new TypeError("Collection contains invalid values");
                error.reported = true;
                throw error;
            }
            if (type.kind !== "set") return items;
            const result = new Set(items);
            if (result.size !== items.length) throw new TypeError("Duplicate Set entry");
            return result;
        }
        if (type.kind === "map")
        {
            if (!isRecord(input)) throw new TypeError("Expected string-keyed map record");
            const result = existing instanceof Map ? new Map() : {};
            let failed = false;
            for (const key of Object.keys(input))
            {
                const itemPath = memberPath(path, key);
                try
                {
                    const item = value(input[key], descriptor(type.valueType), itemPath, null, true);
                    if (result instanceof Map) result.set(key, item);
                    else put(result, key, item);
                }
                catch (error) { report(itemPath, error); failed = true; }
            }
            if (failed)
            {
                const error = new TypeError("Map contains invalid values");
                error.reported = true;
                throw error;
            }
            return result;
        }
        return handle(input, type, path, handlers, options, false);
    };
    let result;
    try { result = object(root, { kind: "objectRef" }, "/root"); }
    catch (error)
    {
        report("/root", error);
        throwReports(reports);
    }
    const reachable = new Set();
    const reach = instance =>
    {
        if (reachable.has(instance)) return;
        reachable.add(instance);
        for (const child of dependencies.get(instance) ?? []) reach(child);
    };
    reach(result);
    const resolveWeak = value =>
    {
        if (!value || typeof value !== "object" || ArrayBuffer.isView(value) || dependencies.has(value)) return value;
        if (weakTokens.has(value))
        {
            const pending = weakTokens.get(value);
            const target = instances.get(pending.source);
            if (!target || !reachable.has(target)) throw new TypeError("Weak reference target is outside the accepted strong graph");
            checkClass(target, pending.type);
            return target;
        }
        if (Array.isArray(value)) return value.map(resolveWeak);
        if (value instanceof Set) return new Set(Array.from(value, resolveWeak));
        if (value instanceof Map) return new Map(Array.from(value, ([key, item]) => [key, resolveWeak(item)]));
        const out = {};
        for (const [key, item] of Object.entries(value)) put(out, key, resolveWeak(item));
        return out;
    };
    for (const pending of pendingFields)
    {
        if (!reachable.has(pending.instance)) continue;
        try { assign(pending.instance, pending.field, pending.slot, resolveWeak(pending.converted)); }
        catch (error) { report(pending.path, error); }
    }
    if (options.initialize !== false)
    {
        const visited = new Set();
        const finish = instance =>
        {
            if (visited.has(instance)) return;
            visited.add(instance);
            for (const child of dependencies.get(instance) ?? []) finish(child);
            if (created.has(instance) && mapped(instance, "IInitialize"))
            {
                try { instance.Initialize(); }
                catch (error) { report(objectPaths.get(instance), error); }
            }
        };
        finish(result);
    }
    return { root: result, reports };
}
