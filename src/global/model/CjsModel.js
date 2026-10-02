import { createChild, addChild, removeChild, deleteChild, clearChildren } from "../blue/children.js";
import "../blue/values.js";
import { CJS_MODEL_BRAND, CjsSchema } from "../schema/index.js";
import { getRuntimeState } from "../compose/runtimeState.js";
import { queueModifiedMember, settleModifiedMembers } from "../compose/values.js";
import { BLUELISTEVENT } from "../consts/blue.js";
import { CjsModelState } from "./CjsModelState.js";
import { DictReader, CreateAnchorTable } from "../blue/DictReader.js";
import { DictWriter } from "../blue/DictWriter.js";
import { Copier } from "../blue/Copier.js";
import { Traverse } from "../blue/find.js";
import { GetResources } from "../blue/getResources.js";
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
        return createChild(target, property, values, { ...options, listNotify: typeof target.OnListModified === "function" ? target : null });
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
        return addChild(target, property, child, { ...options, listNotify: typeof target.OnListModified === "function" ? target : null });
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
        return removeChild(target, property, child, { ...options, listNotify: typeof target.OnListModified === "function" ? target : null });
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
        return deleteChild(target, property, child, { ...options, listNotify: typeof target.OnListModified === "function" ? target : null });
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
        return clearChildren(target, property, { ...options, listNotify: typeof target.OnListModified === "function" ? target : null });
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
     * Visits this object's declared graph through Blue's shared traversal.
     *
     * Includes plain declared classes and resources in derived-to-base member
     * order. Preorder false prunes descendants; postorder returns are ignored.
     * This public visitor does not define the legacy values initialization order.
     *
     * @param {function(object): (boolean|void)} visitor
     * @param {object} [options={}]
     * @param {Set<object>} [options.visited] Existing cycle-detection set.
     * @param {"pre"|"post"} [options.order="pre"]
     * @param {boolean} [options.reverse=false] Reverse member and collection order.
     * @param {boolean} [options.ownedOnly=false] Follow only declared owned edges.
     * @param {boolean} [options.includeRoot=true] Whether to visit this root.
     * @returns {CjsModel} This model.
     * @throws {TypeError} If visitor is not a function.
     * @impl custom Compatibility entry point for Blue's declaration-driven visitor.
     */
    Traverse(visitor, options = {})
    {
        return Traverse(this, visitor, options);
    }

    /**
     * Collects unique resources from the declared graph through Blue.
     *
     * Visits plain classes and recursive resource dependencies as well as models.
     * Declared resource fields, including runtime-only type.resource references,
     * contribute resources without pruning descendants. Output contents are replaced
     * in encounter order; no resource is released or initialized by this operation.
     *
     * @param {Array<*>} [out=[]] Output array, whose contents are replaced.
     * @returns {Array<*>} The supplied output array.
     * @impl custom Compatibility entry point for declaration-driven resource collection.
     */
    GetResources(out = [])
    {
        return GetResources(this, out);
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
     * @param {boolean} [options.roundTrip] Exports only members an import
     *     writes back (no READ-only ones), so the bag rebuilds the graph.
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

        importOptions.importContext.registerCreated(result, options => initializeOwnedGraph(result, options));

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
     * Copies a model through Blue's Copier (`CloneTo`, Copier.cpp:36-40): a
     * new object of the source's class for every object reached, shared
     * children still shared, PERSIST members copied, each copy initialized
     * after its members. A raw value bag is built with `from`.
     *
     * Carbon's members decide what is copied: a READWRITE-only member such as
     * `EveSpaceObject2.inheritProperties` (EveSpaceObject2_Blue.cpp:376-380)
     * is not, nor are the light records attachment sets rebuild (docs
     * sof-attachment-lights). The values round trip clone copied both until
     * 2026-09-28.
     *
     * @param {CjsModel|object|null} value
     * @param {object} [options={}] Build options, for a raw value bag only.
     * @returns {CjsModel} The copy.
     * @throws {TypeError} If the copy fails, where Carbon's CloneTo returns false.
     */
    static clone(value, options = {})
    {
        if (!value || typeof value.GetValues !== "function")
        {
            return this.from(value || {}, options);
        }

        const copy = new Copier().CloneTo(value);
        if (!copy) throw new TypeError(`${CjsSchema.getClassName(value.constructor)}.clone failed: Copier.CloneTo returned no copy.`);
        return copy;
    }

}

CjsSchema.define(CjsModel, { className: "CjsModel" });
// GetValues is the writer; it must never ask a model for its own values.
DictWriter.registerDelegate(CjsModel.prototype.GetValues);

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

/**
 * Initializes, through the same owned walk and `visited` set, every model of
 * this import (`options.created`) that `value` references by a non-owned
 * field and that the walk has not reached yet.
 */
function initializeReferencedFirst(value, options)
{
    for (const field of CjsSchema.getSchema(value.constructor).children)
    {
        if (field.owned) continue;
        const target = value[field.name];
        const targets = Array.isArray(target) ? target : [ target ];
        for (const model of targets)
        {
            if (model instanceof CjsModel && options.created.has(model) && !options.visited.has(model))
            {
                initializeOwnedGraph(model, options);
            }
        }
    }
}

function initializeOwnedGraph(root, options = {})
{
    traverseLegacyOwnedModels(root, value =>
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

            // REFERENCED MODELS FIRST. Carbon's BlackReader initializes an object
            // right after its members are read (BlackReader.cpp:388-402), so a
            // model met first as a REFERENCE is initialized there, before the
            // model referencing it. The owned walk alone reaches such a model
            // only through its owner, which can come later: a Tr2DynamicEmitter
            // referencing its particle system then Rebinds against a system
            // not yet valid and never emits. Models of this import that a
            // value references are initialized before it; others were
            // initialized when they were made.
            if (options.created instanceof Set) initializeReferencedFirst(value, options);

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
    }, options.visited);
    return root;
}

/**
 * Keeps the legacy values initialization graph separate from public traversal.
 *
 * Initialization historically uses base-first schema children, reverse postorder,
 * owned edges, array expansion only, and stops at non-model objects. A callback
 * guard on Blue's broader visitor would still cross plain objects and reorder
 * inherited children, changing initialization and reference-before-emitter timing.
 * This private compatibility path intentionally retains the old buckets and does
 * not grant initialization policy to canonical graph metadata.
 *
 * @param {CjsModel} root Legacy model root.
 * @param {function(CjsModel): void} visitor Initialization operation.
 * @param {Set<CjsModel>} [visited] Shared cycle/reference-in-progress set.
 * @impl custom Isolates the existing values initialization contract until its
 * callers are deliberately migrated; public traversal has no model restriction.
 */
function traverseLegacyOwnedModels(root, visitor, visited)
{
    const seen = visited instanceof Set ? visited : new Set();
    const visit = model =>
    {
        if (!CjsSchema.cast(model, CjsModel) || seen.has(model)) return;
        seen.add(model);
        const children = CjsSchema.getSchema(model.constructor).children;
        for (let i = children.length - 1; i >= 0; i--)
        {
            const child = children[i];
            if (!child.owned) continue;
            const value = model[child.name];
            if (Array.isArray(value))
            {
                for (let j = value.length - 1; j >= 0; j--) visit(value[j]);
            }
            else
            {
                visit(value);
            }
        }
        visitor(model);
    };
    visit(root);
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
    return CreateAnchorTable();
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
