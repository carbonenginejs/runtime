import {
    cloneCarbonValue,
    coerceCarbonMathInto,
    coerceCarbonTypedArrayInto,
    defaultValueForCarbonField,
    exportCarbonValue,
    getCarbonTypeDefinition,
    inferCarbonTypeFromCpp,
    normalizeCarbonValue
} from "./types/carbonTypes.js";
import { composeAbstractDecorator } from "../compose/abstract.js";
import { CJS_CLASS_NAME, getRegisteredClassName } from "../compose/className.js";
import { composeNotifyDecorator } from "../compose/notify.js";
import { carbonInheritDecorator, carbonMapInterfaceDecorator, carbonInterfaceTableDecorator, cast } from "../compose/interface.js";
import { composeValuesDecorator, createValuesTransport, isExportableField, isWritableField } from "../compose/values.js";
import { blueEnums, CjsBlueEnumRegistry, CJS_ENUM_NAME } from "../blue/enums/CjsBlueEnumRegistry.js";
import { TriSettingNames } from "../consts/trinity.js";
import { registerClass, unregisterClass, getRegisteredConstructor, getClassRegistrationRevision, ClassRegistrarNullFactory } from "../blue/classes/registry.js";


const CLASS_SCHEMA = new WeakMap();

// Exported schemas, memoized per class. SCHEMA_GENERATION is bumped by every
// metadata definition (see getOrCreateClassSchema), which is what makes a stale
// memo detectable without tracking which subclasses a base class change reaches.
// Blue class-registration revisions independently invalidate name-dependent
// buckets and defaults, regardless of which facade changed the registration.
const SCHEMA_EXPORTS = new WeakMap();
const DEFAULT_EXPORTS = new WeakMap();
const FIELD_INITIAL_DEFAULTS = new WeakMap();
const VALUES_DECLARATIONS = new WeakMap();
const FIELD_DECLARATION_METADATA = new WeakMap();
let SCHEMA_GENERATION = 0;

// Statics described by edit.setting, in definition order (see getSettings).
// Declared before the class body, which reads SETTING_DECORATOR.
const SETTINGS = [];
const CARBON_SETTING_NAMES = new Set(TriSettingNames);
const SETTING_APPLIES = Object.freeze({ ALWAYS: "always", CREATE: "create", LOAD: "load" });
const SETTING_DECORATOR = Object.assign(
    (name, options) => settingDecorator(name, options),
    SETTING_APPLIES
);
const STAGE3_FIELD_METADATA = Symbol("carbonenginejs.schema.stage3Fields");
const STAGE3_METHOD_METADATA = Symbol("carbonenginejs.schema.stage3Methods");

// Where a class's decorator metadata lives: `Symbol.metadata`, which Babel's
// 2023-11 decorators fall back to `Symbol.for("Symbol.metadata")` for.
const DECORATOR_METADATA_KEY = Symbol.metadata ?? Symbol.for("Symbol.metadata");

// Decorator metadata objects already replayed into a class schema.
const CONSUMED_DECORATOR_METADATA = new WeakSet();

// Declared here rather than beside describeDecorator: the CjsSchema class body
// builds every decorator namespace in its static initializer, which runs before
// any const declared after the class is initialized.
const DECORATOR_METADATA = Symbol("carbonenginejs.schema.decoratorMetadata");

export { CJS_ENUM_NAME } from "../blue/enums/CjsBlueEnumRegistry.js";

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
export { CJS_CLASS_NAME };


// Be::BlueStructureDataType storage used by native BlueStructureDefinition.
const STRUCT_TYPES = {
    UINT32_1: ["uint32", "uint32", 4, 4],
    FLOAT32_1: ["float32", "float32", 4, 4],
    FLOAT32_3: ["vec3", "vector3", 12, 4],
    FLOAT32_4: ["vec4", "vector4", 16, 4],
    INT32_1: ["int32", "int32", 4, 4],
    SHAREDSTRING_1: ["string", "string", 8, 8],
    USHORT_1: ["uint16", "uint16", 2, 2],
    UBYTE_1: ["uint8", "uint8", 1, 1],
    BOOL8_1: ["boolean", "boolean", 1, 1],
    SHORT_1: ["int16", "int16", 2, 2],
    BYTE_1: ["int8", "int8", 1, 1]
};

/**
 * Reusable schema/decorator metadata surface.
 *
 * Decorators are namespace-scoped so consumers can export only the parts they
 * understand. The functions support stage-3 field decorators and direct tool
 * registration through decorateField().
 */
export class CjsSchema
{
    /**
     * Registers complete reviewed schema metadata for a constructor.
     * An own `abstract: true` declaration registers this definition's names with
     * Carbon's refusal factory and DISABLE_PYTHON_CONSTRUCTION flag. It leaves
     * the constructor callable and does not make subclasses abstract. Existing
     * registrations keep their original factory under the first-wins rule.
     * This option is shared by meta.define/type.define; it does not govern
     * readers or other callers that construct directly from the type identity.
     */
    static define(Constructor, definition = {})
    {
        defineClassMetadata(Constructor, normalizeClassDefinition(Constructor, definition));
        return this;
    }

    /**
     * Creates a field decorator that binds the field to a registered enum
     * identity.
     *
     * A name containing a dot resolves only through the Blue enum registry,
     * when field or schema metadata is read: a missing registration throws, and
     * the failure is not cached, so registering later and reading again works.
     * Any other name resolves the declaring class's (or an ancestor's)
     * PascalCase static; a missing static skips enum validation.
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
    /**
     * Carbon's `dynamic_cast`: returns the value when it implements the
     * contract, otherwise null. See `compose/interface.js` for why this exists
     * and what it deliberately does not do.
     *
     * @param {*} value
     * @param {Function} Contract
     * @returns {*} `value` or `null`.
     */
    static cast(value, Contract)
    {
        return cast(value, Contract);
    }

    /**
     * Applies method decorators imperatively, for code built without decorator syntax.
     *
     * @param {Function} Constructor The class owning the method.
     * @param {string} methodName The method's name.
     * @param {...Function} decorators The decorators, applied in order.
     * @returns {Function} `Constructor`.
     */
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

    /**
     * Every static described by `edit.setting`, in definition order, as
     * `{ name, owner, key, applies, enum, values, carbon }`. The list only grows.
     *
     * @returns {ReadonlyArray<object>} The described settings.
     */
    /**
     * Whether values may write a field: a writer's edit-flag rule, which the
     * values transport and Blue's reader share.
     *
     * @param {object} field A field record.
     * @returns {boolean} True when writable.
     */
    static isFieldWritable(field)
    {
        return isWritableField(field);
    }

    /**
     * Whether an export writes a field under the given options (`persistOnly`).
     *
     * @param {object} field A field record.
     * @param {object} [options] Export options.
     * @returns {boolean} True when exported.
     */
    static isFieldExported(field, options = {})
    {
        return isExportableField(field, options);
    }

    /** Returns the shared schema settings object without copying it. */
    static getSettings()
    {
        return SETTINGS;
    }

    /**
     * Returns resolved schema metadata for a named field.
     *
     * The record is the class's own table entry, built once at registration
     * and shared by every lookup; it must not be written to.
     */
    static getField(Constructor, fieldName)
    {
        const schema = CLASS_SCHEMA.get(Constructor);
        const field = schema?.registered
            ? schema.effectiveFieldsByName.get(fieldName)
            : computeEffectiveFields(Constructor).find(candidate => candidate.name === fieldName);
        return field ? enrichEnumField(field, Constructor) : null;
    }

