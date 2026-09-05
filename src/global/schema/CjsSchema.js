import { defaultValueForCarbonField } from "./types/carbonTypes.js";


const CLASS_SCHEMA = new WeakMap();

// Exported schemas, memoized per class. SCHEMA_GENERATION is bumped by every
// metadata definition (see getOrCreateClassSchema), which is what makes a stale
// memo detectable without tracking which subclasses a base class change reaches.
const SCHEMA_EXPORTS = new WeakMap();
const DEFAULT_EXPORTS = new WeakMap();
const FIELD_INITIAL_DEFAULTS = new WeakMap();
const FIELD_DECLARATION_METADATA = new WeakMap();
let SCHEMA_GENERATION = 0;

const CONSTRUCTOR_BY_NAME = new Map();
const ENUM_SCHEMA_BY_NAME = new Map();
const ENUM_SCHEMA_BY_OBJECT = new WeakMap();
const STAGE3_FIELD_METADATA = Symbol("carbonenginejs.schema.stage3Fields");

// Declared here rather than beside describeDecorator: the CjsSchema class body
// builds every decorator namespace in its static initializer, which runs before
// any const declared after the class is initialized.
const DECORATOR_METADATA = Symbol("carbonenginejs.schema.decoratorMetadata");

export const CJS_ENUM_NAME = Symbol.for("carbonenginejs.enum.name");

/**
 * Cross-copy carrier for a declared class name.
 *
 * Schema metadata lives in a `WeakMap` keyed by constructor, which is private
 * to whichever copy of this file created it. Applications can install or
 * bundle multiple runtime copies, so a class declared by another copy is
 * invisible to `getClassName` here — it returns null for a perfectly
 * well-declared class.
 *
 * That null is not inert. `_type` is emitted only when a class name is known,
 * so a cross-copy model exports with no type tag and the values graph silently
 * stops being able to rebuild it. Stamping the name on the constructor under a
 * global-registry symbol makes the identity survive the boundary, exactly as
 * `carbonenginejs.model` does for instances.
 */
export const CJS_CLASS_NAME = Symbol.for("carbonenginejs.className");

/**
 * Cross-copy brand for "this object is already a live CjsModel".
 *
 * Declared here rather than in CjsModel, even though CjsModel is what applies
 * it, because the dependency runs one way only: CjsModel imports CjsSchema and
 * the reverse is impossible. A predicate that reads a symbol needs no access to
 * the class, so the question can be answered from this side of the edge and the
 * answer becomes available to every consumer that has the schema.
 *
 * `value instanceof CjsModel` answers a narrower question than it appears to:
 * it asks whether the value came from THIS copy of the runtime package. When an
 * application contains multiple copies, a model handed over by another copy
 * fails the test while being a perfectly good model.
 *
 * `Symbol.for` resolves through the global registry, which is one registry per
 * realm no matter how many copies of this file are loaded — the same reason
 * `carbonenginejs.type` and `carbonenginejs.enum.name` already use it.
 */
export const CJS_MODEL_BRAND = Symbol.for("carbonenginejs.model");

/**
 * Reusable schema/decorator metadata surface.
 *
 * Decorators are namespace-scoped so consumers can export only the parts they
 * understand. The functions support stage-3 field decorators and direct tool
 * registration through decorateField().
 */
export class CjsSchema
{
    /** Registers complete reviewed schema metadata for a constructor. */
    static define(Constructor, definition = {})
    {
        defineClassMetadata(Constructor, normalizeClassDefinition(Constructor, definition));
        return this;
    }

    /**
     * Creates a field decorator that binds the field to a registered enum
     * identity.
     */
    static enum(values)
    {
        return fieldDecorator("enum", normalizeEnumDefinition(values));
    }

    /** Registers enum identity, members, and optional source metadata. */
    static defineEnum(values, definition = {})
    {
        defineEnumMetadata(values, normalizeEnumSchema(values, definition));
        return this;
    }

    /** Applies field schema metadata without requiring decorator syntax. */
    static decorateField(Constructor, fieldName, ...decorators)
    {
        for (const decorator of decorators)
        {
            decorator(Constructor.prototype, fieldName);
        }
        return Constructor;
    }

    /** Applies method provenance metadata without requiring decorator syntax. */
    static decorateMethod(Constructor, methodName, ...decorators)
    {
        for (const decorator of decorators)
        {
            decorator(Constructor.prototype, methodName);
        }
        return Constructor;
    }

    /** Registers one field definition on a constructor's schema. */
    static defineField(Constructor, fieldName, namespace, value)
    {
        defineFieldMetadata(Constructor, fieldName, namespace, value);
        return this;
    }

    /** Registers one method definition on a constructor's schema. */
    static defineMethod(Constructor, methodName, namespace, value)
    {
        defineMethodMetadata(Constructor, methodName, namespace, value);
        return this;
    }

    /** Returns resolved schema metadata for a named field. */
    static getField(Constructor, fieldName)
    {
        return getEffectiveFields(Constructor).find(field => field.name === fieldName) || null;
    }

    /**
     * Excludes named inherited fields from the decorated class's schema surface.
     */
    static hideInherited(fieldNames)
    {
        return hiddenInheritedFieldsDecorator(normalizeHiddenInheritedFields(fieldNames));
    }

    /**
     * Checks whether a field is hidden from a class by its inheritance chain.
     */
    static isFieldHidden(Constructor, fieldName)
    {
        return getHiddenInheritedFieldNames(Constructor).has(fieldName);
    }

    /** Returns resolved provenance metadata for a named method. */
    static getMethod(Constructor, methodName)
    {
        const schema = CLASS_SCHEMA.get(Constructor);
        return schema?.methodsByName.get(methodName) || null;
    }

    /** Returns the explicit stable serialized name registered for a constructor. */
    static getClassName(Constructor)
    {
        let current = Constructor;
        while (typeof current === "function")
        {
            // The local metadata is authoritative wherever it exists, including
            // when it deliberately declares no name. The cross-copy brand is
            // consulted ONLY for a class this copy has never seen at all --
            // otherwise it would answer for local classes whose absence of a
            // name is itself the declared answer.
            const local = CLASS_SCHEMA.get(current);
            const className = local
                ? (local.className || null)
                : (Object.hasOwn(current, CJS_CLASS_NAME) ? current[CJS_CLASS_NAME] : null);
            if (className)
            {
                return current !== Constructor && className === "CjsModel" ? null : className;
            }
            current = Object.getPrototypeOf(current);
        }
        return null;
    }

    /** Returns the registered schema family for a constructor. */
    static getClassFamily(Constructor)
    {
        let current = Constructor;
        while (typeof current === "function")
        {
            const family = CLASS_SCHEMA.get(current)?.family || null;
            if (family) return family;
            current = Object.getPrototypeOf(current);
        }
        return null;
    }

    /** Returns this constructor's own reviewed purpose without inheriting it. */
    static getClassPurpose(Constructor)
    {
        return CLASS_SCHEMA.get(Constructor)?.purpose || null;
    }

    /**
     * Reports whether a value is a live model, including one constructed by a
     * different copy of this package.
     *
     * Prefer this to `value instanceof CjsModel` anywhere the answer decides
     * between ALIASING and COPYING, or admits and rejects. Getting it wrong
     * there does not throw: it silently substitutes a plain object for a live
     * instance, or rejects a real model for having been declared elsewhere.
     *
     * @param {*} value Candidate value.
     * @returns {boolean} True when the value is a live model from any copy.
     */
    static isModelInstance(value)
    {
        return !!value && typeof value === "object" && value[CJS_MODEL_BRAND] === true;
    }

