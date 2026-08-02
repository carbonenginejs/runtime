const DOCUMENT_NAMES = ["ancestries", "archetypes", "bloodlines", "characterAvatarBehaviors", "characterColorLocations", "characterColorNames", "characterModifierLocations", "characterPortraitResources", "characterResources", "characterSculptingLocations", "paperdolls", "races"];
const RELATIONSHIPS = [["ancestries", ["bloodlineID"], "bloodlines"], ["bloodlines", ["raceID"], "races"], ["characterResources", ["clothingAlsoCoversCategory"], "characterModifierLocations"], ["characterResources", ["clothingAlsoCoversCategory2"], "characterModifierLocations"], ["characterResources", ["clothingRemovesCategory"], "characterModifierLocations"], ["characterResources", ["clothingRemovesCategory2"], "characterModifierLocations"], ["paperdolls", ["modifiers", "*", "modifierLocationID"], "characterModifierLocations"], ["paperdolls", ["modifiers", "*", "paperdollResourceID"], "characterResources"], ["paperdolls", ["colorSelections", "*", "colorID"], "characterColorLocations"], ["paperdolls", ["colorSelections", "*", "colorNameA"], "characterColorNames"], ["paperdolls", ["colorSelections", "*", "colorNameBC"], "characterColorNames"], ["paperdolls", ["sculptWeights", "*", "sculptLocationID"], "characterSculptingLocations"], ["paperdolls", ["backgroundID"], "characterPortraitResources"]];
const METADATA_FIELDS = ["sourceTarget", "sourceGame", "sourceProvider", "sourceBuild", "generatedAt"];

/** Builds model-shaped character-library JSON from source-document records. */
class CjsCharacterLibraryBuilder {
  static schema = "carbonenginejs.characterLibrary";
  static schemaVersion = 4;

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
    return result;
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
  const missing = DOCUMENT_NAMES.filter(name => !source.has(name));
  const extra = [...source.keys()].filter(name => !DOCUMENT_NAMES.includes(name));
  if (missing.length) {
    throw new Error(`Character library is missing documents: ${missing.join(", ")}`);
  }
  if (extra.length) {
    throw new Error(`Character library has unsupported documents: ${extra.sort(CompareText).join(", ")}`);
  }
  return Object.fromEntries(DOCUMENT_NAMES.map(name => [name, source.get(name)]));
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
  const graphIDs = new Map();
  let nextGraphID = 1;
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
        const graphKey = `${targetName}:${targetID}`;
        let graphID = graphIDs.get(graphKey);
        if (graphID === undefined) {
          graphID = nextGraphID++;
          graphIDs.set(graphKey, graphID);
          target._id = graphID;
        }
        owner[field] = {
          _ref: graphID
        };
      });
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
    for (let itemIndex = 0; itemIndex < value[field].length; itemIndex++) {
      VisitRelationshipField(value[field][itemIndex], path, index + 2, `${label}.${field}[${itemIndex}]`, visit);
    }
    return;
  }
  VisitRelationshipField(value[field], path, index + 1, `${label}.${field}`, visit);
}
function NormalizeIdentity(value, label) {
  if (typeof value === "string" && value) {
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
      if (key === "_id" || key === "_ref" || key === "_type") {
        throw new TypeError(`${label} contains reserved model metadata ${key}`);
      }
      DefineValue(result, key, CloneJSON(child, `${label}.${key}`, active));
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
