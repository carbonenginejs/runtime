import { coerceCarbonMathInto, exportCarbonValue, normalizeCarbonValue } from "../schema/types/index.js";
import { CJS_MODEL_BRAND, CjsSchema } from "../schema/index.js";
import { getRuntimeState } from "./runtime/CjsRuntimeState.js";
import { CjsModelState } from "./CjsModelState.js";
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

const MAX_UPDATE_PASSES = 32;
const CHILD_COLLECTION_KINDS = new Set([ "array", "list" ]);
const CHILD_LIST_EVENT = {
    UNLOAD_START: 0x07,
    INSERTED: 0x08,
    REMOVED: 0x09
};

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
     * Deep-merges ordered value sources and applies the result once.
     *
     * Plain objects merge recursively; arrays, typed arrays, and other values
     * replace the preceding value.
     *
     * @param {Array<Object|CjsModel>} [values=[]]
     * @param {object} [options={}]
     * @returns {Set<string>|boolean} The result returned by {@link CjsModel.set}.
     */
    Merge(values = [], options = {})
    {
        return CjsModel.merge(this, values, options);
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
        const imported = importSourceValue([ values ], field, {
            ...options,
            ownerConstructor: target.constructor
        });
        const child = imported[0];

        assertChildObject(child, field.name);
        CjsModel.addChild(target, field.name, child, options);
        return child;
    }

    /**
     * Appends an existing object to a schema-backed child collection.
     *
     * The mutation invokes Carbon-shaped `OnListModified` when present,
     * records the field's declared flag/rebuild consequences, emits one
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
        notifyListModified(target, CHILD_LIST_EVENT.INSERTED, index, 0, child, collection);

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
        notifyListModified(target, CHILD_LIST_EVENT.REMOVED, index, 0, child, collection);

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
        notifyListModified(target, CHILD_LIST_EVENT.UNLOAD_START, 0, 0, null, collection);
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
     * @param {string|Iterable<string>} [options.property] Fields the caller changed directly; their declared flag/rebuild tokens are added first.
     * @param {string|Iterable<string>} [options.properties] Alias of `property`.
     * @param {*} [options.source=this] Origin forwarded to the hook and event (binding feedback control).
     * @param {boolean} [options.skipEvents=false] Prevents the final modified event.
     * @returns {boolean} False when the hook rejected the update (dirty is retained).
     * @throws {Error} If local changes do not settle within the update-pass limit.
     */
    UpdateValues(options = {})
    {
        addExplicitUpdateProperties(this, options.property ?? options.properties);
        if (this.__state.updating) return true;

        const source = options.source ?? this;
        this.__state.updating = true;

        try
        {
            for (let pass = 0; ; pass++)
            {
                if (pass >= MAX_UPDATE_PASSES)
                {
                    throw new Error(`${CjsSchema.getClassName(this.constructor)}.UpdateValues exceeded ${MAX_UPDATE_PASSES} local settle passes.`);
                }

                this.__state.dirty = false;

                if (this.OnModified({ ...options, source }) === false)
                {
                    this.__state.dirty = true;
                    return false;
                }

                if (!this.__state.dirty) break;
            }
        }
        catch (err)
        {
            this.__state.dirty = true;
            throw err;
        }
        finally
        {
            this.__state.updating = false;
        }

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
     * Invoked only by UpdateValues. Receives the mutation options bag
     * (source, caller context, skipEvents, ...). There is no changed-property
     * list - the pipeline is cooperative and cannot guarantee one - so
     * overrides are written broad-safe: consult own state, compare cached
     * derivations, and rely on `__state.flags`/`__state.rebuild` tokens for
     * targeted signals. Returning `false` rejects the update and retains the
     * dirty mark.
     *
     * @param {object} [options={}]
     * @returns {boolean} Whether the update may complete.
     */
    OnModified(options = {})
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
     * @param {boolean} [options.forceIDs] Emits `_id` on every model.
     * @param {boolean} [options.keyedLists] Exports a list as a name-keyed
     *     object when every item is a model with a unique non-empty `name`;
     *     the redundant item `name` field is dropped in that form. Empty
     *     lists stay arrays.
     * @param {string} [options.enumFormat] Enum-backed field emission:
     *     "values" (default, numeric), "names" (exact member-name strings),
     *     or "identity" (`[name, "OwnerClass.EnumName"]` tuples). Unknown
     *     numeric values export as raw numbers in every mode.
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

        if (!hasAdvancedExportOptions(options))
        {
            for (const field of getModelFields(value))
            {
                out[field.name] = exportSourceValue(value[field.name], options);
            }

            return out;
        }

        return exportModelInto(value, out, null, options, createExportContext(value, options));
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

        if (!values || typeof values !== "object") return false;

        if (typeof values._type === "string")
        {
            assertTargetTypeMatches(out, values._type, options);
        }

        // One import operation context is shared across the whole call tree so
        // `_id` registrations and `{ _ref }` resolutions see the same identity
        // table. The outermost call owns finalization of forward references.
        const ownsImportContext = !options.importContext;
        const importOptions = {
            ...options,
            importContext: options.importContext ?? createImportContext(),
            ownerConstructor: out.constructor
        };

        if (values._id !== undefined && values._id !== null)
        {
            importOptions.importContext.register(values._id, out);
        }

        const enumTranslations = validateEnumInputs(out, values);

        const changed = new Set();
        for (const field of getModelFields(out))
        {
            if (!isWritableModelField(field)) continue;

            const key = findIncomingKey(values, field);
            if (key !== null)
            {
                const oldValue = out[field.name];
                const incoming = enumTranslations.has(field.name) ? enumTranslations.get(field.name) : values[key];

                let didChange;
                if (isReferenceValue(incoming))
                {
                    didChange = applyIncomingReference(out, field, incoming, importOptions);
                }
                else
                {
                    // Registered struct fields have value semantics. Constructors may
                    // install their canonical struct instance up front; populate that
                    // instance rather than replacing it with an imported object.
                    const structChanged = applyIncomingStructInPlace(oldValue, incoming, field, importOptions);

                    if (structChanged !== null)
                    {
                        didChange = field.io?.always === true || structChanged;
                    }
                    else
                    {
                        // Fast path: a math field with an existing compatible typed array
                        // is coerced IN PLACE (no allocation, buffer reference preserved).
                        const mathChanged = coerceCarbonMathInto(oldValue, incoming, field);

                        if (mathChanged !== null)
                        {
                            didChange = field.io?.always === true || mathChanged;
                        }
                        else
                        {
                            const newValue = importSourceValue(incoming, field, importOptions);
                            didChange = field.io?.always === true || !areEquivalentSourceValues(oldValue, newValue);
                            if (didChange) out[field.name] = newValue;
                        }
                    }
                }

                if (didChange)
                {
                    changed.add(field.name);
                    if (options.markDirty !== false)
                    {
                        out.__state.dirty = true;
                        // Write-time token adds: the knowledge of WHICH field
                        // changed lives here, so declared consequences land
                        // here (props are not tracked in state).
                        if (options.notify !== false)
                        {
                            addDeclaredFieldTokens(out, field);
                        }
                    }
                }
            }
        }

        if (ownsImportContext)
        {
            importOptions.importContext.finalize();
            importOptions.importContext.initializeCreated(importOptions);
        }

        if (changed.size && options.markDirty === false)
        {
            if (options.skipUpdate !== true && options.skipEvents !== true && out.__state.suppressEvents === 0)
            {
                out.EmitEvent("modified", out, createModifiedPayload(changed, options.source ?? out));
            }
        }
        else if (changed.size && options.skipUpdate !== true && !out.__state.updating)
        {
            out.UpdateValues(options);
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
     * Deep-merges ordered value sources and applies the result with one set call.
     *
     * @param {CjsModel} out
     * @param {Array<object|CjsModel>} [values=[]]
     * @param {object} [options={}]
     * @returns {Set<string>|boolean} The result returned by {@link CjsModel.set}.
     * @throws {TypeError} If the target, source array, or options are invalid.
     */
    static merge(out, values = [], options = {})
    {
        if (!(out instanceof CjsModel))
        {
            throw new TypeError("CjsModel.merge requires a CjsModel target.");
        }

        if (!Array.isArray(values))
        {
            throw new TypeError("CjsModel.merge requires an array of value sources.");
        }

        if (!options || typeof options !== "object" || Array.isArray(options) || ArrayBuffer.isView(options))
        {
            throw new TypeError("CjsModel.merge requires an options object.");
        }

        const merged = {};
        for (const value of values) mergeValueBag(merged, value, options);
        return CjsModel.set(out, merged, options);
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

        return this.from(value.GetValues(options), options);
    }

}

CjsSchema.define(CjsModel, { className: "CjsModel" });

export const carbon = CjsSchema.carbon;
export { CjsSchema };
export const impl = CjsSchema.impl;
export const io = CjsSchema.io;
export const jessica = CjsSchema.jessica;
export const schema = CjsSchema;
export const type = CjsSchema.type;

function mergeValueBag(out, value, options = {})
{
    const source = value instanceof CjsModel ? CjsModel.get(value, {}, options) : value;
    if (!isPlainRecord(source)) return out;

    for (const [key, incoming] of Object.entries(source))
    {
        if (key === "__proto__" || key === "constructor" || key === "prototype") continue;

        const normalized = incoming instanceof CjsModel ? CjsModel.get(incoming, {}, options) : incoming;
        if (isPlainRecord(normalized))
        {
            if (!isPlainRecord(out[key])) out[key] = {};
            mergeValueBag(out[key], normalized, options);
        }
        else
        {
            out[key] = normalized;
        }
    }
    return out;
}

function isPlainRecord(value)
{
    if (!value || typeof value !== "object" || Array.isArray(value) || ArrayBuffer.isView(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function getModelFields(target)
{
    const schema = CjsSchema.getSchema(target.constructor);
    return schema.fields.map(schemaFieldToModelField);
}

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
                // applies - all flag/rebuild tokens are added, and the object is
                // marked for one settle.
                addAllDeclaredTokens(value);
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

function schemaFieldToModelField(field)
{
    return {
        ...field,
        jsType: field.type || field.jsType || null
    };
}

function isWritableModelField(field)
{
    const io = field?.io;
    if (!io) return true;
    if (io.write || io.persist || io.persistOnly) return true;
    if (io.read && !io.write) return false;
    return true;
}

function findIncomingKey(values, field)
{
    for (const key of incomingKeyCandidates(field))
    {
        if (Object.prototype.hasOwnProperty.call(values, key)) return key;
    }

    return null;
}

function incomingKeyCandidates(field)
{
    const aliases = field.aliases === undefined
        ? field.alias === undefined ? [] : [field.alias]
        : Array.isArray(field.aliases) ? field.aliases : [field.aliases];
    return [field.name, ...aliases].filter(value => typeof value === "string" && value.length);
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
    if (options.notify !== false) addDeclaredFieldTokens(target, field);
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

    if (!target.__state.updating) target.UpdateValues(options);
}

// Adds one field's declared @io.flag / @io.rebuild tokens to their stores.
// Duplicate adds are no-ops (Sets). Nothing in the model layer ever clears
// these stores - getters clear flags, work methods clear rebuild tokens.
function addDeclaredFieldTokens(target, field)
{
    const io = field?.io;
    if (!io) return;
    if (io.flag) for (const token of io.flag) target.__state.flags.add(token);
    if (io.rebuild) for (const token of io.rebuild) target.__state.rebuild.add(token);
}

// Construction / broad invalidation: every declared token applies.
function addAllDeclaredTokens(target)
{
    const fields = CjsSchema.getSchema(target.constructor)?.fields || [];
    for (const field of fields) addDeclaredFieldTokens(target, field);
}

// Direct-mutation courtesy: a caller that knows which fields it touched
// (bindings) passes them so declared consequences stay precise.
function addExplicitUpdateProperties(target, properties)
{
    if (properties === null || properties === undefined) return;
    target.__state.dirty = true;
    for (const property of typeof properties === "string" ? [properties] : properties)
    {
        const field = CjsSchema.getField(target.constructor, property);
        if (field) addDeclaredFieldTokens(target, field);
    }
}

function createModifiedPayload(properties, source)
{
    return {
        properties: new Set(properties),
        source
    };
}

function areEquivalentSourceValues(a, b)
{
    if (Object.is(a, b)) return true;

    if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b))
    {
        if (a.constructor !== b.constructor || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++)
        {
            if (!Object.is(a[i], b[i])) return false;
        }
        return true;
    }

    if (Array.isArray(a) && Array.isArray(b))
    {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++)
        {
            if (!areEquivalentSourceValues(a[i], b[i])) return false;
        }
        return true;
    }

    return false;
}

/**
 * Exports a source-shaped field value while preserving reference and enum
 * policy.
 */
export function exportSourceValue(value, options = {})
{
    if (value instanceof CjsModel) return value.GetValues(options);
    return exportCarbonValue(value);
}

function hasAdvancedExportOptions(options)
{
    return !!(options && (options.persistOnly || options.typeTags || options.forceTypeTags
        || options.refs || options.forceIDs || options.keyedLists
        || (options.enumFormat && options.enumFormat !== "values")));
}

// Enum-aware value handling: @schema.enum("X") resolves through the owning
// class's PascalCase static `Constructor.X`, lazily and leaf-first.
const ENUM_REVERSE_CACHE = new WeakMap();

function resolveEnumStaticForField(Constructor, field)
{
    const name = field?.enum?.enumType;
    if (!name) return null;
    const members = Constructor?.[name];
    if (!members || typeof members !== "object") return null;
    return { name, members };
}

function enumMemberName(members, value)
{
    let reverse = ENUM_REVERSE_CACHE.get(members);
    if (!reverse)
    {
        reverse = new Map();
        for (const key of Object.keys(members))
        {
            // Duplicate values: first-declared key wins.
            if (!reverse.has(members[key])) reverse.set(members[key], key);
        }
        ENUM_REVERSE_CACHE.set(members, reverse);
    }
    return reverse.get(value);
}

function enumIdentity(Constructor, name)
{
    let current = Constructor;
    while (typeof current === "function")
    {
        if (Object.hasOwn(current, name))
        {
            return `${CjsSchema.getClassName(current) || current.name}.${name}`;
        }
        current = Object.getPrototypeOf(current);
    }
    return `${CjsSchema.getClassName(Constructor) || Constructor.name}.${name}`;
}

// Returns the validated numeric member value, or undefined when the input is
// not a member. Accepts numeric values, exact member-name strings, and arrays
// (element 0 only, so identity tuples round-trip).
function translateEnumInput(value, members)
{
    if (Array.isArray(value))
    {
        if (!value.length) return undefined;
        return translateEnumInput(value[0], members);
    }
    if (typeof value === "string")
    {
        return Object.hasOwn(members, value) ? members[value] : undefined;
    }
    if (typeof value === "number")
    {
        return enumMemberName(members, value) === undefined ? undefined : value;
    }
    return undefined;
}

// Atomic pre-validation: every enum-backed incoming value is checked before
// any mutation; one TypeError reports every invalid property.
function validateEnumInputs(out, values)
{
    const translations = new Map();
    let issues = null;
    for (const field of getModelFields(out))
    {
        if (!isWritableModelField(field)) continue;
        const key = findIncomingKey(values, field);
        if (key === null) continue;
        const spec = resolveEnumStaticForField(out.constructor, field);
        if (!spec) continue;
        const raw = values[key];
        if (raw === null || raw === undefined || raw instanceof CjsModel) continue;
        const translated = translateEnumInput(raw, spec.members);
        if (translated === undefined)
        {
            issues = issues || [];
            issues.push(`${field.name}: ${JSON.stringify(raw)} is not a member of ${enumIdentity(out.constructor, spec.name)}`);
        }
        else
        {
            translations.set(field.name, translated);
        }
    }
    if (issues)
    {
        throw new TypeError(`Invalid enum values for ${CjsSchema.getClassName(out.constructor) || "model"} - ${issues.join("; ")}`);
    }
    return translations;
}

function exportEnumFieldValue(value, spec, Constructor, options)
{
    if (typeof value !== "number") return value;
    const memberName = enumMemberName(spec.members, value);
    if (memberName === undefined) return value;
    if (options.enumFormat === "names") return memberName;
    return [memberName, enumIdentity(Constructor, spec.name)];
}

function isPersistedModelField(field)
{
    const io = field?.io;
    return !!(io && (io.persist || io.persistOnly));
}

function declaredExportClassName(fieldType)
{
    if (!fieldType) return null;
    if (typeof fieldType === "string") return fieldType;
    if (fieldType.kind === "array" || fieldType.kind === "list")
    {
        const item = fieldType.itemType ?? null;
        return typeof item === "string" ? item : item?.className ?? null;
    }
    return fieldType.className ?? null;
}

function createExportContext(root, options)
{
    if (!options.refs && !options.forceIDs) return null;

    let nextId = 1;
    const idByModel = new Map();
    const context = {
        emitted: new Set(),
        idByModel,
        getId(model)
        {
            let id = idByModel.get(model);
            if (id === undefined)
            {
                id = nextId++;
                idByModel.set(model, id);
            }
            return id;
        }
    };

    if (options.refs)
    {
        // Pre-count occurrences so only genuinely shared models receive ids.
        const counts = new Map();
        (function walk(value)
        {
            if (Array.isArray(value))
            {
                for (const item of value) walk(item);
                return;
            }
            if (!(value instanceof CjsModel)) return;
            const count = (counts.get(value) ?? 0) + 1;
            counts.set(value, count);
            if (count > 1) return;
            for (const field of getModelFields(value))
            {
                if (options.persistOnly && !isPersistedModelField(field)) continue;
                walk(value[field.name]);
            }
        })(root);
        for (const [model, count] of counts)
        {
            if (count > 1) idByModel.set(model, nextId++);
        }
    }

    return context;
}

function exportModelInto(model, out, declaredClassName, options, context)
{
    if (context)
    {
        context.emitted.add(model);
    }

    const className = CjsSchema.getClassName(model.constructor);
    if (options.forceTypeTags || (options.typeTags && className && className !== declaredClassName))
    {
        out._type = className;
    }
    if (context && (options.forceIDs || context.idByModel.has(model)))
    {
        out._id = context.getId(model);
    }

    // Field metadata is per-copy for the same reason the class name is, and
    // when it is missing the loop below simply exports nothing — a model that
    // silently becomes an empty object rather than failing. The model itself
    // always knows its own schema, so the export is delegated to the copy that
    // declared it. `_type` and `_id` are already resolved above and are kept:
    // identity belongs to the graph being written, not to the model's own view
    // of itself.
    const fields = getModelFields(model);
    if (!fields.length && typeof model.GetValues === "function")
    {
        return Object.assign(out, model.GetValues(options), out);
    }

    const enumMode = options.enumFormat && options.enumFormat !== "values";
    for (const field of fields)
    {
        if (options.persistOnly && !isPersistedModelField(field)) continue;
        if (enumMode)
        {
            const spec = resolveEnumStaticForField(model.constructor, field);
            if (spec)
            {
                out[field.name] = exportEnumFieldValue(model[field.name], spec, model.constructor, options);
                continue;
            }
        }
        out[field.name] = exportAdvancedValue(
            model[field.name],
            declaredExportClassName(field.jsType || field.type || null),
            options,
            context
        );
    }

    return out;
}

function exportAdvancedValue(value, declaredClassName, options, context)
{
    // Branded, for the same reason as the import side: a cross-copy model that
    // fails this test is exported as an anonymous field bag, losing both its
    // `_type` and its place in the shared-identity table.
    if (isModelInstance(value))
    {
        if (context && options.refs && context.emitted.has(value))
        {
            return { _ref: context.getId(value) };
        }
        return exportModelInto(value, {}, declaredClassName, options, context);
    }
    if (Array.isArray(value))
    {
        if (options.keyedLists)
        {
            const keyed = exportKeyedList(value, declaredClassName, options, context);
            if (keyed) return keyed;
        }
        return value.map(item => exportAdvancedValue(item, declaredClassName, options, context));
    }
    return exportCarbonValue(value);
}

function exportKeyedList(list, declaredClassName, options, context)
{
    if (!list.length) return null;

    const seen = new Set();
    for (const item of list)
    {
        if (!(item instanceof CjsModel)) return null;
        const name = item.name;
        if (typeof name !== "string" || name === "" || seen.has(name)) return null;
        seen.add(name);
    }

    const out = {};
    for (const item of list)
    {
        const exported = exportAdvancedValue(item, declaredClassName, options, context);
        if (exported && typeof exported === "object" && exported._ref === undefined)
        {
            delete exported.name;
        }
        out[item.name] = exported;
    }
    return out;
}

/** Imports a source-shaped field value according to schema and reference policy. */
export function importSourceValue(value, field = null, options = {})
{
    // Branded rather than `instanceof`: a live model handed over by a sibling
    // package is still a live model, and the alternative here is not an error
    // but a silent copy into a plain object further down.
    if (isModelInstance(value)) return value;

    if (isReferenceValue(value))
    {
        const resolved = resolveIncomingReference(value, options);
        if (resolved instanceof CjsPendingReference)
        {
            throw new TypeError(`Forward { _ref: ${JSON.stringify(value._ref)} } cannot be deferred in this position.`);
        }
        return resolved;
    }

    const schemaType = getSchemaType(options.ownerConstructor, field?.name);
    const declaredClassName = getSchemaClassName(schemaType, options);
    if (value && typeof value === "object" && !isModelInstance(value) && !Array.isArray(value) && !ArrayBuffer.isView(value))
    {
        // A registered `_type` selects the concrete class in singular
        // schema-typed positions. Carbon contracts may be declared through
        // interface names with no runtime inheritance, so the declared name
        // is a fallback, not a constraint the concrete class must extend.
        const explicitClassName = isSingularSchemaKind(schemaType) && typeof value._type === "string"
            ? getSchemaClassName(value._type, options)
            : null;
        const className = explicitClassName || declaredClassName;
        if (className)
        {
            return createModelValue(className, value, options);
        }
    }

    if ((schemaType?.kind === "array" || schemaType?.kind === "list") && schemaType.itemType && Array.isArray(value))
    {
        const itemClassName = getSchemaClassName(schemaType.itemType, options);
        const result = [];
        for (let i = 0; i < value.length; i++)
        {
            const item = value[i];
            if (isReferenceValue(item))
            {
                result.push(importReferenceInto(item, options, result, i));
                continue;
            }
            if (!item || typeof item !== "object" || item instanceof CjsModel || ArrayBuffer.isView(item))
            {
                result.push(importSourceValue(item, null, options));
                continue;
            }

            const explicitClassName = typeof item._type === "string"
                ? getSchemaClassName(item._type, options)
                : null;
            if (explicitClassName)
            {
                result.push(createModelValue(explicitClassName, item, options));
                continue;
            }

            result.push(itemClassName
                ? createModelValue(itemClassName, item, options)
                : importSourceValue(item, null, options));
        }
        return result;
    }

    // List fields also accept name-keyed object maps for unique-named items;
    // the map is a wholesale list replacement, mirroring array semantics.
    const effectiveType = field?.jsType || field?.type || schemaType;
    if ((effectiveType?.kind === "array" || effectiveType?.kind === "list")
        && value && typeof value === "object" && !Array.isArray(value) && !ArrayBuffer.isView(value))
    {
        return importListMapValue(value, effectiveType, options);
    }

    if (field) return normalizeCarbonValue(value, field);
    if (ArrayBuffer.isView(value)) return normalizeCarbonValue(value, { jsType: { kind: "typedArray", js: value.constructor.name } });
    if (typeof value === "bigint") return value;
    if (Array.isArray(value))
    {
        const result = [];
        for (let i = 0; i < value.length; i++)
        {
            const item = value[i];
            result.push(isReferenceValue(item)
                ? importReferenceInto(item, options, result, i)
                : importSourceValue(item, null, options));
        }
        return result;
    }
    if (value && typeof value === "object" && !(value instanceof CjsModel))
    {
        const result = {};
        for (const [key, item] of Object.entries(value))
        {
            result[key] = isReferenceValue(item)
                ? importReferenceInto(item, options, result, key)
                : importSourceValue(item, null, options);
        }
        return result;
    }
    return value;
}

function applyIncomingStructInPlace(current, incoming, field, options)
{
    const schemaType = getSchemaType(options.ownerConstructor, field?.name) || field?.type || field?.jsType;
    if (schemaType?.kind !== "struct" || !(current instanceof CjsModel)) return null;
    if (incoming === null || incoming === undefined) return false;
    if (typeof incoming !== "object" || Array.isArray(incoming) || ArrayBuffer.isView(incoming))
    {
        throw new TypeError(`${field.name} requires an object value for registered struct ${schemaType.className || "unknown"}.`);
    }

    const values = incoming instanceof CjsModel ? incoming.GetValues() : incoming;
    const changed = current.SetValues(values, options);
    return changed instanceof Set ? changed.size > 0 : changed === true;
}

function importListMapValue(value, schemaType, options)
{
    const itemClassName = schemaType.itemType ? getSchemaClassName(schemaType.itemType, options) : null;
    const result = [];
    for (const key of Object.keys(value))
    {
        const item = value[key];
        if (item === undefined || item === null) continue;

        if (item instanceof CjsModel)
        {
            if (typeof item.name === "string" && item.name === "")
            {
                item.SetValues({ name: key });
            }
            result.push(item);
            continue;
        }

        if (isReferenceValue(item))
        {
            // Shared items keep their own name; the map key is not restamped
            // onto an instance owned by another position in the graph.
            result.push(importReferenceInto(item, options, result, result.length));
            continue;
        }

        if (typeof item !== "object" || Array.isArray(item) || ArrayBuffer.isView(item))
        {
            throw new TypeError(`List field maps require object or model values; "${key}" cannot become a list item.`);
        }

        const explicitClassName = typeof item._type === "string"
            ? getSchemaClassName(item._type, options)
            : null;
        const className = explicitClassName || itemClassName;
        if (!className)
        {
            throw new TypeError(`List field maps cannot resolve a model class for "${key}".`);
        }

        const values = item.name === undefined ? { ...item, name: key } : item;
        result.push(createModelValue(className, values, options));
    }
    return result;
}

function getSchemaType(Constructor, fieldName)
{
    if (!Constructor || !fieldName) return null;
    return CjsSchema.getField(Constructor, fieldName)?.type || null;
}

function getSchemaClassName(schemaType, options = {})
{
    if (!schemaType) return null;
    if (typeof schemaType === "string")
    {
        const Schema = options.registry || CjsModel.schema;
        return Schema.GetConstructor(schemaType) ? schemaType : null;
    }
    if (schemaType.kind === "model")
    {
        return schemaType.className || null;
    }
    if (schemaType.kind === "objectRef" || schemaType.kind === "struct")
    {
        const Schema = options.registry || CjsModel.schema;
        return schemaType.className && Schema.GetConstructor(schemaType.className)
            ? schemaType.className
            : null;
    }
    return null;
}

function createModelValue(className, values, options)
{
    const Schema = options.registry || CjsModel.schema;
    const Constructor = Schema.GetConstructor(className);
    if (!Constructor)
    {
        throw new TypeError(`No CjsModel class is registered for schema type ${className}.`);
    }
    // Branded, so a class registered from a sibling package is accepted. The
    // check still rejects a genuinely unrelated class; it just no longer
    // rejects a real model for having been declared elsewhere.
    if (Constructor !== CjsModel && !isModelInstance(Constructor.prototype))
    {
        throw new TypeError(`Registered schema type ${className} is not a CjsModel.`);
    }
    if (typeof Constructor.from !== "function")
    {
        throw new TypeError(`Registered CjsModel ${className} does not provide from().`);
    }
    return Constructor.from(values, options);
}

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
function resolveIncomingReference(value, options)
{
    const id = value._ref;
    const context = options.importContext;
    if (!context)
    {
        throw new TypeError(`Cannot resolve { _ref: ${JSON.stringify(id)} } outside an import operation; import the graph through SetValues/from so identity is tracked.`);
    }
    const resolved = context.byId.get(id);
    if (resolved === undefined) return new CjsPendingReference(id);
    return resolved;
}

// Resolves a reference into a container slot, deferring forward references to
// the owning operation's finalize pass. Deferred slots hold null until then.
function importReferenceInto(value, options, target, key)
{
    const resolved = resolveIncomingReference(value, options);
    if (resolved instanceof CjsPendingReference)
    {
        options.importContext.defer(resolved.id, instance =>
        {
            target[key] = instance;
        });
        return null;
    }
    return resolved;
}

// Applies a `{ _ref }` incoming value to a model field, returning whether the
// field changed. Forward references keep the current value until finalize.
function applyIncomingReference(out, field, incoming, options)
{
    const fieldName = field.name;
    const resolved = resolveIncomingReference(incoming, options);

    if (resolved instanceof CjsPendingReference)
    {
        options.importContext.defer(resolved.id, instance =>
        {
            out[fieldName] = instance;
        });
        return true;
    }

    if (field.io?.always !== true && Object.is(out[fieldName], resolved)) return false;
    out[fieldName] = resolved;
    return true;
}

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

function isSingularSchemaKind(schemaType)
{
    if (!schemaType) return false;
    if (typeof schemaType === "string") return true;
    return schemaType.kind !== "array" && schemaType.kind !== "list"
        && schemaType.kind !== "map" && schemaType.kind !== "set";
}

function assertTargetTypeMatches(out, typeName, options = {})
{
    const Constructor = resolveRegisteredModelClass(typeName, options);
    if (!(out instanceof Constructor))
    {
        throw new TypeError(`Values with _type "${typeName}" cannot apply to a ${CjsSchema.getClassName(out.constructor) || "model"} target.`);
    }
}
