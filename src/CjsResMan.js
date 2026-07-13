import { CjsMotherLode } from "./CjsMotherLode.js";
import { CjsEventEmitter } from "@carbonenginejs/core-types/model";
import { CjsResource } from "./CjsResource.js";
import {
  getResourceExtension,
  normalizeResourceExtension,
  normalizeResourcePath
} from "./resourcePath.js";

export class CjsResMan extends CjsEventEmitter
{
  constructor(options = {}) {
    super();
    this.motherLode = new CjsMotherLode();
    this.source = null;
    this.resourceTypes = new Map();
    this.objectLoaders = new Map();
    this.formats = new Map();
    this.objectOperations = new WeakMap();
    this.sourceOperations = new WeakMap();
    this.formatOperations = new WeakMap();

    this.Register(options);
  }

  /**
   * Add or replace resource-manager configuration.
   *
   * The same options object can be forwarded unchanged by CjsLibrary. Format
   * classes continue to own their input extensions; resource types are keyed
   * by semantic requirements such as "texture", "image", or "geometry".
   */
  Register(options = {})
  {
    if (!options || typeof options !== "object" || Array.isArray(options))
    {
      throw new TypeError("CjsResMan.Register options must be an object.");
    }

    if (Object.prototype.hasOwnProperty.call(options, "motherLode"))
    {
      this.motherLode = options.motherLode || new CjsMotherLode();
    }
    if (Object.prototype.hasOwnProperty.call(options, "source"))
    {
      this.SetSource(options.source);
    }

    for (const entry of NormalizeRegistrationEntries(options.formats))
    {
      if (typeof entry === "function") this.RegisterFormat(entry);
      else this.RegisterFormat(entry.Format || entry.format, entry.defaults || {});
    }
    for (const entry of NormalizeRegistrationEntries(options.resourceTypes, true))
    {
      if (typeof entry === "function") this.RegisterResourceType(entry);
      else this.RegisterResourceType(entry.requirement || entry.payload || entry.key, entry.Constructor || entry.Resource || entry.resourceType, entry);
    }
    for (const [ ext, loader ] of Object.entries(options.objectLoaders || {}))
    {
      this.RegisterObjectLoader(ext, loader);
    }
    return this;
  }

  SetSource(source) {
    this.source = source || null;
    return this;
  }

  RegisterResourceType(requirement, Constructor = null, options = {})
  {
    if (typeof requirement === "function")
    {
      options = Constructor && typeof Constructor === "object" ? Constructor : {};
      Constructor = requirement;
      requirement = options.requirement || options.payload || Constructor.payload;
    }

    const key = NormalizeRequirement(requirement);
    if (!key) throw new TypeError("CjsResMan.RegisterResourceType requires a semantic requirement.");
    if (typeof Constructor !== "function")
    {
      throw new TypeError("CjsResMan.RegisterResourceType requires a constructor or factory.");
    }

    this.resourceTypes.set(key, Constructor);
    for (const alias of options.aliases || [])
    {
      const aliasKey = NormalizeRequirement(alias);
      if (aliasKey) this.resourceTypes.set(aliasKey, Constructor);
    }
    return this;
  }

  RegisterObjectLoader(ext, loader) {
    const key = normalizeResourceExtension(ext);
    if (!key) throw new TypeError("CjsResMan.RegisterObjectLoader requires an extension.");
    if (typeof loader !== "function") throw new TypeError("CjsResMan.RegisterObjectLoader requires a loader function.");
    this.objectLoaders.set(key, loader);
    return this;
  }

  /**
   * Register a reusable format facade for each accepted input extension.
   * Multiple candidates may share an extension and are resolved by requested
   * output/media type or by their support probes.
   *
   * @param {Function} Format
   * @param {object} defaults
   * @returns {CjsResMan}
   */
  RegisterFormat(Format, defaults = {})
  {
    if (typeof Format !== "function")
    {
      throw new TypeError("CjsResMan.RegisterFormat requires a format class.");
    }
    if (!Array.isArray(Format.inputTypes) || Format.inputTypes.length === 0)
    {
      throw new TypeError(`${Format.name || "Format"} must declare non-empty inputTypes.`);
    }

    const descriptor = Object.freeze({ Format, defaults: Object.freeze({ ...defaults }) });
    for (const inputType of Format.inputTypes)
    {
      const key = normalizeResourceExtension(inputType);
      if (!key) continue;
      const candidates = this.formats.get(key) || [];
      const next = candidates.filter(candidate => candidate.Format !== Format);
      next.push(descriptor);
      this.formats.set(key, next);
    }
    return this;
  }

  GetFormats(inputType)
  {
    return this.GetFormatDescriptors(inputType).map(descriptor => descriptor.Format);
  }

  ResolveFormat(inputType, options = {})
  {
    return this.ResolveFormatDescriptor(inputType, options).Format;
  }

  GetResource(path, options = {}) {
    const key = normalizeResourcePath(path);
    const variant = this.GetResourceVariant(options);
    const existing = this.motherLode.Lookup(key, variant);
    if (existing && options.reload !== true) return existing;

    const ext = normalizeResourceExtension(options.ext || getResourceExtension(key));
    const Constructor = this.ResolveResourceConstructor(options);
    const resource = this.CreateResource(Constructor, key, ext, options);
    this.motherLode.Insert(resource, key, variant);
    return resource;
  }