    /**
     * Omits inherited declarations without changing ordinary JS properties.
     * Names match JS keys first. If no key matches, an exposed name selects all
     * inherited keys with that name. The resolved keys stay omitted in descendants;
     * there is no unhide. Both canonical roles and the legacy fields view agree.
     * Unknown-input handling belongs to the consumer: the current DictReader
     * rejects omitted keys, while the optional values transport skips them.
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
        if (schema?.registered) return schema.effectiveMethodsByName.get(methodName) || null;
        return schema?.methodsByName.get(methodName) || null;
    }

    /** Returns the explicit stable serialized name registered for a constructor. */
    static getClassName(Constructor)
    {
        // `define` stamps the name it registers, so the constructor alone
        // answers; compose/className.js is the one reader.
        return getRegisteredClassName(Constructor);
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

    /**
     * Registers a constructor under an explicit serialized class name.
     * Blue owns the complete registration. The first registration of each name
     * wins; replace it by deleting that name before registering again. Aliases
     * are independent names. Metadata may still be declared for a constructor
     * whose name collided, but lookup continues to return the first entry.
     */
    static SetConstructor(name, Constructor)
    {
        registerClass({ name, type: Constructor });
        return this;
    }

    /** Removes one registered name without erasing aliases or sealed metadata. */
    static DeleteConstructor(name)
    {
        return unregisterClass(name);
    }

    /** Returns the constructor registered for a serialized class name, or null. */
    static GetConstructor(name)
    {
        return getRegisteredConstructor(name);
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
    static _valuesService = null;

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
        CjsSchema._valuesService = service;
        return this;
    }

    /**
     * The registered values service, or a thrown explanation of what to import.
     *
     * @param {string} method The calling method's name, for the message.
     * @returns {object} The values service.
     */
    static _requireValuesService(method)
    {
        if (!CjsSchema._valuesService)
        {
            throw new Error(`CjsSchema.${method} requires the values service; import the Blue values service before calling it.`);
        }
        return CjsSchema._valuesService;
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
        // Without the model layer the state-free transport still answers for a
        // decorated class, which is what lets a reader work with only the
        // schema layer loaded - hydration.js states that as its whole reason
        // for calling SetValues directly rather than through here.
        const service = CjsSchema._valuesService;
        return service
            ? service.getValues(target, out, options)
            : CjsSchema.getValuesFromSchema(target, out, options);
    }

    /**
     * The top-level values rule for from/set: a plain object, or null for "no
     * values".
     *
     * SetValues and from exist for hydration and dehydration, so what arrives
     * at the top is data. A live object there is refused rather than read as
     * a bag: measured before this rule, `X.constructor.from(X)` built a new
     * object that aliased X's children and flattened its Map-held models.
     * Child fields are different - a non-plain value there is a reference, and
     * the field's declared type decides that. The one rule lives here so every
     * entry point asks the same question in the same place.
     *
     * @param {*} values Incoming top-level values.
     * @param {string} label Entry point named in the error.
     * @returns {boolean} False for null (nothing to apply), true for a plain bag.
     * @throws {TypeError} For anything that is not a plain object or null.
     */
    static assertValues(values, label)
    {
        if (values === null) return false;
        if (!isPlainObject(values))
        {
            throw new TypeError(`${label} requires a plain values object; received ${describeValuesInput(values)}.`);
        }
        return true;
    }

    /**
     * Copies a source's values into a target - the explicit copy helper.
     *
     * The top-level from/set rule refuses a live object as values, so copying
     * one says so here instead: a plain source already IS values, anything
     * else is exported first. Both then go through the target's validated
     * setter, so the target keeps its own identity and in-place buffers. This
     * is a value copy, not Carbon's Copier: no topology is preserved and
     * reference fields carry the source's references across as references.
     *
     * @param {object} target The object receiving the values.
     * @param {object} source A live object or a plain values object.
     * @param {object} [options={}] Population options.
     * @returns {Set<string>|boolean} Changed fields, or a boolean result.
     */
    static copy(target, source, options = {})
    {
        const values = isPlainObject(source) ? source : CjsSchema.getValues(source, {}, options);
        return CjsSchema.setValues(target, values, options);
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
        if (!CjsSchema.assertValues(values, "CjsSchema.setValues")) return false;
        const service = CjsSchema._valuesService;
        return service
            ? service.setValues(target, values, options)
            : CjsSchema.setValuesFromSchema(target, values, options);
    }

    /**
     * The state-free transport, for a decorated class carrying no SetValues.
     *
     * Coercion, the writability gate and a changed set - the reader's half.
     * The dirty flag, the settle loop, the modified event and child mutation
     * are the EDITING contract and stay with the model path.
     *
     * Registered as the values service's third arm, which threw by name until
     * this existed. Also what `@compose.values` installs.
     */
    static _statelessTransport = createValuesTransport({
        GetFields: Constructor => getEffectiveFields(Constructor).filter(field =>
            findValuesDeclaration(Constructor, field.name)?.type?.runtimeOnly !== true),
        Export: (value, field) => exportCarbonValue(value, getRuntimeValueField, field.type),
        Import: (value, field) => importDeclaredValue(value, field),
        CoerceInto: (current, incoming, field) =>
            coerceCarbonMathInto(current, incoming, field.type)
            ?? coerceCarbonTypedArrayInto(current, incoming, field.type),
        IsEquivalent: (a, b) => a === b
    });

    /** Reads declared fields off any decorated class, without a model base. */
    static getValuesFromSchema(target, out = {}, options = {})
    {
        return CjsSchema._statelessTransport.getValues(target, out, options);
    }

    /** Writes declared fields onto any decorated class, without a model base. */
    static setValuesFromSchema(target, values = {}, options = {})
    {
        return CjsSchema._statelessTransport.setValues(target, values, options);
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
        if (!CjsSchema.assertValues(values, "CjsSchema.from")) values = {};
        return CjsSchema._requireValuesService("from").from(className, values, options);
    }

    /** Returns the stable registered name for an enum object. */
    static getEnumName(values)
    {
        if (typeof values === "string") return values;
        return values && typeof values === "object"
            ? blueEnums.GetEnumName(values) || blueEnums.GetEnumName(values.Type) || values[CJS_ENUM_NAME] || values.Source?.name || values.name || null
            : null;
    }

    /** Returns registered enum metadata by name or enum object. */
    static getEnum(values)
    {
        const name = CjsSchema.getEnumName(values);
        return name && blueEnums.HasEnum(name) ? blueEnums.GetEnumInfo(name) : null;
    }

    /**
     * Return the exported schema for a class.
     *
     * `members` and `properties` retain every declaration in derived-to-base
     * class order, preserving name, JS key, optional index, and declaring class.
     * Core readers and traversal use these tables. The compatibility `fields`
     * view instead merges by JS key in base-first order. Tables are fixed at
     * registration; exports are memoized until metadata or Blue registration changes.
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
     * @returns {CjsClassInfo} Shared per-class record.
     */
    static getSchema(Constructor, options = {})
    {
        const namespaces = normalizeNamespaces(options.namespaces);
        if (namespaces) return buildClassInfo(Constructor, namespaces);

        const memo = SCHEMA_EXPORTS.get(Constructor);
        if (memo && memo.generation === SCHEMA_GENERATION
            && memo.registrationRevision === getClassRegistrationRevision()) return memo.schema;

        const schema = buildClassInfo(Constructor, null);
        SCHEMA_EXPORTS.set(Constructor, { generation: SCHEMA_GENERATION, registrationRevision: getClassRegistrationRevision(), schema });
        return schema;
    }

    /**
     * Returns a fresh plain-values copy of one schema class's declared defaults.
     *
     * Decorated field initializers record their value before the constructor
     * body can turn it into instance state (an audio game-object ID, for
     * example). When no instance has exposed those initializers yet, the class
     * is constructed once with zero arguments to trigger them. This never calls
     * schema construction, SetValues, Initialize, UpdateValues, or another lifecycle
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
     * @throws {TypeError} When any `_type` names an unregistered class.
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


    /**
     * Field type descriptors. Three reference-shaped kinds differ in how a
     * value is populated:
     * - `model(className)` holds a registered class by reference;
     * - `struct(className)` has value semantics: when the owner already holds
     *   an instance, SetValues populates it in place, keeping its identity;
     * - `rawStruct(nativeType)` is an opaque native payload whose plain values
     *   never construct a model.
     */
    static #type = {
        /**
         * Declares array item types; native struct layout belongs to the item class.
         */
        array: (itemType, options) => collectionDecorator("array", itemType, options),
        boolean: fieldDecorator("type", { kind: "boolean" }),
        color: fieldDecorator("type", { kind: "color" }),
        rgb: fieldDecorator("type", { kind: "vec3", semantic: "rgb" }),
        rgba: fieldDecorator("type", { kind: "vec4", semantic: "rgba" }),
        linear: fieldDecorator("type", { kind: "vec4", semantic: "linear" }),
        local: fieldDecorator("type", { kind: "mat4", semantic: "local" }),
        world: fieldDecorator("type", { kind: "mat4", semantic: "world" }),
        translation: fieldDecorator("type", { kind: "vec3", semantic: "translation" }),
        rotation: fieldDecorator("type", { kind: "quat", semantic: "rotation" }),
        scale: fieldDecorator("type", { kind: "vec3", semantic: "scale", default: [1, 1, 1] }),
        mixed: fieldDecorator("type", { kind: "vec4", semantic: "mixed" }),
        int8Array: fieldDecorator("type", { kind: "typedArray", arrayType: "Int8Array" }),
        uint8Array: fieldDecorator("type", { kind: "typedArray", arrayType: "Uint8Array" }),
        uint8ClampedArray: fieldDecorator("type", { kind: "typedArray", arrayType: "Uint8ClampedArray" }),
        int16Array: fieldDecorator("type", { kind: "typedArray", arrayType: "Int16Array" }),
        uint16Array: fieldDecorator("type", { kind: "typedArray", arrayType: "Uint16Array" }),
        int32Array: fieldDecorator("type", { kind: "typedArray", arrayType: "Int32Array" }),
        uint32Array: fieldDecorator("type", { kind: "typedArray", arrayType: "Uint32Array" }),
        float32Array: fieldDecorator("type", { kind: "typedArray", arrayType: "Float32Array" }),
        float64Array: fieldDecorator("type", { kind: "typedArray", arrayType: "Float64Array" }),
        bigInt64Array: fieldDecorator("type", { kind: "typedArray", arrayType: "BigInt64Array" }),
        bigUint64Array: fieldDecorator("type", { kind: "typedArray", arrayType: "BigUint64Array" }),
        flags: values => combinedFieldDecorator({ type: { kind: "uint32" }, enum: normalizeEnumDefinition(values), edit: { flags: true } }),
        custom: name => fieldDecorator("type", { kind: "custom", name: requireTypeName(name) }),
        define: definition => classDefinitionDecorator(definition),
        expression: fieldDecorator("type", { kind: "expression", js: "string" }),
        float32: fieldDecorator("type", { kind: "float32" }),
        float64: fieldDecorator("type", { kind: "float64" }),
        int8: fieldDecorator("type", { kind: "int8" }),
        int16: fieldDecorator("type", { kind: "int16" }),
        int32: fieldDecorator("type", { kind: "int32" }),
        int64: fieldDecorator("type", { kind: "int64" }),
        /**
         * Declares list item types; native struct layout belongs to the item class.
         */
        list: (itemType, options) => collectionDecorator("list", itemType, options),
        mat3: fieldDecorator("type", { kind: "mat3" }),
        mat4: fieldDecorator("type", { kind: "mat4" }),
        map: valueType => fieldDecorator("type", { kind: "map", valueType }),
        model: className => fieldDecorator("type", { kind: "model", className }),
        objectRef: className => fieldDecorator("type", { kind: "objectRef", className }),
        /** Declares a live resource edge that values, persistence and copying must omit. */
        resource: className => fieldDecorator("type", { kind: "objectRef", className, runtimeOnly: true }),
        weakRef: className => fieldDecorator("type", { kind: "weakRef", className }),
        path: fieldDecorator("type", { kind: "path" }),
        quat: fieldDecorator("type", { kind: "quat" }),
        rawStruct: className => fieldDecorator("type", { kind: "rawStruct", className }),
        set: itemType => fieldDecorator("type", { kind: "set", itemType }),
        string: fieldDecorator("type", { kind: "string" }),
        wstring: fieldDecorator("type", { kind: "wstring" }),
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
    };

