import { CjsCharacterLibrary as _CjsCharacterLibrary } from '../library/CjsCharacterLibrary.js';
import { CjsCharacterLibraryDocuments as _CjsCharacterLibraryD } from '../library/CjsCharacterLibraryDocuments.js';

const DOCUMENT_NAMES = _CjsCharacterLibraryD.listDocumentNames();
const RELATIONSHIPS = [["ancestries", ["bloodlineID"], "bloodlines"], ["bloodlines", ["raceID"], "races"], ["characterResources", ["clothingAlsoCoversCategory"], "characterModifierLocations"], ["characterResources", ["clothingAlsoCoversCategory2"], "characterModifierLocations"], ["characterResources", ["clothingRemovesCategory"], "characterModifierLocations"], ["characterResources", ["clothingRemovesCategory2"], "characterModifierLocations"], ["paperdolls", ["modifiers", "*", "modifierLocationID"], "characterModifierLocations"], ["paperdolls", ["modifiers", "*", "paperdollResourceID"], "characterResources"], ["paperdolls", ["colorSelections", "*", "colorID"], "characterColorLocations"], ["paperdolls", ["colorSelections", "*", "colorNameA"], "characterColorNames"], ["paperdolls", ["colorSelections", "*", "colorNameBC"], "characterColorNames"], ["paperdolls", ["sculptWeights", "*", "sculptLocationID"], "characterSculptingLocations"], ["paperdolls", ["backgroundID"], "characterPortraitResources"], ["characterPartTypes", ["partSource"], "characterPartSources"], ["characterPartTypes", ["partSources", "*"], "characterPartSources"], ["characterPartSources", ["metadata"], "characterPartMetadata"], ["characterPartSources", ["versions", "*", "metadata"], "characterPartMetadata"], ["characterPartMetadata", ["dependencies", "*", "partSource"], "characterPartSources"], ["characterPartMetadata", ["dependencies", "*", "modifierLocation"], "characterModifierLocations"], ["characterPartMetadata", ["occlusions", "*", "partSource"], "characterPartSources"], ["characterPartMetadata", ["occlusions", "*", "modifierLocation"], "characterModifierLocations"]];
const METADATA_FIELDS = ["sourceTarget", "sourceGame", "sourceProvider", "sourceBuild", "generatedAt"];

/** Builds schema-v8 model-shaped JSON from source documents and lossless definition catalogs. */
class CjsCharacterLibraryBuilder {
  static schema = "carbonenginejs.characterLibrary";
  static schemaVersion = 8;

  /** Builds one deterministic library value from keyed or named JSON documents. */
  static build(documents = {}, options = {}) {
    RequirePlainObject(options, "Character library options");
    const result = {
      schema: this.schema,
      schemaVersion: this.schemaVersion,
      documents: NormalizeDocuments(documents)
    };
    ApplyRelationships(result.documents);
    for (const field of METADATA_FIELDS) {
      if (options[field] !== null && options[field] !== undefined) {
        result[field] = RequireNonEmptyString(options[field], `Character library ${field}`);
      }
    }
    return _CjsCharacterLibrary.validateValues(result);
  }