  GetObject(path, options = {})
  {
    const resource = this.GetResource(path, options);
    const existing = this.objectOperations.get(resource);
    if (existing)
    {
      return existing.promise;
    }

    const promise = this.LoadResourceObject(resource, options);
    this.objectOperations.set(resource, { promise });
    return promise;
  }

  LoadObject(path, options = {})
  {
    return this.GetObject(path, options);
  }

  FetchObject(path, options = {})
  {
    return this.GetObject(path, options);
  }

  async FetchResource(path, options = {})
  {
    const resource = this.GetResource(path, options);
    await resource.Ready(options);
    return resource;
  }

  Fetch(path, options = {})
  {
    return options.resource === true || options.requirement !== undefined || options.payload !== undefined
      ? this.FetchResource(path, options)
      : this.FetchObject(path, options);
  }

  async LoadResourceObject(resource, options)
  {
    resource.MarkLoading();

    try {
      const bytes = await this.ReadResource(resource.GetPath(), options);
      const explicitLoader = this.GetObjectLoader(resource.GetExt());
      let object;

      if (explicitLoader)
      {
        object = await explicitLoader(bytes, {
          ...options,
          path: resource.GetPath(),
          ext: resource.GetExt(),
          resource,
          resMan: this
        });
      }
      else
      {
        const descriptor = this.ResolveFormatDescriptor(resource.GetExt(), {
          ...options,
          bytes
        });
        object = await this.ReadFormatOnce(resource, descriptor, bytes, options);
      }

      let result = object;
      if (resource.constructor !== CjsResource && typeof resource.SetDTO === "function")
      {
        resource.SetDTO(object, options);
        resource.object = resource;
        result = resource;
      }
      else
      {
        resource.object = object;
      }
      resource.MarkLoaded();
      return result;
    } catch (error) {
      resource.SetError(error);
      throw error;
    }
  }

  async Prefetch(paths, options = {}) {
    const entries = Array.isArray(paths) ? paths : [paths];
    return Promise.all(entries.map(path => this.LoadObject(path, options)));
  }

  GetObjectLoader(ext) {
    return this.objectLoaders.get(normalizeResourceExtension(ext)) || null;
  }

  GetFormatDescriptors(inputType)
  {
    return [ ...(this.formats.get(normalizeResourceExtension(inputType)) || []) ];
  }

  ResolveFormatDescriptor(inputType, options = {})
  {
    const key = normalizeResourceExtension(inputType);
    let candidates = this.GetFormatDescriptors(key);

    if (options.format)
    {
      candidates = candidates.filter(({ Format }) => Format === options.format
        || Format.id === options.format
        || Format.name === options.format);
    }

    if (options.emit)
    {
      candidates = candidates.filter(({ Format }) => [
        ...(Format.outputTypes || []),
        ...(Format.debugOutputTypes || [])
      ].includes(options.emit));
    }

    if (options.mediaType)
    {
      candidates = candidates.filter(({ Format }) => (Format.mediaTypes || []).includes(options.mediaType));
    }

    if (candidates.length > 1 && options.bytes !== undefined)
    {
      const supported = candidates.filter(({ Format, defaults }) =>
      {
        if (typeof Format.isSupported !== "function") return false;
        const report = Format.isSupported(options.bytes, {
          ...defaults,
          ...(options.formatOptions || {})
        });
        return report && report.supported !== false;
      });
      if (supported.length === 1) candidates = supported;
    }

    if (candidates.length === 0)
    {
      const error = new Error(`No format registered for .${key}`);
      error.code = "CJS_RESOURCE_FORMAT_MISSING";
      error.ext = key;
      throw error;
    }

    if (candidates.length > 1)
    {
      const error = new Error(`Ambiguous formats registered for .${key}`);
      error.code = "CJS_RESOURCE_FORMAT_AMBIGUOUS";
      error.ext = key;
      error.formats = candidates.map(({ Format }) => Format.name);
      throw error;
    }

    return candidates[0];
  }

  async ReadFormat(descriptor, bytes, options = {})
  {
    const { Format, defaults } = descriptor;
    const formatOptions = {
      ...defaults,
      ...(options.formatOptions || {})
    };
    if (options.emit !== undefined) formatOptions.emit = options.emit;
    if (options.classes !== undefined) formatOptions.classes = options.classes;

    if (typeof Format.readAsync === "function")
    {
      return Format.readAsync(bytes, formatOptions);
    }
    if (typeof Format.read === "function")
    {
      return Format.read(bytes, formatOptions);
    }

    const reader = new Format(formatOptions);
    if (typeof reader.ReadAsync === "function")
    {
      return reader.ReadAsync(bytes, formatOptions);
    }
    if (typeof reader.Read === "function")
    {
      return reader.Read(bytes, formatOptions);
    }
    throw new TypeError(`${Format.name} does not expose a read operation.`);
  }

