import { CjsSchema } from "#schema/CjsSchema";
import { DictReader } from "../../global/blue/DictReader.js";
import { ICustomPersist } from "../../global/blue/ICustomPersist.js";
import { readDictionaryValue } from "../../global/blue/dictionaryDeclarations.js";
import { resolveHydrationAdapter } from "#schema/hydration";
import {
    CARBON_TYPE,
    normalizeCarbonTypeDescriptor,
    normalizeCarbonValue
} from "#schema/types";

import { CjsReader } from "./CjsReader.js";

/**
 * Shared output and hydration backend for Blue persistence readers.
 *
 * Transports retain framing, source buffers, reference-token parsing, member
 * decoding, skip/recovery behavior, and format-specific metadata. This backend
 * owns common payload/runtime targets, reference emission, hydration adapter
 * phases, reports, and finalization. It also provides reusable class/shape,
 * descriptor assignment, and normalization helpers for transports that resolve
 * persisted fields through a schema. Red does not opt into that descriptor
 * path yet and retains its lenient named-field behavior.
 *
 * Its two transports are `CjsBlackReader` (binary; keeps structure-list
 * parsing and skipping) and `CjsRedReader` (the YAML encoding of the Blue
 * graph; keeps anchors, aliases and typed tables). The generic `CjsYamlFormat`
 * does not use this backend. Readers are bound to one source and
 * garbage-collected, never disposed; each read entry point resets graph state
 * before walking the source again. Runtime hydration constructs a target when
 * its node is met, applies the node's values after its children are read, and
 * runs every `finalize` only once the whole graph exists.
 */
/**
 * A persisted member resolved against its owner, as passed to
 * `AssignRuntimeFieldValue` and `AssignPayloadFieldValue`.
 *
 * @typedef {object} CjsBlueFieldTarget
 * @property {boolean} [discard] Drop the value.
 * @property {boolean} [unknown] The member has no declared field.
 * @property {string} [wireName] Persisted member name, used when unknown.
 * @property {boolean} [indexed] The value goes into one slot of the field.
 * @property {number|string} [index] Slot index; an integer selects an array container.
 * @property {number|string} [key] Slot key written into the container.
 * @property {object} [field] Declared field descriptor, carrying `name`.
 */
export class CjsBlueReader extends CjsReader
{
    /**
     * Creates a CjsBlueReader over caller-provided resource bytes and reader
     * options.
     *
     * @param {object} [options={}] Reader options; also the hydration options.
     * @param {object} [options.schema] Schema used to build the shape map.
     * @param {object} [config={}] Transport configuration.
     * @param {object} [config.schemaRegistry] Schema registry for shapes.
     * @param {object} [config.defaultRegistry] Class registry used when options give none.
     * @param {boolean} [config.includeShapeContext] Pass the shape in runtime contexts.
     * @param {boolean} [config.includeSourceShape] Keep the source shape on fallback targets.
     * @param {boolean} [config.includeEmptyPayloadType] Emit the type field for empty kinds.
     * @param {boolean} [config.requirePayloadReferenceTarget] Always assign the reference ID.
     * @param {boolean} [config.includePayloadValuesField] Use a values field for sequence identity.
     * @param {boolean} [config.validatePayloadReservedFields] Reject payload field collisions.
     */
    constructor(options = {}, config = {})
    {
        super({ ...options });

        this.schemaRegistry = config.schemaRegistry || null;
        this.schemaShapes = this.schemaRegistry
            ? this.schemaRegistry.createShapeMap(options.schema)
            : new Map();
        this.defaultRegistry = config.defaultRegistry || null;
        this.includeShapeContext = Boolean(config.includeShapeContext);
        this.includeSourceShape = Boolean(config.includeSourceShape);
        this.includeEmptyPayloadType = Boolean(config.includeEmptyPayloadType);
        this.requirePayloadReferenceTarget = Boolean(config.requirePayloadReferenceTarget);
        this.includePayloadValuesField = Boolean(config.includePayloadValuesField);
        this.validatePayloadReservedFields = Boolean(config.validatePayloadReservedFields);
        this.payloadReservedFields = null;
        this.adapter = resolveHydrationAdapter(options);
        this.hydrationOptions = {
            ...options,
            skipUpdate: true,
            skipEvents: true
        };
        this.ResetBlueReadState();
    }

