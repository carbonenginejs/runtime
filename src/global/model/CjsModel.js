import { CJS_MODEL_BRAND, CjsSchema } from "../schema/index.js";
import { getRuntimeState } from "../compose/runtimeState.js";
import { queueModifiedMember, settleModifiedMembers } from "../compose/values.js";
import { BLUELISTEVENT } from "../consts/blue.js";
import { CjsModelState } from "./CjsModelState.js";
import { DictReader } from "../blue/DictReader.js";
import { DictWriter } from "../blue/DictWriter.js";
import { CjsEventEmitter } from "./CjsEventEmitter.js";

/**
 * The cross-copy brand this class stamps on every instance.
 *
 * Defined by CjsSchema and applied here. The predicate that reads it lives
 * there too, as `CjsSchema.isModelInstance`, because CjsModel imports CjsSchema
 * and the reverse is impossible — so the schema side is the only side both a
 * consumer and this class can reach. See its declaration for why a symbol is
 * what survives two copies of this package in one realm.
 */

/**
 * Reports whether a value is already a live model, including one constructed by
 * a different copy of this package.
 *
 * Retained as the function form of `CjsSchema.isModelInstance`, which is the
 * spelling to prefer in new code: it is reachable from anything holding the
 * schema, including through `CjsModel.schema`, without importing the model
 * layer to ask a question about it.
 *
 * @param {*} value Candidate value.
 * @returns {boolean} True when the value is a live `CjsModel`.
 */
export function isModelInstance(value)
{
    return CjsSchema.isModelInstance(value);
}

const CHILD_COLLECTION_KINDS = new Set([ "array", "list" ]);


/**
 * Shared base for schema-backed CarbonEngineJS runtime classes.
 *
 * Source fields are exported; runtime caches and bookkeeping are not.
 */
export class CjsModel extends CjsEventEmitter
{
    /**
     * Identifies this class as a schema-backed model.
     *
     * Declared statically so CjsSchema can recognise a model class from a field
     * declaration alone, without importing CjsModel - which it cannot do, since
     * this module already imports CjsSchema. Mirrors `CjsResource.isResource`.
     */
    static isModel = true;

    /**
     * Instance-side counterpart of `isModel`, readable across package copies.
     *
     * On the prototype rather than per instance, so it costs nothing per object
     * and cannot be enumerated into exported values.
     */
    get [CJS_MODEL_BRAND]()
    {
        return true;
    }

    /**
     * Creates a schema-backed model with initialized runtime state.
     */
    constructor()
    {
        super();
        const className = CjsSchema.getClassName(this.constructor);
        if (!className)
        {
            throw new TypeError("CjsModel subclasses require an explicit CjsSchema className.");
        }
        initializeModelState(this);
    }

    /**
     * Exports the model's schema fields to a new plain object.
     *
     * @param {object} [options={}]
     * @returns {object}
     */
    GetValues(options = {})
    {
        return CjsModel.get(this, {}, options);
    }

    /**
     * Applies a plain value bag through the canonical schema-backed setter.
     *
     * @param {object} [values={}]
     * @param {object} [options={}]
     * @returns {Set<string>|boolean} The changed fields, or a boolean result.
     */
    SetValues(values = {}, options = {})
    {
        return CjsModel.set(this, values, options);
    }

    /**
     * Copies the exported fields of another model into this model.
     *
     * @param {CjsModel} value
     * @param {object} [options={}]
     * @returns {CjsModel} This model.
     */
    Copy(value, options = {})
    {
        return CjsModel.copy(this, value, options);
    }

    /**
     * Constructs a new model of this instance's class from its schema values.
     *
     * @param {object} [options={}]
     * @returns {CjsModel}
     */
    Clone(options = {})
    {
        return this.constructor.clone(this, options);
    }