    // Be::EDITFLAGS, exactly (`blueexposure/include/BlueTypes.h:282-311`).
    // Every member below is one of Carbon's; nothing else belongs here. The
    // namespace was called `io` until 2026-09-18, which named about a third of
    // what it holds - only PERSIST and RPERSIST are I/O, NOTIFY is wiring,
    // HIDDEN and FLAGS are editor hints, READ and WRITE are access control.
    /**
     * Blue edit flags, one boolean per EDITFLAGS bit: read 0x001, write 0x002,
     * notify 0x004, hidden 0x008, persist 0x010, rpersist 0x020, flags 0x100,
     * enum 0x200; persistOnly is HIDDEN | PERSIST. The masks and
     * EDIT_FORCELONG are not decorators. Flags combine independently, and
     * persistence does not imply script access.
     *
     * - `notify` calls `OnModified(nameOrNames)` once for changed values.
     *   Equal writes do not notify. `notify: false`, `markDirty: false` and
     *   `skipUpdate: true` suppress this call without retaining names.
     * - `type.enum(...)` already reports `edit.enum: true` in the resolved
     *   schema; `flags` describes a bitmask and supplies no chooser.
     * - Values transport does not enforce READ, and direct JS field access is
     *   never intercepted.
     */
    static #edit = {
        none: fieldDecorator("edit", {}),
        // MODMASK 0x00F
        read: fieldDecorator("edit", { read: true }),
        write: fieldDecorator("edit", { write: true }),
        readwrite: fieldDecorator("edit", { read: true, write: true }),
        notify: fieldDecorator("edit", { notify: true }),
        hidden: fieldDecorator("edit", { hidden: true }),

        // SERMASK 0x0F0
        persist: fieldDecorator("edit", { persist: true }),
        // RPERSIST 0x020 - "like PERSIST but only unserialize (read only)":
        // the value loads from a document and is never written back out.
        rpersist: fieldDecorator("edit", { rpersist: true }),

        flags: fieldDecorator("edit", { flags: true }),
        enum: fieldDecorator("edit", { enum: true }),

        /**
         * Marks a static field as the value behind a named engine setting,
         * Carbon's `TRI_REGISTER_SETTING` or one of ours. It only describes:
         * the renderer's settings read the described statics from
         * `CjsSchema.getSettings()`, and each entry records whether the name
         * is one Carbon registers.
         *
         * `applies` is when a change takes effect: `edit.setting.ALWAYS` (read
         * every frame), `CREATE` (copied when an object is made) or `LOAD`
         * (read while something is built or loaded). `enum` is the enum a
         * numeric setting takes its values from, as the enum object or its
         * registered name; `values` lists the values any other setting takes.
         */
        setting: SETTING_DECORATOR,