  Lookup(path, options = {}) {
    return this.motherLode.Lookup(path, this.GetResourceVariant(options));
  }

  Delete(path, options = null) {
    return options === null || options === undefined
      ? this.motherLode.DeleteAll(path)
      : this.motherLode.Delete(path, this.GetResourceVariant(options));
  }

  Clear() {
    this.motherLode.Clear();
    this.objectOperations = new WeakMap();
    this.sourceOperations = new WeakMap();
    this.formatOperations = new WeakMap();
    return this;
  }

  async ReadResource(path, options = {}) {
    const source = options.source || this.source;
    if (!source || typeof source.Read !== "function") {
      throw new TypeError("CjsResMan requires a source with Read(path, options) to load objects.");
    }

    if (options.reload === true || options.cacheSource === false)
    {
      return source.Read(path, options);
    }

    let operations = this.sourceOperations.get(source);
    if (!operations)
    {
      operations = new Map();
      this.sourceOperations.set(source, operations);
    }

    const key = normalizeResourcePath(path);
    const existing = operations.get(key);
    if (existing) return existing;

    const operation = Promise.resolve().then(() => source.Read(path, options));
    operations.set(key, operation);
    operation.then(() =>
    {
      if (options.cacheSource !== true && operations.get(key) === operation) operations.delete(key);
    }, () =>
    {
      if (operations.get(key) === operation) operations.delete(key);
    });
    return operation;
  }

  CreateResource(Constructor, path, ext, options = {}) {
    const resource = new Constructor(options.values);
    if (!resource || typeof resource.Initialize !== "function") {
      throw new TypeError("Resource constructor must create a CjsResource-compatible object.");
    }
    resource.Initialize(path, ext, NormalizeRequirement(options.requirement || options.payload || ""));
    if (typeof resource.SetObjectLoader === "function")
    {
      const identityOptions = GetIdentityOptions(options);
      resource.SetObjectLoader(loadOptions => this.GetObject(path, {
        ...identityOptions,
        ...loadOptions
      }));
    }
    return resource;
  }

  ResolveResourceConstructor(options = {})
  {
    const requested = NormalizeRequirement(options.requirement || options.payload);
    if (requested && this.resourceTypes.has(requested)) return this.resourceTypes.get(requested);

    const emitted = NormalizeRequirement(options.emit);
    if (emitted && this.resourceTypes.has(emitted)) return this.resourceTypes.get(emitted);

    return CjsResource;
  }

  GetResourceVariant(options = {})
  {
    const identity = GetIdentityOptions(options);
    return Object.keys(identity).length ? StableSerialize(identity) : "";
  }

  ReadFormatOnce(resource, descriptor, bytes, options = {})
  {
    const { Format } = descriptor;
    let operations = this.formatOperations.get(Format);
    if (!operations)
    {
      operations = new Map();
      this.formatOperations.set(Format, operations);
    }

    const key = `${resource.GetPath()}\u0000${StableSerialize({
      emit: options.emit,
      mediaType: options.mediaType,
      classes: options.classes,
      formatOptions: options.formatOptions
    })}`;
    const existing = operations.get(key);
    if (existing) return existing;

    const operation = Promise.resolve().then(() => this.ReadFormat(descriptor, bytes, options));
    operations.set(key, operation);
    operation.then(() =>
    {
      if (options.cacheFormat !== true && operations.get(key) === operation) operations.delete(key);
    }, () =>
    {
      if (operations.get(key) === operation) operations.delete(key);
    });
    return operation;
  }
}

function StableSerialize(value, seen = new WeakSet())
{
  if (value === undefined) return "undefined";
  if (value === null || typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function") return `[Function:${value.name || "anonymous"}]`;
  if (ArrayBuffer.isView(value))
  {
    return `[${value.constructor.name}:${value.byteOffset}:${value.byteLength}]`;
  }
  if (value instanceof ArrayBuffer) return `[ArrayBuffer:${value.byteLength}]`;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return `[${value.map(entry => StableSerialize(entry, seen)).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${StableSerialize(value[key], seen)}`).join(",")}}`;
}

function GetIdentityOptions(options = {})
{
  const identity = {};
  for (const key of [ "requirement", "payload", "emit", "mediaType", "format", "classes", "formatOptions" ])
  {
    if (options[key] !== undefined) identity[key] = options[key];
  }
  return identity;
}

function NormalizeRequirement(value)
{
  return value === null || value === undefined
    ? ""
    : String(value).trim().toLowerCase();
}

function NormalizeRegistrationEntries(value, keyed = false)
{
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "function") return [ value ];
  if (typeof value !== "object")
  {
    throw new TypeError("CjsResMan registration collections must be arrays or objects.");
  }

  if (value.Format || value.format || value.Constructor || value.Resource || value.resourceType)
  {
    return [ value ];
  }

  return Object.entries(value).map(([ key, entry ]) =>
  {
    if (!keyed) return typeof entry === "function" ? entry : { ...entry, key };
    return typeof entry === "function"
      ? { key, requirement: key, Constructor: entry }
      : { ...entry, key, requirement: entry.requirement || entry.payload || key };
  });
}