    /**
     * Constructs one item from a schema-backed child collection's declared
     * item type, then adds it through the ordinary child-mutation path.
     *
     * Domain classes expose named factories such as `CreateAttachment`; this
     * programmatic helper keeps property-string mutation out of their instance
     * API.
     *
     * @param {CjsModel} target Owning model instance.
     * @param {string} property Schema `array` or `list` field name.
     * @param {object} [values={}] Plain child values.
     * @param {object} [options={}] Hydration and mutation options.
     * @returns {*} The constructed and added child.
     */
    static createChild(target, property, values = {}, options = {})
    {
        const { field } = getChildCollection(target, property);
        const itemType = field.type?.itemType;
        const itemClassName = typeof itemType === "string" ? itemType : itemType?.className ?? null;

        // Built as a list item is (DictReader ReadIRootClass): the bag's
        // `_type`, else the declared item class.
        const importContext = createImportContext();
        const child = new DictReader({ ...options, importContext })
            .CreateObject(values, itemClassName ? CjsSchema.GetConstructor(itemClassName) : null);
        importContext.finalize();
        importContext.initializeCreated({ ...options, importContext });

        assertChildObject(child, field.name);
        CjsModel.addChild(target, field.name, child, options);
        return child;
    }

    /**
     * Appends an existing object to a schema-backed child collection.
     *
     * The mutation invokes Carbon-shaped `OnListModified` when present,
     * queues the field's declared member notification, emits one
     * `childadded` event, and settles the parent unless suppressed by options.
     *
     * @param {CjsModel} target Owning model instance.
     * @param {string} property Schema `array` or `list` field name.
     * @param {object} child Existing child object.
     * @param {object} [options={}]
     * @returns {object} The appended child.
     */
    static addChild(target, property, child, options = {})
    {
        const { field, collection } = getChildCollection(target, property);

        assertChildObject(child, field.name);
        assertChildCallback(options.onAdded, "onAdded");

        const index = collection.length;
        collection.push(child);
        recordChildMutation(target, field, options);
        notifyListModified(target, BLUELISTEVENT.BELIST_INSERTED, index, 0, child, collection);

        const payload = createChildEventPayload(target, field.name, child, index, options);
        invokeChildCallback(options.onAdded, target, payload, "onAdded");
        emitChildEvent(target, "childadded", payload, options);
        settleChildMutation(target, field, options);
        return child;
    }

    /**
     * Detaches the first matching object from a schema-backed child collection.
     * Removal never destroys the child.
     *
     * @param {CjsModel} target Owning model instance.
     * @param {string} property Schema `array` or `list` field name.
     * @param {object} child Existing child object.
     * @param {object} [options={}]
     * @returns {boolean} Whether the child was present and removed.
     */
    static removeChild(target, property, child, options = {})
    {
        const { field, collection } = getChildCollection(target, property);
        const index = collection.indexOf(child);

        if (index === -1) return false;
        assertChildCallback(options.onRemoved, "onRemoved");

        collection.splice(index, 1);
        recordChildMutation(target, field, options);
        notifyListModified(target, BLUELISTEVENT.BELIST_REMOVED, index, 0, child, collection);

        const payload = createChildEventPayload(target, field.name, child, index, options);
        invokeChildCallback(options.onRemoved, target, payload, "onRemoved");
        emitChildEvent(target, "childremoved", payload, options);
        settleChildMutation(target, field, options);
        return true;
    }

    /**
     * Removes a child and then performs an explicit deletion action.
     *
     * `options.delete` owns domain-specific teardown when supplied. Without
     * that explicit hook the child is detached and left to ordinary
     * JavaScript lifetime management. Deletion emits both `childremoved` and
     * `childdeleted`.
     *
     * @param {CjsModel} target Owning model instance.
     * @param {string} property Schema `array` or `list` field name.
     * @param {object} child Existing child object.
     * @param {object} [options={}]
     * @param {Function} [options.delete] Explicit child teardown callback.
     * @returns {boolean} Whether the child was present and deleted.
     */
    static deleteChild(target, property, child, options = {})
    {
        const { field, collection } = getChildCollection(target, property);
        const index = collection.indexOf(child);

        if (index === -1) return false;

        if (options.delete !== undefined && typeof options.delete !== "function")
        {
            throw new TypeError("CjsModel child delete option must be a function.");
        }
        assertChildCallback(options.onDeleted, "onDeleted");

        CjsModel.removeChild(target, field.name, child, { ...options, skipUpdate: true });

        if (typeof options.delete === "function")
        {
            options.delete.call(target, child, options);
        }

        const payload = createChildEventPayload(target, field.name, child, index, options);
        invokeChildCallback(options.onDeleted, target, payload, "onDeleted");
        emitChildEvent(target, "childdeleted", payload, options);
        settleChildMutation(target, field, options);
        return true;
    }