    /**
     * Every declared class name on a constructor's chain, nearest first.
     *
     * Read per level from local metadata where this copy has it and from the
     * cross-copy stamp where it does not, so the ancestry of a class registered
     * by a sibling package is still readable. Unnamed levels are skipped rather
     * than ending the walk: an intermediate class with no schema declaration is
     * ordinary, and its named ancestors still apply.
     *
     * @param {Function} Constructor Class to inspect.
     * @returns {string[]} Declared names from the class up to its root.
     */
    static getClassNames(Constructor)
    {
        const names = [];
        let current = Constructor;
        while (typeof current === "function")
        {
            const local = CLASS_SCHEMA.get(current);
            const className = local
                ? (local.className || null)
                : (Object.hasOwn(current, CJS_CLASS_NAME) ? current[CJS_CLASS_NAME] : null);
            if (className && !names.includes(className)) names.push(className);
            current = Object.getPrototypeOf(current);
        }
        return names;
    }

    /**
     * Reports whether a value is an instance of the class declared as `name`,
     * or of any class descending from it — across package copies.
     *
     * This is the cross-copy replacement for `value instanceof SomeClass`, and
     * the reason it is worth having is that the obvious implementation is wrong.
     * Resolving the name through GetConstructor and testing `instanceof` against
     * the result reintroduces the identity comparison this exists to avoid: the
     * registry may hold a sibling's constructor, and then a perfectly good local
     * instance fails. So the check never compares constructor identity at all.
     * It reads the declared names up the value's own prototype chain, which are
     * stamped rather than derived and therefore survive the copy boundary.
     *
     * A consequence worth relying on: this does not consult the constructor
     * registry, so it is unaffected by the flat-map collision where two families
     * register the same class name and the later one wins.
     *
     * @param {string} name Declared class name to test against.
     * @param {*} value Candidate value.
     * @returns {boolean} True when the value descends from that declared class.
     */
    static isInstanceOf(name, value)
    {
        if (typeof name !== "string" || !name.trim()) return false;
        if (!value || typeof value !== "object") return false;
        return this.getClassNames(value.constructor).includes(name.trim());
    }

    /** Registers a constructor under an explicit serialized class name. */
    static SetConstructor(name, Constructor)
    {
        if (typeof name !== "string" || !name.trim())
        {
            throw new TypeError("CjsSchema.SetConstructor requires a non-empty name.");
        }
        if (typeof Constructor !== "function")
        {
            throw new TypeError(`CjsSchema constructor ${name.trim()} must be a function.`);
        }

        CONSTRUCTOR_BY_NAME.set(name.trim(), Constructor);
        // Buckets resolve class references by name, so a late registration
        // changes how already-built schemas should have been bucketed.
        SCHEMA_GENERATION += 1;
        return this;
    }

    /** Returns the constructor registered for a serialized class name. */
    static GetConstructor(name)
    {
        if (typeof name !== "string" || !name.trim()) return null;
        return CONSTRUCTOR_BY_NAME.get(name.trim()) || null;
    }

    /**
     * The installed values-transport implementation.
     *
     * The transport API lives HERE - everything is called through the schema
     * (operator direction, 2026-09-05) - while the implementation currently
     * still lives in the model layer, which registers itself at load. Layering
     * forbids the reverse import (schema never imports model), so this is a
     * composition seam: the physical relocation of the transport bodies is the
     * facade migration's work, and changes nothing for callers of these
     * statics.
     */
    static #valuesService = null;

    /**
     * Installs the values-transport implementation.
     *
     * Called once by the model layer at module load. A second registration
     * replaces the first, which only module duplication could cause.
     *
     * @param {{getValues: Function, setValues: Function, From: Function}} service
     * @returns {typeof CjsSchema}
     */
    static registerValuesService(service)
    {
        if (!service || typeof service.getValues !== "function" || typeof service.setValues !== "function" || typeof service.from !== "function")
        {
            throw new TypeError("CjsSchema.registerValuesService requires getValues, setValues and from functions.");
        }
        CjsSchema.#valuesService = service;
        return this;
    }

