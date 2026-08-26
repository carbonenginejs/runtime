import { CjsBlackFormat } from "#resource/formats/black";
import { EveSOFData } from "./EveSOFData.js";
import { EveSOFDataMgr } from "./EveSOFDataMgr.js";


const DEFAULT_BASE_PATH = "res:/dx9/model/spaceobjectfactory";
const GENERIC_FILE_NAME = "generic.black";
const NONE = "none";
const CATALOGS = Object.freeze({
  hull: Object.freeze({
    directory: "hulls",
    has: "HasHullData",
    get: "GetHullData",
    update: "UpdateHull"
  }),
  faction: Object.freeze({
    directory: "factions",
    has: "HasFactionData",
    get: "GetFactionData",
    update: "UpdateFaction"
  }),
  race: Object.freeze({
    directory: "races",
    has: "HasRaceData",
    get: "GetRaceData",
    update: "UpdateRace"
  }),
  material: Object.freeze({
    directory: "materials",
    has: "HasMaterialData",
    get: "GetMaterialData",
    update: "UpdateMaterial"
  }),
  pattern: Object.freeze({
    directory: "patterns",
    has: "HasPatternData",
    get: "GetPatternData",
    update: "UpdatePattern"
  }),
  layout: Object.freeze({
    directory: "layouts",
    has: "HasLayoutData",
    get: "GetLayoutData",
    update: "UpdateLayout"
  })
});


/**
 * Builds and grows one serializable partial SOF catalog from individual Black
 * records, publishing each decoded record into an EveSOFDataMgr.
 */
export class CjsSofLibraryBuilder
{

  #dataMgr;

  #readObject;

  #pending = new Map();

  #bootOperation = null;

  /** Creates a lazy catalog around one exact manager and object/byte source. */
  constructor({
    dataMgr,
    data = null,
    source = null,
    basePath = DEFAULT_BASE_PATH
  } = {})
  {
    if (!(dataMgr instanceof EveSOFDataMgr))
    {
      throw new TypeError("CjsSofLibraryBuilder dataMgr must be an EveSOFDataMgr.");
    }
    if (typeof source !== "function")
    {
      throw new TypeError("CjsSofLibraryBuilder requires a decoded-object or Black-byte source function.");
    }

    this.#dataMgr = dataMgr;
    this.basePath = normalizeSofPath(basePath).replace(/\/+$/u, "");
    if (!this.basePath)
    {
      throw new TypeError("CjsSofLibraryBuilder basePath must be a non-empty resource path.");
    }
    this.data = new EveSOFData();
    this.#readObject = source;
    if (data !== null) this.SetData(data);
  }

  /** Space-object-factory resource directory containing generic and named catalogs. */
  basePath = DEFAULT_BASE_PATH;

  /** Mutable partial source catalog suitable for GetValues persistence. */
  data;

  /** Returns the exact manager receiving normalized catalog updates. */
  GetDataManager()
  {
    return this.#dataMgr;
  }