    /**
     * Detaches every object from a schema-backed child collection without
     * destroying the children.
     *
     * Carbon-shaped `OnListModified` receives its unload-start callback while
     * the collection is still populated. The public domain method decides
     * whether clearing or per-child deletion is appropriate.
     *
     * @param {CjsModel} target Owning model instance.
     * @param {string} property Schema `array` or `list` field name.
     * @param {object} [options={}]
     * @returns {boolean} Whether any children were cleared.
     */
    static clearChildren(target, property, options = {})
    {
        const { field, collection } = getChildCollection(target, property);
        const count = collection.length;

        if (!count) return false;
        assertChildCallback(options.onCleared, "onCleared");

        recordChildMutation(target, field, options);
        notifyListModified(target, BLUELISTEVENT.BELIST_UNLOADSTART, 0, 0, null, collection);
        collection.length = 0;

        const payload = {
            property: field.name,
            count,
            source: options.source ?? target
        };
        invokeChildCallback(options.onCleared, target, payload, "onCleared");
        emitChildEvent(target, "childrencleared", payload, options);
        settleChildMutation(target, field, options);
        return true;
    }

    /**
     * Applies pending changes: drives the OnModified hook until the model
     * settles, clears the dirty mark, and emits one final modified event.
     *
     * Calling this IS the "I made changes, apply please" contract: it always
     * runs at least one hook pass, dirty or not, so direct/untracked
     * mutations (the cooperative-pipeline reality) can be applied
     * explicitly. Class Update/per-frame methods typically gate on
     * `__state.IsDirty()` before calling.
     *
     * @param {object} [options={}]
     * @param {string|Iterable<string>} [options.property] Fields the caller changed directly; queued before settling.
     * @param {string|Iterable<string>} [options.properties] Alias of `property`.
     * @param {*} [options.source=this] Origin carried by the completion event (binding feedback control).
     * @param {boolean} [options.skipEvents=false] Prevents the final modified event.
     * @returns {boolean} False when the hook rejected the update (dirty is retained).
     * @throws {Error} If local changes do not settle within the update-pass limit.
     */
    UpdateValues(options = {})
    {
        addExplicitUpdateProperties(this, options.property ?? options.properties);
        if (options.property == null && options.properties == null && options.changedFields == null
            && (this.__state.updating || !this.__state.pendingModified?.size))
        {
            queueModifiedMember(this, null);
        }
        if (this.__state.updating) return true;

        const source = options.source ?? this;
        if (!settleModifiedMembers(this)) return false;

        if (options.skipEvents !== true && this.__state.suppressEvents === 0)
        {
            this.EmitEvent("modified", this, { source });
        }

        return true;
    }

    /**
     * The settle hook: reproduces the meaningful consequences of the
     * corresponding Carbon INotify::OnModified implementation.
     *
     * Receives one exposed member name, corresponding to Carbon's member
     * address. The values transport applies its NOTIFY gate before queuing.
     * Direct native-shaped callers choose their own gate. A null identity
     * preserves the existing explicit unnamed UpdateValues call; its wider
     * UI policy remains separate. No options bag is passed to this hook.
     *
     * @param {string|null} [_propertyName]
     * @returns {boolean} Whether the update may complete.
     */
    OnModified(_propertyName = null)
    {
        return true;
    }

    /**
     * Visits this model and its schema-backed child models without revisiting cycles.
     *
     * In pre-order traversal, returning `false` prunes that model's descendants.
     * Visitor return values are ignored in post-order traversal.
     *
     * @param {function(CjsModel): (boolean|void)} visitor
     * @param {object} [options={}]
     * @param {Set<CjsModel>} [options.visited] Existing cycle-detection set.
     * @param {"pre"|"post"} [options.order="pre"]
     * @param {boolean} [options.reverse=false] Reverses field and list-item order.
     * @param {boolean} [options.ownedOnly=false] Traverses only owned relationships.
     * @returns {CjsModel} This model.
     * @throws {TypeError} If `visitor` is not a function.
     */
    Traverse(visitor, options = {})
    {
        if (typeof visitor !== "function")
        {
            throw new TypeError("CjsModel.Traverse requires a visitor function.");
        }

        const visited = options.visited instanceof Set ? options.visited : new Set();
        const order = options.order === "post" ? "post" : "pre";
        const reverse = options.reverse === true;

        const visit = model =>
        {
            if (!(model instanceof CjsModel) || visited.has(model)) return;
            visited.add(model);

            let descend = true;
            if (order === "pre") descend = visitor(model) !== false;

            if (descend)
            {
                // Only the fields declared to hold child models, precomputed per
                // class - not every field, type-tested per value per visit.
                const children = CjsSchema.getSchema(model.constructor).children;
                const start = reverse ? children.length - 1 : 0;
                const end = reverse ? -1 : children.length;
                const step = reverse ? -1 : 1;

                for (let i = start; i !== end; i += step)
                {
                    const child = children[i];
                    if (options.ownedOnly === true && !child.owned) continue;
                    const value = model[child.name];

                    if (Array.isArray(value))
                    {
                        const itemStart = reverse ? value.length - 1 : 0;
                        const itemEnd = reverse ? -1 : value.length;
                        for (let j = itemStart; j !== itemEnd; j += step) visit(value[j]);
                    }
                    else
                    {
                        visit(value);
                    }
                }
            }

            if (order === "post") visitor(model);
        };

        visit(this);
        return this;
    }

