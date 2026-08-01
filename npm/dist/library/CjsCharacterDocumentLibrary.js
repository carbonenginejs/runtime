const CHARACTER_LIBRARY_SCHEMA = "carbonenginejs.characterLibrary";
const CHARACTER_LIBRARY_SCHEMA_VERSION = 3;
const REQUIRED_DOCUMENT_NAMES = ["ancestries", "archetypes", "bloodlines", "characterAvatarBehaviors", "characterColorLocations", "characterColorNames", "characterModifierLocations", "characterPortraitResources", "characterResources", "characterSculptingLocations", "paperdolls", "races"];
const RELATIONSHIPS = [{
  source: "ancestries",
  path: ["bloodlineID"],
  target: "bloodlines"
}, {
  source: "bloodlines",
  path: ["raceID"],
  target: "races"
}, {
  source: "paperdolls",
  path: ["modifiers", "*", "modifierLocationID"],
  target: "characterModifierLocations"
}, {
  source: "paperdolls",
  path: ["modifiers", "*", "paperdollResourceID"],
  target: "characterResources"
}, {
  source: "paperdolls",
  path: ["colorSelections", "*", "colorID"],
  target: "characterColorLocations"
}, {
  source: "paperdolls",
  path: ["colorSelections", "*", "colorNameA"],
  target: "characterColorNames"
}, {
  source: "paperdolls",
  path: ["colorSelections", "*", "colorNameBC"],
  target: "characterColorNames"
}, {
  source: "paperdolls",
  path: ["sculptWeights", "*", "sculptLocationID"],
  target: "characterSculptingLocations"
}];
const METADATA_FIELDS = ["sourceTarget", "sourceGame", "sourceProvider", "sourceBuild", "generatedAt"];

/** Indexes schema-v3 source documents without hydrating legacy character models. */
class CjsCharacterDocumentLibrary {
  static schema = CHARACTER_LIBRARY_SCHEMA;
  static schemaVersion = CHARACTER_LIBRARY_SCHEMA_VERSION;
  #document = null;
  #indexes = new Map();

  /** Builds one detached character-library document from plain JSON documents. */
  static create(input, options = {}) {
    return createCharacterLibraryDocument(input, options);
  }

  /** Returns whether a value declares the source-document library format. */
  static isDocument(value) {
    return isCharacterLibraryDocument(value);
  }

  /** Validates the source-document library contract without changing its value. */
  static validate(value) {
    return validateCharacterLibraryDocument(value);
  }

  /** Returns a detached validated copy of one character-library document. */
  static copy(value) {
    return copyCharacterLibraryDocument(value);
  }

  /** Creates a detached document-only library from a validated schema-v3 value. */
  constructor(value) {
    this.SetDocument(value);
  }

  /** Replaces the source-document value and atomically rebuilds record indexes. */
  SetDocument(value) {
    const document = this.constructor.copy(value);
    const indexes = new Map();
    for (const [name, records] of Object.entries(document.documents)) {
      indexes.set(name, new Map(Object.entries(records)));
    }
    this.#document = document;
    this.#indexes = indexes;
    return this;
  }

  /** Returns the installed detached schema-v3 document. */
  GetDocumentData() {
    return this.#document;
  }