    static #requireValuesService(method)
    {
        if (!CjsSchema.#valuesService)
        {
            throw new Error(`CjsSchema.${method} requires the values service; import the model layer before calling it.`);
        }
        return CjsSchema.#valuesService;
    }

    /**
     * Exports a target's schema fields to a plain object.
     *
     * @param {object} target A schema-backed instance.
     * @param {object} [out={}] Caller-owned output object.
     * @param {object} [options={}] Export options (refs, typeTags, ...).
     * @returns {object} The exported values.
     */
    static getValues(target, out = {}, options = {})
    {
        return CjsSchema.#requireValuesService("getValues").getValues(target, out, options);
    }

    /**
     * Applies a plain value bag to a target through its validated setter.
     *
     * @param {object} target A schema-backed instance.
     * @param {object} [values={}] Incoming values.
     * @param {object} [options={}] Population options.
     * @returns {Set<string>|boolean} Changed fields, or a boolean result.
     */
    static setValues(target, values = {}, options = {})
    {
        return CjsSchema.#requireValuesService("setValues").setValues(target, values, options);
    }

    /**
     * Constructs a registered class from a plain values bag.
     *
     * The deserializer: resolves the class by name, builds it, applies the
     * values, and calls the class-owned Initialize when one exists.
     *
     * @param {string} className The registered class name.
     * @param {object} [values={}] Values to apply.
     * @param {object} [options={}] Population options.
     * @returns {object} The constructed instance.
     */
    static from(className, values = {}, options = {})
    {
        return CjsSchema.#requireValuesService("from").from(className, values, options);
    }

    /** Returns the stable registered name for an enum object. */
    static getEnumName(values)
    {
        if (typeof values === "string") return values;
        return values && typeof values === "object"
            ? ENUM_SCHEMA_BY_OBJECT.get(values)?.name || values[CJS_ENUM_NAME] || values.Source?.name || values.name || null
            : null;
    }

    /** Returns registered enum metadata by name or enum object. */
    static getEnum(values)
    {
        const name = CjsSchema.getEnumName(values);
        return name ? ENUM_SCHEMA_BY_NAME.get(name) || null : null;
    }

    /**
     * Return the exported schema for a class.
     *
     * The schema is the precomputed answer - collapsing the inheritance
     * lineage and merging metadata - so building it per call would defeat its
     * purpose. Callers traverse model graphs and ask once per node, so this is
     * memoized per class and rebuilt only when class metadata is defined.
     *
     * Namespace-filtered exports are not memoized: they are a projection of the
     * full schema requested by tooling, not the hot read path.
     *
     * The result is shared, not copied - treat it as read-only. It is not
     * frozen: deep-cloning and freezing every field on the way out cost far
     * more than the mistakes it guarded against.
     *
     * @param {Function} Constructor
     * @param {object} [options={}]
     * @param {string|Array<string>} [options.namespaces] Restricts exported metadata namespaces.
     * @returns {object} Shared schema export.
     */
    static getSchema(Constructor, options = {})
    {
        const namespaces = normalizeNamespaces(options.namespaces);
        if (namespaces) return buildSchema(Constructor, namespaces);

        const memo = SCHEMA_EXPORTS.get(Constructor);
        if (memo && memo.generation === SCHEMA_GENERATION) return memo.schema;

        const schema = buildSchema(Constructor, null);
        SCHEMA_EXPORTS.set(Constructor, { generation: SCHEMA_GENERATION, schema });
        return schema;
    }

    /**
     * Returns a fresh plain-values copy of one schema class's declared defaults.
     *
     * Decorated field initializers record their value before the constructor
     * body can turn it into instance state (an audio game-object ID, for
     * example). When no instance has exposed those initializers yet, the class
     * is constructed once with zero arguments to trigger them. This never calls
     * CjsModel.from, SetValues, Initialize, UpdateValues, or another lifecycle
     * hook.
     *
     * The canonical template is cached by constructor and kept immutable. A
     * caller always receives a copy so it cannot poison later expansions.
     *
     * @param {Function|string} ConstructorOrName Constructor or registered class name.
     * @returns {object} A self-describing plain model-values template.
     */
    static getDefaults(ConstructorOrName)
    {
        return cloneDefaultValue(getDefaultsTemplate(ConstructorOrName));
    }

    /**
     * Expands a sparse, self-describing model-values graph with schema defaults.
     *
     * Authored values win. Authored collections replace default collections;
     * structs merge recursively; `_id` and `_ref` pass through unchanged. The
     * operation is plain-data-only after each class's lazy default template has
     * been captured and never constructs or initializes the authored graph.
     *
     * @param {object} values Sparse self-describing model values.
     * @returns {object} A new default-expanded plain-values graph.
     */
    static applyDefaults(values)
    {
        if (!isPlainObject(values))
        {
            throw new TypeError("CjsSchema.applyDefaults requires a plain model-values object.");
        }
        if (typeof values._type !== "string" || !values._type.trim())
        {
            throw new TypeError("CjsSchema.applyDefaults requires a root _type.");
        }
        return expandDefaultValue(values, null, undefined, "$root");
    }


    static type = Object.freeze({
        array: itemType => fieldDecorator("type", { kind: "array", itemType }),
        boolean: fieldDecorator("type", { kind: "boolean" }),
        color: fieldDecorator("type", { kind: "color" }),
        define: definition => classDefinitionDecorator(definition),
        expression: fieldDecorator("type", { kind: "expression", js: "string" }),
        float32: fieldDecorator("type", { kind: "float32" }),
        float64: fieldDecorator("type", { kind: "float64" }),
        int8: fieldDecorator("type", { kind: "int8" }),
        int16: fieldDecorator("type", { kind: "int16" }),
        int32: fieldDecorator("type", { kind: "int32" }),
        int64: fieldDecorator("type", { kind: "int64" }),
        list: itemType => fieldDecorator("type", { kind: "list", itemType }),
        mat3: fieldDecorator("type", { kind: "mat3" }),
        mat4: fieldDecorator("type", { kind: "mat4" }),
        map: valueType => fieldDecorator("type", { kind: "map", valueType }),
        model: className => fieldDecorator("type", { kind: "model", className }),
        objectRef: className => fieldDecorator("type", { kind: "objectRef", className }),
        path: fieldDecorator("type", { kind: "path" }),
        quat: fieldDecorator("type", { kind: "quat" }),
        rawStruct: className => fieldDecorator("type", { kind: "rawStruct", className }),
        set: itemType => fieldDecorator("type", { kind: "set", itemType }),
        string: fieldDecorator("type", { kind: "string" }),
        struct: className => fieldDecorator("type", { kind: "struct", className }),
        typedArray: arrayType => fieldDecorator("type", { kind: "typedArray", arrayType }),
        uint8: fieldDecorator("type", { kind: "uint8" }),
        uint16: fieldDecorator("type", { kind: "uint16" }),
        uint32: fieldDecorator("type", { kind: "uint32" }),
        uint64: fieldDecorator("type", { kind: "uint64" }),
        unknown: fieldDecorator("type", { kind: "unknown" }),
        vec2: fieldDecorator("type", { kind: "vec2" }),
        vec3: fieldDecorator("type", { kind: "vec3" }),
        vec4: fieldDecorator("type", { kind: "vec4" }),

        // An enum names the vocabulary a field's values are drawn from, which
        // is part of its type - it belongs here beside int32 and string rather
        // than under a separate namespace. define and hideInherited show this
        // namespace already carries class decorators as well as field ones.
        enum: values => fieldDecorator("enum", normalizeEnumDefinition(values)),

        /**
         * Hides named inherited fields from a subclass's schema, for a subclass
         * that genuinely does not carry part of its parent's shape.
         */
        hideInherited: fieldNames => hiddenInheritedFieldsDecorator(normalizeHiddenInheritedFields(fieldNames))
    });

    static io = Object.freeze({
        always: fieldDecorator("io", { always: true }),
        notify: fieldDecorator("io", { notify: true }),
        owned: fieldDecorator("io", { ownership: "owned" }),
        persist: fieldDecorator("io", { read: true, write: true, persist: true }),
        persistOnly: fieldDecorator("io", { persist: true, persistOnly: true }),
        read: fieldDecorator("io", { read: true }),
        readwrite: fieldDecorator("io", { read: true, write: true }),
        reference: fieldDecorator("io", { ownership: "reference" }),
        // Declares the lazy-invalidation token(s) a change to this field
        // implies ("bounds is stale"). Added to __state.flags at write time;
        // cleared ONLY by the getter that recomputes the derived value.
        flag: (...tokens) => fieldDecorator("io", { flag: tokens.flat().map(String) }),
        // Declares the rebuild requirement token(s) a change to this field
        // implies ("vertices need rebuilding"). Added to __state.rebuild at
        // write time; cleared ONLY by the specific work method that succeeds
        // (typically driven from Update / per-frame passes).
        rebuild: (...tokens) => fieldDecorator("io", { rebuild: tokens.flat().map(String) }),
        write: fieldDecorator("io", { write: true })
    });

    static jessica = Object.freeze({
        group: name => fieldDecorator("jessica", { group: name }),
        hidden: fieldDecorator("jessica", { hidden: true }),
        readOnly: fieldDecorator("jessica", { readOnly: true }),
        widget: name => fieldDecorator("jessica", { widget: name })
    });

    // impl decorators apply to methods AND fields: a promoted/diverging field
    // (e.g. a Carbon-hidden authored value exposed for values interchange) is
    // an implementation decision, so it carries impl.adapted/impl.custom +
    // impl.reason just like a diverging method. carbon.* stays factual
    // provenance and remains method-only.
    static impl = Object.freeze({
        abstract: memberDecorator("impl", { abstract: true, status: "abstract" }),
        adapted: memberDecorator("impl", { adapted: true, status: "adapted" }),
        custom: memberDecorator("impl", { custom: true, status: "custom" }),
        implemented: memberDecorator("impl", { implemented: true, status: "implemented" }),
        noop: memberDecorator("impl", { noop: true, status: "noop" }),
        notImplemented: memberDecorator("impl", { notImplemented: true, status: "notImplemented" }),
        notSupported: memberDecorator("impl", { notSupported: true, status: "notSupported" }),
        note: text => memberDecorator("impl", { note: String(text) }),
        reason: text => memberDecorator("impl", { reason: String(text) })
    });

    static carbon = Object.freeze({
        method: methodDecorator("carbon", { method: true }),
        renamed: originalName => {
            if (typeof originalName !== "string" || !originalName.trim())
            {
                throw new TypeError("CjsSchema.carbon.renamed requires a non-empty original method name.");
            }
            return methodDecorator("carbon", {
                method: true,
                renamed: true,
                originalName: originalName.trim()
            });
        },
        contextual: tiers => {
            const list = Array.isArray(tiers) ? tiers : [tiers];
            const normalized = [];
            for (const tier of list)
            {
                if (typeof tier !== "string" || !tier.trim())
                {
                    continue;
                }
                normalized.push(tier.trim());
            }
            if (!normalized.length)
            {
                throw new TypeError("CjsSchema.carbon.contextual requires at least one context tier name.");
            }
            const base = methodDecorator("carbon", {
                method: true,
                contextual: true,
                contextTiers: normalized
            });
            const described = getDecoratorMetadata(base);
            return describeDecorator(function contextualMethodDecorator(targetOrValue, contextOrMethodName)
            {
                // Contextual methods are validated context-first at decoration
                // time: the first declared parameter must be the frame context.
                if (contextOrMethodName && typeof contextOrMethodName === "object")
                {
                    assertContextFirstMethod(targetOrValue, contextOrMethodName.name);
                }
                else if (targetOrValue && contextOrMethodName)
                {
                    assertContextFirstMethod(targetOrValue[contextOrMethodName], contextOrMethodName);
                }
                return base(targetOrValue, contextOrMethodName);
            }, described.namespace, described.value);
        }
    });

    static components = createComponentsNamespace();
}

function captureFieldInitialDefault(Constructor, fieldName, initialValue, declarationMetadata = null)
{
    if (typeof Constructor !== "function") return;

    let fields = FIELD_INITIAL_DEFAULTS.get(Constructor);
    if (!fields)
    {
        fields = new Map();
        FIELD_INITIAL_DEFAULTS.set(Constructor, fields);
    }
    const existing = fields.get(fieldName);
    if (existing)
    {
        const ownDeclaration = FIELD_DECLARATION_METADATA.get(Constructor)?.get(fieldName);
        const replacesInheritedDefault = ownDeclaration &&
            declarationMetadata === ownDeclaration &&
            existing.declarationMetadata !== ownDeclaration;
        if (!replacesInheritedDefault) return;
    }

    try
    {
        fields.set(fieldName, {
            value: deepFreezeDefaultValue(snapshotSchemaDefault(initialValue)),
            declarationMetadata
        });
    }
    catch (err)
    {
        // Schema capture must never make ordinary class construction fail. The
        // explicit defaults request reports the unsupported value instead.
        fields.set(fieldName, {
            error: err instanceof Error ? err.message : String(err),
            declarationMetadata
        });
    }
    DEFAULT_EXPORTS.delete(Constructor);
}

function getDefaultsTemplate(ConstructorOrName)
{
    const Constructor = resolveDefaultsConstructor(ConstructorOrName);
    const memo = DEFAULT_EXPORTS.get(Constructor);
    if (memo && memo.generation === SCHEMA_GENERATION) return memo.defaults;

    let fields = getEffectiveFields(Constructor);
    let captured = FIELD_INITIAL_DEFAULTS.get(Constructor);
    let instance = null;

    if (fields.some(field => !captured?.has(field.name)))
    {
        try
        {
            // A bare constructor runs JavaScript field/constructor setup only.
            // The CjsModel initialization lifecycle is driven by from(), not by
            // `new`, and is deliberately absent from this operation.
            instance = new Constructor();
        }
        catch (err)
        {
            const className = CjsSchema.getClassName(Constructor) || Constructor.name || "<anonymous>";
            throw new TypeError(
                `CjsSchema.getDefaults could not construct ${className} with zero arguments: ` +
                `${err instanceof Error ? err.message : String(err)}`,
                { cause: err }
            );
        }
        fields = getEffectiveFields(Constructor);
        captured = FIELD_INITIAL_DEFAULTS.get(Constructor);
    }

    const className = CjsSchema.getClassName(Constructor);
    if (!className)
    {
        throw new TypeError("CjsSchema.getDefaults requires a constructor with an explicit className.");
    }

    const defaults = { _type: className };
    for (const field of fields)
    {
        const entry = captured?.get(field.name);
        let value;
        let hasValue = false;

        if (entry?.error)
        {
            throw new TypeError(
                `CjsSchema.getDefaults could not capture ${className}.${field.name}: ${entry.error}`
            );
        }
        if (entry && Object.hasOwn(entry, "value"))
        {
            value = cloneDefaultValue(entry.value);
            hasValue = true;
        }
        else if (instance)
        {
            value = snapshotSchemaDefault(instance[field.name]);
            // Directly registered schema accessors are explicit declarations
            // too. Their getter is the only authoritative default source even
            // though the property lives on the prototype rather than as an
            // own field (for example two Blue names sharing one color buffer).
            hasValue = field.name in instance;
        }

        if (!hasValue)
        {
            value = snapshotSchemaDefault(defaultValueForCarbonField(field));
        }
        defaults[field.name] = value;
    }

    const frozen = deepFreezeDefaultValue(defaults);
    DEFAULT_EXPORTS.set(Constructor, {
        generation: SCHEMA_GENERATION,
        defaults: frozen
    });
    return frozen;
}

function resolveDefaultsConstructor(ConstructorOrName)
{
    if (typeof ConstructorOrName === "function") return ConstructorOrName;
    if (typeof ConstructorOrName !== "string" || !ConstructorOrName.trim())
    {
        throw new TypeError("CjsSchema.getDefaults requires a constructor or registered class name.");
    }

    const className = ConstructorOrName.trim();
    const Constructor = CjsSchema.GetConstructor(className);
    if (!Constructor)
    {
        throw new TypeError(`No CjsSchema constructor is registered for _type "${className}".`);
    }
    return Constructor;
}

function snapshotSchemaDefault(value, active = new WeakSet())
{
    if (value === null || value === undefined) return value;
    if (typeof value === "bigint") return value.toString();
    if (typeof value !== "object") return value;
    if (ArrayBuffer.isView(value))
    {
        return Array.from(value, item => typeof item === "bigint" ? item.toString() : item);
    }
    if (active.has(value))
    {
        throw new TypeError("cyclic class defaults are not JSON-compatible");
    }

    active.add(value);
    try
    {
        if (Array.isArray(value))
        {
            return value.map(item => snapshotSchemaDefault(item, active));
        }
        if (value instanceof Map)
        {
            return Object.fromEntries(Array.from(value.entries(), ([key, item]) => [
                String(key),
                snapshotSchemaDefault(item, active)
            ]));
        }
        if (value instanceof Set)
        {
            return Array.from(value, item => snapshotSchemaDefault(item, active));
        }

        const Constructor = value.constructor;
        const className = typeof Constructor === "function"
            ? CjsSchema.getClassName(Constructor)
            : null;
        if (className)
        {
            const result = { _type: className };
            const captured = FIELD_INITIAL_DEFAULTS.get(Constructor);
            for (const field of getEffectiveFields(Constructor))
            {
                const entry = captured?.get(field.name);
                if (entry?.error)
                {
                    throw new TypeError(`${className}.${field.name}: ${entry.error}`);
                }

                let fieldValue = entry && Object.hasOwn(entry, "value")
                    ? cloneDefaultValue(entry.value)
                    : value[field.name];
                if (fieldValue === undefined)
                {
                    fieldValue = defaultValueForCarbonField(field);
                }
                result[field.name] = snapshotSchemaDefault(fieldValue, active);
            }
            return result;
        }

        const result = {};
        for (const [key, item] of Object.entries(value))
        {
            result[key] = snapshotSchemaDefault(item, active);
        }
        return result;
    }
    finally
    {
        active.delete(value);
    }
}

function expandDefaultValue(value, declaredType, defaultValue, path)
{
    if (value === null || value === undefined) return value;
    if (typeof value === "bigint") return value.toString();
    if (typeof value !== "object") return value;
    if (ArrayBuffer.isView(value))
    {
        return Array.from(value, item => typeof item === "bigint" ? item.toString() : item);
    }

    const kind = declaredType?.kind || null;
    const itemType = declaredType?.itemType || null;
    if (Array.isArray(value))
    {
        return value.map((item, index) => expandDefaultValue(
            item,
            kind === "list" || kind === "array" || kind === "set" ? itemType : null,
            undefined,
            `${path}[${index}]`
        ));
    }
    if (value instanceof Set)
    {
        return Array.from(value, (item, index) => expandDefaultValue(
            item,
            itemType,
            undefined,
            `${path}[${index}]`
        ));
    }
    if (value instanceof Map)
    {
        const result = {};
        for (const [key, item] of value)
        {
            result[String(key)] = expandDefaultValue(
                item,
                declaredType?.valueType || null,
                undefined,
                `${path}.${String(key)}`
            );
        }
        return result;
    }

    if (Object.hasOwn(value, "_ref"))
    {
        return cloneDefaultValue(value);
    }

    if (typeof value._type === "string" && value._type.trim())
    {
        const Constructor = CjsSchema.GetConstructor(value._type.trim());
        if (!Constructor)
        {
            throw new TypeError(`${path} names unknown _type "${value._type.trim()}".`);
        }
        return expandSchemaObject(value, Constructor, path);
    }

    if ((kind === "list" || kind === "array" || kind === "set") && isPlainObject(value))
    {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [
            key,
            expandDefaultValue(item, itemType, undefined, `${path}.${key}`)
        ]));
    }
    if (kind === "map" && isPlainObject(value))
    {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [
            key,
            expandDefaultValue(item, declaredType?.valueType || null, undefined, `${path}.${key}`)
        ]));
    }

    const declaredClass = resolveDeclaredConstructor(declaredType);
    if (declaredClass)
    {
        return expandSchemaObject(value, declaredClass, path);
    }

    if (isPlainObject(defaultValue))
    {
        return mergePlainDefaults(defaultValue, value, path);
    }

    const result = {};
    for (const [key, item] of Object.entries(value))
    {
        result[key] = expandDefaultValue(item, null, undefined, `${path}.${key}`);
    }
    return result;
}