        // PERSISTONLY = HIDDEN | PERSIST, for hidden attributes.
        persistOnly: fieldDecorator("edit", { persist: true, persistOnly: true, hidden: true }),


    };

    // Stored ownership metadata remains available to explicit graph traversal.
    // Readers initialize only their own newly allocated objects; ownership does
    // not make them initialize constructor defaults or borrowed instances.
    static #lifecycle = {
        owned: fieldDecorator("lifecycle", { ownership: "owned" }),
        reference: fieldDecorator("lifecycle", { ownership: "reference" })
    };

    // Composition decorators: type/edit/carbon/impl/jessica DESCRIBE, compose
    // INSTALLS (design record, direction item 11). All three are live; the
    // migration of existing classes onto them is separate work.
    static #compose = {
        abstract: composeAbstractDecorator(Constructor => CjsSchema.getClassName(Constructor)),
        notify: composeNotifyDecorator,
        values: composeValuesDecorator(CjsSchema._statelessTransport)
    };

    /**
     * Editor-facing presentation hints: `group(name)`, `hidden`, `readOnly`
     * and `widget(name)`. They change no persistence, validation or mutation:
     * `jessica.hidden` is not `hideInherited`, and `jessica.readOnly` does not
     * block SetValues.
     */
    static #jessica = {
        group: name => fieldDecorator("jessica", { group: name }),
        description: text => fieldDecorator("jessica", { description: String(text) }),
        hidden: fieldDecorator("jessica", { hidden: true }),
        readOnly: fieldDecorator("jessica", { readOnly: true }),
        widget: name => fieldDecorator("jessica", { widget: name })
    };

    // impl decorators apply to methods AND fields: a promoted/diverging field
    // (e.g. a Carbon-hidden authored value exposed for values interchange) is
    // an implementation decision, so it carries impl.adapted/impl.custom +
    // impl.reason just like a diverging method. carbon.* stays factual
    // provenance and remains method-only.
    static #impl = {
        abstract: memberDecorator("impl", { abstract: true, status: "abstract" }),
        adapted: memberDecorator("impl", { adapted: true, status: "adapted" }),
        custom: memberDecorator("impl", { custom: true, status: "custom" }),
        implemented: memberDecorator("impl", { implemented: true, status: "implemented" }),
        noop: memberDecorator("impl", { noop: true, status: "noop" }),
        notImplemented: memberDecorator("impl", { notImplemented: true, status: "notImplemented" }),
        notSupported: memberDecorator("impl", { notSupported: true, status: "notSupported" }),
        // Audit-only: names the state members invalidated by this field/method.
        // The owning class retains all dirty-state, rebuild and timing behavior.
        invalidates: (...members) => memberDecorator("impl", { invalidates: members }),
        note: text => memberDecorator("impl", { note: String(text) }),
        reason: text => memberDecorator("impl", { reason: String(text) })
    };

    /**
     * What an installed interface member should be marked as on its consumer.
     *
     * CARBON'S INTERFACES ARE NOT UNIFORM, and that is the whole reason this
     * exists. Some methods are pure virtual, and a consumer inheriting one
     * without implementing it is genuinely unimplemented. Others are declared
     * with an EMPTY BODY on purpose, so an implementer overrides only the half
     * it cares about - `IBlueResManNotifications` has both callbacks empty in
     * the donor. Marking that second kind `impl.abstract` on every consumer
     * writes a divergence that does not exist, onto dozens of classes at once.
     *
     * So the interface's own declaration is carried across, and
     * `impl.abstract` is only the fallback for a member the interface said
     * nothing about. The chain is walked because `CollectMembers` does: a
     * member may be declared on an ancestor of the contract named here.
     *
     * @param {Function} Contract The interface the member was installed from.
     * @param {String} name The member.
     * @returns {Array<Function>} Decorators for `decorateMethod`.
     */
    static _inheritedImplDecorators(Contract, name)
    {
        let declared = null;
        for (
            let base = Contract;
            typeof base === "function" && base.prototype && base !== Object;
            base = Object.getPrototypeOf(base)
        )
        {
            declared = CjsSchema.getMethod(base, name)?.impl ?? null;
            if (declared) break;
        }

        const status = declared?.status;
        const decorator = status ? CjsSchema.#impl[status] : null;
        const decorators = [ typeof decorator === "function" ? decorator : CjsSchema.#impl.abstract ];

        // A reason the interface wrote belongs to the member wherever it lands;
        // a consumer left holding the marking without it could not be reviewed.
        if (declared?.reason) decorators.push(CjsSchema.#impl.reason(declared.reason));
        if (declared?.note) decorators.push(CjsSchema.#impl.note(declared.note));

        return decorators;
    }

    static #carbon = {
        // Carbon's base list and Carbon's exposure table: two different facts,
        // two decorators, both factual and so both here rather than in
        // `compose`. See compose/interface.js for the black-reader branch that
        // proves they cannot be collapsed into one.
        inherit: (...Bases) => carbonInheritDecorator(
            Bases,
            (Constructor, name, Contract) => CjsSchema.decorateMethod(
                Constructor, name, ...CjsSchema._inheritedImplDecorators(Contract, name))),
        mapInterface: (...Interfaces) => carbonMapInterfaceDecorator(Interfaces),
        interfaceTable: definition => carbonInterfaceTableDecorator(definition),
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
        /**
         * Marks a method that takes, as its first argument, the context standing
         * in for Carbon renderer or process globals; the decorator throws when the
         * method takes no argument. The marker does not go on the owner that
         * constructs and stamps that context (`EveSpaceScene.Update`). When the
         * method also writes into caller-owned output storage, that argument
         * stays last.
         */
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
    };

    /**
     * Public grouping; these aliases share the existing implementations.
     * `member(name?, { index? })` declares stored data and `property(...)` a
     * live property, with an exposed name independent of the decorated JS key.
     * Explicit `members`/`properties` arrays use { name, key, index?, ...metadata }
     * and retain multiple indexed routes on one key. Legacy `fields` inputs and
     * decorator arrays remain JS-keyed and also populate the compatibility view.
     */
    static meta = {
        blue: { ...Object.fromEntries(Object.entries(this.#edit).filter(([name]) => !["none", "enum", "setting"].includes(name))), ...this.#carbon },
        ui: { ...this.#jessica, components: createComponentsNamespace() },
        type: Object.fromEntries(Object.entries(this.#type).filter(([name]) => !["define", "hideInherited"].includes(name))),
        ...Object.fromEntries(Object.entries(this.#impl).filter(([name]) => name !== "custom")),
        ours: this.#impl.custom,
        ...this.#lifecycle,
        events: this.#compose.notify,
        requires: this.#compose.abstract,
        values: this.#compose.values,
        setting: this.#edit.setting,
        struct: createStructNamespace(),
        member: (name, options) => declarationDecorator("member", name, options),
        property: (name, options) => declarationDecorator("property", name, options),
        define: this.#type.define,
        hideInherited: this.hideInherited
    };

}


/** Collection layouts are owned by the registered item class. */
function collectionDecorator(kind, itemType, options)
{
    if (options && Object.hasOwn(options, "structure"))
    {
        throw new TypeError("Inline structure layouts are removed; use meta.struct on the item class.");
    }
    return fieldDecorator("type", { kind, itemType });
}

/**
 * Describes native struct offsets without installing instance behavior.
 * Apply struct.define before class registration (below meta.define in source).
 * @impl custom JavaScript holds BlueStructureDefinition on its class info.
 */
function createStructNamespace()
{
    const result = {
        define: ({ size } = {}) => function defineStruct(Constructor)
        {
            RejectAfterRegistration(Constructor, "structure size");
            getOrCreateClassSchema(Constructor).structureSize = size;
        }
    };
    for (const dataType of Object.keys(STRUCT_TYPES))
    {
        result[dataType] = offset => fieldDecorator("struct", { dataType, offset });
    }
    return result;
}

/**
 * Builds the one canonical native layout during class registration.
 * Carbon binds static BlueStructureDefinition arrays to list instances
 * (blueexposure/include/IBlueStructureList.h:116). JavaScript instead stores
 * this description on CjsClassInfo so the resource reader needs no domain import.
 * @impl custom Class-owned layout metadata is a JavaScript extension.
 */
function buildStructureDefinition(schema)
{
    const members = [];
    const className = schema.className;
    for (const { entry } of schema.declarations)
    {
        if (entry.type?.structure !== undefined)
        {
            throw new TypeError(className + "." + entry.name + ": inline structure layouts are removed");
        }
        if (!entry.struct) continue;
        const { dataType, offset } = entry.struct;
        const storage = STRUCT_TYPES[dataType];
        const fail = reason => { throw new TypeError(className + "." + entry.name + ": " + reason); };
        if (!storage) fail("unsupported structure data type " + dataType);
        const [kind, wireType, width, alignment] = storage;
        if (!Number.isSafeInteger(offset) || offset < 0) fail("struct offset must be a non-negative integer");
        if (!Number.isSafeInteger(schema.structureSize) || schema.structureSize <= 0) fail("struct requires a positive integer size");
        if (offset % alignment) fail("misaligned struct offset for " + dataType);
        if (offset + width > schema.structureSize) fail("struct member ends outside size");
        if (entry.role !== "member") fail("struct storage must be a member");
        if (entry.type && !(dataType === "FLOAT32_4" && ["color", "quat"].includes(entry.type.kind)))
        {
            fail("incompatible or repeated schema type " + entry.type.kind + " for " + dataType);
        }
        if (entry.enum && !["uint32", "int32", "uint16", "int16", "uint8", "int8"].includes(kind))
        {
            fail("enum requires integer struct storage");
        }
        entry.type ||= { kind };
        members.push({ name: entry.name, offset, dataType,
            type: entry.type.kind === "quat" ? "quaternion" : entry.type.kind === "color" ? "color" : wireType,
            width });
    }
    if (!members.length)
    {
        if (Object.hasOwn(schema, "structureSize")) throw new TypeError(className + ".<struct>: struct requires members");
        return;
    }
    members.sort((left, right) => left.offset - right.offset);
    let end = 0;
    for (const member of members)
    {
        if (member.offset < end) throw new TypeError(className + "." + member.name + ": overlapping struct members");
        end = member.offset + member.width;
    }
    schema.structureDefinition = {
        name: className, size: schema.structureSize,
        members: members.map(({ width, ...member }) => member),
        boundaries: members.map(member => member.offset + member.width)
    };
    refreshLegacyFields(schema);
}

function captureFieldInitialDefault(Constructor, fieldName, initialValue, declarationMetadata = null)
{
    if (typeof Constructor !== "function") return;
    const field = findValuesDeclaration(Constructor, fieldName, true);
    if (field?.type?.runtimeOnly === true) return;

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
            value: deepFreezeDefaultValue(snapshotSchemaDefault(initialValue, new WeakSet(), field?.type)),
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
    if (memo && memo.generation === SCHEMA_GENERATION
        && memo.registrationRevision === getClassRegistrationRevision()) return memo.defaults;

    let fields = getEffectiveFields(Constructor).filter(field => field.type?.runtimeOnly !== true
        && findValuesDeclaration(Constructor, field.name)?.type?.runtimeOnly !== true);
    let captured = FIELD_INITIAL_DEFAULTS.get(Constructor);
    let instance = null;

    if (fields.some(field => !captured?.has(field.name)))
    {
        try
        {
            // A bare constructor runs JavaScript field/constructor setup only.
            // Mapped initialization is driven by the shared reader, not by
            // `new`, and is deliberately absent from this operation.
            instance = new Constructor();
        }
        catch (err)
        {
            const className = CjsSchema.getClassName(Constructor) || "<unregistered>";
            throw new TypeError(
                `CjsSchema.getDefaults could not construct ${className} with zero arguments: ` +
                `${err instanceof Error ? err.message : String(err)}`,
                { cause: err }
            );
        }
        fields = getEffectiveFields(Constructor).filter(field => field.type?.runtimeOnly !== true
            && findValuesDeclaration(Constructor, field.name)?.type?.runtimeOnly !== true);
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
            value = snapshotSchemaDefault(instance[field.name], new WeakSet(), field.type);
            // Directly registered schema accessors are explicit declarations
            // too. Their getter is the only authoritative default source even
            // though the property lives on the prototype rather than as an
            // own field (for example two Blue names sharing one color buffer).
            hasValue = field.name in instance;
        }

        if (!hasValue)
        {
            value = snapshotSchemaDefault(defaultValueForCarbonField(field), new WeakSet(), field.type);
        }
        defaults[field.name] = value;
    }

    const frozen = deepFreezeDefaultValue(defaults);
    DEFAULT_EXPORTS.set(Constructor, {
        generation: SCHEMA_GENERATION,
        registrationRevision: getClassRegistrationRevision(),
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

function snapshotSchemaDefault(value, active = new WeakSet(), type = null)
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
            return value.map(item => snapshotSchemaDefault(item, active, type?.itemType));
        }
        if (value instanceof Map)
        {
            return Object.fromEntries(Array.from(value.entries(), ([key, item]) => [
                String(key),
                snapshotSchemaDefault(item, active, type?.valueType)
            ]));
        }
        if (value instanceof Set)
        {
            return Array.from(value, item => snapshotSchemaDefault(item, active, type?.itemType));
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
                if (field.type?.runtimeOnly === true || findValuesDeclaration(Constructor, field.name)?.type?.runtimeOnly === true) continue;
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
                result[field.name] = snapshotSchemaDefault(fieldValue, active, field.type);
            }
            return result;
        }

        const result = {};
        for (const key of Object.keys(value))
        {
            const field = getRuntimeValueField(value, key, type);
            if (field?.type?.runtimeOnly === true) continue;
            result[key] = snapshotSchemaDefault(value[key], active, field?.type ?? (type?.kind === "map" ? type.valueType : null));
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
    for (const key of Object.keys(values))
    {
        const field = findValuesDeclaration(Constructor, key, true) || schema.byName.get(key);
        if (field?.type?.runtimeOnly === true) continue;
        const item = values[key];
        if (key === "_type" || key === "_id" || key === "_ref")
        {
            result[key] = cloneDefaultValue(item);
            continue;
        }

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
    if (typeof type === "function") return type;
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
    return typeof className === "function" ? className : className ? CjsSchema.GetConstructor(className) : null;
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

function settingDecorator(name, { applies = SETTING_APPLIES.ALWAYS, enum: enumType = null, values = null } = {})
{
    if (typeof name !== "string" || !name)
    {
        throw new TypeError("CjsSchema.edit.setting requires a setting name.");
    }
    if (!Object.values(SETTING_APPLIES).includes(applies))
    {
        throw new TypeError(`CjsSchema.edit.setting "${name}": applies must be edit.setting.ALWAYS, CREATE or LOAD.`);
    }
    if (enumType !== null && values !== null)
    {
        throw new TypeError(`CjsSchema.edit.setting "${name}": give enum or values, not both.`);
    }
    if (values !== null && !Array.isArray(values))
    {
        throw new TypeError(`CjsSchema.edit.setting "${name}": values must be an array.`);
    }
    const carbon = CARBON_SETTING_NAMES.has(name);
    const value = { setting: { name, applies, enum: enumType, values, carbon } };

    return describeDecorator(function schemaSettingDecorator(_, context)
    {
        if (context?.kind !== "field" || !context.static)
        {
            throw new TypeError(`CjsSchema.edit.setting "${name}" only describes a static class field.`);
        }

        // A static field's returned initializer runs once, at class
        // definition, with the class as `this`.
        return function initializeSetting(initialValue)
        {
            // The same class loaded twice (two bundles) describes it again;
            // the later copy is the one in use. A second field is a mistake.
            const entry = { name, owner: this, key: context.name, applies, enum: enumType, values, carbon };
            const index = SETTINGS.findIndex(existing => existing.name === name);
            if (index >= 0 && SETTINGS[index].key !== entry.key)
            {
                throw new TypeError(`CjsSchema.edit.setting "${name}" is described on two fields.`);
            }
            if (index >= 0) SETTINGS[index] = entry;
            else SETTINGS.push(entry);
            getOrCreateClassSchema(this).settings.push(entry);
            return initialValue;
        };
    }, "carbon", value);
}

/** A named custom type is meaningful only when a format explicitly handles it. */
function requireTypeName(name)
{
    if (typeof name !== "string" || !name.trim()) throw new TypeError("meta.type.custom requires a nonempty name.");
    return name.trim();
}

/** Retains all namespaces in both Stage-3 and imperative field declarations. */
function combinedFieldDecorator(definition)
{
    const parts = Object.entries(definition).map(([namespace, value]) => ({ namespace, value }));
    const decorators = parts.map(({namespace, value}) => fieldDecorator(namespace, value));
    const combined = (target, context) =>
    {
        const initializers = decorators.map(decorator => decorator(target, context)).filter(value => typeof value === "function");
        if (initializers.length) return function (value)
        {
            for (const initialize of initializers) value = initialize.call(this, value);
            return value;
        };
    };
    Object.defineProperty(combined, DECORATOR_METADATA, { value: { parts } });
    return combined;
}

function fieldDecorator(namespace, value)
{
    return describeDecorator(function schemaFieldDecorator(targetOrValue, contextOrFieldName)
    {
        if (contextOrFieldName && typeof contextOrFieldName === "object")
        {
            const context = contextOrFieldName;

            // A getter, setter or accessor declares a live property. Its metadata is
            // recorded at definition like a field's, and it has no initial value
            // to capture.
            if (context.kind === "getter" || context.kind === "setter" || context.kind === "accessor")
            {
                recordStage3FieldMetadata(context, namespace, value);
                return undefined;
            }
            if (context.kind !== "field") throw new TypeError("CjsSchema decorators only support class fields and accessors.");
            recordStage3FieldMetadata(context, namespace, value);

            // Registration (`define`) replays the Stage-3 metadata recorded
            // above, so a registered class's table is complete before any
            // instance exists. The per-instance initializers below are the
            // fallback for a class that never registers; for a registered one
            // they would only restate what registration already consumed.
            context.addInitializer(function initializeSchemaField()
            {
                if (!isRegisteredClass(this.constructor)) defineFieldMetadata(this.constructor, context.name, namespace, value, { kind: context.kind });
            });

            return function initializeSchemaFieldValue(initialValue)
            {
                if (!isRegisteredClass(this.constructor)) defineFieldMetadata(this.constructor, context.name, namespace, value, { kind: context.kind });
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
            const normalized = normalizeClassDefinition(value, definition);
            registerStage3FieldMetadata(value, context.metadata);
            defineClassMetadata(value, normalized);
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

/**
 * Whether a function's source still carries the names it was written with.
 *
 * A minifier renames parameters to one or two characters, so `(context)`
 * arrives as `(t)` and any assertion about the NAME becomes an assertion about
 * the build. There is no way to tell a minified name from a wrongly chosen one
 * by inspection, so the only sound thing is to stop asking once the names are
 * gone - which a parameter list of nothing but short identifiers says plainly.
 *
 * @param {string} parameterList Source from the opening parenthesis.
 * @returns {boolean} True when at least one parameter kept a real name.
 */
function hasReadableParameterNames(parameterList)
{
    const close = parameterList.indexOf(")");
    const declared = close === -1 ? parameterList : parameterList.slice(0, close);

    return /[A-Za-z_$][\w$]{2,}/u.test(declared);
}

function assertContextFirstMethod(fn, methodName)
{
    if (typeof fn !== "function")
    {
        return;
    }

    const source = String(fn);
    const parameterList = source.slice(source.indexOf("("));

    // Arity is the contract and holds in any build: a contextual method that
    // takes nothing cannot have been given a context.
    if (fn.length < 1)
    {
        throw new TypeError(
            `CjsSchema.carbon.contextual method "${String(methodName)}" must take a context as its first parameter.`
        );
    }

    // The NAME is an authoring convention, and it is only checkable while the
    // names exist. Asserting it against a minified bundle threw on every
    // contextual method in the shipped build and took the engine down at load
    // - the failure is the assertion's, not the code's.
    if (!hasReadableParameterNames(parameterList)) return;

    if (!CONTEXT_FIRST_PARAMETER.test(parameterList))
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

            recordStage3MethodMetadata(context, namespace, value);

            // As for fields: registration replays the record above, and the
            // initializer is the fallback for a class that never registers.
            context.addInitializer(function initializeSchemaMethod()
            {
                const Constructor = context.static ? this : this.constructor;
                if (!isRegisteredClass(Constructor)) defineMethodMetadata(Constructor, context.name, namespace, value);
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
            return [ "field", "getter", "setter", "accessor" ].includes(contextOrMemberName.kind)
                ? forFields(targetOrValue, contextOrMemberName)
                : forMethods(targetOrValue, contextOrMemberName);
        }

        // Legacy (non-2023-11) path: a method target resolves to a function
        // on the prototype; anything else is treated as a field.
        return targetOrValue && contextOrMemberName && typeof findPropertyDescriptor(targetOrValue, contextOrMemberName)?.value === "function"
            ? forMethods(targetOrValue, contextOrMemberName)
            : forFields(targetOrValue, contextOrMemberName);
    }, namespace, value);
}

/** Finds an accessor without evaluating it. */
function findPropertyDescriptor(target, key)
{
    for (let current = target; current; current = Object.getPrototypeOf(current))
    {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor) return descriptor;
    }
    return null;
}

function declarationDecorator(role, name, options = {})
{
    const declaration = { role };
    if (name !== undefined) declaration.name = name;
    if (Object.hasOwn(options, "index")) declaration.index = options.index;
    validateDeclaration({ name: name === undefined ? "<field>" : name, key: "<field>", ...declaration });
    return fieldDecorator("declaration", declaration);
}

function validateDeclaration(entry)
{
    for (const key of [ "name", "key" ])
    {
        if (typeof entry[key] !== "string" || !entry[key].trim())
        {
            throw new TypeError(`CjsSchema declaration ${key} must be a non-empty string.`);
        }
    }
    if (entry.role !== "member" && entry.role !== "property")
    {
        throw new TypeError('CjsSchema declaration role must be "member" or "property".');
    }
    if (Object.hasOwn(entry, "index") && (!Number.isSafeInteger(entry.index) || entry.index < 0))
    {
        throw new TypeError("CjsSchema declaration index must be a nonnegative safe integer.");
    }
    return entry;
}

function inferredDeclarationRole(Constructor, key, kind)
{
    if (kind) return [ "getter", "setter", "accessor" ].includes(kind) ? "property" : "member";
    // A class field may shadow an inherited accessor. Only an accessor owned
    // by this class establishes its role without an explicit declaration.
    const descriptor = Object.getOwnPropertyDescriptor(Constructor.prototype, key);
    return descriptor && (descriptor.get || descriptor.set) ? "property" : "member";
}

function declarationIdentity(entry)
{
    return JSON.stringify([ entry.key, entry.name, Object.hasOwn(entry, "index") ? entry.index : null ]);
}

function declarationMap(schema, role)
{
    return role === "member" ? schema.membersByIdentity : schema.propertiesByIdentity;
}

function applyDeclarationNamespace(entry, namespace, value)
{
    if (namespace === "declaration")
    {
        for (const key of [ "name", "role", "index" ])
        {
            if (Object.hasOwn(value, key)) entry[key] = value[key];
        }
    }
    else
    {
        entry[namespace] = mergeNamespace(entry[namespace], value);
    }
    return validateDeclaration(entry);
}

/** The compatibility view retains JS-key lookup and never serves native readers. */
function refreshLegacyFields(schema)
{
    schema.fields = schema.declarations.filter(record => record.legacy).map(({ entry }) =>
    {
        const field = { name: entry.key };
        for (const [ namespace, value ] of Object.entries(entry))
        {
            if ([ "name", "key", "role", "index", "declaringClass" ].includes(namespace)) continue;
            field[namespace] = value;
        }
        return field;
    });
    schema.fieldsByName = new Map(schema.fields.map(field => [ field.name, field ]));
}

function defineFieldMetadata(Constructor, fieldName, namespace, value, options = {})
{
    RejectAfterRegistration(Constructor, `field "${String(fieldName)}"`);
    const schema = getOrCreateClassSchema(Constructor);
    let record = schema.legacyDeclarationsByKey.get(fieldName);
    const before = record?.entry;
    const entry = before ? { ...before } : {
        name: fieldName,
        key: fieldName,
        role: inferredDeclarationRole(Constructor, fieldName, options.kind),
        declaringClass: Constructor
    };
    applyDeclarationNamespace(entry, namespace, value);
    const identity = declarationIdentity(entry);
    const targetMap = declarationMap(schema, entry.role);
    const collision = targetMap.get(identity);
    if (collision && collision !== record)
    {
        throw new TypeError(`CjsSchema has duplicate ${entry.role} declaration "${entry.name}" for ${entry.key}.`);
    }
    if (record)
    {
        declarationMap(schema, before.role).delete(declarationIdentity(before));
        record.entry = entry;
    }
    else
    {
        record = { entry, legacy: true };
        schema.declarations.push(record);
        schema.legacyDeclarationsByKey.set(fieldName, record);
    }
    targetMap.set(identity, record);
    refreshLegacyFields(schema);
    SCHEMA_GENERATION += 1;
}

/** Complete native declarations do not invent a lossy JS-keyed legacy field. */
function defineCanonicalDeclaration(Constructor, definition, role)
{
    RejectAfterRegistration(Constructor, `${role} "${definition.name}"`);
    const schema = getOrCreateClassSchema(Constructor);
    const entry = {
        name: definition.name,
        key: definition.key,
        role,
        declaringClass: Constructor,
        ...(Object.hasOwn(definition, "index") ? { index: definition.index } : {})
    };
    for (const [ namespace, value ] of Object.entries(definition.metadata))
    {
        if ([ "name", "key", "role", "index", "declaringClass" ].includes(namespace))
        {
            throw new TypeError(`CjsSchema ${namespace} is reserved declaration identity, not a metadata namespace.`);
        }
        applyDeclarationNamespace(entry, namespace, value);
    }
    validateDeclaration(entry);
    if (entry.role !== role) throw new TypeError(`CjsSchema ${role} input cannot declare a ${entry.role}.`);
    const map = declarationMap(schema, role);
    const identity = declarationIdentity(entry);
    if (map.has(identity))
    {
        throw new TypeError(`CjsSchema has duplicate ${role} declaration "${entry.name}" for ${entry.key}.`);
    }
    const record = { entry, legacy: false };
    schema.declarations.push(record);
    map.set(identity, record);
    SCHEMA_GENERATION += 1;
}

/** All native occurrences, derived class first; no cross-owner/name merging. */
function getCanonicalDeclarations(Constructor, role)
{
    const schema = CLASS_SCHEMA.get(Constructor);
    if (schema?.registered) return role === "member" ? schema.effectiveMembers : schema.effectiveProperties;
    const hidden = computeHiddenInheritedFieldNames(Constructor);
    const declarations = [];
    for (const current of getSchemaLineage(Constructor).reverse())
    {
        for (const record of CLASS_SCHEMA.get(current).declarations)
        {
            const { entry } = record;
            if (entry.role !== role || hidden.has(entry.key)) continue;
            let inheritedType;
            if (record.legacy && !entry.type)
            {
                for (const Parent of getSchemaLineage(Object.getPrototypeOf(current)).reverse())
                {
                    const inherited = CLASS_SCHEMA.get(Parent).declarations.find(({ entry: candidate }) =>
                        candidate.key === entry.key && candidate.role === entry.role && candidate.index === entry.index);
                    if (!inherited) continue;
                    if (inherited.entry.type) inheritedType = inherited.entry.type;
                    // Explicit declarations are complete; never borrow through
                    // one to invent metadata for an older declaration.
                    if (inheritedType || !inherited.legacy) break;
                }
            }
            declarations.push(inheritedType ? { ...entry, type: inheritedType } : entry);
        }
    }
    return declarations;
}

function defineClassMetadata(Constructor, definition)
{
    if (isRegisteredClass(Constructor))
    {
        throw new TypeError(`CjsSchema.define: ${CLASS_SCHEMA.get(Constructor).className} is already registered.`);
    }

    // The decorators recorded this class's members, and those of any ancestor
    // that never registers itself, on the classes' decorator metadata.
    // Consumed here, so the table built below is complete.
    consumeLineageDecoratorMetadata(Constructor);

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
    if (definition.struct) schema.structureSize = definition.struct.size;
    if (definition.family) schema.family = definition.family;
    if (definition.purpose) schema.purpose = definition.purpose;
    if (definition.sourceClass) schema.sourceClass = definition.sourceClass;
    if (definition.carbon) schema.carbon = definition.carbon;
    if (definition.modelledOn) schema.modelledOn = definition.modelledOn;
    if (definition.aliases) schema.aliases = [...definition.aliases];
    if (Object.hasOwn(definition, "abstract")) schema.abstract = definition.abstract;

    for (const field of definition.fields || [])
    {
        defineManualMemberMetadata(Constructor, "fields", field);
    }

    for (const member of definition.members || []) defineCanonicalDeclaration(Constructor, member, "member");
    for (const property of definition.properties || []) defineCanonicalDeclaration(Constructor, property, "property");

    for (const method of definition.methods || [])
    {
        defineManualMemberMetadata(Constructor, "methods", method);
    }

    buildStructureDefinition(schema);
    registerClassMetadata(Constructor, schema);
    sealClassSchema(Constructor, schema);
}

/**
 * Builds a registered class's flattened member table, once: Carbon's
 * `BlueRttiType`, built from the class's `ClassInfo` and cached on it
 * (`blueexposure/BlueClasses.cpp:586-593`). Every later lookup reads it, and
 * any later change to the class's members is an error (`defineMemberMetadata`).
 * The base class registered first, because the subclass's module imports it.
 */
function sealClassSchema(Constructor, schema)
{
    const fields = computeEffectiveFields(Constructor);

    schema.effectiveMembers = getCanonicalDeclarations(Constructor, "member");
    schema.effectiveProperties = getCanonicalDeclarations(Constructor, "property");
    schema.effectiveFields = fields;
    schema.effectiveFieldsByName = new Map(fields.map(field => [ field.name, field ]));
    schema.effectiveMethodsByName = computeEffectiveMethods(Constructor);
    schema.hiddenInheritedAll = computeHiddenInheritedFieldNames(Constructor);
    schema.registered = true;
    SCHEMA_GENERATION += 1;
}

/**
 * A class's method provenance by name, its own merged over its ancestors':
 * an inherited method reports the provenance of the class that declares it.
 */
function computeEffectiveMethods(Constructor)
{
    const byName = new Map();

    for (const current of getSchemaLineage(Constructor))
    {
        for (const method of CLASS_SCHEMA.get(current)?.methods || [])
        {
            const existing = byName.get(method.name);
            byName.set(method.name, mergeMemberMetadata(existing ? { ...existing } : { name: method.name }, method));
        }
    }

    return byName;
}

/** Whether a class has registered, which fixes its member table. */
function isRegisteredClass(Constructor)
{
    return CLASS_SCHEMA.get(Constructor)?.registered === true;
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
    // Fields are flattened into the table registration built, so a late field
    // is refused. Method provenance is not flattened: `getMethod` reads the
    // class's own map, so a late one (an interface's `decorateMethod` calls
    // after its `define`) changes nothing already built.
    if (listKey === "fields") RejectAfterRegistration(Constructor, `field "${String(name)}"`);
    SCHEMA_GENERATION += 1;

    const schema = getOrCreateClassSchema(Constructor);
    let item = schema[mapKey].get(name);

    if (!item)
    {
        item = { name };
        schema[listKey].push(item);
        schema[mapKey].set(name, item);
    }

    item[namespace] = mergeNamespace(item[namespace], value);

    // A method arriving after registration also reaches the class's
    // flattened provenance map (subclasses registered since do not see it).
    if (listKey === "methods" && schema.registered)
    {
        const effective = schema.effectiveMethodsByName.get(name);
        schema.effectiveMethodsByName.set(name, mergeMemberMetadata(effective ? { ...effective } : { name }, item));
    }
}

function defineHiddenInheritedFields(Constructor, fieldNames)
{
    if (typeof Constructor !== "function")
    {
        throw new TypeError("CjsSchema.hideInherited requires a class constructor.");
    }

    RejectAfterRegistration(Constructor, "hidden inherited fields");
    SCHEMA_GENERATION += 1;

    const Parent = Object.getPrototypeOf(Constructor);
    const inherited = [ ...getCanonicalDeclarations(Parent, "member"), ...getCanonicalDeclarations(Parent, "property") ];
    const inheritedFields = new Set(getEffectiveFields(Parent).map(field => field.name));
    for (const entry of inherited) inheritedFields.add(entry.key);
    const resolvedKeys = new Set();
    // Declared name only: Constructor.name does not survive minification, and a
    // mangled name in an error reads as a real one and sends you chasing it.
    const className = CLASS_SCHEMA.get(Constructor)?.className || "<undeclared>";

    for (const fieldName of fieldNames)
    {
        // Existing callers name JS keys. An exposed name is an alias only when
        // it is not itself a JS key, and then selects every matching key.
        const keys = inheritedFields.has(fieldName)
            ? [ fieldName ]
            : inherited.filter(entry => entry.name === fieldName).map(entry => entry.key);
        if (!keys.length)
        {
            throw new TypeError(
                `CjsSchema.hideInherited cannot hide "${fieldName}" on ${className}: ` +
                "the parent schema does not expose that field."
            );
        }
        for (const key of keys) resolvedKeys.add(key);
    }

    const schema = getOrCreateClassSchema(Constructor);
    for (const key of resolvedKeys) schema.hiddenInherited.add(key);
}

// The state-free transport's import. A declared REFERENCE field - model or
// objectRef, or a list or Map of them - treats a non-plain object as the
// reference itself and assigns it, Carbon's IRoot* member (operator ruling,
// 2026-09-14). The DECLARED TYPE decides that the field holds references; the
// value's class is never inspected. Plain bags, and every other field kind,
// import by value exactly as before.
function importDeclaredValue(value, field)
{
    const type = field.type;
    value = omitRuntimeValues(value, type);
    switch (type?.kind)
    {
        case "model":
        case "objectRef":
            if (isObjectReference(value)) return value;
            break;
        case "list":
        case "array":
            if (Array.isArray(value) && isReferenceType(type.itemType))
            {
                return value.map(item => isObjectReference(item) ? item : cloneCarbonValue(item));
            }
            break;
        case "map":
            if (value instanceof Map && isReferenceType(type.valueType))
            {
                return new Map(Array.from(value, ([ key, item ]) =>
                    [ key, isObjectReference(item) ? item : cloneCarbonValue(item) ]));
            }
            break;
    }
    return normalizeCarbonValue(value, type);
}

// Values select a declaration before applying its runtime-only exclusion.
// Keep this schema-local: schema transports cannot depend on Blue readers.
function findValuesDeclaration(Constructor, name, storage = false)
{
    if (typeof Constructor !== "function") return null;
    const info = CjsSchema.getSchema(Constructor);
    let selected = VALUES_DECLARATIONS.get(info);
    if (!selected)
    {
        selected = new Map();
        for (let owner = Constructor; typeof owner === "function"; owner = Object.getPrototypeOf(owner))
        {
            for (const fields of [info.members, info.properties])
            {
                for (const field of fields)
                {
                    if (field.declaringClass === owner && !selected.has(field.name)) selected.set(field.name, field);
                }
            }
        }
        VALUES_DECLARATIONS.set(info, selected);
    }
    if (selected.has(name)) return selected.get(name);
    for (const field of selected.values())
    {
        const aliases = field.aliases ?? (field.alias === undefined ? [] : [field.alias]);
        if ((Array.isArray(aliases) ? aliases : [aliases]).includes(name)) return field;
    }
    if (storage)
    {
        for (const field of selected.values())
        {
            if (field.key === name && field.index === undefined) return field;
        }
    }
    return null;
}

function getRuntimeValueField(value, key, type)
{
    const Constructor = isPlainObject(value)
        ? (typeof value._type === "string" && CjsSchema.GetConstructor(value._type)) || resolveDeclaredConstructor(type)
        : value.constructor;
    return findValuesDeclaration(Constructor, key, true);
}

/**
 * Internal reader helper: removes declared runtime fields from plain values.
 * Leaves scalar coercion, live references and unchanged containers untouched.
 * @param {*} value Incoming value.
 * @param {*} type Declared field type.
 * @returns {*} The original value, or a copy with runtime fields omitted.
 */
export function omitRuntimeValues(value, type)
{
    const kind = type?.kind;
    const declared = resolveDeclaredConstructor(type);
    if (!declared && !["array", "list", "map", "set"].includes(kind)) return value;
    if (["array", "list", "set"].includes(kind) && (Array.isArray(value) || value instanceof Set))
    {
        let changed = false;
        const entries = Array.from(value, item => {
            const next = omitRuntimeValues(item, type.itemType);
            changed ||= next !== item;
            return next;
        });
        return changed ? value instanceof Set ? new Set(entries) : entries : value;
    }
    if (kind === "map" && value instanceof Map)
    {
        let changed = false;
        const entries = Array.from(value, ([key, item]) => {
            const next = omitRuntimeValues(item, type.valueType);
            changed ||= next !== item;
            return [key, next];
        });
        return changed ? new Map(entries) : value;
    }
    if (!isPlainObject(value)) return value;
    // cloneCarbonValue treats opaque source-shaped carriers as references.
    if (typeof value._sourceClassName === "string") return value;
    const Constructor = (typeof value._type === "string" && CjsSchema.GetConstructor(value._type)) || declared;
    let descriptors = null;
    for (const key of Object.keys(value))
    {
        const field = findValuesDeclaration(Constructor, key, true);
        if (field?.type?.runtimeOnly === true)
        {
            descriptors ||= Object.getOwnPropertyDescriptors(value);
            delete descriptors[key];
            continue;
        }
        const childType = field?.type ?? (kind === "map" ? type.valueType : null);
        if (!hasRuntimeValuesType(childType)) continue;
        const item = value[key];
        const next = omitRuntimeValues(item, childType);
        if (next === item) continue;
        descriptors ||= Object.getOwnPropertyDescriptors(value);
        descriptors[key] = { value: next, writable: true, enumerable: true, configurable: true };
    }
    return descriptors ? Object.create(Object.getPrototypeOf(value), descriptors) : value;
}

function hasRuntimeValuesType(type, seen = new Set())
{
    if (type?.runtimeOnly === true) return true;
    if (["array", "list", "set", "map"].includes(type?.kind))
    {
        return hasRuntimeValuesType(type.valueType ?? type.itemType, seen);
    }
    const Constructor = resolveDeclaredConstructor(type);
    if (!Constructor || seen.has(Constructor)) return false;
    seen.add(Constructor);
    const info = CjsSchema.getSchema(Constructor);
    return [...info.members, ...info.properties].some(field =>
        findValuesDeclaration(Constructor, field.name) === field && hasRuntimeValuesType(field.type, seen));
}

// A declared item type that holds references: a model or objectRef
// descriptor, or a bare name registered as a class. "string" and "unknown"
// are not registered, so they stay values.
function isReferenceType(type)
{
    if (typeof type === "string") return CjsSchema.GetConstructor(type) !== null;
    return type?.kind === "model" || type?.kind === "objectRef";
}

// Not a values bag: an object that is neither plain, an array nor a typed
// array. Asks only what the value is made of, never which class built it.
function isObjectReference(value)
{
    return value !== null && typeof value === "object" && !isPlainObject(value)
        && !Array.isArray(value) && !ArrayBuffer.isView(value);
}

/**
 * A class's flattened field records, base first: the table registration built,
 * or for a class that never registered, the lineage merged now.
 */
function getEffectiveFields(Constructor)
{
    const schema = CLASS_SCHEMA.get(Constructor);
    return schema?.registered ? schema.effectiveFields : computeEffectiveFields(Constructor);
}

/** The lineage walk and merge a registered class does once, at `sealClassSchema`. */
function computeEffectiveFields(Constructor)
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

    // Enum chooser metadata carries the same ENUM fact as Blue's flag.
    // Keep it visible under edit for comparisons without duplicating annotations.
    for (const field of ordered)
    {
        if (field.enum) field.edit = { ...field.edit, enum: true };
    }
    return ordered.filter(field => !hidden.has(field.name));
}

function getHiddenInheritedFieldNames(Constructor)
{
    const schema = CLASS_SCHEMA.get(Constructor);
    return schema?.registered ? schema.hiddenInheritedAll : computeHiddenInheritedFieldNames(Constructor);
}

function computeHiddenInheritedFieldNames(Constructor)
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
        // A new declared type replaces the resource fact; edit-only overrides
        // continue to inherit their original type and its marker.
        if (namespace === "type" && value?.kind && !Object.hasOwn(value, "runtimeOnly"))
        {
            delete target[namespace].runtimeOnly;
        }
    }
    return target;
}

/**
 * The per-class record `getSchema()` returns - the `Be::ClassInfo` analog,
 * named CjsClassInfo (audit ruling 8, 2026-09-05). A typedef rather than an
 * exported class: the record is shared read-only data consumed by tooling as
 * plain JSON; promote to a real class only if facade-era accessors earn it.
 *
 * @typedef {object} CjsClassInfo
 * @property {string|null} className Registered serialized class name.
 * @property {Array<object>} fields Compatibility metadata merged by JS key, base class first.
 * @property {Array<object>} members Stored declarations, derived class first, without name merging.
 * @property {Array<object>} properties Live declarations, derived class first, without name merging.
 * @property {Array<object>} [methods] Method provenance metadata.
 * @property {string} [family] Registered schema family.
 * @property {object} [structureDefinition] Native struct offsets and stride. @impl JavaScript class-info extension.
 * @property {boolean} [abstract] This class's explicit registration policy, never inherited. Existing name registrations may retain another factory.
 */
function buildClassInfo(Constructor, namespaces)
{
    const schema = CLASS_SCHEMA.get(Constructor);
    const fields = [];
    const methods = [];

    for (const field of getEffectiveFields(Constructor))
    {
        fields.push(enrichEnumField(exportField(field, namespaces), Constructor));
    }

    // Methods are exported from this class only, while fields resolve through
    // the whole lineage above: a subclass's export lists the methods it
    // declares, not those it inherits. Registration consumes each class's own
    // decorator metadata, so the list is the same before and after any instance
    // exists. `getMethod` answers for inherited methods too, from the
    // flattened map registration builds (`computeEffectiveMethods`).
    //
    // Left own-only deliberately: nothing reads .methods off a runtime schema
    // today (tools-core classTool parses source documents, not these), and
    // flattening here changes exported schemas for every decorator-using class
    // in the org.
    for (const method of schema?.methods || [])
    {
        methods.push(exportField(method, namespaces));
    }

    const result = {
        className: CjsSchema.getClassName(Constructor),
        fields,
        members: getCanonicalDeclarations(Constructor, "member").map(entry =>
            enrichEnumField(exportCanonicalDeclaration(entry, namespaces), entry.declaringClass)),
        properties: getCanonicalDeclarations(Constructor, "property").map(entry =>
            enrichEnumField(exportCanonicalDeclaration(entry, namespaces), entry.declaringClass))
    };

    if (schema?.structureDefinition) result.structureDefinition = schema.structureDefinition;

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

    if (schema?.carbon)
    {
        result.carbon = schema.carbon;
    }

    if (schema?.modelledOn)
    {
        result.modelledOn = schema.modelledOn;
    }

    if (schema?.aliases?.length)
    {
        result.aliases = [ ...schema.aliases ];
    }

    if (typeof schema?.abstract === "boolean") result.abstract = schema.abstract;

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
        // A collection of values (strings, numbers, vectors, matrices) holds no
        // model; an instance-transform array would otherwise cost a visit per
        // matrix. Items naming a class, or an interface nothing registers,
        // stay traversable.
        if (MANY_KINDS.has(kind) && isValueItemType(type.itemType)) continue;

        const entry = { name: field.name, many: MANY_KINDS.has(kind) };

        if (type && resolveFieldClass(type)?.isResource === true)
        {
            resources.push(entry);
            continue;
        }

        entry.owned = field.lifecycle?.ownership === "owned";
        children.push(entry);
    }

    schema.byName = byName;
    schema.children = children;
    schema.resources = resources;
}


// Kinds an item may resolve to that hold no model: every Carbon kind except
// the object-bearing ones and "unknown".
const NON_VALUE_KINDS = new Set([ ...MODEL_KINDS, "unknown", "enum" ]);

/**
 * Whether a collection's declared item type is a value, not an object: a
 * Carbon kind by name ("uint32", "mat4") or a C++ spelling of one
 * ("std::string", "uint32_t"). An unresolved name is not a value - it is
 * usually an interface ("ITr2ValueBinding") whose items are objects.
 */
function isValueItemType(itemType)
{
    if (!itemType) return false;
    if (typeof itemType === "object") return !NON_VALUE_KINDS.has(itemType.kind);
    if (typeof itemType !== "string" || getRegisteredConstructor(itemType)) return false;
    return !NON_VALUE_KINDS.has(getCarbonTypeDefinition(itemType).kind)
        || !NON_VALUE_KINDS.has(inferCarbonTypeFromCpp(itemType).kind);
}


// Only string references survive normalization - type.struct(SomeClass) drops
// the reference entirely - so a field can only be bucketed when it names a
// class. The one field in the tree that named nothing was a missing
// declaration, not a deliberate escape.
function resolveFieldClass(type)
{
    const ref = type.className || type.itemType || type.valueType;
    return typeof ref === "string" && ref ? getRegisteredConstructor(ref) : null;
}


function getOrCreateClassSchema(Constructor)
{
    let schema = CLASS_SCHEMA.get(Constructor);
    if (!schema)
    {
        schema = {
            className: null,
            family: null,
            purpose: null,
            sourceClass: null,
            carbon: null,
            modelledOn: null,
            aliases: null,
            fields: [],
            fieldsByName: new Map(),
            declarations: [],
            legacyDeclarationsByKey: new Map(),
            membersByIdentity: new Map(),
            propertiesByIdentity: new Map(),
            hiddenInherited: new Set(),
            methods: [],
            methodsByName: new Map(),
            settings: []
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
        kind: context.kind,
        namespace,
        value
    });
}

/**
 * Refuses a change to a registered class's members. Registration built the
 * class's table and every subclass's table copied it, so a late change would
 * leave them disagreeing; it must be declared before `define`.
 */
function RejectAfterRegistration(Constructor, what)
{
    const schema = CLASS_SCHEMA.get(Constructor);
    if (!schema?.registered) return;

    throw new TypeError(
        `CjsSchema: ${what} added to ${schema.className} after it registered. ` +
        "Declare members before CjsSchema.define / @type.define runs."
    );
}

function recordStage3MethodMetadata(context, namespace, value)
{
    const metadata = context?.metadata;
    if (!metadata || typeof metadata !== "object") return;

    if (!Object.prototype.hasOwnProperty.call(metadata, STAGE3_METHOD_METADATA))
    {
        Object.defineProperty(metadata, STAGE3_METHOD_METADATA, {
            configurable: false,
            enumerable: false,
            value: [],
            writable: false
        });
    }

    metadata[STAGE3_METHOD_METADATA].push({ name: context.name, isStatic: context.static, namespace, value });
}

/**
 * Consumes the decorator metadata of a class and of every ancestor that has
 * not registered, base first, so a class registering below an unregistered
 * base still carries the base's members.
 */
function consumeLineageDecoratorMetadata(Constructor)
{
    const pending = [];
    let current = Constructor;

    while (typeof current === "function" && current !== Function.prototype)
    {
        if (current !== Constructor && isRegisteredClass(current)) break;
        pending.push(current);
        current = Object.getPrototypeOf(current);
    }

    for (const Class of pending.reverse())
    {
        const metadata = Object.prototype.hasOwnProperty.call(Class, DECORATOR_METADATA_KEY) ? Class[DECORATOR_METADATA_KEY] : null;
        registerStage3FieldMetadata(Class, metadata);
    }
}

function registerStage3FieldMetadata(Constructor, metadata)
{
    if (!metadata || typeof metadata !== "object") return;
    if (CONSUMED_DECORATOR_METADATA.has(metadata)) return;
    CONSUMED_DECORATOR_METADATA.add(metadata);

    if (Object.prototype.hasOwnProperty.call(metadata, STAGE3_METHOD_METADATA))
    {
        for (const method of metadata[STAGE3_METHOD_METADATA])
        {
            defineMethodMetadata(Constructor, method.name, method.namespace, method.value);
        }
    }

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
        defineFieldMetadata(Constructor, field.name, field.namespace, field.value, { kind: field.kind });
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
    if (Object.hasOwn(result, "abstract") && typeof result.abstract !== "boolean")
    {
        throw new TypeError("CjsSchema.define abstract must be a boolean when provided.");
    }
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
    // REPLICATES AND MODELLED ON ARE DIFFERENT CLAIMS, and only the first can
    // be checked. `carbon` names a class this one REPLICATES: same contract,
    // method for method, so a parity check may hold us to its whole surface.
    // `modelledOn` names a class this one TOOK ITS SHAPE FROM and does not
    // replicate - `CjsWebgpuWorkQueue` is modelled on `MetalWorkQueue`, whose
    // 113 methods are the entire command recorder against our 27, because the
    // rest of that surface lives on the pipeline, the resource set and the
    // render context here. Declaring the second as the first would report 101
    // absences as debt; declaring nothing leaves the class unchecked and its
    // provenance unrecorded.
    //
    // NEITHER IS `sourceClass`, which is SERIALIZATION identity - the name a
    // document calls this class on the wire (`CjsLightData`'s `"LightData"`).
    // A donor is not a wire name: writing `MetalWorkQueue` there would tell
    // dehydration the class serializes under that name.
    for (const [ key, what ] of [ [ "carbon", "replicates" ], [ "modelledOn", "is modelled on" ] ])
    {
        if (result[key] === undefined || result[key] === null) continue;

        if (typeof result[key] !== "string" || !result[key].trim())
        {
            throw new TypeError(`CjsSchema.define ${key} must be a non-empty Carbon class name when provided.`);
        }

        result[key] = result[key].trim();
        void what;
    }

    if (result.carbon && result.modelledOn)
    {
        throw new TypeError(
            "CjsSchema.define takes carbon or modelledOn, not both: a class either replicates its "
            + "donor's contract or is modelled on it, and the two are different claims."
        );
    }

    if (!result.sourceClass && result.className) result.sourceClass = result.className;
    const aliases = [
        ...(result.aliases === undefined ? [] : Array.isArray(result.aliases) ? result.aliases : [result.aliases]),
        ...(result.alias === undefined ? [] : Array.isArray(result.alias) ? result.alias : [result.alias])
    ].filter(alias => typeof alias === "string" && alias.trim()).map(alias => alias.trim())
        .filter(alias => alias !== result.className);
    result.aliases = aliases.length ? [...new Set(aliases)] : null;
    result.fields = normalizeManualMembers(result.fields, "fields");
    result.members = normalizeCanonicalDeclarations(result.members, "member");
    result.properties = normalizeCanonicalDeclarations(result.properties, "property");
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

/** Canonical arrays retain exposed names independently of JS keys and indexes. */
function normalizeCanonicalDeclarations(definitions, role)
{
    if (definitions === undefined || definitions === null) return [];
    const entries = Array.isArray(definitions)
        ? definitions.map(definition => {
            if (!isPlainObject(definition)) throw new TypeError(`CjsSchema ${role} declarations must be objects.`);
            const { name, key = name, index, role: declaredRole, ...metadata } = definition;
            if (declaredRole !== undefined && declaredRole !== role)
                throw new TypeError(`CjsSchema ${role} input cannot declare a ${declaredRole}.`);
            return { name, key, ...(Object.hasOwn(definition, "index") ? { index } : {}), metadata };
        })
        : isPlainObject(definitions)
            ? Object.entries(definitions).map(([ key, metadata ]) => ({ name: key, key, metadata }))
            : null;
    if (!entries) throw new TypeError(`CjsSchema ${role} declarations require an array or a JS-keyed object.`);
    return entries.map(entry => {
        validateDeclaration({ ...entry, role });
        const metadata = normalizeManualMember(entry.key, entry.metadata, "fields");
        delete metadata.name;
        return { ...entry, metadata };
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
            for (const part of decorator.parts ?? [decorator])
            {
                member[part.namespace] = mergeNamespace(member[part.namespace], part.value);
            }
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

    // BLUE_REGISTER_ABSTRACT_CLASS supplies a callable refusal factory, not
    // a null factory pointer. Flag 1 is DISABLE_PYTHON_CONSTRUCTION; the factory
    // determines Blue creation. Only this class's own definition selects it.
    const isAbstract = schema.abstract === true;
    const createFn = isAbstract ? ClassRegistrarNullFactory : undefined;
    const flags = isAbstract ? 1 : 0;
    for (const name of [ schema.className, ...(schema.aliases || []) ])
    {
        registerClass({ name, type: Constructor, createFn, flags });
    }
}

function defineEnumMetadata(values, schema)
{
    if (!values || typeof values !== "object" || !schema?.name) return;
    blueEnums.Register(schema.name, schema.type, schema);
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
    if (definition.exposure !== undefined) result.exposure = definition.exposure;
    if (definition.exposedName !== undefined) result.exposedName = definition.exposedName;
    if (definition.chooserSource !== undefined) result.chooserSource = definition.chooserSource;
    if (definition.chooser !== undefined) result.chooser = definition.chooser;

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
    if (Array.isArray(definition))
    {
        if (definition.length > 4 || definition.some(label => typeof label !== "string"))
            throw new TypeError("meta.ui.components requires up to four string labels.");
        definition = Object.fromEntries(definition.map((label, index) => ["xyzw"[index], label]));
    }
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
    if (enumType.includes("."))
    {
        const info = blueEnums.GetEnumInfo(enumType);
        return { ...exported, enum: {
            ...exported.enum, identity: info.name, members: info.type,
            ...(info.chooser === undefined ? {} : { chooser: info.chooser })
        } };
    }
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

/** Structural identity is never removed by a namespace projection. */
function exportCanonicalDeclaration(entry, namespaces)
{
    const result = { name: entry.name, key: entry.key, role: entry.role, declaringClass: entry.declaringClass };
    if (Object.hasOwn(entry, "index")) result.index = entry.index;
    for (const [ namespace, value ] of Object.entries(entry))
    {
        if ([ "name", "key", "role", "index", "declaringClass" ].includes(namespace)) continue;
        if (namespaces && !namespaces.has(namespace)) continue;
        result[namespace] = value;
    }
    if (entry.enum && (!namespaces || namespaces.has("edit"))) result.edit = { ...result.edit, enum: true };
    return result;
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

// Names what arrived where a values bag was required, for assertValues' error.
function describeValuesInput(value)
{
    if (value === undefined) return "undefined";
    if (Array.isArray(value)) return "an array";
    if (typeof value !== "object") return `a ${typeof value}`;
    // Arbitrary input: ours answers by registered name; anything unstamped is
    // a platform or caller type, whose constructor name is all there is.
    const name = value.constructor ? getRegisteredClassName(value.constructor) ?? value.constructor.name : null;
    return name ? `an instance of ${name}` : "an object without Object.prototype";
}

// Install provenance here, after the schema exists. The registry core cannot
// import schema: both Blue and schema need its storage during module loading.
CjsSchema.define(CjsBlueEnumRegistry, {
    className: "CjsBlueEnumRegistry",
    modelledOn: "BlueRegistration",
    family: "blue",
    fields: {},
    methods: Object.fromEntries([
        "Create", "Register", "Get", "Set", "GetValueName", "GetValueNameAsBitMask", "_Register",
        "RegisterEnum", "HasEnum", "GetEnum", "GetEnumInfo", "GetEnumName",
        "GetNameFromValue", "GetNameFromBitmask"
    ].map(name => [name, [CjsSchema.meta.adapted]]))
});
