import { CjsMotherLode } from "./CjsMotherLode.js";
import { CjsEventEmitter } from "@carbonenginejs/core-types/model";
import { CjsResource } from "./CjsResource.js";
import {
  CjsResManQueue,
  CjsResManWorkQueue,
  NormalizeCjsResManQueue
} from "./CjsResManQueue.js";
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
    this.queuedSourceOperations = new WeakMap();
    this.formatOperations = new WeakMap();
    this.preparePipelines = new Map();
    this.defaultPreparePipeline = "";
    this.maxConcurrentLoads = 8;
    this.maxPrepareTime = 0.005;
    this.maxPrepareItemsPerTick = 0;
    this.autoPumpMainThreadQueue = true;
    this.queueScheduler = DefaultQueueScheduler;
    this.urgentResourceLoads = false;
    this._backgroundPumpScheduled = false;
    this._mainThreadPumpScheduled = false;
    this._loadQueue = new CjsResManWorkQueue(CjsResManQueue.BACKGROUND, {
      concurrency: this.maxConcurrentLoads,
      onReady: () => this.ScheduleBackgroundQueue()
    });
    this._prepareQueue = new CjsResManWorkQueue(CjsResManQueue.MAIN, {
      concurrency: 1,
      onReady: () => this.ScheduleMainThreadQueue()
    });

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
    if (Object.prototype.hasOwnProperty.call(options, "maxConcurrentLoads"))
    {
      AssertPositiveInteger(options.maxConcurrentLoads, "maxConcurrentLoads");
      this.maxConcurrentLoads = options.maxConcurrentLoads;
      this._loadQueue.SetConcurrency(this.maxConcurrentLoads);
    }
    if (Object.prototype.hasOwnProperty.call(options, "maxPrepareTime"))
    {
      AssertNonNegativeNumber(options.maxPrepareTime, "maxPrepareTime");
      this.maxPrepareTime = options.maxPrepareTime;
    }
    if (Object.prototype.hasOwnProperty.call(options, "maxPrepareItemsPerTick"))
    {
      AssertNonNegativeInteger(options.maxPrepareItemsPerTick, "maxPrepareItemsPerTick");
      this.maxPrepareItemsPerTick = options.maxPrepareItemsPerTick;
    }
    if (Object.prototype.hasOwnProperty.call(options, "autoPumpMainThreadQueue"))
    {
      this.autoPumpMainThreadQueue = Boolean(options.autoPumpMainThreadQueue);
    }
    if (Object.prototype.hasOwnProperty.call(options, "queueScheduler"))
    {
      if (options.queueScheduler !== null && typeof options.queueScheduler !== "function")
      {
        throw new TypeError("CjsResMan queueScheduler must be a function or null.");
      }
      this.queueScheduler = options.queueScheduler || DefaultQueueScheduler;
    }
    if (Object.prototype.hasOwnProperty.call(options, "urgentResourceLoads"))
    {
      this.SetUrgentResourceLoads(options.urgentResourceLoads);
    }

    for (const [ name, entry ] of NormalizePreparePipelineEntries(options.preparePipelines))
    {
      const stages = Array.isArray(entry) ? entry : entry.stages;
      this.RegisterPreparePipeline(name, stages, {
        default: !Array.isArray(entry) && entry.default === true
      });
    }
    if (Object.prototype.hasOwnProperty.call(options, "defaultPreparePipeline"))
    {
      this.SetDefaultPreparePipeline(options.defaultPreparePipeline);
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

  RegisterPreparePipeline(name, stages, options = {}) {
    const key = NormalizePipelineName(name);
    if (!key) throw new TypeError("CjsResMan.RegisterPreparePipeline requires a name.");
    this.preparePipelines.set(key, Object.freeze(NormalizePrepareStages(stages)));
    if (options.default === true) this.defaultPreparePipeline = key;
    return this;
  }

  SetDefaultPreparePipeline(name = "") {
    const key = NormalizePipelineName(name);
    if (key && !this.preparePipelines.has(key)) {
      throw new Error(`Unknown CjsResMan prepare pipeline: ${key}`);
    }
    this.defaultPreparePipeline = key;
    return this;
  }

  GetPreparePipeline(name) {
    return [ ...(this.preparePipelines.get(NormalizePipelineName(name)) || []) ];
  }

  ResolvePrepareStages(options = {}) {
    const requested = options.preparePipeline ?? options.pipeline ?? this.defaultPreparePipeline;
    const key = NormalizePipelineName(requested);
    if (key && !this.preparePipelines.has(key)) {
      const error = new Error(`Unknown CjsResMan prepare pipeline: ${key}`);
      error.code = "CJS_RESOURCE_PREPARE_PIPELINE_MISSING";
      error.pipeline = key;
      throw error;
    }
    const stages = key ? this.GetPreparePipeline(key) : [];
    return [ ...stages, ...NormalizePrepareStages(options.prepareStages || []) ];
  }

  AddToQueue(queue, callback, context = null, flags = 0) {
    const task = this.QueueTask(queue, callback, context, { flags });
    task.promise.catch(error => {
      this.EmitEvent?.("queueerror", this, task.queue, task.id, error);
    });
    return task.id;
  }

  CancelFromQueue(queue, id, reason = "") {
    return this.GetWorkQueue(queue).Cancel(id, reason);
  }

  GetNextIdForQueue(queue) {
    return this.GetWorkQueue(queue).GetNextId();
  }

  PumpMainThreadQueue(options = {}) {
    const urgent = options.urgent === true || this.urgentResourceLoads;
    const result = this._prepareQueue.Pump({
      maxItems: urgent ? 0 : (options.maxItems ?? this.maxPrepareItemsPerTick),
      maxTime: urgent ? 0 : (options.maxTime ?? this.maxPrepareTime) * 1000,
      now: options.now
    });
    if (result.queued > 0 && result.active === 0) this.ScheduleMainThreadQueue();
    return result.processed > 0;
  }

  PumpBackgroundQueue(options = {}) {
    const result = this._loadQueue.Pump({
      maxItems: options.maxItems ?? 0,
      maxTime: options.maxTime === undefined ? 0 : options.maxTime * 1000,
      now: options.now
    });
    return result.processed > 0;
  }

  PauseQueue(queue) {
    this.GetWorkQueue(queue).Pause();
    return this;
  }

  ResumeQueue(queue) {
    const name = NormalizeCjsResManQueue(queue);
    this.GetWorkQueue(name).Resume();
    if (name === CjsResManQueue.MAIN) this.ScheduleMainThreadQueue();
    else this.ScheduleBackgroundQueue();
    return this;
  }

  GetPendingLoads() {
    return this._loadQueue.GetPendingCount();
  }

  GetPendingPrepares() {
    return this._prepareQueue.GetPendingCount();
  }

  GetQueueStats(queue = null) {
    if (queue !== null && queue !== undefined) return this.GetWorkQueue(queue).GetStats();
    return Object.freeze({
      loads: this._loadQueue.GetStats(),
      prepares: this._prepareQueue.GetStats()
    });
  }

  SetUrgentResourceLoads(value) {
    this.urgentResourceLoads = Boolean(value);
    return this;
  }

  IsUrgentResourceLoads() {
    return this.urgentResourceLoads;
  }

  IsLoading() {
    return this.GetPendingLoads() + this.GetPendingPrepares() > 0;
  }

  Update(options = {}) {
    const loaded = this.PumpBackgroundQueue(options.background || {});
    const prepared = this.PumpMainThreadQueue(options.prepare || options);
    return loaded || prepared;
  }

  Tick(options = {}) {
    return this.Update(options);
  }

  async Wait(options = {}) {
    const yieldQueue = typeof options.yield === "function" ? options.yield : DefaultQueueYield;
    while (this.IsLoading()) {
      if (options.pump !== false) this.Update(options);
      await yieldQueue();
    }
    return this;
  }

  GetWorkQueue(queue) {
    return NormalizeCjsResManQueue(queue) === CjsResManQueue.MAIN
      ? this._prepareQueue
      : this._loadQueue;
  }

  QueueTask(queue, callback, context = null, metadata = null) {
    return this.GetWorkQueue(queue).Add(callback, context, metadata);
  }

  ScheduleBackgroundQueue() {
    if (this._backgroundPumpScheduled || this._loadQueue.IsPaused()) return this;
    this._backgroundPumpScheduled = true;
    Promise.resolve().then(() => {
      this._backgroundPumpScheduled = false;
      this.PumpBackgroundQueue();
    });
    return this;
  }

  ScheduleMainThreadQueue() {
    if (!this.autoPumpMainThreadQueue || this._mainThreadPumpScheduled || this._prepareQueue.IsPaused()) return this;
    this._mainThreadPumpScheduled = true;
    try {
      this.queueScheduler(() => {
        this._mainThreadPumpScheduled = false;
        this.PumpMainThreadQueue();
      });
    } catch (error) {
      this._mainThreadPumpScheduled = false;
      throw error;
    }
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

    const promise = this.QueueResourceObject(resource, options);
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
      return await this.PrepareResourceObject(resource, bytes, options);
    } catch (error) {
      resource.SetError(error);
      throw error;
    }
  }

  QueueResourceObject(resource, options = {}) {
    resource.MarkRequested();
    const load = this.QueueReadResource(resource.GetPath(), options);

    return load
      .then(bytes => {
        resource.MarkLoading();
        return this.PrepareResourceObjectQueued(resource, bytes, options);
      })
      .catch(error => {
        resource.SetError(error);
        throw error;
      });
  }

  QueueReadResource(path, options = {}) {
    const source = options.source || this.source;
    if (!source || typeof source.Read !== "function") {
      return Promise.reject(new TypeError("CjsResMan requires a source with Read(path, options) to load objects."));
    }

    const key = normalizeResourcePath(path);
    if (options.reload === true || options.cacheSource === false) {
      return this.QueueTask(CjsResManQueue.BACKGROUND, () => this.ReadResource(key, options), source, {
        kind: "load",
        path: key
      }).promise;
    }

    let operations = this.queuedSourceOperations.get(source);
    if (!operations) {
      operations = new Map();
      this.queuedSourceOperations.set(source, operations);
    }

    const existing = operations.get(key);
    if (existing) return existing;

    const operation = this.QueueTask(CjsResManQueue.BACKGROUND, () => this.ReadResource(key, options), source, {
      kind: "load",
      path: key
    }).promise;
    operations.set(key, operation);
    operation.then(() => {
      if (operations.get(key) === operation) operations.delete(key);
    }, () => {
      if (operations.get(key) === operation) operations.delete(key);
    });
    return operation;
  }

  async PrepareResourceObject(resource, bytes, options = {}) {
    let object = await this.ReadResourceObjectPayload(resource, bytes, options);
    for (const stage of this.ResolvePrepareStages(options)) {
      const next = await stage.prepare(object, CreatePrepareContext(this, resource, bytes, options, stage.name));
      if (next !== undefined) object = next;
    }
    return this.PublishResourceObject(resource, object, options);
  }

  async PrepareResourceObjectQueued(resource, bytes, options = {}) {
    const stages = [
      Object.freeze({
        name: "read",
        prepare: () => this.ReadResourceObjectPayload(resource, bytes, options)
      }),
      ...this.ResolvePrepareStages(options),
      Object.freeze({
        name: "publish",
        prepare: object => this.PublishResourceObject(resource, object, options)
      })
    ];
    let object = bytes;

    for (const stage of stages) {
      const task = this.QueueTask(CjsResManQueue.MAIN, () =>
        stage.prepare(object, CreatePrepareContext(this, resource, bytes, options, stage.name)), resource, {
        kind: "prepare",
        stage: stage.name,
        path: resource.GetPath()
      });
      const next = await task.promise;
      if (next !== undefined) object = next;
    }
    return object;
  }

  async ReadResourceObjectPayload(resource, bytes, options = {}) {
    const explicitLoader = this.GetObjectLoader(resource.GetExt());
    if (explicitLoader) {
      return explicitLoader(bytes, CreatePrepareContext(this, resource, bytes, options, "read"));
    }

    const descriptor = this.ResolveFormatDescriptor(resource.GetExt(), {
      ...options,
      bytes
    });
    return this.ReadFormatOnce(resource, descriptor, bytes, options);
  }

  PublishResourceObject(resource, object, options = {}) {
    let result = object;
    if (resource.constructor !== CjsResource && typeof resource.SetPayload === "function") {
      resource.SetPayload(object, options);
      resource.object = resource;
      result = resource;
    }
    else {
      resource.object = object;
    }
    if (!resource.IsPrepared?.()) resource.MarkLoaded();
    return result;
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
    this._loadQueue.Clear();
    this._prepareQueue.Clear();
    this.motherLode.Clear();
    this.objectOperations = new WeakMap();
    this.sourceOperations = new WeakMap();
    this.queuedSourceOperations = new WeakMap();
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
  for (const key of [
    "requirement",
    "payload",
    "emit",
    "mediaType",
    "format",
    "classes",
    "formatOptions",
    "pipeline",
    "preparePipeline",
    "prepareStages"
  ])
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

function NormalizePipelineName(value)
{
  return value === null || value === undefined
    ? ""
    : String(value).trim().toLowerCase();
}

function NormalizePrepareStages(value)
{
  if (value === null || value === undefined) return [];
  const entries = Array.isArray(value) ? value : [ value ];
  return entries.map((entry, index) => {
    const prepare = typeof entry === "function"
      ? entry
      : entry?.prepare || entry?.run || entry?.handler;
    if (typeof prepare !== "function") {
      throw new TypeError("CjsResMan prepare stages require a function or prepare/run/handler method.");
    }
    const name = typeof entry === "function"
      ? entry.name || `stage${index + 1}`
      : entry.name || prepare.name || `stage${index + 1}`;
    return Object.freeze({ name: String(name), prepare });
  });
}

function NormalizePreparePipelineEntries(value)
{
  if (value === null || value === undefined) return [];
  if (value instanceof Map) return [ ...value.entries() ];
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("CjsResMan preparePipelines must be an object or Map.");
  }
  return Object.entries(value);
}

function CreatePrepareContext(resMan, resource, bytes, options, stage)
{
  return Object.freeze({
    ...options,
    stage,
    bytes,
    path: resource.GetPath(),
    ext: resource.GetExt(),
    resource,
    resMan
  });
}

function AssertPositiveInteger(value, name)
{
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError(`CjsResMan ${name} must be a positive integer.`);
  }
}

function AssertNonNegativeInteger(value, name)
{
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`CjsResMan ${name} must be a non-negative integer.`);
  }
}

function AssertNonNegativeNumber(value, name)
{
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`CjsResMan ${name} must be a non-negative finite number.`);
  }
}

function DefaultQueueScheduler(callback)
{
  return setTimeout(callback, 0);
}

function DefaultQueueYield()
{
  return new Promise(resolve => setTimeout(resolve, 0));
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
