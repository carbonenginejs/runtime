import { IList } from "./exposure/IList.js";
import { blue } from "./blue.js";
import { BlueClasses } from "./exposure/BlueClasses.js";
import { CjsSchema } from "./schema/index.js";
import { ensureRuntimeState } from "./compose/runtimeState.js";
import { NotifyModified } from "./compose/modified.js";
import { BLUELISTEVENT } from "../global/consts/blue.js";

const CHILD_COLLECTION_KINDS = new Set([ "array", "list" ]);

/** Appends a child and applies the explicit mutation callbacks. */
export function addChild(target, property, child, options = {})
{
    const { field, collection } = getChildCollection(target, property);

    assertChildObject(child, field.name);
    assertChildCallback(options.onAdded, "onAdded");

    const index = collection.length;
    const nativeList = blue.classes.QueryThisInterface(collection, IList, collection.constructor, BlueClasses.BLUEQIOPT.BEQI_SILENT) !== null;
    if (nativeList)
    {
        if (!collection.Append(child)) throw new TypeError(`Child is not admitted by ${field.name}.`);
    }
    else collection.push(child);
    recordChildMutation(target, field, options);
    if (!nativeList) notifyListModified(target, BLUELISTEVENT.BELIST_INSERTED, index, 0, child, collection, options);

    const payload = createChildEventPayload(target, field.name, child, index, options);
    invokeChildCallback(options.onAdded, target, payload, "onAdded");
    settleChildMutation(target, field, options);
    return child;
}

/** Detaches a child without destroying it. */
export function removeChild(target, property, child, options = {})
{
    const { field, collection } = getChildCollection(target, property);
    const index = collection.indexOf(child);

    if (index === -1) return false;
    assertChildCallback(options.onRemoved, "onRemoved");

    const nativeList = blue.classes.QueryThisInterface(collection, IList, collection.constructor, BlueClasses.BLUEQIOPT.BEQI_SILENT) !== null;
    if (nativeList) collection.Remove(index);
    else collection.splice(index, 1);
    recordChildMutation(target, field, options);
    if (!nativeList) notifyListModified(target, BLUELISTEVENT.BELIST_REMOVED, index, 0, child, collection, options);

    const payload = createChildEventPayload(target, field.name, child, index, options);
    invokeChildCallback(options.onRemoved, target, payload, "onRemoved");
    settleChildMutation(target, field, options);
    return true;
}

/** Detaches a child and runs explicit domain teardown. */
export function deleteChild(target, property, child, options = {})
{
    const { field, collection } = getChildCollection(target, property);
    const index = collection.indexOf(child);

    if (index === -1) return false;

    if (options.delete !== undefined && typeof options.delete !== "function")
    {
        throw new TypeError("Schema child delete option must be a function.");
    }
    assertChildCallback(options.onDeleted, "onDeleted");

    removeChild(target, field.name, child, { ...options, skipUpdate: true });

    if (typeof options.delete === "function")
    {
        options.delete.call(target, child, options);
    }

    const payload = createChildEventPayload(target, field.name, child, index, options);
    invokeChildCallback(options.onDeleted, target, payload, "onDeleted");
    settleChildMutation(target, field, options);
    return true;
}

/** Notifies before emptying a declared child collection. */
export function clearChildren(target, property, options = {})
{
    const { field, collection } = getChildCollection(target, property);
    const count = collection.length;

    if (!count) return false;
    assertChildCallback(options.onCleared, "onCleared");

    recordChildMutation(target, field, options);
    if (blue.classes.QueryThisInterface(collection, IList, collection.constructor, BlueClasses.BLUEQIOPT.BEQI_SILENT) !== null) collection.Remove(-1);
    else
    {
        notifyListModified(target, BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0, null, collection, options);
        collection.length = 0;
    }

    const payload = {
        property: field.name,
        count,
        source: options.source ?? target
    };
    invokeChildCallback(options.onCleared, target, payload, "onCleared");
    settleChildMutation(target, field, options);
    return true;
}

function getChildCollection(target, property)
{
    if (!target || !CjsSchema.getClassName(target.constructor))
    {
        throw new TypeError("Child collection target must be a registered schema instance.");
    }

    if (typeof property !== "string" || !property)
    {
        throw new TypeError("Schema child collection property must be a non-empty string.");
    }

    const field = CjsSchema.getField(target.constructor, property);
    if (!field)
    {
        throw new TypeError(`${CjsSchema.getClassName(target.constructor)} has no schema field named ${JSON.stringify(property)}.`);
    }

    const fieldType = field.type || field.jsType;
    if (!CHILD_COLLECTION_KINDS.has(fieldType?.kind))
    {
        throw new TypeError(`${field.name} must be a schema array or list child collection.`);
    }

    const collection = target[field.name];
    if (!Array.isArray(collection))
    {
        throw new TypeError(`${field.name} must contain an ordinary JavaScript Array.`);
    }

    return { field, collection };
}

function assertChildObject(child, property)
{
    if (!child || typeof child !== "object" || Array.isArray(child) || ArrayBuffer.isView(child))
    {
        throw new TypeError(`${property} requires a non-null child object.`);
    }
}

function assertChildCallback(callback, optionName)
{
    if (callback !== undefined && callback !== null && typeof callback !== "function")
    {
        throw new TypeError(`Schema child ${optionName} option must be a function.`);
    }
}

function recordChildMutation(target, field, options)
{
    if (options.markDirty === false) return;
    ensureRuntimeState(target).dirty = true;
}

function notifyListModified(target, event, index, secondIndex, child, collection, options)
{
    if (options.listNotify) options.listNotify.OnListModified(event, index, secondIndex, child, collection);
}

function createChildEventPayload(target, property, child, index, options)
{
    return {
        property,
        child,
        index,
        source: options.source ?? target
    };
}

function invokeChildCallback(callback, target, payload, optionName)
{
    if (callback === undefined || callback === null) return;
    assertChildCallback(callback, optionName);
    callback.call(target, payload);
}

function settleChildMutation(target, field, options)
{
    if (options.skipUpdate === true) return;

    if (options.markDirty === false) return;
    NotifyModified(target, field.name, { ...options, notify: options.notify !== false && !!field.edit?.notify });
}