  /** Lists installed source-document names in deterministic order. */
  ListDocuments() {
    return Object.keys(this.#document.documents);
  }

  /** Returns one installed source document or null. */
  GetDocument(name) {
    return this.#document.documents[String(name)] ?? null;
  }

  /** Returns whether a named document contains an exact record identity. */
  Has(documentName, id) {
    return this.#indexes.get(String(documentName))?.has(String(id)) || false;
  }

  /** Returns one plain source record or null. */
  Get(documentName, id) {
    return this.#indexes.get(String(documentName))?.get(String(id)) || null;
  }

  /** Resolves one {_ref} value within its explicitly named target document. */
  ResolveReference(documentName, reference) {
    if (!reference || typeof reference !== "object" || Array.isArray(reference) || !Object.hasOwn(reference, "_ref") || Object.keys(reference).length !== 1) {
      throw new TypeError("Character relationship must be a {_ref} object");
    }
    return this.Get(documentName, reference._ref);
  }
}

/** Builds one detached character-library document from plain JSON documents. */
function createCharacterLibraryDocument(input, options = {}) {
  RequirePlainObject(options, "Character library options");
  const documents = NormalizeDocuments(input);
  RequireDocuments(documents);
  ApplyRelationships(documents);
  const result = {
    schema: CHARACTER_LIBRARY_SCHEMA,
    schemaVersion: CHARACTER_LIBRARY_SCHEMA_VERSION,
    documents
  };
  for (const field of METADATA_FIELDS) {
    const value = OptionalString(options[field], `Character library ${field}`);
    if (value !== null) {
      result[field] = value;
    }
  }
  validateCharacterLibraryDocument(result);
  return result;
}

/** Returns whether a value declares the source-document library format. */
function isCharacterLibraryDocument(value) {
  return IsPlainObject(value) && value.schema === CHARACTER_LIBRARY_SCHEMA && Number(value.schemaVersion) === CHARACTER_LIBRARY_SCHEMA_VERSION && IsPlainObject(value.documents);
}

/** Validates the source-document library contract without changing its value. */
function validateCharacterLibraryDocument(value) {
  RequirePlainObject(value, "Character library document");
  if (value.schema !== CHARACTER_LIBRARY_SCHEMA || Number(value.schemaVersion) !== CHARACTER_LIBRARY_SCHEMA_VERSION) {
    throw new TypeError("Unsupported character-library document schema");
  }
  RequirePlainObject(value.documents, "Character library documents");
  RequireDocuments(value.documents);
  ValidateMetadata(value);
  ValidateDocumentRecords(value.documents);
  const referenced = CollectReferences(value.documents, true);
  ValidateTargetIdentities(value.documents, referenced);
  return value;
}

/** Returns a detached validated copy of one character-library document. */
function copyCharacterLibraryDocument(value) {
  validateCharacterLibraryDocument(value);
  return CloneJSON(value, "Character library document", new WeakSet());
}
function NormalizeDocuments(input) {
  const values = new Map();
  if (Array.isArray(input)) {
    for (let index = 0; index < input.length; index++) {
      const descriptor = input[index];
      RequirePlainObject(descriptor, `Character document descriptor ${index}`);
      AddDocument(values, descriptor.name, descriptor.data);
    }
  } else {
    RequirePlainObject(input, "Character library document input");
    for (const name of Object.keys(input)) {
      AddDocument(values, name, input[name]);
    }
  }
  const orderedNames = [...REQUIRED_DOCUMENT_NAMES, ...[...values.keys()].filter(name => !REQUIRED_DOCUMENT_NAMES.includes(name)).sort(CompareText)];
  const result = {};
  for (const name of orderedNames) {
    if (values.has(name)) {
      DefineValue(result, name, values.get(name));
    }
  }
  return result;
}
function AddDocument(documents, value, data) {
  const name = String(value ?? "").trim();
  if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(name)) {
    throw new TypeError(`Invalid character document name "${value}"`);
  }
  if (documents.has(name)) {
    throw new Error(`Duplicate character document "${name}"`);
  }
  RequirePlainObject(data, `Character document ${name}`);
  const records = {};
  for (const key of Object.keys(data).sort(CompareIdentities)) {
    const record = data[key];
    RequirePlainObject(record, `Character document ${name} record ${key}`);
    if (Object.hasOwn(record, "_id")) {
      throw new TypeError(`Character document ${name} record ${key} already defines reserved _id`);
    }
    DefineValue(records, key, CloneJSON(record, `Character document ${name} record ${key}`, new WeakSet()));
  }
  documents.set(name, records);
}
function RequireDocuments(documents) {
  const missing = REQUIRED_DOCUMENT_NAMES.filter(name => !Object.hasOwn(documents, name));
  if (missing.length) {
    throw new Error(`Character library is missing documents: ${missing.join(", ")}`);
  }
}
function ApplyRelationships(documents) {
  const referenced = CollectReferences(documents, false);
  for (const [target, ids] of referenced) {
    const records = documents[target];
    for (const id of ids) {
      if (!Object.hasOwn(records, id)) {
        continue;
      }
      const record = records[id];
      const identified = {};
      DefineValue(identified, "_id", id);
      for (const key of Object.keys(record)) {
        DefineValue(identified, key, record[key]);
      }
      DefineValue(records, id, identified);
    }
  }
}
function CollectReferences(documents, validate) {
  const referenced = new Map();
  for (const relationship of RELATIONSHIPS) {
    const records = documents[relationship.source];
    for (const [recordID, record] of Object.entries(records)) {
      VisitRelationshipField(record, relationship.path, 0, `${relationship.source}.${recordID}`, (owner, field, label) => {
        const value = owner[field];
        if (value === null || value === undefined) {
          return;
        }
        const id = validate ? ReadReference(value, label) : ReadSourceIdentity(value, label);
        if (!referenced.has(relationship.target)) {
          referenced.set(relationship.target, new Set());
        }
        referenced.get(relationship.target).add(id);
        if (!validate) {
          owner[field] = {
            _ref: id
          };
        }
      });
    }
  }
  return referenced;
}
function VisitRelationshipField(value, path, index, label, visit) {
  if (index === path.length - 1) {
    const field = path[index];
    if (!IsPlainObject(value)) {
      throw new TypeError(`${label} must be an object`);
    }
    if (Object.hasOwn(value, field)) {
      visit(value, field, `${label}.${field}`);
    }
    return;
  }
  const field = path[index];
  if (!IsPlainObject(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  if (!Object.hasOwn(value, field) || value[field] === null) {
    return;
  }
  if (path[index + 1] === "*") {
    if (!Array.isArray(value[field])) {
      throw new TypeError(`${label}.${field} must be an array`);
    }
    for (let itemIndex = 0; itemIndex < value[field].length; itemIndex++) {
      VisitRelationshipField(value[field][itemIndex], path, index + 2, `${label}.${field}[${itemIndex}]`, visit);
    }
    return;
  }
  VisitRelationshipField(value[field], path, index + 1, `${label}.${field}`, visit);
}
function ReadSourceIdentity(value, label) {
  if (IsReference(value)) {
    return NormalizeIdentity(value._ref, label);
  }
  return NormalizeIdentity(value, label);
}
function ReadReference(value, label) {
  if (!IsReference(value) || Object.keys(value).length !== 1) {
    throw new TypeError(`${label} must be a {_ref} relationship`);
  }
  return NormalizeIdentity(value._ref, label);
}
function IsReference(value) {
  return IsPlainObject(value) && Object.hasOwn(value, "_ref");
}
function NormalizeIdentity(value, label) {
  if (typeof value === "string") {
    if (value === "") {
      throw new TypeError(`${label} identity must not be empty`);
    }
    return value;
  }
  if (Number.isSafeInteger(value)) {
    return String(value);
  }
  throw new TypeError(`${label} identity must be a string or safe integer`);
}
function ValidateDocumentRecords(documents) {
  for (const [name, records] of Object.entries(documents)) {
    RequirePlainObject(records, `Character document ${name}`);
    for (const [key, record] of Object.entries(records)) {
      RequirePlainObject(record, `Character document ${name} record ${key}`);
      CloneJSON(record, `Character document ${name} record ${key}`, new WeakSet());
    }
  }
}
function ValidateTargetIdentities(documents, referenced) {
  for (const [name, records] of Object.entries(documents)) {
    const ids = referenced.get(name) ?? new Set();
    for (const [key, record] of Object.entries(records)) {
      const expected = ids.has(key);
      const actual = Object.hasOwn(record, "_id");
      if (expected !== actual) {
        throw new TypeError(expected ? `Referenced character record ${name}.${key} is missing _id` : `Unreferenced character record ${name}.${key} must not define _id`);
      }
      if (actual && NormalizeIdentity(record._id, `${name}.${key}._id`) !== key) {
        throw new TypeError(`Character record ${name}.${key} has a mismatched _id`);
      }
    }
  }
}
function ValidateMetadata(value) {
  for (const field of METADATA_FIELDS) {
    if (Object.hasOwn(value, field)) {
      OptionalString(value[field], `Character library ${field}`, false);
    }
  }
}
function OptionalString(value, label, optional = true) {
  if (value === null || value === undefined) {
    if (optional) {
      return null;
    }
    throw new TypeError(`${label} must be a non-empty string`);
  }
  const result = String(value).trim();
  if (!result) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return result;
}
function CloneJSON(value, label, active) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${label} contains a non-finite number`);
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError(`${label} contains a non-JSON value`);
  }
  if (active.has(value)) {
    throw new TypeError(`${label} contains a cycle`);
  }
  active.add(value);
  let result;
  if (Array.isArray(value)) {
    result = new Array(value.length);
    for (let index = 0; index < value.length; index++) {
      result[index] = CloneJSON(value[index], `${label}[${index}]`, active);
    }
  } else {
    RequirePlainObject(value, label);
    result = {};
    for (const key of Object.keys(value)) {
      DefineValue(result, key, CloneJSON(value[key], `${label}.${key}`, active));
    }
  }
  active.delete(value);
  return result;
}
function RequirePlainObject(value, label) {
  if (!IsPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object`);
  }
}
function IsPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function CompareIdentities(left, right) {
  const leftInteger = /^-?\d+$/u.test(left);
  const rightInteger = /^-?\d+$/u.test(right);
  if (leftInteger && rightInteger) {
    const leftValue = BigInt(left);
    const rightValue = BigInt(right);
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  }
  return CompareText(left, right);
}
function CompareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
function DefineValue(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  });
}

export { CjsCharacterDocumentLibrary };
//# sourceMappingURL=CjsCharacterDocumentLibrary.js.map