    /**
     * Clears blue read state before reusing the current Blue graph reader.
     */
    ResetBlueReadState()
    {
        this.reports = [];
        this.runtimeInstances = [];
    }

    /**
     * Finalizes runtime instances after the current Blue graph reader has been
     * read.
     */
    FinalizeRuntimeInstances()
    {
        for (const record of this.runtimeInstances)
        {
            this.adapter.finalize(
                record.instance,
                this.CreateRuntimeContext(record.kind, record.shape, false)
            );
        }
    }

    /**
     * Creates runtime target for the current Blue graph reader.
     *
     * @param {string} kind Persisted class name.
     * @param {object|null} [shape=null] Source shape for the class, when known.
     * @returns {object} The constructed runtime object, or a fallback carrier.
     */
    CreateRuntimeTarget(kind, shape = null)
    {
        const built = this.adapter.construct(
            kind,
            this.CreateRuntimeContext(kind, shape, true, this.options)
        );
        if (built !== undefined) return built;

        const ClassConstructor = this.ResolveClass(kind);
        if (ClassConstructor) return new ClassConstructor();

        return this.CreateRuntimeFallback(kind, shape);
    }

    /**
     * Creates runtime fallback for the current Blue graph reader.
     *
     * @param {string|null} kind Persisted class name.
     * @param {object|null} [shape=null] Source shape for the class, when known.
     * @returns {object} A plain carrier recording the source class.
     */
    CreateRuntimeFallback(kind, shape = null)
    {
        const target = { _sourceClassName: this.includeSourceShape ? kind : (kind || null) };
        if (this.includeSourceShape) target._sourceShape = shape || null;
        return target;
    }

    /**
     * Applies runtime values to the current Blue graph reader.
     *
     * @param {object} target Runtime object to populate.
     * @param {Object<string, *>} values Decoded member values by name.
     * @param {string} kind Persisted class name.
     * @param {object|null} [shape=null] Source shape for the class, when known.
     */
    ApplyRuntimeValues(target, values, kind, shape = null)
    {
        const context = this.CreateRuntimeContext(kind, shape, true, this.hydrationOptions);
        // The reader resolved the kind itself, so it asks the schema about THAT
        // class - does it declare fields to populate? - rather than leaving the
        // adapter to inspect the object. A fallback carrier (no class) and a
        // caller-supplied plain class both answer no, and keep raw assignment.
        context.declared = CjsSchema.getClassName(this.ResolveClass(kind)) !== null;
        if (context.declared)
        {
            // A binary block's bytes go to the instance (YamlReader::ReadBinaryBlock,
            // YamlReader.cpp:539-556), never through the values transport.
            for (const member of BinaryMembers(target.constructor))
            {
                if (!Object.hasOwn(values, member.name) || !ArrayBuffer.isView(values[member.name])) continue;
                if (!this.ReadBinaryBlock(target, member.name, values[member.name])) continue;
                values = { ...values };
                delete values[member.name];
            }
        }
        if (context.declared && typeof target.SetValues !== "function"
            && typeof this.options.adapter?.applyValues !== "function")
        {
            // Registered classes without the legacy values method populate
            // canonical storage: embedded objects and mapped lists keep their
            // identities, and mapped NOTIFY follows each declared write.
            // Black and Red have already constructed their object references;
            // the existing whole-graph finalizer still owns initialization.
            const reader = new DictReader({ declarations: true, initialize: false });
            const declaredValues = {};
            for (const name of Object.keys(values))
            {
                const field = reader.FindEntry(name, target.constructor);
                // Runtime resources do not cross the values boundary. Unknown
                // names must reach ReadInto so a schema mismatch throws instead
                // of silently leaving a class member at its default.
                if (field?.type?.runtimeOnly === true) continue;
                declaredValues[name] = values[name];
            }
            reader.ReadInto(target, declaredValues);
        }
        else this.adapter.applyValues(target, values, context);
        this.runtimeInstances.push({ instance: target, kind, shape });
    }