  /** Builds from the single plain input object used by acquisition adapters. */
  static buildFromInputs(input = {}) {
    RequirePlainObject(input, "Character library builder input");
    const {
      documents,
      ...options
    } = input;
    if (documents === undefined) {
      throw new TypeError("Character library builder input must define documents");
    }
    return this.build(documents, options);
  }
}
function NormalizeDocuments(input) {
  const source = new Map();
  if (Array.isArray(input)) {
    for (let index = 0; index < input.length; index++) {
      const descriptor = input[index];
      RequirePlainObject(descriptor, `Character document descriptor ${index}`);
      AddDocument(source, descriptor.name, descriptor.data);
    }
  } else {
    RequirePlainObject(input, "Character library document input");
    for (const [name, data] of Object.entries(input)) {
      AddDocument(source, name, data);
    }
  }
  const missing = DOCUMENT_NAMES.filter(name => _CjsCharacterLibraryD.isRequiredDocument(name) && !source.has(name));
  const extra = [...source.keys()].filter(name => !DOCUMENT_NAMES.includes(name));
  if (missing.length) {
    throw new Error(`Character library is missing documents: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`Character library has unsupported documents: ${extra.sort(CompareText).join(", ")}`);
  }
  return Object.fromEntries(DOCUMENT_NAMES.map(name => [name, source.get(name) ?? []]));
}
function AddDocument(documents, value, data) {
  const name = String(value ?? "").trim();
  if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(name)) {
    throw new TypeError(`Invalid character document name ${JSON.stringify(value)}`);
  }
  if (documents.has(name)) {
    throw new Error(`Duplicate character document ${JSON.stringify(name)}`);
  }
  RequirePlainObject(data, `Character document ${name}`);
  const records = [];
  for (const recordID of Object.keys(data).sort(CompareIdentities)) {
    if (!recordID.trim()) {
      throw new TypeError(`Character document ${name} recordID must be a non-empty string`);
    }
    const record = data[recordID];
    RequirePlainObject(record, `Character document ${name} record ${recordID}`);
    if (Object.hasOwn(record, "recordID")) {
      throw new TypeError(`Character document ${name} record ${recordID} already defines reserved recordID`);
    }
    const copied = CloneJSON(record, `Character document ${name} record ${recordID}`, new WeakSet());
    const identified = {};
    DefineValue(identified, "recordID", String(recordID));
    for (const [key, child] of Object.entries(copied)) {
      DefineValue(identified, key, child);
    }
    records.push(identified);
  }
  documents.set(name, records);
}
function ApplyRelationships(documents) {
  const recordsByDocument = new Map(DOCUMENT_NAMES.map(name => [name, new Map(documents[name].map(record => [record.recordID, record]))]));
  const reservedGraphIDs = CollectGraphIDs(documents);
  const relationshipGraphIDs = new Map();
  let nextGraphID = 1;
  const AllocateGraphID = () => {
    while (reservedGraphIDs.has(nextGraphID)) nextGraphID++;
    const graphID = nextGraphID++;
    reservedGraphIDs.add(graphID);
    return graphID;
  };
  const CreateReference = (targetName, targetID, target) => {
    const graphKey = `${targetName}:${targetID}`;
    let graphID = relationshipGraphIDs.get(graphKey);
    if (graphID === undefined) {
      graphID = target._id ?? AllocateGraphID();
      relationshipGraphIDs.set(graphKey, graphID);
      if (target._id === undefined || target._id === null) target._id = graphID;
    }
    return {
      _ref: graphID
    };
  };
  for (const [sourceName, path, targetName] of RELATIONSHIPS) {
    for (const source of documents[sourceName]) {
      VisitRelationshipField(source, path, 0, `${sourceName}.${source.recordID}`, (owner, field, label) => {
        if (owner[field] === null || owner[field] === undefined) {
          return;
        }
        const targetID = NormalizeIdentity(owner[field], label);
        if (targetID === "0") {
          owner[field] = null;
          return;
        }
        const target = recordsByDocument.get(targetName).get(targetID);
        if (!target) {
          owner[field] = targetID;
          return;
        }
        owner[field] = CreateReference(targetName, targetID, target);
      });
    }
  }
  const partTypes = recordsByDocument.get("characterPartTypes");
  for (const resource of documents.characterResources) {
    if (Object.hasOwn(resource, "partType")) {
      throw new TypeError(`Character document characterResources record ${resource.recordID} contains reserved derived relationship partType`);
    }
    const sourcePath = resource.resPath;
    if (sourcePath === null || sourcePath === undefined) {
      continue;
    }
    const targetID = NormalizeIdentity(sourcePath, `characterResources.${resource.recordID}.resPath`);
    const target = partTypes.get(targetID);
    if (target) {
      resource.partType = CreateReference("characterPartTypes", targetID, target);
    }
  }
}
function VisitRelationshipField(value, path, index, label, visit) {
  if (index === path.length - 1) {
    if (!IsPlainObject(value)) {
      throw new TypeError(`${label} must be an object`);
    }
    const field = path[index];
    if (Object.hasOwn(value, field)) {
      visit(value, field, `${label}.${field}`);
    }
    return;
  }
  if (!IsPlainObject(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const field = path[index];
  if (!Object.hasOwn(value, field) || value[field] === null) {
    return;
  }
  if (path[index + 1] === "*") {
    if (!Array.isArray(value[field])) {
      throw new TypeError(`${label}.${field} must be an array`);
    }
    if (index + 2 === path.length) {
      for (let itemIndex = 0; itemIndex < value[field].length; itemIndex++) {
        visit(value[field], itemIndex, `${label}.${field}[${itemIndex}]`);
      }
      return;
    }
    for (let itemIndex = 0; itemIndex < value[field].length; itemIndex++) {
      VisitRelationshipField(value[field][itemIndex], path, index + 2, `${label}.${field}[${itemIndex}]`, visit);
    }
    return;
  }
  VisitRelationshipField(value[field], path, index + 1, `${label}.${field}`, visit);
}
function NormalizeIdentity(value, label) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (Number.isSafeInteger(value)) {
    return String(value);
  }
  throw new TypeError(`${label} identity must be a non-empty string or safe integer`);
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
    result = value.map((child, index) => CloneJSON(child, `${label}[${index}]`, active));
  } else {
    RequirePlainObject(value, label);
    result = {};
    for (const [key, child] of Object.entries(value)) {
      DefineValue(result, key, CloneJSON(child, `${label}.${key}`, active));
    }
  }
  active.delete(value);
  return result;
}
function CollectGraphIDs(documents) {
  const reservedGraphIDs = new Set();
  const definedGraphIDs = new Set();
  const referencedGraphIDs = new Set();
  for (const [documentName, records] of Object.entries(documents)) {
    for (let index = 0; index < records.length; index++) {
      VisitGraphMetadata(records[index], `${documentName}[${index}]`, reservedGraphIDs, definedGraphIDs, referencedGraphIDs);
    }
  }
  const unresolved = [...referencedGraphIDs].filter(value => !definedGraphIDs.has(value));
  if (unresolved.length) {
    throw new TypeError(`Unresolved character graph _ref ids: ${unresolved.map(JSON.stringify).join(", ")}`);
  }
  return reservedGraphIDs;
}
function VisitGraphMetadata(value, label, reservedGraphIDs, definedGraphIDs, referencedGraphIDs) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      VisitGraphMetadata(value[index], `${label}[${index}]`, reservedGraphIDs, definedGraphIDs, referencedGraphIDs);
    }
    return;
  }
  if (!IsPlainObject(value)) return;
  if (value._id !== undefined && value._id !== null) {
    const graphID = RequireGraphID(value._id, `${label}._id`);
    if (definedGraphIDs.has(graphID)) {
      throw new TypeError(`Duplicate character graph _id ${JSON.stringify(graphID)}`);
    }
    definedGraphIDs.add(graphID);
    reservedGraphIDs.add(graphID);
  }
  if (value._ref !== undefined && value._ref !== null) {
    const graphID = RequireGraphID(value._ref, `${label}._ref`);
    referencedGraphIDs.add(graphID);
    reservedGraphIDs.add(graphID);
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "_id" || key === "_ref") continue;
    VisitGraphMetadata(child, `${label}.${key}`, reservedGraphIDs, definedGraphIDs, referencedGraphIDs);
  }
}
function RequireGraphID(value, label) {
  if (typeof value === "string" && value.length || typeof value === "number" && Number.isSafeInteger(value)) {
    return value;
  }
  throw new TypeError(`${label} must be a non-empty string or safe integer graph identity`);
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
function RequireNonEmptyString(value, label) {
  const result = String(value).trim();
  if (!result) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return result;
}
function CompareText(left, right) {
  return String(left).localeCompare(String(right), "en");
}
function CompareIdentities(left, right) {
  const a = String(left);
  const b = String(right);
  if (/^-?\d+$/u.test(a) && /^-?\d+$/u.test(b)) {
    const aa = BigInt(a);
    const bb = BigInt(b);
    return aa < bb ? -1 : aa > bb ? 1 : 0;
  }
  return CompareText(a, b);
}
function DefineValue(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  });
}

export { CjsCharacterLibraryBuilder };
//# sourceMappingURL=CjsCharacterLibraryBuilder.js.map
