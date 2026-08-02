import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, CjsSchema } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { CjsCharacterLibraryDocuments as _CjsCharacterLibraryD } from './CjsCharacterLibraryDocuments.js';

let _initClass, _init_schema, _init_extra_schema, _init_schemaVersion, _init_extra_schemaVersion, _init_sourceTarget, _init_extra_sourceTarget, _init_sourceGame, _init_extra_sourceGame, _init_sourceProvider, _init_extra_sourceProvider, _init_sourceBuild, _init_extra_sourceBuild, _init_generatedAt, _init_extra_generatedAt, _init_documents, _init_extra_documents;

/** Hydrated character library whose public fields have the same shape as its JSON values. */
let _CjsCharacterLibrary;
class CjsCharacterLibrary extends CjsModel {
  static {
    ({
      e: [_init_schema, _init_extra_schema, _init_schemaVersion, _init_extra_schemaVersion, _init_sourceTarget, _init_extra_sourceTarget, _init_sourceGame, _init_extra_sourceGame, _init_sourceProvider, _init_extra_sourceProvider, _init_sourceBuild, _init_extra_sourceBuild, _init_generatedAt, _init_extra_generatedAt, _init_documents, _init_extra_documents],
      c: [_CjsCharacterLibrary, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterLibrary",
      family: "character"
    })], [[[io, io.readwrite, type, type.string], 16, "schema"], [[io, io.readwrite, type, type.uint32], 16, "schemaVersion"], [[io, io.readwrite, type, type.string], 16, "sourceTarget"], [[io, io.readwrite, type, type.string], 16, "sourceGame"], [[io, io.readwrite, type, type.string], 16, "sourceProvider"], [[io, io.readwrite, type, type.string], 16, "sourceBuild"], [[io, io.readwrite, type, type.string], 16, "generatedAt"], [[io, io.readwrite, void 0, type.model("CjsCharacterLibraryDocuments")], 16, "documents"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_documents(this);
  }
  #documentIndexes = new Map();
  schema = _init_schema(this, "carbonenginejs.characterLibrary");
  schemaVersion = (_init_extra_schema(this), _init_schemaVersion(this, 5));
  sourceTarget = (_init_extra_schemaVersion(this), _init_sourceTarget(this, null));
  sourceGame = (_init_extra_sourceTarget(this), _init_sourceGame(this, null));
  sourceProvider = (_init_extra_sourceGame(this), _init_sourceProvider(this, null));
  sourceBuild = (_init_extra_sourceProvider(this), _init_sourceBuild(this, null));
  generatedAt = (_init_extra_sourceBuild(this), _init_generatedAt(this, null));
  documents = (_init_extra_generatedAt(this), _init_documents(this, new _CjsCharacterLibraryD()));

  /** Rejects combined plain values that cannot hydrate without losing fields or structure. */
  static validateValues(value) {
    RequirePlainObject(value, "Character library");
    if (value.schema !== "carbonenginejs.characterLibrary" || value.schemaVersion !== 5) {
      throw new TypeError("Character library must use carbonenginejs.characterLibrary schema version 5");
    }
    RequirePlainObject(value.documents, "Character library documents");
    for (const name of _CjsCharacterLibraryD.listDocumentNames()) {
      if (!Object.hasOwn(value.documents, name) || !Array.isArray(value.documents[name])) {
        throw new TypeError(`Character library documents must define array ${JSON.stringify(name)}`);
      }
    }
    ValidateModelValue(value, _CjsCharacterLibrary, "Character library");
    return value;
  }

  /** Lists the document collections declared by this library model. */
  ListDocuments() {
    return _CjsCharacterLibraryD.listDocumentNames();
  }

  /** Returns one hydrated document collection or null. */
  GetDocument(name) {
    const key = String(name);
    return _CjsCharacterLibraryD.getDocumentType(key) ? this.documents[key] : null;
  }

  /** Adds one already-hydrated source record without cloning or rehydrating it. */
  Add(documentName, record) {
    const key = String(documentName);
    const document = this.GetDocument(key);
    const typeName = _CjsCharacterLibraryD.getDocumentType(key);
    if (!document || !typeName) {
      throw new Error(`Unknown character library document ${JSON.stringify(key)}`);
    }
    const Constructor = CjsSchema.GetConstructor(typeName);
    if (!Constructor || !(record instanceof Constructor)) {
      throw new TypeError(`Character library document ${JSON.stringify(key)} requires ${typeName}`);
    }
    const recordID = NormalizeStoredRecordID(record.recordID);
    if (this.Get(key, recordID)) {
      throw new Error(`Character library document ${JSON.stringify(key)} already contains record ${JSON.stringify(recordID)}`);
    }
    document.push(record);
    this.#documentIndexes.delete(key);
    return record;
  }

  /** Clears one or every private record lookup index after direct editor mutation. */
  Reindex(documentName = null) {
    if (documentName === null || documentName === undefined) {
      const indexes = new Map();
      for (const name of this.ListDocuments()) {
        indexes.set(name, CreateDocumentIndex(name, this.GetDocument(name), _CjsCharacterLibraryD.getDocumentType(name)));
      }
      this.#documentIndexes = indexes;
      return this;
    }
    const key = String(documentName);
    if (!this.GetDocument(key)) {
      throw new Error(`Unknown character library document ${JSON.stringify(key)}`);
    }
    const entry = CreateDocumentIndex(key, this.GetDocument(key), _CjsCharacterLibraryD.getDocumentType(key));
    this.#documentIndexes.set(key, entry);
    return this;
  }

  /** Returns whether a document contains a record with the requested source identity. */
  Has(documentName, recordID) {
    return this.Get(documentName, recordID) !== null;
  }

  /** Returns one hydrated source record by its named recordID field. */
  Get(documentName, recordID) {
    const key = String(documentName);
    const document = this.GetDocument(key);
    if (!document) {
      return null;
    }
    const identity = NormalizeLookupRecordID(recordID);
    let entry = this.#documentIndexes.get(key);
    if (!entry || entry.document !== document || entry.length !== document.length) {
      entry = CreateDocumentIndex(key, document, _CjsCharacterLibraryD.getDocumentType(key));
      this.#documentIndexes.set(key, entry);
    }
    let record = entry.records.get(identity) ?? null;
    if (record && record.recordID === identity) {
      return record;
    }
    if (record || !entry.misses.has(identity)) {
      entry = CreateDocumentIndex(key, document, _CjsCharacterLibraryD.getDocumentType(key));
      entry.misses.add(identity);
      this.#documentIndexes.set(key, entry);
      record = entry.records.get(identity) ?? null;
    }
    return record && record.recordID === identity ? record : null;
  }
  static {
    _initClass();
  }
}
function CreateDocumentIndex(name, document, typeName) {
  const records = new Map();
  const Constructor = CjsSchema.GetConstructor(typeName);
  for (const record of document) {
    if (!Constructor || !(record instanceof Constructor)) {
      throw new TypeError(`Character library document ${JSON.stringify(name)} requires ${typeName}`);
    }
    const recordID = NormalizeStoredRecordID(record?.recordID);
    if (records.has(recordID)) {
      throw new Error(`Character library document ${JSON.stringify(name)} contains duplicate record ${JSON.stringify(recordID)}`);
    }
    records.set(recordID, record);
  }
  return {
    document,
    length: document.length,
    misses: new Set(),
    records
  };
}
function NormalizeStoredRecordID(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Character library recordID must be a non-empty string");
  }
  return value;
}
function NormalizeLookupRecordID(value) {
  const result = String(value ?? "");
  if (!result.trim()) {
    throw new TypeError("Character library recordID must be a non-empty string");
  }
  return result;
}
function ValidateModelValue(value, Constructor, label) {
  RequirePlainObject(value, label);
  if (Object.hasOwn(value, "_ref")) {
    if (Object.keys(value).length !== 1) {
      throw new TypeError(`${label} reference must contain only _ref`);
    }
    return;
  }
  const schema = CjsSchema.getSchema(Constructor);
  const fields = new Map(schema.fields.map(field => [field.name, field]));
  for (const key of Object.keys(value)) {
    if (key === "_id" || key === "_type") {
      continue;
    }
    const field = fields.get(key);
    if (!field) {
      throw new TypeError(`${label} contains unsupported field ${JSON.stringify(key)}`);
    }
    ValidateFieldValue(value[key], field.type, `${label}.${key}`);
  }
}
function ValidateFieldValue(value, fieldType, label) {
  if (value === null || value === undefined || !fieldType) {
    return;
  }
  if (fieldType.kind === "model") {
    if (typeof value === "string" && value.trim() || Number.isSafeInteger(value)) {
      return;
    }
    const Constructor = CjsSchema.GetConstructor(fieldType.className);
    if (!Constructor) {
      throw new TypeError(`${label} uses unregistered model ${fieldType.className}`);
    }
    ValidateModelValue(value, Constructor, label);
    return;
  }
  if (fieldType.kind === "list" || fieldType.kind === "array") {
    if (!Array.isArray(value)) {
      throw new TypeError(`${label} must be an array`);
    }
    const Constructor = CjsSchema.GetConstructor(fieldType.itemType);
    if (Constructor) {
      for (let index = 0; index < value.length; index++) {
        ValidateModelValue(value[index], Constructor, `${label}[${index}]`);
      }
    }
  }
}
function RequirePlainObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object`);
  }
}

export { _CjsCharacterLibrary as CjsCharacterLibrary };
//# sourceMappingURL=CjsCharacterLibrary.js.map