  /** Replaces the partial source catalog and rebuilds the manager from it. */
  SetData(data)
  {
    if (!data || typeof data !== "object" || Array.isArray(data))
    {
      throw new TypeError("CjsSofLibraryBuilder data must be an EveSOFData-shaped object.");
    }

    const catalog = new EveSOFData();
    for (const kind of Object.keys(CATALOGS))
    {
      const values = data[kind] ?? [];
      if (!Array.isArray(values))
      {
        throw new TypeError(`CjsSofLibraryBuilder data.${kind} must be an array.`);
      }
      catalog[kind] = values.slice();
    }
    catalog.generic = data.generic ?? null;
    if (!catalog.generic)
    {
      throw new TypeError("CjsSofLibraryBuilder data requires generic SOF data.");
    }
    if (!this.#dataMgr.SetData(catalog))
    {
      throw new TypeError("CjsSofLibraryBuilder could not install the supplied SOF catalog.");
    }
    this.data = catalog;
    this.#bootOperation = Promise.resolve(catalog.generic);
    return this;
  }

  /** Returns detached model values for caching or caller-managed transport. */
  GetValues(options = {})
  {
    return this.data.GetValues(options);
  }

  /** Loads generic.black once and publishes it as the manager's generic data. */
  async InitializeAsync(options = {})
  {
    await this.EnsureGeneric(options);
    return this;
  }

  /** Ensures the minimum generic.black catalog record is installed. */
  EnsureGeneric(options = {})
  {
    const force = requireForceOption(options);
    if (!force && this.#dataMgr.HasGenericData())
    {
      if (!this.data.generic) this.data.generic = this.#dataMgr.GetGenericData();
      return Promise.resolve(this.data.generic);
    }
    if (!force && this.#bootOperation) return this.#bootOperation;

    const path = `${this.basePath}/${GENERIC_FILE_NAME}`;
    const operation = this.#Read(path, {
      kind: "generic",
      name: "generic",
      role: "sofCatalog",
      signal: options.signal ?? null
    }).then(async value =>
    {
      if (!value || typeof value !== "object" || Array.isArray(value))
      {
        throw new TypeError(`SOF generic catalog did not contain an object: ${path}`);
      }
      if (!this.#dataMgr.UpdateGeneric(value))
      {
        throw new TypeError(`SOF manager rejected generic catalog data: ${path}`);
      }
      this.data.generic = value;
      await this.#EnsureGenericDependencies(options);
      return value;
    });
    this.#bootOperation = operation;
    operation.catch(() =>
    {
      if (this.#bootOperation === operation) this.#bootOperation = null;
    });
    return operation;
  }

  /** Ensures the complete named-catalog closure required by one DNA string. */
  async EnsureFromDNA(dnaString, options = {})
  {
    await this.EnsureGeneric(options);
    const requirements = CjsSofLibraryBuilder.ParseDnaRequirements(dnaString);
    const [ , faction ] = await Promise.all([
      Promise.all(requirements.hulls.map(name => this.FetchHull(name, options))),
      this.FetchFaction(requirements.faction, options),
      this.FetchRace(requirements.race, options),
      Promise.all(requirements.materials.map(name => this.FetchMaterial(name, options))),
      Promise.all(requirements.patterns.map(name => this.FetchPattern(name, options)))
    ]);
    await this.#EnsureFactionDependencies(faction, options);

    const layoutContext = Object.freeze({
      faction: requirements.faction,
      race: requirements.race
    });
    const visitedLayouts = new Set();
    await Promise.all(requirements.layouts.map(name =>
      this.#EnsureLayout(name, layoutContext, visitedLayouts, options)));
    return this;
  }

  /** Fetches or returns one hull catalog record. */
  FetchHull(nameOrPath, options = {})
  {
    return this.#FetchNamed("hull", nameOrPath, options);
  }

  /** Fetches or returns one faction catalog record. */
  FetchFaction(nameOrPath, options = {})
  {
    return this.#FetchNamed("faction", nameOrPath, options);
  }

  /** Fetches or returns one race catalog record. */
  FetchRace(nameOrPath, options = {})
  {
    return this.#FetchNamed("race", nameOrPath, options);
  }

  /** Fetches or returns one material catalog record. */
  FetchMaterial(nameOrPath, options = {})
  {
    return this.#FetchNamed("material", nameOrPath, options);
  }

  /** Fetches or returns one pattern catalog record. */
  FetchPattern(nameOrPath, options = {})
  {
    return this.#FetchNamed("pattern", nameOrPath, options);
  }

  /** Fetches or returns one layout catalog record. */
  FetchLayout(nameOrPath, options = {})
  {
    return this.#FetchNamed("layout", nameOrPath, options);
  }

  /** Parses catalog names from DNA without requiring any catalog to be loaded. */
  static ParseDnaRequirements(dnaString)
  {
    const dna = String(dnaString ?? "").trim().toLowerCase();
    const parts = splitCarbon(dna, ":");
    if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2])
    {
      throw new TypeError("SOF lazy loading requires a DNA hull, faction, and race.");
    }

    const commands = new Map();
    for (let index = 3; index < parts.length; index++)
    {
      const command = splitCarbon(parts[index], "?");
      if (command.length !== 2 || !command[0])
      {
        throw new TypeError(`SOF lazy loading received a malformed DNA command: ${parts[index]}`);
      }
      commands.set(command[0], splitCarbon(command[1], ";"));
    }
    if (commands.has("mesh") && !commands.has("material"))
    {
      commands.set("material", commands.get("mesh"));
    }

    const patternArgs = commands.get("pattern") ?? [];
    return Object.freeze({
      dna,
      hulls: freezeNames(splitCarbon(parts[0], ";")),
      faction: normalizeCatalogName(parts[1], "faction"),
      race: normalizeCatalogName(parts[2], "race"),
      materials: freezeNames([
        ...(commands.get("material") ?? []),
        ...patternArgs.slice(1)
      ]),
      patterns: freezeNames(patternArgs.slice(0, 1)),
      layouts: freezeNames(commands.get("layout") ?? [])
    });
  }

  /** Loads, normalizes, and publishes one named catalog record. */
  async #FetchNamed(kind, nameOrPath, options)
  {
    const force = requireForceOption(options);
    await this.EnsureGeneric({ signal: options.signal ?? null });
    const request = normalizeNamedRequest(kind, nameOrPath, this.basePath);
    const config = CATALOGS[kind];
    if (!force && this.#dataMgr[config.has](request.name))
    {
      return findNamedRecord(this.data[kind], request.name)
        ?? this.#dataMgr[config.get](request.name);
    }

    const key = `${kind}:${request.name}`;
    const existing = this.#pending.get(key);
    if (existing) return existing;

    const operation = this.#Read(request.path, {
      kind,
      name: request.name,
      role: "sofCatalog",
      signal: options.signal ?? null
    }).then(value => this.#PublishNamed(kind, request, value));
    this.#pending.set(key, operation);
    const clear = () =>
    {
      if (this.#pending.get(key) === operation) this.#pending.delete(key);
    };
    operation.then(clear, clear);
    return operation;
  }

  /** Validates one fetched named record and updates the source and manager. */
  #PublishNamed(kind, request, value)
  {
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
      throw new TypeError(`SOF ${kind} catalog did not contain an object: ${request.path}`);
    }
    const name = normalizeCatalogName(value.name, `${kind} object name`);
    if (!request.isPath && name !== request.name)
    {
      throw new TypeError(`SOF ${kind} catalog ${request.path} returned ${JSON.stringify(name)} instead of ${JSON.stringify(request.name)}.`);
    }

    const config = CATALOGS[kind];
    if (!this.#dataMgr[config.update](name, value))
    {
      throw new TypeError(`SOF manager rejected ${kind} catalog data: ${request.path}`);
    }
    replaceNamedRecord(this.data[kind], name, value);
    return value;
  }

  /** Loads every material and default pattern referenced by one faction. */
  async #EnsureFactionDependencies(faction, options)
  {
    if (!faction) return;
    const managedFaction = this.#dataMgr.GetFactionData(
      normalizeCatalogName(faction.name, "faction object name")
    );
    await Promise.all([
      ...freezeNames([
        managedFaction.defaultPatternLayer1MaterialName,
        managedFaction.defaultPatternLayer2MaterialName,
        ...managedFaction.areaMaterials.materialNames.values()
      ]).map(name => this.FetchMaterial(name, options)),
      ...freezeNames([managedFaction.defaultPatternName])
        .map(name => this.FetchPattern(name, options))
    ]);
  }

  /** Loads every material referenced by the normalized generic wreck areas. */
  async #EnsureGenericDependencies(options)
  {
    const generic = this.#dataMgr.GetGenericData();
    await Promise.all(freezeNames([
      ...generic.genericWreckMaterialData.materialNames.values()
    ]).map(name => this.FetchMaterial(name, options)));
  }

  /** Recursively loads one layout and every catalog named by its descriptors. */
  async #EnsureLayout(layoutName, context, visited, options)
  {
    const name = normalizeCatalogName(layoutName, "layout");
    const key = `${name}:${context.faction}:${context.race}`;
    if (visited.has(key)) return;
    visited.add(key);

    const layout = await this.FetchLayout(name, options);
    const descriptors = collectLayoutDescriptors(layout?.placements ?? []);
    for (const descriptor of descriptors)
    {
      const factionName = optionalCatalogName(descriptor.faction) || context.faction;
      const raceName = optionalCatalogName(descriptor.race) || context.race;
      const [ , faction ] = await Promise.all([
        Promise.all(freezeNames(splitCarbon(String(descriptor.hull ?? "").toLowerCase(), ";"))
          .map(hull => this.FetchHull(hull, options))),
        this.FetchFaction(factionName, options),
        this.FetchRace(raceName, options),
        Promise.all(freezeNames([
          descriptor.material1,
          descriptor.material2,
          descriptor.material3,
          descriptor.material4
        ]).map(material => this.FetchMaterial(material, options))),
        Promise.all(freezeNames([descriptor.pattern])
          .map(pattern => this.FetchPattern(pattern, options)))
      ]);
      await this.#EnsureFactionDependencies(faction, options);
      const nestedLayout = optionalCatalogName(descriptor.layout);
      if (nestedLayout)
      {
        await this.#EnsureLayout(nestedLayout, Object.freeze({
          faction: factionName,
          race: raceName
        }), visited, options);
      }
    }
  }