function expandSchemaObject(values, Constructor, path)
{
    if (!isPlainObject(values))
    {
        throw new TypeError(`${path} must be a plain object.`);
    }

    const result = cloneDefaultValue(getDefaultsTemplate(Constructor));
    const schema = CjsSchema.getSchema(Constructor);
    for (const [key, item] of Object.entries(values))
    {
        if (key === "_type" || key === "_id" || key === "_ref")
        {
            result[key] = cloneDefaultValue(item);
            continue;
        }

        const field = schema.byName.get(key);
        result[key] = expandDefaultValue(
            item,
            field?.type || null,
            result[key],
            `${path}.${key}`
        );
    }
    return result;
}

function resolveDeclaredConstructor(type)
{
    let className = null;
    if (typeof type === "string")
    {
        className = type;
    }
    else if (type && typeof type === "object")
    {
        if (["model", "objectRef", "struct"].includes(type.kind))
        {
            className = type.className || null;
        }
    }
    return className ? CjsSchema.GetConstructor(className) : null;
}

function mergePlainDefaults(defaults, values, path)
{
    const result = cloneDefaultValue(defaults);
    for (const [key, item] of Object.entries(values))
    {
        result[key] = expandDefaultValue(item, null, result[key], `${path}.${key}`);
    }
    return result;
}