    /**
     * A reader's `ReadBinaryBlock` (BlackReader.cpp:599-612,
     * YamlReader.cpp:539-556): the bytes are copied into the buffer the
     * instance's `AllocateReadBuffer` returns, and `SetBufferAndSize` hands
     * them back for the instance to decode. An instance that does not map
     * ICustomPersist is not given them (IRootReader.cpp:77-88).
     *
     * Adapted: the transport has already read the block, as size and bytes or
     * as a decoded base64 scalar; this is the half every reader shares. The
     * returned buffer is any typed array the class chooses, filled bytewise.
     *
     * @param {object} instance The object that owns the block.
     * @param {string} propertyName The block's member name.
     * @param {ArrayBufferView} bytes The block's bytes.
     * @returns {boolean} Whether the instance took them.
     */
    ReadBinaryBlock(instance, propertyName, bytes)
    {
        const persist = CjsSchema.cast(instance, ICustomPersist);
        if (!persist) return false;
        const buffer = persist.AllocateReadBuffer(propertyName, bytes.byteLength);
        // memcpy: byte views over the two existing buffers, once per block read.
        const target = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength); // alloc: byte view, no copy
        const source = new Uint8Array(bytes.buffer, bytes.byteOffset, Math.min(bytes.byteLength, target.byteLength)); // alloc: byte view, no copy
        target.set(source);
        persist.SetBufferAndSize(propertyName, buffer, bytes.byteLength);
        return true;
    }

    /**
     * The value a binary block decodes to, for a payload read: a new instance
     * of the owner's class reads the bytes (`ReadBinaryBlock`), and the payload
     * carries the member it then holds.
     *
     * Ours: a payload is plain values, so no instance owns the block; the class
     * still decodes its own bytes.
     *
     * @param {string|null} kind Persisted class name.
     * @param {string} propertyName The block's member name.
     * @param {ArrayBufferView} bytes The block's bytes.
     * @returns {*} The decoded member value, or undefined when no registered class declares the block.
     */
    ReadBinaryBlockValue(kind, propertyName, bytes)
    {
        const Constructor = this.ResolveClass(kind);
        if (!Constructor || CjsSchema.getClassName(Constructor) === null) return undefined;
        const member = BinaryMembers(Constructor).find(item => item.name === propertyName);
        if (!member) return undefined;
        const instance = new Constructor();
        if (!this.ReadBinaryBlock(instance, propertyName, bytes)) return undefined;
        return readDictionaryValue(instance, member);
    }

    /**
     * Creates runtime context for the current Blue graph reader.
     *
     * @param {string} kind Persisted class name.
     * @param {object|null} shape Source shape for the class.
     * @param {boolean} includeOptions Whether to attach `options`.
     * @param {object|null} [options=null] Options attached when included.
     * @returns {object} The hydration adapter context.
     */
    CreateRuntimeContext(kind, shape, includeOptions, options = null)
    {
        const context = { kind };
        if (this.includeShapeContext) context.shape = shape;
        if (includeOptions) context.options = options;
        return context;
    }

    /**
     * Creates payload target for the current Blue graph reader.
     *
     * @param {string|null} kind Persisted class name.
     * @returns {object} An empty payload object, tagged with its type when configured.
     */
    CreatePayloadTarget(kind)
    {
        const typeField = this.GetPayloadTypeField();
        return typeField && (kind || this.includeEmptyPayloadType) ? { [typeField]: kind } : {};
    }

    /**
     * Creates payload reference for the current Blue graph reader.
     *
     * @param {object} targetObject Referenced payload object.
     * @param {number|string} referenceId Reference identity.
     * @returns {object} A reference marker, or the target itself.
     */
    CreatePayloadReference(targetObject, referenceId)
    {
        const idField = this.GetPayloadIdField();
        const referenceField = this.GetPayloadReferenceField();

        if (idField && this.requirePayloadReferenceTarget)
        {
            this.AssignPayloadReferenceId(targetObject, idField, referenceId);
        }
        else if (idField && targetObject && typeof targetObject === "object")
        {
            this.AssignPayloadReferenceId(targetObject, idField, referenceId);
        }

        return referenceField ? { [referenceField]: referenceId } : targetObject;
    }

    /**
     * Returns payload type field from the current Blue graph reader.
     *
     * @returns {string|null} The field name, or null when disabled.
     */
    GetPayloadTypeField()
    {
        return this.GetPayloadField("payloadTypeField", "_type");
    }

    /**
     * Returns payload ID field from the current Blue graph reader.
     *
     * @returns {string|null} The field name, or null when disabled.
     */
    GetPayloadIdField()
    {
        return this.GetPayloadField("payloadIdField", "_id");
    }

    /**
     * Returns payload reference field from the current Blue graph reader.
     *
     * @returns {string|null} The field name, or null when disabled.
     */
    GetPayloadReferenceField()
    {
        return this.GetPayloadField("payloadReferenceField", "_ref");
    }

    /**
     * Returns payload values field from the current Blue graph reader.
     *
     * @returns {string|null} The field name, or null when disabled.
     */
    GetPayloadValuesField()
    {
        return this.GetPayloadField("payloadValuesField", "_values");
    }

    /**
     * Returns payload field from the current Blue graph reader.
     *
     * @param {string} name Option name holding the field name.
     * @param {string} fallback Field name used when the option is unset.
     * @returns {string|null} The field name, or null when disabled.
     * @throws {TypeError} When validation is on and the option is not a non-empty string or false.
     */
    GetPayloadField(name, fallback)
    {
        const value = this.options[name];
        if (!this.validatePayloadReservedFields)
        {
            return value === false ? null : (value || fallback);
        }
        if (value === false) return null;
        if (value === undefined) return fallback;
        if (typeof value === "string" && value) return value;
        throw this.PayloadError(
            "PAYLOAD_MARKER_CONFIGURATION",
            `${name} must be a non-empty string or false`
        );
    }

    /**
     * Validates payload configuration against Blue graph reader constraints and
     * throws on failure.
     *
     * @throws {TypeError} When the configured marker fields conflict.
     */
    ValidatePayloadConfiguration()
    {
        if (!this.validatePayloadReservedFields)
        {
            this.payloadReservedFields = null;
            return;
        }

        const fields = [
            [ "type", this.GetPayloadTypeField() ],
            [ "id", this.GetPayloadIdField() ],
            [ "reference", this.GetPayloadReferenceField() ]
        ];
        const idField = this.GetPayloadIdField();
        const referenceField = this.GetPayloadReferenceField();
        const valuesField = this.includePayloadValuesField && idField
            ? this.GetPayloadValuesField()
            : null;
        if (valuesField) fields.push([ "values", valuesField ]);
        if (referenceField && !idField)
        {
            throw this.PayloadError(
                "PAYLOAD_MARKER_CONFIGURATION",
                "payloadReferenceField requires payloadIdField"
            );
        }
        if (idField && this.includePayloadValuesField && !valuesField)
        {
            throw this.PayloadError(
                "PAYLOAD_MARKER_CONFIGURATION",
                "payloadIdField requires payloadValuesField for sequence identity"
            );
        }

        const reserved = new Map();
        for (const [ role, field ] of fields)
        {
            if (!field) continue;
            if (reserved.has(field))
            {
                throw this.PayloadError(
                    "PAYLOAD_MARKER_CONFIGURATION",
                    `payload ${role} field "${field}" duplicates the ${reserved.get(field)} field`
                );
            }
            reserved.set(field, role);
        }
        this.payloadReservedFields = reserved;
    }

    /**
     * Validates payload field available against Blue graph reader constraints
     * and throws on failure.
     *
     * @param {string} field Payload field name.
     * @throws {TypeError} When the field is reserved for a marker.
     */
    AssertPayloadFieldAvailable(field)
    {
        if (!this.validatePayloadReservedFields) return;
        if (!this.payloadReservedFields) this.ValidatePayloadConfiguration();
        const role = this.payloadReservedFields.get(field);
        if (!role) return;
        throw this.PayloadError(
            "PAYLOAD_RESERVED_FIELD_COLLISION",
            `payload field "${field}" is reserved for the ${role} marker`
        );
    }

    /**
     * Assigns payload values while preserving the current Blue graph reader
     * contract.
     *
     * @param {object} targetObject Payload object.
     * @param {Object<string, *>} values Member values by name.
     */
    AssignPayloadValues(targetObject, values)
    {
        for (const [ field, value ] of Object.entries(values))
        {
            this.AssertPayloadFieldAvailable(field);
            this.DefinePayloadProperty(targetObject, field, value);
        }
    }

    /**
     * Assigns payload reference ID while preserving the current Blue graph
     * reader contract.
     *
     * @param {object} targetObject Payload object.
     * @param {string} idField ID field name.
     * @param {number|string} referenceId Reference identity.
     * @throws {TypeError} When validation is on and an existing ID differs.
     */
    AssignPayloadReferenceId(targetObject, idField, referenceId)
    {
        if (!Object.hasOwn(targetObject, idField))
        {
            this.DefinePayloadProperty(targetObject, idField, referenceId);
            return;
        }
        if (!this.validatePayloadReservedFields) return;
        if (targetObject[idField] === referenceId) return;
        throw this.PayloadError(
            "PAYLOAD_RESERVED_FIELD_COLLISION",
            `payload ID field "${idField}" conflicts with reference ${referenceId}`
        );
    }

    /**
     * Creates a payload error annotated with the current graph context for the
     * Blue graph reader.
     *
     * @param {string} code Error code.
     * @param {string} message Error message.
     * @returns {TypeError} The error, carrying `code`.
     */
    PayloadError(code, message)
    {
        const error = new TypeError(`${code}: ${message}`);
        error.code = code;
        return error;
    }

    /**
     * Defines payload property on the current Blue graph reader result.
     *
     * @param {object} targetObject Payload object.
     * @param {string} field Property name.
     * @param {*} value Property value.
     */
    DefinePayloadProperty(targetObject, field, value)
    {
        Object.defineProperty(targetObject, field, {
            value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    }

    /**
     * Assigns runtime field value while preserving the current Blue graph reader
     * contract.
     *
     * @param {object} targetObject Runtime object.
     * @param {CjsBlueFieldTarget} target Resolved field target.
     * @param {*} value Decoded value.
     */
    AssignRuntimeFieldValue(targetObject, target, value)
    {
        if (target.discard) return;
        if (target.unknown)
        {
            targetObject[target.wireName] = value;
            return;
        }

        if (target.indexed)
        {
            let current = targetObject[target.field.name];
            if (!current || typeof current !== "object")
            {
                current = Number.isInteger(target.index) ? [] : {};
                targetObject[target.field.name] = current;
            }

            current[target.key] = this.NormalizeRuntimeFieldValue(value, target.field);
            return;
        }

        targetObject[target.field.name] = this.NormalizeRuntimeFieldValue(value, target.field);
    }

    /**
     * Assigns payload field value while preserving the current Blue graph reader
     * contract.
     *
     * @param {object} targetObject Payload object.
     * @param {CjsBlueFieldTarget} target Resolved field target.
     * @param {*} value Decoded value.
     */
    AssignPayloadFieldValue(targetObject, target, value)
    {
        if (target.discard) return;
        this.AssertPayloadFieldAvailable(target.unknown ? target.wireName : target.field.name);
        if (target.unknown)
        {
            if (this.validatePayloadReservedFields)
            {
                this.DefinePayloadProperty(targetObject, target.wireName, value);
            }
            else
            {
                targetObject[target.wireName] = value;
            }
            return;
        }

        if (target.indexed)
        {
            let current = this.validatePayloadReservedFields
                ? (Object.hasOwn(targetObject, target.field.name) ? targetObject[target.field.name] : null)
                : targetObject[target.field.name];
            if (!current || typeof current !== "object")
            {
                current = Number.isInteger(target.index) ? [] : {};
                if (this.validatePayloadReservedFields)
                {
                    this.DefinePayloadProperty(targetObject, target.field.name, current);
                }
                else
                {
                    targetObject[target.field.name] = current;
                }
            }

            current[target.key] = value;
            return;
        }

        if (this.validatePayloadReservedFields)
        {
            this.DefinePayloadProperty(targetObject, target.field.name, value);
        }
        else
        {
            targetObject[target.field.name] = value;
        }
    }

    /**
     * Converts runtime field value into the canonical Blue graph reader
     * representation.
     *
     * @param {*} value Decoded value.
     * @param {object|null} field Declared field descriptor.
     * @returns {*} The normalized value, or the value unchanged.
     */
    NormalizeRuntimeFieldValue(value, field)
    {
        if (!field) return value;

        // Object-graph fields already contain constructed instances. Preserve
        // those identities and normalize only scalar/math leaf values.
        const descriptor = normalizeCarbonTypeDescriptor(field);
        const kind = descriptor.kind;

        if ((kind === CARBON_TYPE.ARRAY || kind === CARBON_TYPE.STRUCT_LIST) && Array.isArray(value)) return value;
        if ((kind === CARBON_TYPE.ROOT_REF
            || kind === CARBON_TYPE.ROOT
            || kind === CARBON_TYPE.RAW_STRUCT
            || kind === CARBON_TYPE.UNKNOWN)
            && value && typeof value === "object")
        {
            return value;
        }
        if (CjsBlueReader.isShapeIncompatibleMathArray(value, descriptor)) return value;

        return normalizeCarbonValue(value, field);
    }

    /**
     * Resolves source shape against the current Blue graph reader.
     *
     * @param {string} kind Persisted class name.
     * @returns {object|null} The source shape, or null.
     */
    ResolveSourceShape(kind)
    {
        const registry = this.options.registry || null;
        if (registry?.GetSourceShape) return registry.GetSourceShape(kind);

        const sourceShapes = this.options.sourceShapes || null;
        if (sourceShapes?.GetSourceShape) return sourceShapes.GetSourceShape(kind);
        if (sourceShapes)
        {
            const shape = sourceShapes instanceof Map ? sourceShapes.get(kind) : sourceShapes[kind];
            if (shape)
            {
                return this.schemaRegistry?.normalizeShape
                    ? this.schemaRegistry.normalizeShape(shape)
                    : shape;
            }
        }

        return this.schemaShapes.get(kind) || null;
    }

    /**
     * Resolves class against the current Blue graph reader.
     *
     * @param {string|null} kind Persisted class name.
     * @returns {Function|null} The class constructor, or null.
     */
    ResolveClass(kind)
    {
        if (!kind) return null;

        const classes = this.options.classes || {};
        const Registry = this.options.registry || this.defaultRegistry;
        return classes[kind] || (Registry ? Registry.getConstructor(kind) : null);
    }

    /**
     * Applies the configured resource-path transform to a decoded field value
     * for the Blue graph reader.
     *
     * @param {string} value Decoded resource path.
     * @returns {string} The transformed path, or the value unchanged.
     */
    TransformPath(value)
    {
        const handler = this.options.pathHandler;
        return typeof handler === "function" ? handler(value) : value;
    }

    /**
     * Reports whether the current Blue graph reader satisfies shape incompatible
     * math array.
     *
     * @param {*} value Decoded value.
     * @param {object|null} descriptor Normalized type descriptor.
     * @returns {boolean} True when an array's length differs from the declared length.
     */
    static isShapeIncompatibleMathArray(value, descriptor)
    {
        const expectedLength = descriptor?.length;
        return Array.isArray(value)
            && Number.isInteger(expectedLength)
            && value.length !== expectedLength;
    }
}

/**
 * A class's `type.binary` members: Carbon's BINARYBLOCK attributes.
 *
 * @param {Function} Constructor A registered class.
 * @returns {object[]} Its binary member declarations.
 */
function BinaryMembers(Constructor)
{
    return CjsSchema.getSchema(Constructor).members.filter(member => member.type?.binary === true);
}

export default CjsBlueReader;

CjsSchema.meta.define(CjsBlueReader, { className: "CjsBlueReader" });