  /** Reads one source result and normalizes decoded objects or Black bytes. */
  async #Read(path, context)
  {
    return normalizeSofObject(await this.#readObject(path, context), path);
  }

}

async function normalizeSofObject(value, path)
{
  let input = value;
  if (input && typeof input.arrayBuffer === "function")
  {
    input = await input.arrayBuffer();
  }
  else if (input && typeof input === "object" && Object.hasOwn(input, "object"))
  {
    return input.object;
  }
  else if (input && typeof input === "object" && Object.hasOwn(input, "bytes"))
  {
    input = input.bytes;
  }

  if (input instanceof ArrayBuffer || ArrayBuffer.isView(input))
  {
    const bytes = input instanceof ArrayBuffer
      ? input
      : input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    return CjsBlackFormat.readPayload(bytes, {}).object;
  }
  if (!input || typeof input !== "object")
  {
    throw new TypeError(`SOF catalog source returned no object or bytes for ${path}`);
  }
  return input;
}

function normalizeNamedRequest(kind, nameOrPath, basePath)
{
  const text = String(nameOrPath ?? "").trim();
  if (!text) throw new TypeError(`SOF ${kind} name or path must be non-empty.`);
  const isPath = text.includes("/") || /\.black$/iu.test(text);
  const normalizedPath = isPath ? normalizeSofPath(text) : "";
  const leaf = isPath
    ? normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1).replace(/\.black$/iu, "")
    : text;
  const name = normalizeCatalogName(leaf, kind);
  return Object.freeze({
    name,
    path: isPath
      ? normalizedPath
      : `${basePath}/${CATALOGS[kind].directory}/${name}.black`,
    isPath
  });
}