function cloneDefaultValue(value)
{
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(cloneDefaultValue);
    if (value && typeof value === "object")
    {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [
            key,
            cloneDefaultValue(item)
        ]));
    }
    return value;
}

function deepFreezeDefaultValue(value, seen = new WeakSet())
{
    if (!value || typeof value !== "object" || seen.has(value)) return value;
    seen.add(value);
    for (const item of Object.values(value)) deepFreezeDefaultValue(item, seen);
    return value;
}

function createComponentsNamespace()
{
    const components = definition => fieldDecorator("components", normalizeComponentDefinition(definition));
    Object.defineProperties(components, {
        get: { value: getComponentValue },
        indices: { value: getComponentIndices },
        set: { value: setComponentValue }
    });
    return components;
}

// Every decorator carries the namespace and value it would install. That is
// what lets one vocabulary serve both forms: `type.uint32` applied as a
// decorator, and `type.uint32` written as data in a CjsSchema.define() member.
// Without it the object form would need its own spelling of every namespace
// value, and two spellings of `impl.adapted` will eventually disagree.
function describeDecorator(decorator, namespace, value)
{
    Object.defineProperty(decorator, DECORATOR_METADATA, {
        value: { namespace, value }
    });
    return decorator;
}

/**
 * The namespace/value a decorator installs, or null when it is not one.
 *
 * @param {*} candidate Possible decorator.
 * @returns {{namespace:string, value:*}|null} Installed metadata.
 */
function getDecoratorMetadata(candidate)
{
    return typeof candidate === "function" ? candidate[DECORATOR_METADATA] || null : null;
}

function fieldDecorator(namespace, value)
{
    return describeDecorator(function schemaFieldDecorator(targetOrValue, contextOrFieldName)
    {
        if (contextOrFieldName && typeof contextOrFieldName === "object")
        {
            const context = contextOrFieldName;
            if (context.kind !== "field") throw new TypeError("CjsSchema decorators only support class fields.");
            recordStage3FieldMetadata(context, namespace, value);

            // The class decorator replays the Stage-3 metadata recorded above, so
            // schema inspection works before the first instance is constructed.
            // Keep both runtime initializers as fallbacks: addInitializer covers
            // spec-compliant runtimes, while the returned field initializer covers
            // runtimes that do not fire field-decorator addInitializer. All paths
            // register the same metadata idempotently through mergeNamespace.
            context.addInitializer(function initializeSchemaField()
            {
                defineFieldMetadata(this.constructor, context.name, namespace, value);
            });

            return function initializeSchemaFieldValue(initialValue)
            {
                defineFieldMetadata(this.constructor, context.name, namespace, value);
                captureFieldInitialDefault(
                    this.constructor,
                    context.name,
                    initialValue,
                    context.metadata
                );
                return initialValue;
            };
        }

        const Constructor = targetOrValue?.constructor;
        if (!Constructor || !contextOrFieldName)
        {
            throw new TypeError("CjsSchema field decorators require a class field target.");
        }

        defineFieldMetadata(Constructor, contextOrFieldName, namespace, value);
    }, namespace, value);
}

function classDefinitionDecorator(definition)
{
    return function schemaClassDefinitionDecorator(value, context)
    {
        if (context && typeof context === "object")
        {
            if (context.kind !== "class") throw new TypeError("CjsSchema type.define only supports classes.");
            registerStage3FieldMetadata(value, context.metadata);
            defineClassMetadata(value, normalizeClassDefinition(value, definition));
            return;
        }

        if (typeof value !== "function")
        {
            throw new TypeError("CjsSchema type.define requires a class constructor.");
        }

        defineClassMetadata(value, normalizeClassDefinition(value, definition));
    };
}

function hiddenInheritedFieldsDecorator(fieldNames)
{
    return function schemaHiddenInheritedFieldsDecorator(value, context)
    {
        if (context && typeof context === "object")
        {
            if (context.kind !== "class") throw new TypeError("CjsSchema.hideInherited only supports classes.");
            registerStage3FieldMetadata(value, context.metadata);
        }
        else if (typeof value !== "function")
        {
            throw new TypeError("CjsSchema.hideInherited requires a class constructor.");
        }

        defineHiddenInheritedFields(value, fieldNames);
    };
}