    /**
     * Collects unique resources reported by this model graph into an array.
     *
     * Every model in the graph is visited: reporting resources does not hide a
     * model's descendants, because an under-reported dependency set would let
     * readiness checks pass while a child's resources were still loading.
     *
     * Resources held in schema fields are collected automatically - they are
     * already declared, as `@type.objectRef("TriGeometryRes")` and friends, so
     * restating them in a hook would be the hand-written relay chain this
     * traversal exists to replace.
     *
     * `OnGetResources()` is the escape hatch for resources a model holds
     * outside its schema, such as private fields. It takes no arguments and
     * always returns an iterable of resources - never a bare resource and never
     * nothing. Most models do not implement it.
     *
     * @param {Array<*>} [out=[]] Output array, whose contents are replaced.
     * @returns {Array<*>} The supplied output array.
     */
    GetResources(out = [])
    {
        const resources = new Set();

        this.Traverse(model =>
        {
            for (const field of CjsSchema.getSchema(model.constructor).resources)
            {
                const value = model[field.name];
                if (Array.isArray(value))
                {
                    for (const item of value) AddResource(resources, item);
                }
                else
                {
                    AddResource(resources, value);
                }
            }

            if (typeof model.OnGetResources === "function")
            {
                AddResources(resources, model.OnGetResources());
            }
            return true;
        });

        out.length = 0;
        out.push(...resources);
        return out;
    }

    /**
     * Marks the model as changed; the next settle applies it.
     *
     * The cooperative-pipeline contract: anything mutating outside
     * `SetValues` (direct writes, Object.assign, reader adapters) owes this
     * call or an explicit `UpdateValues()`.
     *
     * @returns {CjsModel} This model.
     */
    MarkDirty()
    {
        this.__state.MarkDirty();
        if (this.__state.updating) queueModifiedMember(this, null);
        return this;
    }

    /**
     * Clears the dirty mark without settling. Rarely correct outside tests
     * and teardown - the settle clears it itself.
     *
     * @returns {CjsModel} This model.
     */
    ClearDirty()
    {
        this.__state.ClearDirty();
        return this;
    }

    /**
     * Checks whether a settle is owed.
     *
     * @returns {boolean}
     */
    IsDirty()
    {
        return this.__state.IsDirty();
    }

    /**
     * Gets the shared schema registry and decorator facade.
     *
     * @returns {typeof CjsSchema}
     */
    static get schema()
    {
        return CjsSchema;
    }

    /**
     * Exports a model's schema fields into an output object.
     *
     * All options default off, leaving the plain output identical to the
     * historical shape. Options propagate recursively to nested models.
     *
     * @param {CjsModel} value
     * @param {object} [out={}]
     * @param {object} [options={}]
     * @param {boolean} [options.persistOnly] Exports only persisted fields.
     * @param {boolean} [options.typeTags] Emits `_type` only where the concrete
     *     class is not derivable from the declared field type (the root and
     *     polymorphic slots).
     * @param {boolean} [options.forceTypeTags] Emits `_type` on every model.
     * @param {boolean} [options.refs] Tracks shared models: repeats export as
     *     `{ _ref }` and their first occurrence carries `_id`. Also guards
     *     against cyclic graphs.
     * @returns {object} The supplied output object.
     * @throws {TypeError} If the source or output target is invalid.
     */
    static get(value, out = {}, options = {})
    {
        if (!(value instanceof CjsModel))
        {
            throw new TypeError("CjsModel.get requires a CjsModel source.");
        }

        if (!out || typeof out !== "object" || Array.isArray(out) || ArrayBuffer.isView(out))
        {
            throw new TypeError("CjsModel.get requires an object output target.");
        }

        // Blue's writer (IRootWriter/YamlWriter rules) is the one export.
        return new DictWriter().WriteObject(value, out, options);
    }