function normalizeCatalogName(value, label)
{
  const name = String(value ?? "").trim().toLowerCase();
  if (!name || name === NONE)
  {
    throw new TypeError(`SOF ${label} must be a non-empty catalog name.`);
  }
  return name;
}

function optionalCatalogName(value)
{
  const name = String(value ?? "").trim().toLowerCase();
  return !name || name === NONE ? "" : name;
}

function freezeNames(values)
{
  return Object.freeze([...new Set((values ?? [])
    .map(optionalCatalogName)
    .filter(Boolean))]);
}

function findNamedRecord(values, name)
{
  return values.find(value => optionalCatalogName(value?.name) === name) ?? null;
}

function replaceNamedRecord(values, name, value)
{
  const index = values.findIndex(item => optionalCatalogName(item?.name) === name);
  if (index === -1) values.push(value);
  else values[index] = value;
}

function collectLayoutDescriptors(placements, result = [], visited = new Set())
{
  for (const placement of Array.isArray(placements) ? placements : [])
  {
    if (!placement || typeof placement !== "object" || visited.has(placement)) continue;
    visited.add(placement);
    if (placement.descriptor && typeof placement.descriptor === "object")
    {
      result.push(placement.descriptor);
    }
    collectLayoutDescriptors(placement.placements, result, visited);
  }
  return result;
}

function requireForceOption(options)
{
  if (!options || typeof options !== "object" || Array.isArray(options))
  {
    throw new TypeError("SOF catalog load options must be an object.");
  }
  if (options.force !== undefined && typeof options.force !== "boolean")
  {
    throw new TypeError("SOF catalog force option must be a boolean.");
  }
  return options.force === true;
}

function splitCarbon(value, separator)
{
  if (value === "") return [];
  const result = String(value).split(separator);
  if (result[result.length - 1] === "") result.pop();
  return result;
}

function normalizeSofPath(value)
{
  return String(value ?? "")
    .trim()
    .replace(/\\/gu, "/")
    .replace(/\/{2,}/gu, "/")
    .toLowerCase();
}
