import { resolveHydrationAdapter } from '@carbonenginejs/core-types/hydration';
import { normalizeCarbonTypeDescriptor, CARBON_TYPE, normalizeCarbonValue } from '@carbonenginejs/core-types/types';
import { CjsReader } from './CjsReader.js';

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
 */
class CjsBlueReader extends CjsReader {
  constructor(options = {}, config = {}) {
    super({
      ...options
    });
    this.schemaRegistry = config.schemaRegistry || null;
    this.schemaShapes = this.schemaRegistry ? this.schemaRegistry.createShapeMap(options.schema) : new Map();
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
      markDirty: false,
      skipUpdate: true,
      skipEvents: true
    };
    this.ResetBlueReadState();
  }
  ResetBlueReadState() {
    this.reports = [];
    this.runtimeInstances = [];
  }
  FinalizeRuntimeInstances() {
    for (const record of this.runtimeInstances) {
      this.adapter.finalize(record.instance, this.CreateRuntimeContext(record.kind, record.shape, false));
    }
  }
  CreateRuntimeTarget(kind, shape = null) {
    const built = this.adapter.construct(kind, this.CreateRuntimeContext(kind, shape, true, this.options));
    if (built !== undefined) return built;
    const ClassConstructor = this.ResolveClass(kind);
    if (ClassConstructor) return new ClassConstructor();
    return this.CreateRuntimeFallback(kind, shape);
  }
  CreateRuntimeFallback(kind, shape = null) {
    const target = {
      _sourceClassName: this.includeSourceShape ? kind : kind || null
    };
    if (this.includeSourceShape) target._sourceShape = shape || null;
    return target;
  }
  ApplyRuntimeValues(target, values, kind, shape = null) {
    this.adapter.applyValues(target, values, this.CreateRuntimeContext(kind, shape, true, this.hydrationOptions));
    this.runtimeInstances.push({
      instance: target,
      kind,
      shape
    });
  }
  CreateRuntimeContext(kind, shape, includeOptions, options = null) {
    const context = {
      kind
    };
    if (this.includeShapeContext) context.shape = shape;
    if (includeOptions) context.options = options;
    return context;
  }
  CreatePayloadTarget(kind) {
    const typeField = this.GetPayloadTypeField();
    return typeField && (kind || this.includeEmptyPayloadType) ? {
      [typeField]: kind
    } : {};
  }
  CreatePayloadReference(targetObject, referenceId) {
    const idField = this.GetPayloadIdField();
    const referenceField = this.GetPayloadReferenceField();
    if (idField && this.requirePayloadReferenceTarget) {
      this.AssignPayloadReferenceId(targetObject, idField, referenceId);
    } else if (idField && targetObject && typeof targetObject === "object") {
      this.AssignPayloadReferenceId(targetObject, idField, referenceId);
    }
    return referenceField ? {
      [referenceField]: referenceId
    } : targetObject;
  }
  GetPayloadTypeField() {
    return this.GetPayloadField("payloadTypeField", "_type");
  }
  GetPayloadIdField() {
    return this.GetPayloadField("payloadIdField", "_id");
  }
  GetPayloadReferenceField() {
    return this.GetPayloadField("payloadReferenceField", "_reference");
  }
  GetPayloadValuesField() {
    return this.GetPayloadField("payloadValuesField", "_values");
  }
  GetPayloadField(name, fallback) {
    const value = this.options[name];
    if (!this.validatePayloadReservedFields) {
      return value === false ? null : value || fallback;
    }
    if (value === false) return null;
    if (value === undefined) return fallback;
    if (typeof value === "string" && value) return value;
    throw this.PayloadError("PAYLOAD_MARKER_CONFIGURATION", `${name} must be a non-empty string or false`);
  }
  ValidatePayloadConfiguration() {
    if (!this.validatePayloadReservedFields) {
      this.payloadReservedFields = null;
      return;
    }
    const fields = [["type", this.GetPayloadTypeField()], ["id", this.GetPayloadIdField()], ["reference", this.GetPayloadReferenceField()]];
    const idField = this.GetPayloadIdField();
    const referenceField = this.GetPayloadReferenceField();
    const valuesField = this.includePayloadValuesField && idField ? this.GetPayloadValuesField() : null;
    if (valuesField) fields.push(["values", valuesField]);
    if (referenceField && !idField) {
      throw this.PayloadError("PAYLOAD_MARKER_CONFIGURATION", "payloadReferenceField requires payloadIdField");
    }
    if (idField && this.includePayloadValuesField && !valuesField) {
      throw this.PayloadError("PAYLOAD_MARKER_CONFIGURATION", "payloadIdField requires payloadValuesField for sequence identity");
    }
    const reserved = new Map();
    for (const [role, field] of fields) {
      if (!field) continue;
      if (reserved.has(field)) {
        throw this.PayloadError("PAYLOAD_MARKER_CONFIGURATION", `payload ${role} field "${field}" duplicates the ${reserved.get(field)} field`);
      }
      reserved.set(field, role);
    }
    this.payloadReservedFields = reserved;
  }
  AssertPayloadFieldAvailable(field) {
    if (!this.validatePayloadReservedFields) return;
    if (!this.payloadReservedFields) this.ValidatePayloadConfiguration();
    const role = this.payloadReservedFields.get(field);
    if (!role) return;
    throw this.PayloadError("PAYLOAD_RESERVED_FIELD_COLLISION", `payload field "${field}" is reserved for the ${role} marker`);
  }
  AssignPayloadValues(targetObject, values) {
    for (const [field, value] of Object.entries(values)) {
      this.AssertPayloadFieldAvailable(field);
      this.DefinePayloadProperty(targetObject, field, value);
    }
  }
  AssignPayloadReferenceId(targetObject, idField, referenceId) {
    if (!Object.hasOwn(targetObject, idField)) {
      this.DefinePayloadProperty(targetObject, idField, referenceId);
      return;
    }
    if (!this.validatePayloadReservedFields) return;
    if (targetObject[idField] === referenceId) return;
    throw this.PayloadError("PAYLOAD_RESERVED_FIELD_COLLISION", `payload ID field "${idField}" conflicts with reference ${referenceId}`);
  }
  PayloadError(code, message) {
    const error = new TypeError(`${code}: ${message}`);
    error.code = code;
    return error;
  }
  DefinePayloadProperty(targetObject, field, value) {
    Object.defineProperty(targetObject, field, {
      value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  }
  AssignRuntimeFieldValue(targetObject, target, value) {
    if (target.unknown) {
      targetObject[target.wireName] = value;
      return;
    }
    if (target.indexed) {
      let current = targetObject[target.field.name];
      if (!current || typeof current !== "object") {
        current = Number.isInteger(target.index) ? [] : {};
        targetObject[target.field.name] = current;
      }
      current[target.key] = this.NormalizeRuntimeFieldValue(value, target.field);
      return;
    }
    targetObject[target.field.name] = this.NormalizeRuntimeFieldValue(value, target.field);
  }
  AssignPayloadFieldValue(targetObject, target, value) {
    this.AssertPayloadFieldAvailable(target.unknown ? target.wireName : target.field.name);
    if (target.unknown) {
      if (this.validatePayloadReservedFields) {
        this.DefinePayloadProperty(targetObject, target.wireName, value);
      } else {
        targetObject[target.wireName] = value;
      }
      return;
    }
    if (target.indexed) {
      let current = this.validatePayloadReservedFields ? Object.hasOwn(targetObject, target.field.name) ? targetObject[target.field.name] : null : targetObject[target.field.name];
      if (!current || typeof current !== "object") {
        current = Number.isInteger(target.index) ? [] : {};
        if (this.validatePayloadReservedFields) {
          this.DefinePayloadProperty(targetObject, target.field.name, current);
        } else {
          targetObject[target.field.name] = current;
        }
      }
      current[target.key] = value;
      return;
    }
    if (this.validatePayloadReservedFields) {
      this.DefinePayloadProperty(targetObject, target.field.name, value);
    } else {
      targetObject[target.field.name] = value;
    }
  }
  NormalizeRuntimeFieldValue(value, field) {
    if (!field) return value;

    // Object-graph fields already contain constructed instances. Preserve
    // those identities and normalize only scalar/math leaf values.
    const descriptor = normalizeCarbonTypeDescriptor(field);
    const kind = descriptor.kind;
    if (kind === CARBON_TYPE.ARRAY && Array.isArray(value)) return value;
    if ((kind === CARBON_TYPE.OBJECT_REF || kind === CARBON_TYPE.STRUCT || kind === CARBON_TYPE.RAW_STRUCT || kind === CARBON_TYPE.UNKNOWN) && value && typeof value === "object") {
      return value;
    }
    if (CjsBlueReader.isShapeIncompatibleMathArray(value, descriptor)) return value;
    return normalizeCarbonValue(value, field);
  }
  ResolveSourceShape(kind) {
    const registry = this.options.registry || null;
    if (registry?.GetSourceShape) return registry.GetSourceShape(kind);
    const sourceShapes = this.options.sourceShapes || null;
    if (sourceShapes?.GetSourceShape) return sourceShapes.GetSourceShape(kind);
    if (sourceShapes) {
      const shape = sourceShapes instanceof Map ? sourceShapes.get(kind) : sourceShapes[kind];
      if (shape) {
        return this.schemaRegistry?.normalizeShape ? this.schemaRegistry.normalizeShape(shape) : shape;
      }
    }
    return this.schemaShapes.get(kind) || null;
  }
  ResolveClass(kind) {
    if (!kind) return null;
    const classes = this.options.classes || {};
    const Registry = this.options.registry || this.defaultRegistry;
    return classes[kind] || (Registry ? Registry.GetConstructor(kind) : null);
  }
  TransformPath(value) {
    const handler = this.options.pathHandler;
    return typeof handler === "function" ? handler(value) : value;
  }
  static isShapeIncompatibleMathArray(value, descriptor) {
    const expectedLength = descriptor?.length;
    return Array.isArray(value) && Number.isInteger(expectedLength) && value.length !== expectedLength;
  }
}

export { CjsBlueReader };
//# sourceMappingURL=CjsBlueReader.js.map