    /**
     * Applies schema-backed values to a model and processes resulting updates.
     *
     * Reserved metadata keys are honored, never treated as fields: a string
     * `values._type` must name the target's class or one of its base classes;
     * `values._id` registers the target for `{ _ref }` resolution; a
     * `{ _ref }` incoming field value resolves to the registered instance
     * (shared identity) and throws when the id never resolves.
     *
     * @param {CjsModel} out
     * @param {object} [values={}]
     * @param {object} [options={}]
     * @param {boolean} [options.markDirty=true] Tracks changed properties and notification flags.
     * @param {boolean} [options.notify=true] Tracks schema notification flags.
     * @param {boolean} [options.skipUpdate=false] Leaves dirty changes unsettled.
     * @param {boolean} [options.skipEvents=false] Suppresses direct modified events.
     * @param {boolean} [options.returnBoolean=false] Returns a boolean instead of changed fields.
     * @param {*} [options.source=out] Origin included in update callbacks and events.
     * @returns {Set<string>|boolean} Changed fields, or a boolean result.
     * @throws {TypeError} If the target is not a model.
     */
    static set(out, values = {}, options = {})
    {
        if (!(out instanceof CjsModel))
        {
            throw new TypeError("CjsModel.set requires a CjsModel target.");
        }

        if (!CjsSchema.assertValues(values, "CjsModel.set")) return false;

        // One import operation context is shared across the whole call tree so
        // `_id` registrations and `{ _ref }` resolutions see the same identity
        // table. The outermost call owns finalization of forward references.
        const ownsImportContext = !options.importContext;
        const importOptions = { ...options, importContext: options.importContext ?? createImportContext() };

        // Blue's reader notifies once per NOTIFY member it writes
        // (IRootReader.cpp:156-159); the member is queued for UpdateValues.
        const markDirty = options.markDirty !== false;
        let notifyRequested = false;
        const notify = markDirty && options.notify !== false
            ? {
                OnModified(name)
                {
                    queueModifiedMember(out, name);
                    out.__state.dirty = true;
                    notifyRequested = true;
                }
            }
            : null;

        const changed = new DictReader(importOptions).ReadInto(out, values, notify);
        if (markDirty && changed.size) out.__state.dirty = true;

        if (ownsImportContext)
        {
            importOptions.importContext.finalize();
            importOptions.importContext.initializeCreated(importOptions);
        }

        if (changed.size && !markDirty)
        {
            if (options.skipUpdate !== true && options.skipEvents !== true && out.__state.suppressEvents === 0)
            {
                out.EmitEvent("modified", out, createModifiedPayload(changed, options.source ?? out));
            }
        }
        else if ((changed.size || notifyRequested) && options.skipUpdate !== true && !out.__state.updating)
        {
            // Members were queued at mutation time, including deferred writes.
            out.UpdateValues({ ...options, changedFields: changed });
        }

        return options.returnBoolean === true ? changed.size > 0 : changed.size ? changed : false;
    }

    /**
     * Copies all exported fields from one model into another.
     *
     * @param {CjsModel} out
     * @param {CjsModel} value
     * @param {object} [options={}]
     * @returns {CjsModel} The target model.
     * @throws {TypeError} If either argument is not a model.
     */
    static copy(out, value, options = {})
    {
        if (!(out instanceof CjsModel))
        {
            throw new TypeError("CjsModel.copy requires a CjsModel target.");
        }

        if (!(value instanceof CjsModel))
        {
            throw new TypeError("CjsModel.copy requires a CjsModel source.");
        }

        CjsModel.set(out, CjsModel.get(value, {}, options), options);
        return out;
    }