const CONTEXT_FIRST_PARAMETER = /^\(?\s*_?(context|updateContext)\b/;

function assertContextFirstMethod(fn, methodName)
{
    if (typeof fn !== "function")
    {
        return;
    }
    const source = String(fn);
    const parameterList = source.slice(source.indexOf("("));
    if (fn.length < 1 || !CONTEXT_FIRST_PARAMETER.test(parameterList))
    {
        throw new TypeError(
            `CjsSchema.carbon.contextual method "${String(methodName)}" must be context-first ` +
            "(first parameter named context or updateContext)."
        );
    }
}

function methodDecorator(namespace, value)
{
    return describeDecorator(function schemaMethodDecorator(targetOrValue, contextOrMethodName)
    {
        if (contextOrMethodName && typeof contextOrMethodName === "object")
        {
            const context = contextOrMethodName;
            if (context.kind !== "method") throw new TypeError("CjsSchema method decorators only support class methods.");

            context.addInitializer(function initializeSchemaMethod()
            {
                const Constructor = context.static ? this : this.constructor;
                defineMethodMetadata(Constructor, context.name, namespace, value);
            });
            return;
        }

        const Constructor = targetOrValue?.constructor;
        if (!Constructor || !contextOrMethodName)
        {
            throw new TypeError("CjsSchema method decorators require a class method target.");
        }

        defineMethodMetadata(Constructor, contextOrMethodName, namespace, value);
    }, namespace, value);
}

function memberDecorator(namespace, value)
{
    const forMethods = methodDecorator(namespace, value);
    const forFields = fieldDecorator(namespace, value);
    return describeDecorator(function schemaMemberDecorator(targetOrValue, contextOrMemberName)
    {
        if (contextOrMemberName && typeof contextOrMemberName === "object")
        {
            return contextOrMemberName.kind === "field"
                ? forFields(targetOrValue, contextOrMemberName)
                : forMethods(targetOrValue, contextOrMemberName);
        }

        // Legacy (non-2023-11) path: a method target resolves to a function
        // on the prototype; anything else is treated as a field.
        return targetOrValue && contextOrMemberName && typeof targetOrValue[contextOrMemberName] === "function"
            ? forMethods(targetOrValue, contextOrMemberName)
            : forFields(targetOrValue, contextOrMemberName);
    }, namespace, value);
}

function defineFieldMetadata(Constructor, fieldName, namespace, value)
{
    defineMemberMetadata(Constructor, "fields", "fieldsByName", fieldName, namespace, value);
}

function defineClassMetadata(Constructor, definition)
{
    const schema = getOrCreateClassSchema(Constructor);
    if (definition.className)
    {
        schema.className = definition.className;
        // Non-enumerable and own-property, so it neither pollutes exported
        // values nor is mistaken for an inherited name further down the chain.
        Object.defineProperty(Constructor, CJS_CLASS_NAME, {
            value: definition.className,
            configurable: true
        });
    }
    if (definition.family) schema.family = definition.family;
    if (definition.purpose) schema.purpose = definition.purpose;
    if (definition.sourceClass) schema.sourceClass = definition.sourceClass;
    if (definition.aliases) schema.aliases = [...definition.aliases];

    for (const field of definition.fields || [])
    {
        defineManualMemberMetadata(Constructor, "fields", field);
    }

    for (const method of definition.methods || [])
    {
        defineManualMemberMetadata(Constructor, "methods", method);
    }

    registerClassMetadata(Constructor, schema);
}

function defineManualMemberMetadata(Constructor, memberType, definition)
{
    const define = memberType === "methods" ? defineMethodMetadata : defineFieldMetadata;
    for (const [namespace, value] of Object.entries(definition))
    {
        if (namespace === "name") continue;
        define(Constructor, definition.name, namespace, value);
    }
}

function defineMethodMetadata(Constructor, methodName, namespace, value)
{
    defineMemberMetadata(Constructor, "methods", "methodsByName", methodName, namespace, value);
}

function defineMemberMetadata(Constructor, listKey, mapKey, name, namespace, value)
{
    const schema = getOrCreateClassSchema(Constructor);
    let item = schema[mapKey].get(name);

    if (!item)
    {
        item = { name };
        schema[listKey].push(item);
        schema[mapKey].set(name, item);
    }

    item[namespace] = mergeNamespace(item[namespace], value);
}

function defineHiddenInheritedFields(Constructor, fieldNames)
{
    if (typeof Constructor !== "function")
    {
        throw new TypeError("CjsSchema.hideInherited requires a class constructor.");
    }

    const Parent = Object.getPrototypeOf(Constructor);
    const inheritedFields = new Set(getEffectiveFields(Parent).map(field => field.name));
    // Declared name only: Constructor.name does not survive minification, and a
    // mangled name in an error reads as a real one and sends you chasing it.
    const className = CLASS_SCHEMA.get(Constructor)?.className || "<undeclared>";

    for (const fieldName of fieldNames)
    {
        if (!inheritedFields.has(fieldName))
        {
            throw new TypeError(
                `CjsSchema.hideInherited cannot hide "${fieldName}" on ${className}: ` +
                "the parent schema does not expose that field."
            );
        }
    }

    const schema = getOrCreateClassSchema(Constructor);
    for (const fieldName of fieldNames)
    {
        schema.hiddenInherited.add(fieldName);
    }
}

function getEffectiveFields(Constructor)
{
    const ordered = [];
    const byName = new Map();
    const hidden = new Set();

    for (const current of getSchemaLineage(Constructor))
    {
        const schema = CLASS_SCHEMA.get(current);
        for (const field of schema?.fields || [])
        {
            const existing = byName.get(field.name);
            if (existing)
            {
                mergeMemberMetadata(existing, field);
            }
            else
            {
                const merged = mergeMemberMetadata({ name: field.name }, field);
                ordered.push(merged);
                byName.set(field.name, merged);
            }
        }

        for (const fieldName of schema?.hiddenInherited || [])
        {
            hidden.add(fieldName);
        }
    }

    return ordered.filter(field => !hidden.has(field.name));
}

function getHiddenInheritedFieldNames(Constructor)
{
    const hidden = new Set();
    for (const current of getSchemaLineage(Constructor))
    {
        for (const fieldName of CLASS_SCHEMA.get(current)?.hiddenInherited || [])
        {
            hidden.add(fieldName);
        }
    }
    return hidden;
}

function getSchemaLineage(Constructor)
{
    const lineage = [];
    let current = Constructor;
    while (typeof current === "function")
    {
        if (CLASS_SCHEMA.has(current)) lineage.push(current);
        current = Object.getPrototypeOf(current);
    }
    return lineage.reverse();
}

function mergeMemberMetadata(target, source)
{
    for (const [namespace, value] of Object.entries(source))
    {
        if (namespace === "name") continue;
        target[namespace] = mergeNamespace(target[namespace], value);
    }
    return target;
}

function buildSchema(Constructor, namespaces)
{
    const schema = CLASS_SCHEMA.get(Constructor);
    const fields = [];
    const methods = [];

    for (const field of getEffectiveFields(Constructor))
    {
        fields.push(enrichEnumField(exportField(field, namespaces), Constructor));
    }

    // KNOWN DEFECT: methods are read from this class only, while fields resolve
    // through the whole lineage above. A subclass therefore reports no inherited
    // methods, and the decorated form hides that behind a second bug that
    // cancels it out: method decorators register through addInitializer, where
    // `this.constructor` is the *instance's* class, so constructing one
    // Tr2LightProfileRes writes CjsResource's methods onto Tr2LightProfileRes.
    // Which class owns which methods then depends on construction order, and
    // before any instance exists a class reports no methods at all.
    //
    // Declaring metadata as data (CjsSchema.define fields/methods) registers on
    // the declaring class at module load, so it is deterministic - and it makes
    // the missing inheritance visible rather than accidentally papered over.
    //
    // Left unfixed deliberately: nothing reads .methods off a runtime schema
    // today (tools-core classTool parses source documents, not these), and the
    // fix - walking the lineage here as getEffectiveFields does - changes
    // exported schemas for every decorator-using class in the org.
    for (const method of schema?.methods || [])
    {
        methods.push(exportField(method, namespaces));
    }

    const result = {
        className: CjsSchema.getClassName(Constructor),
        fields
    };

    const family = schema?.family || CjsSchema.getClassFamily(Constructor);
    if (family)
    {
        result.family = family;
    }

    if (schema?.purpose)
    {
        result.purpose = schema.purpose;
    }

    if (schema?.sourceClass && schema.sourceClass !== result.className)
    {
        result.sourceClass = schema.sourceClass;
    }

    if (schema?.aliases?.length)
    {
        result.aliases = [ ...schema.aliases ];
    }

    if (methods.length) result.methods = methods;

    addSchemaBuckets(result);
    return result;
}


// Kinds that hold many values rather than one. `map` and `set` are included
// because they are iterable collections of the referenced class, same as a list.
const MANY_KINDS = new Set([ "list", "array", "set", "map" ]);

// Kinds that can hold a child model. Bucketing on the KIND rather than on a
// resolvable class reference keeps traversal conservative: `type.struct(Class)`
// drops the reference during normalization, and a raw defineField may omit the
// item type, so requiring a reference would silently stop visiting those.
// Scalar and math kinds are excluded, which is where the saving comes from.
const MODEL_KINDS = new Set([
    "struct", "model", "rawStruct", "objectRef", "unknown",
    "list", "array", "set", "map"
]);


/**
 * Precompute the answers consumers would otherwise recompute per traversal.
 *
 * Graph walks ask the same two questions of every node - which fields hold
 * child models, which hold resources - and answering them by scanning the field
 * list and type-testing each value costs more than the walk itself. The class
 * cannot change without rebuilding its schema, so this is solved once.
 */
function addSchemaBuckets(schema)
{
    const byName = new Map();
    const children = [];
    const resources = [];

    for (const field of schema.fields)
    {
        byName.set(field.name, field);

        const type = field.type;
        // An undeclared field could hold anything, so it stays traversable.
        const kind = type?.kind;
        if (kind && !MODEL_KINDS.has(kind)) continue;

        const entry = { name: field.name, many: MANY_KINDS.has(kind) };

        if (type && resolveFieldClass(type)?.isResource === true)
        {
            resources.push(entry);
            continue;
        }

        entry.owned = field.io?.ownership === "owned";
        children.push(entry);
    }

    schema.byName = byName;
    schema.children = children;
    schema.resources = resources;
}


// Only string references survive normalization - type.struct(SomeClass) drops
// the reference entirely - so a field can only be bucketed when it names a
// class. The one field in the tree that named nothing was a missing
// declaration, not a deliberate escape.
function resolveFieldClass(type)
{
    const ref = type.className || type.itemType || type.valueType;
    return typeof ref === "string" && ref ? CONSTRUCTOR_BY_NAME.get(ref) || null : null;
}


function getOrCreateClassSchema(Constructor)
{
    // The only route by which class metadata is mutated, and therefore the only
    // place exported schemas can go stale. A single global counter rather than
    // per-class invalidation because a base class change invalidates every
    // subclass, and lineage is not tracked in reverse.
    SCHEMA_GENERATION += 1;

    let schema = CLASS_SCHEMA.get(Constructor);
    if (!schema)
    {
        schema = {
            className: null,
            family: null,
            purpose: null,
            sourceClass: null,
            aliases: null,
            fields: [],
            fieldsByName: new Map(),
            hiddenInherited: new Set(),
            methods: [],
            methodsByName: new Map()
        };
        CLASS_SCHEMA.set(Constructor, schema);
    }
    return schema;
}

function normalizeHiddenInheritedFields(fieldNames)
{
    if (!Array.isArray(fieldNames) || !fieldNames.length)
    {
        throw new TypeError("CjsSchema.hideInherited requires a non-empty array of field names.");
    }

    const normalized = fieldNames.map((fieldName, index) =>
    {
        if (typeof fieldName !== "string" || !fieldName.trim())
        {
            throw new TypeError(`CjsSchema.hideInherited fieldNames[${index}] must be a non-empty string.`);
        }
        return fieldName.trim();
    });

    return [...new Set(normalized)];
}

function recordStage3FieldMetadata(context, namespace, value)
{
    const metadata = context?.metadata;
    if (!metadata || typeof metadata !== "object") return;

    let fields;
    if (Object.prototype.hasOwnProperty.call(metadata, STAGE3_FIELD_METADATA))
    {
        fields = metadata[STAGE3_FIELD_METADATA];
    }
    else
    {
        fields = [];
        Object.defineProperty(metadata, STAGE3_FIELD_METADATA, {
            configurable: false,
            enumerable: false,
            value: fields,
            writable: false
        });
    }

    fields.push({
        name: context.name,
        namespace,
        value
    });
}

function registerStage3FieldMetadata(Constructor, metadata)
{
    if (!metadata || typeof metadata !== "object") return;
    if (!Object.prototype.hasOwnProperty.call(metadata, STAGE3_FIELD_METADATA)) return;

    let declarations = FIELD_DECLARATION_METADATA.get(Constructor);
    if (!declarations)
    {
        declarations = new Map();
        FIELD_DECLARATION_METADATA.set(Constructor, declarations);
    }
    for (const field of metadata[STAGE3_FIELD_METADATA])
    {
        declarations.set(field.name, metadata);
        defineFieldMetadata(Constructor, field.name, field.namespace, field.value);
    }
}

function normalizeClassDefinition(Constructor, definition)
{
    if (typeof definition === "string")
    {
        definition = { className: definition };
    }

    const result = { ...(definition || {}) };
    if (typeof result.className !== "string" || !result.className.trim())
    {
        throw new TypeError("CjsSchema.define requires an explicit non-empty className.");
    }
    result.className = result.className.trim();
    if (result.purpose !== undefined && result.purpose !== null)
    {
        if (typeof result.purpose !== "string" || !result.purpose.trim())
        {
            throw new TypeError("CjsSchema.define purpose must be a non-empty string when provided.");
        }
        result.purpose = result.purpose.trim().replace(/\s+/g, " ");
        if (result.purpose.includes("*/"))
        {
            throw new TypeError("CjsSchema.define purpose cannot close a JSDoc comment.");
        }
    }
    if (!result.sourceClass && result.className) result.sourceClass = result.className;
    const aliases = [
        ...(result.aliases === undefined ? [] : Array.isArray(result.aliases) ? result.aliases : [result.aliases]),
        ...(result.alias === undefined ? [] : Array.isArray(result.alias) ? result.alias : [result.alias])
    ].filter(alias => typeof alias === "string" && alias.trim()).map(alias => alias.trim())
        .filter(alias => alias !== result.className);
    result.aliases = aliases.length ? [...new Set(aliases)] : null;
    result.fields = normalizeManualMembers(result.fields, "fields");
    result.methods = normalizeManualMembers(result.methods, "methods");
    delete result.alias;
    return result;
}

/**
 * Normalize a definition's `fields`/`methods` into internal member records.
 *
 * Two spellings are accepted. A name-keyed object is the one to write:
 * declaration order is key order, which is what drives GetValues() export
 * order, and the name appears once rather than as a property of its own record.
 * The array of `{name, ...}` records predates it and still parses, because it
 * is what the internal schema stores.
 *
 * @param {object|Array<object>|null} members Declared members.
 * @param {string} memberType Either "fields" or "methods", for messages.
 * @returns {Array<object>} Internal member records.
 */
function normalizeManualMembers(members, memberType)
{
    if (members === undefined || members === null) return [];

    if (Array.isArray(members))
    {
        return members.map((member, index) =>
        {
            if (!isPlainObject(member) || typeof member.name !== "string" || !member.name.trim())
            {
                throw new TypeError(`CjsSchema.define ${memberType}[${index}] requires a non-empty name.`);
            }
            const { name, ...namespaces } = member;
            return normalizeManualMember(name.trim(), namespaces, memberType);
        });
    }

    if (!isPlainObject(members))
    {
        throw new TypeError(
            `CjsSchema.define ${memberType} must be a name-keyed object or an array of named records.`
        );
    }

    return Object.entries(members).map(([ name, definition ]) =>
    {
        if (!name.trim())
        {
            throw new TypeError(`CjsSchema.define ${memberType} requires a non-empty name.`);
        }
        return normalizeManualMember(name.trim(), definition, memberType);
    });
}

/**
 * Collapse one member's declaration into a namespace map.
 *
 * A declaration is a decorator, a namespace object, or an array mixing both.
 * Decorators are accepted as data so the object form reuses the vocabulary the
 * decorators already define rather than restating it: `impl.adapted` written
 * twice in two spellings is two things that can disagree.
 *
 * @param {string} name Member name.
 * @param {*} definition Declared metadata.
 * @param {string} memberType Either "fields" or "methods", for messages.
 * @returns {object} Internal member record.
 */
function normalizeManualMember(name, definition, memberType)
{
    const member = { name };

    for (const entry of Array.isArray(definition) ? definition : [ definition ])
    {
        if (entry === undefined || entry === null) continue;

        const decorator = getDecoratorMetadata(entry);
        if (decorator)
        {
            member[decorator.namespace] = mergeNamespace(member[decorator.namespace], decorator.value);
            continue;
        }

        if (!isPlainObject(entry))
        {
            throw new TypeError(
                `CjsSchema.define ${memberType} "${name}" accepts schema decorators, ` +
                "namespace objects, or an array of them."
            );
        }

        for (const [ namespace, value ] of Object.entries(entry))
        {
            member[namespace] = mergeNamespace(member[namespace], value);
        }
    }

    return member;
}

function registerClassMetadata(Constructor, schema)
{
    if (!Constructor || !schema?.className) return;

    CjsSchema.SetConstructor(schema.className, Constructor);

    for (const alias of schema.aliases || [])
    {
        CjsSchema.SetConstructor(alias, Constructor);
    }
}

function defineEnumMetadata(values, schema)
{
    if (!values || typeof values !== "object" || !schema?.name) return;

    ENUM_SCHEMA_BY_NAME.set(schema.name, schema);
    ENUM_SCHEMA_BY_OBJECT.set(values, schema);

    if (Object.isExtensible(values) && !Object.prototype.hasOwnProperty.call(values, CJS_ENUM_NAME))
    {
        Object.defineProperty(values, CJS_ENUM_NAME, {
            value: schema.name
        });
    }
}

function normalizeEnumSchema(values, definition)
{
    const type = values?.Type || values;
    const members = Array.isArray(definition.members)
        ? definition.members.map(member => ({ ...member }))
        : [];
    const result = {
        name: definition.name || values?.[CJS_ENUM_NAME] || values?.Source?.name || values?.name || null,
        type,
        members
    };

    if (definition.source) result.source = definition.source;
    if (definition.family) result.family = definition.family;
    if (definition.line !== undefined && definition.line !== null) result.line = definition.line;

    return result;
}

function normalizeEnumDefinition(values)
{
    if (typeof values === "string")
    {
        return { enumType: values };
    }

    const type = values?.Type || (isPlainObject(values) ? values : null);
    if (type && typeof type === "object")
    {
        const result = {
            values: type
        };
        const enumType = CjsSchema.getEnumName(values);
        if (enumType) result.enumType = enumType;
        return result;
    }

    return { values };
}

function normalizeComponentDefinition(definition)
{
    if (!isPlainObject(definition))
    {
        throw new TypeError("CjsSchema.components requires a plain object definition.");
    }

    return Object.fromEntries(Object.entries(definition).map(([swizzle, value]) => [
        normalizeSwizzle(swizzle),
        normalizeComponentEntry(value)
    ]));
}

function normalizeComponentEntry(value)
{
    if (typeof value === "string") return { name: value };
    if (isPlainObject(value)) return cloneSchemaValue(value);
    return value;
}

function getComponentValue(value, swizzle)
{
    const indices = getComponentIndices(swizzle);
    if (indices.length === 1) return value?.[indices[0]];
    return indices.map(index => value?.[index]);
}

function setComponentValue(target, swizzle, value)
{
    if (!target)
    {
        throw new TypeError("CjsSchema.components.set requires a target vector.");
    }

    const indices = getComponentIndices(swizzle);
    if (indices.length === 1)
    {
        target[indices[0]] = value;
        return target;
    }

    if (!value || typeof value[Symbol.iterator] !== "function")
    {
        throw new TypeError(`CjsSchema.components.set requires an iterable value for '${swizzle}'.`);
    }

    let offset = 0;
    for (const item of value)
    {
        if (offset >= indices.length) break;
        target[indices[offset++]] = item;
    }

    if (offset !== indices.length)
    {
        throw new RangeError(`CjsSchema.components.set expected ${indices.length} values for '${swizzle}' but received ${offset}.`);
    }

    return target;
}

function getComponentIndices(swizzle)
{
    return [...normalizeSwizzle(swizzle)].map(componentIndex);
}

function normalizeSwizzle(swizzle)
{
    const text = String(swizzle || "").trim().toLowerCase();
    if (!text)
    {
        throw new TypeError("Component swizzle cannot be empty.");
    }

    for (const char of text)
    {
        componentIndex(char);
    }

    return text;
}

function componentIndex(char)
{
    switch (char)
    {
        case "x":
        case "r":
        case "0":
            return 0;
        case "y":
        case "g":
        case "1":
            return 1;
        case "z":
        case "b":
        case "2":
            return 2;
        case "w":
        case "a":
        case "3":
            return 3;
        default:
            throw new RangeError(`Unsupported component '${char}'.`);
    }
}

function mergeNamespace(existing, value)
{
    if (isPlainObject(existing) && isPlainObject(value)) return { ...existing, ...value };
    return value;
}

// Resolves @schema.enum("X") through the owning class's PascalCase static so
// exported schemas are self-describing: adds the class-scoped identity and a
// reference to the frozen member map when the static resolves.
function enrichEnumField(exported, Constructor)
{
    const enumType = exported?.enum?.enumType;
    if (!enumType) return exported;
    const members = Constructor?.[enumType];
    if (!members || typeof members !== "object") return exported;

    let owner = Constructor;
    let current = Constructor;
    while (typeof current === "function")
    {
        if (Object.prototype.hasOwnProperty.call(current, enumType))
        {
            owner = current;
            break;
        }
        current = Object.getPrototypeOf(current);
    }

    return {
        ...exported,
        enum: {
            ...exported.enum,
            identity: `${CjsSchema.getClassName(owner) || owner.name}.${enumType}`,
            members
        }
    };
}

function exportField(field, namespaces)
{
    const result = {
        name: field.name
    };

    for (const [key, value] of Object.entries(field))
    {
        if (key === "name") continue;
        if (namespaces && !namespaces.has(key)) continue;
        result[key] = value;
    }

    return result;
}

function normalizeNamespaces(namespaces)
{
    if (!namespaces) return null;
    return new Set(Array.isArray(namespaces) ? namespaces : [namespaces]);
}

function cloneSchemaValue(value)
{
    if (Array.isArray(value)) return value.map(cloneSchemaValue);
    if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneSchemaValue(item)]));
    return value;
}

function isPlainObject(value)
{
    return Boolean(value) && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}