    /**
     * Constructs, populates, initializes, and cleans an owned model graph.
     *
     * The invoked constructor must support zero arguments. Initial population
     * suppresses updates and events; owned children initialize before parents.
     *
     * A string `values._type` selects the concrete constructor: it must name
     * this class or a registered subclass, otherwise a TypeError is thrown. A
     * `values._id` registers the instance in the import operation context
     * before any field descends, so `{ _ref }` values elsewhere in the same
     * operation — including cycles and self-references — resolve to this
     * instance. The outermost call finalizes forward references before
     * initialization; an unresolved `_ref` throws.
     *
     * @param {object} [values={}]
     * @param {object} [options={}]
     * @returns {CjsModel} An instance of the invoked model constructor.
     * @throws {Error} If any owned model explicitly fails initialization.
     */
    static from(values = {}, options = {})
    {
        // null still means "no values": a default instance, as before.
        if (!CjsSchema.assertValues(values, "CjsModel.from")) values = {};

        if (isReferenceValue(values))
        {
            throw new TypeError(`${CjsSchema.getClassName(this) || this.name}.from cannot construct from a { _ref } value; references resolve only inside the owning import operation.`);
        }

        if (values && typeof values === "object" && typeof values._type === "string")
        {
            const Constructor = resolveRegisteredModelClass(values._type, options);
            if (Constructor !== this)
            {
                if (!(Constructor.prototype instanceof this))
                {
                    throw new TypeError(`_type "${values._type}" is not ${CjsSchema.getClassName(this) || this.name} or one of its registered subclasses.`);
                }
                return Constructor.from(values, options);
            }
        }

        const ownsImportContext = !options.importContext;
        const importOptions = ownsImportContext
            ? { ...options, importContext: createImportContext() }
            : options;

        const result = new this();

        importOptions.importContext.registerCreated(result);

        // Register-before-descent: the instance is visible to `_ref` lookups
        // before its own fields import, so back-references and cycles work.
        if (values && typeof values === "object" && values._id !== undefined && values._id !== null)
        {
            importOptions.importContext.register(values._id, result);
        }

        result.__state.suppressEvents++;
        try
        {
            result.SetValues(values, {
                ...importOptions,
                skipEvents: true,
                skipUpdate: true
            });

            if (ownsImportContext)
            {
                importOptions.importContext.finalize();
                importOptions.importContext.initializeCreated({
                    ...importOptions,
                    initChildren: true
                });
            }
        }
        finally
        {
            result.__state.suppressEvents--;
        }
        return result;
    }

    /**
     * Constructs a model from another model-like value or a raw value bag.
     *
     * @param {CjsModel|object|null} value
     * @param {object} [options={}]
     * @returns {CjsModel} An instance of the invoked model constructor.
     */
    static clone(value, options = {})
    {
        if (!value || typeof value.GetValues !== "function")
        {
            return this.from(value || {}, options);
        }

        // `refs` IS the clone contract, and a caller cannot turn it off
        // (operator, 2026-09-17): a totally new version of the target, every
        // object new, internal references intact. Identity is what delivers
        // that - without `refs` no `_id` is emitted at all, so a child
        // referenced twice exports as two full copies and rebuilds as two
        // separate objects, silently. It was the caller's to pass until now,
        // and none of the three in `src` passed it.
        return this.from(value.GetValues({ ...options, refs: true }), { ...options, refs: true });
    }

}

CjsSchema.define(CjsModel, { className: "CjsModel" });

export const carbon = CjsSchema.carbon;
export { CjsSchema };
export const impl = CjsSchema.impl;
export const edit = CjsSchema.edit;
export const jessica = CjsSchema.jessica;
export const lifecycle = CjsSchema.lifecycle;
export const schema = CjsSchema;
export const type = CjsSchema.type;

function initializeModelState(target)
{
    // Models own their runtime-state shape: __state is a CjsModelState,
    // created at construction before anything else (the event emitter's
    // lazily-added `events` map lives on the same instance as an expando).
    const existing = getRuntimeState(target);
    if (existing instanceof CjsModelState) return existing;
    if (existing)
    {
        throw new TypeError("CjsModel requires __state to be a CjsModelState.");
    }

    const state = new CjsModelState();
    Object.defineProperty(target, "__state", {
        value: state,
        enumerable: false,
        configurable: false,
        writable: false
    });
    return state;
}

function initializeOwnedGraph(root, options = {})
{
    root.Traverse(value =>
    {
        value.__state.suppressEvents++;

        try
        {
            if (value.__state instanceof CjsModelState)
            {
                // Construction: everything is new, so every declared consequence
                // applies; the object is
                // marked for one settle.
                value.__state.dirty = true;
            }

            // Initialize arguments belong to the class's Carbon/adapted contract.
            // Owned-graph traversal is coordinated here and must not occupy arg 0.
            // A conforming Initialize performs its own final
            // UpdateValues({ skipEvents: true }), leaving nothing dirty.
            if (typeof value.Initialize === "function")
            {
                if (value.Initialize() === false)
                {
                    throw new Error(`${CjsSchema.getClassName(value.constructor)}.from initialization failed.`);
                }
            }

            // Settle anything Initialize did not (including the no-Initialize
            // case): the one construction settle, events suppressed.
            if (value.__state instanceof CjsModelState && value.__state.dirty)
            {
                value.UpdateValues({
                    ...options,
                    source: options.source ?? value,
                    skipEvents: true
                });
            }
        }
        finally
        {
            value.__state.suppressEvents--;
        }
    }, {
        order: "post",
        reverse: true,
        ownedOnly: true,
        visited: options.visited
    });
    return root;
}

function AddResource(target, value)
{
    if (value?.isResource === true) target.add(value);
}


function AddResources(target, values)
{
    if (typeof values === "string" || typeof values?.[Symbol.iterator] !== "function")
    {
        throw new TypeError("CjsModel.OnGetResources must return an iterable of resources.");
    }

    // Empty slots are the model's own unset fields, not a contract violation.
    for (const value of values)
    {
        if (value !== null && value !== undefined) target.add(value);
    }
}

function getChildCollection(target, property)
{
    if (!(target instanceof CjsModel))
    {
        throw new TypeError("CjsModel child collection target must be a CjsModel instance.");
    }

    if (typeof property !== "string" || !property)
    {
        throw new TypeError("CjsModel child collection property must be a non-empty string.");
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
        throw new TypeError(`CjsModel child ${optionName} option must be a function.`);
    }
}

function recordChildMutation(target, field, options)
{
    if (options.markDirty === false) return;
    target.__state.dirty = true;
    if (options.notify !== false && field.edit?.notify) queueModifiedMember(target, field.name);
}

function notifyListModified(target, event, index, secondIndex, child, collection)
{
    if (typeof target.OnListModified === "function")
    {
        target.OnListModified(event, index, secondIndex, child, collection);
    }
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

function emitChildEvent(target, eventName, payload, options)
{
    if (options.skipEvents !== true && target.__state.suppressEvents === 0)
    {
        target.EmitEvent(eventName, target, payload);
    }
}

function settleChildMutation(target, field, options)
{
    if (options.skipUpdate === true) return;

    if (options.markDirty === false)
    {
        if (options.skipEvents !== true && target.__state.suppressEvents === 0)
        {
            target.EmitEvent("modified", target, createModifiedPayload(
                new Set([ field.name ]),
                options.source ?? target
            ));
        }
        return;
    }

    if (!target.__state.updating) target.UpdateValues({ ...options, changedFields: new Set([field.name]) });
}

// Direct callers supply their own identities and notification policy.
function addExplicitUpdateProperties(target, properties)
{
    if (properties === null || properties === undefined) return;
    target.__state.dirty = true;
    for (const property of typeof properties === "string" ? [properties] : properties)
    {
        queueModifiedMember(target, property);
    }
}

function createModifiedPayload(properties, source)
{
    return {
        properties: new Set(properties),
        source
    };
}

// Enum-aware value handling: @schema.enum("X") resolves through the owning
// class's PascalCase static `Constructor.X`, lazily and leaf-first.
// Returns the validated numeric member value, or undefined when the input is
// not a member. Accepts numeric values, exact member-name strings, and arrays
// (element 0 only, so identity tuples round-trip).
// Atomic pre-validation: every enum-backed incoming value is checked before
// any mutation; one TypeError reports every invalid property.


// --- Import operation context: `_id`/`_ref` identity across one call tree ---

/** Represents one unresolved model reference during a single import operation. */
class CjsPendingReference
{

    /**
     * Creates a deferred reference placeholder for a not-yet-resolved model
     * identifier.
     */
    constructor(id, expectedClassName = null)
    {
        this.id = id;
        this.expectedClassName = expectedClassName;
    }

}

function createImportContext()
{
    const byId = new Map();
    const created = [];
    const pending = [];
    return {
        byId,
        registerCreated(instance)
        {
            created.push(instance);
        },
        register(id, instance)
        {
            const existing = byId.get(id);
            if (existing === instance) return;
            if (existing !== undefined)
            {
                throw new TypeError(`Duplicate _id ${JSON.stringify(id)} in imported values.`);
            }
            byId.set(id, instance);
        },
        defer(id, assign)
        {
            pending.push({ id, assign });
        },
        finalize()
        {
            const unresolved = new Set();
            for (const entry of pending)
            {
                const instance = byId.get(entry.id);
                if (instance === undefined)
                {
                    unresolved.add(entry.id);
                    continue;
                }
                entry.assign(instance);
            }
            pending.length = 0;
            if (unresolved.size)
            {
                throw new TypeError(`Unresolved _ref ids: ${Array.from(unresolved, id => JSON.stringify(id)).join(", ")}. Every { _ref } must match a { _id } in the same import operation.`);
            }
        },
        initializeCreated(options)
        {
            const visited = new Set();

            for (let index = created.length - 1; index >= 0; index--)
            {
                initializeOwnedGraph(created[index], { ...options, visited });
            }

            created.length = 0;
        }
    };
}

function isReferenceValue(value)
{
    return !!value && typeof value === "object" && !Array.isArray(value)
        && !ArrayBuffer.isView(value) && !(value instanceof CjsModel)
        && value._ref !== undefined;
}

// Resolves a `{ _ref }` immediately when the target is registered, or returns
// a CjsPendingReference for the finalize pass (forward references). Resolved
// references assign like direct instances: no declared-type constraint, since
// Carbon contracts may be declared through interface names that have no
// runtime inheritance relationship with the concrete class.
// Resolves a reference into a container slot, deferring forward references to
// the owning operation's finalize pass. Deferred slots hold null until then.
// Applies a `{ _ref }` incoming value to a model field, returning whether the
// field changed. Forward references keep the current value until finalize.
function resolveRegisteredModelClass(typeName, options = {})
{
    const Schema = options.registry || CjsModel.schema;
    const Constructor = Schema.GetConstructor(typeName);
    if (!Constructor)
    {
        throw new TypeError(`No CjsModel class is registered for _type "${typeName}".`);
    }
    return Constructor;
}

// The transport API lives on CjsSchema - everything is called through the
// schema (operator direction, 2026-09-05) - and the model layer installs the
// implementation here at load, because layering forbids schema importing
// model. Dispatch:
// - a model target takes the full validated path (typed coercion, identity,
//   dirty/settle/events);
// - a non-model class carrying its own SetValues/GetValues convention (the
//   CjsFormat family) is delegated to it, per the reader ruling that
//   population goes through SetValues;
// - a plain decorated class without either goes through the schema layer's
//   state-free transport (landed 2026-09-08), which is coercion, the
//   writability gate and a changed set - the reader's half, with the editing
//   contract left to the model path.
// CjsSchema.from is the whole-bag deserializer: resolve, build, apply, then
// call the class-owned Initialize when it exists (ruled 2026-09-05).
CjsSchema.registerValuesService({
    getValues(target, out = {}, options = {})
    {
        if (CjsSchema.isModelInstance(target)) return CjsModel.get(target, out, options);
        if (target && typeof target.GetValues === "function") return target.GetValues(options);
        return CjsSchema.getValuesFromSchema(target, out, options);
    },
    setValues(target, values = {}, options = {})
    {
        if (CjsSchema.isModelInstance(target)) return CjsModel.set(target, values, options);
        if (target && typeof target.SetValues === "function") return target.SetValues(values, options);
        return CjsSchema.setValuesFromSchema(target, values, options);
    },
    from(className, values = {}, options = {})
    {
        const name = typeof className === "string" ? className.trim() : "";
        const Constructor = CjsSchema.GetConstructor(name);
        if (!Constructor)
        {
            throw new TypeError(`CjsSchema.from has no class registered for "${String(className)}".`);
        }
        if (typeof Constructor.from === "function") return Constructor.from(values, options);

        const instance = new Constructor();
        this.setValues(instance, values, options);
        if (typeof instance.Initialize === "function") instance.Initialize(options);
        return instance;
    }
});
