// Source: blue/src/BluePaths.h, blue/src/BluePaths.cpp
//
// The paths service: an ordered list of res file systems, asked in turn, with
// the local file system among them (BluePaths.cpp:52-64, :364-385), and the
// remote file cache consulted for the two questions that separate "listed" from
// "here":
//
// - `FileExists`: some file system can supply the file - for the remote cache,
//   its index lists it.
// - `FileExistsLocally`: the bytes are on this machine - in the remote cache's
//   folder, or on the local file system (cpp:170-206).
//
// `Tr2Mesh` and `TriTextureParameter` ask the second to decide whether to show
// a `_lowdetail` sibling while the authored file downloads.
//
// WHAT THE HOST SUPPLIES. Carbon creates its local file system over the disk.
// Here the host installs one - disk in Node, whatever byte store a browser page
// keeps - and the remote file cache, which Carbon reaches through the global
// `BeRemoteFileCache`. With neither installed nothing exists, which is Carbon's
// answer for an empty machine and what every caller is written for.
//
// Search paths, resolution and yielding reads stay refused, from IBluePaths:
// they belong to a local file system with search paths, which no host here
// provides yet.
//
// READING ROUTES BY PROTOCOL (ours). Carbon asks every file system in turn for
// a stream (cpp:259-266). Here each miss can cost a network round trip, so
// `GetStreamFromPath` asks only the file systems whose class declares the
// path's protocol (`IBlueResFileSystem.protocols`), in list order. The
// synchronous questions (`FileExists`, `IsDirectory`...) cost nothing and
// still ask every file system, as Carbon does.
//
// FORMS (ours). The caller says which forms it accepts, each file system
// declares the forms it produces (`IBlueResFileSystem.forms`), and the paths
// service asks for a form both sides share, or one a cheap bridge turns into
// an accepted one: bytes to text and back, a stream to bytes or text. No
// shared or bridgeable form is an error, never a guess.
import { CjsSchema, meta, blue } from "#schema";
import { BlueFileUtil } from "./BlueFileUtil.js";
import { IBluePaths } from "./IBluePaths.js";
import { BlueResFileSystemForm } from "./IBlueResFileSystem.js";

const { BYTES, TEXT, STREAM, VALUE } = BlueResFileSystemForm;

/** Every form a file system may declare. */
const KNOWN_FORMS = new Set([ BYTES, TEXT, STREAM, VALUE ]);

/**
 * The cheap conversions, as `produced -> accepted -> convert`. Each costs at
 * most one pass over the bytes; nothing here decodes a file format.
 */
const BRIDGES = {
  [BYTES]: {
    [TEXT]: bytes => new TextDecoder().decode(bytes)
  },
  [TEXT]: {
    [BYTES]: text => new TextEncoder().encode(text)
  },
  [STREAM]: {
    [BYTES]: async stream => new Uint8Array(await new Response(stream).arrayBuffer()), // alloc: view over the read stream; does not copy
    [TEXT]: stream => new Response(stream).text()
  }
};

/** `BluePaths::BeforeOrAfter` (BluePaths.h:24-28) - where `RegisterFileSystem` places a file system. */
export const BluePathsBeforeOrAfter = Object.freeze({ BEFORE: 0, AFTER: 1 });

/** `BluePaths` - res file systems asked in turn, and the remote cache for listed-versus-here. */
export class CjsBluePaths extends IBluePaths
{
  /** @type {import("./IBlueResFileSystem.js").IBlueResFileSystem|null} */
  _localFileSystem = null;

  /** @type {import("./IBlueResFileSystem.js").IBlueResFileSystem[]} */
  _resFileSystems = [];

  /** @type {import("./RemoteFileCache.js").RemoteFileCache|null} */
  _remoteFileCache = null;

  /** Paths known to exist locally; Carbon never removes one (cpp:152-166). */
  _existingFiles = new Set();

  _cacheFileExistance = true;

  /**
   * Installs the local file system, at the front of the list where Carbon
   * creates its own (cpp:54-61). Null removes it.
   *
   * Custom: Carbon creates its local file system over the disk. A browser has
   * no disk, so the host supplies what "this machine" means.
   *
   * @param {import("./IBlueResFileSystem.js").IBlueResFileSystem|null} fileSystem Local file system.
   * @returns {CjsBluePaths} This service.
   */
  SetLocalFileSystem(fileSystem)
  {
    if (fileSystem !== null) assertDeclared(fileSystem);
    if (this._localFileSystem !== null)
    {
      this._resFileSystems.splice(this._resFileSystems.indexOf(this._localFileSystem), 1);
    }
    this._localFileSystem = fileSystem;
    if (fileSystem !== null) this._resFileSystems.unshift(fileSystem);
    this._existingFiles.clear();
    return this;
  }

  /** The installed local file system, or `null`. */
  GetLocalFileSystem()
  {
    return this._localFileSystem;
  }

  /**
   * Installs the remote file cache `FileExistsLocally` and `FileNeedsDownload`
   * consult. Null removes it.
   *
   * Custom: Carbon consults the global `BeRemoteFileCache`. A host serving
   * several builds holds a cache per build, so this service is given its own.
   * Registering the cache as a file system is separate, as in Carbon:
   * `RegisterFileSystem(new BlueResFileSystemRemote(cache), AFTER)`.
   *
   * @param {import("./RemoteFileCache.js").RemoteFileCache|null} remoteFileCache Remote file cache.
   * @returns {CjsBluePaths} This service.
   */
  SetRemoteFileCache(remoteFileCache)
  {
    this._remoteFileCache = remoteFileCache;
    this._existingFiles.clear();
    return this;
  }

  /** The installed remote file cache, or `null`. */
  GetRemoteFileCache()
  {
    return this._remoteFileCache;
  }

  /**
   * `RegisterFileSystem` - adds a file system before or after the others
   * (cpp:364-385).
   *
   * Adapted: takes the instance, where Carbon takes a class-name suffix and
   * creates it, so a host can pass a file system bound to one build's cache.
   *
   * @param {import("./IBlueResFileSystem.js").IBlueResFileSystem} fileSystem File system.
   * @param {number} [beforeOrAfter=BluePathsBeforeOrAfter.AFTER] `BluePathsBeforeOrAfter`.
   * @returns {CjsBluePaths} This service.
   */
  RegisterFileSystem(fileSystem, beforeOrAfter = BluePathsBeforeOrAfter.AFTER)
  {
    assertDeclared(fileSystem);
    if (beforeOrAfter === BluePathsBeforeOrAfter.BEFORE) this._resFileSystems.unshift(fileSystem);
    else this._resFileSystems.push(fileSystem);
    return this;
  }

  /**
   * `UnregisterFileSystem` - removes a registered file system (cpp:387-400).
   *
   * Adapted: by instance, where Carbon finds it by class name.
   *
   * @throws {Error} "File system not found".
   */
  UnregisterFileSystem(fileSystem)
  {
    const index = this._resFileSystems.indexOf(fileSystem);
    if (index === -1) throw new Error("File system not found");
    this._resFileSystems.splice(index, 1);
  }

  /** `IsFileSystemRegistered` - whether a file system is in the list (cpp:402-410). Adapted: by instance. */
  IsFileSystemRegistered(fileSystem)
  {
    return this._resFileSystems.includes(fileSystem);
  }

  /**
   * `GetDirectoryContents` - every file system's entries for the directory
   * (cpp:111-117).
   *
   * @param {string} directory Res path of the directory.
   * @param {Set<string>} [results=new Set()] Entry names, added to.
   * @returns {Set<string>} `results`.
   */
  GetDirectoryContents(directory, results = new Set())
  {
    for (const fileSystem of this._resFileSystems) fileSystem.GetDirectoryContents(directory, results);
    return results;
  }

  /** `IsDirectory` - whether any file system has a directory at the path (cpp:119-130). */
  IsDirectory(path)
  {
    for (const fileSystem of this._resFileSystems)
    {
      if (fileSystem.IsDirectory(path)) return true;
    }
    return false;
  }

  /**
   * `FileExists` - whether any file system can supply the file: the others
   * first, then the local one, remembering a local hit (cpp:143-168).
   */
  FileExists(filename)
  {
    for (const fileSystem of this._resFileSystems)
    {
      if (fileSystem !== this._localFileSystem && fileSystem.FileExists(filename)) return true;
    }
    if (this._cacheFileExistance && this._existingFiles.has(filename)) return true;
    if (this._localFileSystem === null) return false;

    const exists = this._localFileSystem.FileExists(filename);
    if (exists && this._cacheFileExistance) this._existingFiles.add(filename);
    return exists;
  }

  /**
   * `FileExistsLocally` - whether the file's bytes are on this machine: in the
   * remote cache's folder, or on the local file system (cpp:170-206).
   *
   * Not whether the resource manager has loaded it: that is a different
   * cache, one level up.
   */
  FileExistsLocally(filename)
  {
    if (this._cacheFileExistance && this._existingFiles.has(filename)) return true;

    if (this._remoteFileCache !== null
      && this._remoteFileCache.FileExists(filename)
      && this._remoteFileCache.IsCachedLocally(filename))
    {
      if (this._cacheFileExistance) this._existingFiles.add(filename);
      return true;
    }

    if (this._localFileSystem !== null && this._localFileSystem.FileExists(filename))
    {
      if (this._cacheFileExistance) this._existingFiles.add(filename);
      return true;
    }

    return false;
  }

  /** `FileNeedsDownload` - whether the remote cache lists the file but does not hold its bytes (cpp:208-220). */
  FileNeedsDownload(filename)
  {
    return this._remoteFileCache !== null
      && this._remoteFileCache.FileExists(filename)
      && !this._remoteFileCache.IsCachedLocally(filename);
  }

  /**
   * `GetStreamFromPathW` - the file from the first file system that supplies
   * it, in a form the caller accepts, or `null` when none has it
   * (cpp:227-268).
   *
   * Adapted: asynchronous; routed by protocol and matched by form (see the top
   * of this file); and without Carbon's language-code substitution
   * (`AdjustFilenameForLanguageCode`), which picks a localized sibling of a
   * `res:` path, since nothing here localizes resources. A file system's
   * rejection (a server error, an abort) ends the read: only "not here" moves
   * on to the next file system.
   *
   * @param {string} path Res path.
   * @param {object} [options={}] Read options.
   * @param {string[]} [options.accept=["bytes"]] Accepted `BlueResFileSystemForm`s, preferred first.
   * @param {AbortSignal|null} [options.signal=null] Cancels the read.
   * @returns {Promise<import("./IBlueResFileSystem.js").BlueResFileSystemResult|null>} The file, or `null`.
   * @throws {TypeError} When the path has no protocol.
   * @throws {Error} `CJS_BEPATHS_NO_FILE_SYSTEM` when no file system serves the protocol,
   *   `CJS_BEPATHS_NO_FORM` when none that does can produce an accepted form.
   */
  async GetStreamFromPath(path, options = {})
  {
    const accept = options.accept ?? [ BYTES ];
    const signal = options.signal ?? null;

    // Route: the file systems that serve the path's protocol, in list order.
    const protocol = BlueFileUtil.getResProtocol(path);
    if (protocol === null) throw new TypeError(`BePaths: "${path}" has no protocol.`);
    const key = protocol.toLowerCase();
    const serving = this._resFileSystems.filter(fileSystem => fileSystem.constructor.protocols.includes(key));
    if (serving.length === 0)
    {
      throw pathsError("CJS_BEPATHS_NO_FILE_SYSTEM", path, `BePaths: no file system serves "${protocol}:" (${path}).`);
    }

    // Match: each one's form to ask for, and the bridge to an accepted form.
    const plans = [];
    for (const fileSystem of serving)
    {
      const plan = matchForm(fileSystem.constructor.forms, accept);
      if (plan) plans.push({ fileSystem, ...plan });
    }
    if (plans.length === 0)
    {
      throw pathsError("CJS_BEPATHS_NO_FORM", path,
        `BePaths: no file system for "${protocol}:" produces a form in [${accept.join(", ")}] (${path}).`);
    }

    // Read: the first that has the file answers.
    for (const { fileSystem, produce, bridge } of plans)
    {
      const result = await fileSystem.GetStreamFromPath(path, { form: produce, signal });
      if (result === null) continue;
      if (result.form !== produce)
      {
        throw new TypeError(`BePaths: asked for "${produce}" and got "${result.form}" (${path}).`);
      }
      return bridge ? { form: bridge.to, data: await bridge.convert(result.data) } : result;
    }
    return null;
  }
}

CjsSchema.blue.interface(IBluePaths)(CjsBluePaths);
CjsSchema.blue.define(CjsBluePaths, {
  className: "CjsBluePaths",
  donors: [ "BluePaths" ],
  members: [ { name: "cacheFileExistance", key: "_cacheFileExistance", type: { kind: "boolean" }, edit: { read: true, write: true }, carbon: { member: true } } ],
  methods: {
    SetLocalFileSystem: [],
    GetLocalFileSystem: [],
    SetRemoteFileCache: [],
    GetRemoteFileCache: [],
    RegisterFileSystem: [ blue.method, meta.adapted ],
    UnregisterFileSystem: [ blue.method, meta.adapted ],
    IsFileSystemRegistered: [ blue.method, meta.adapted ],
    GetDirectoryContents: [ blue.method, meta.implemented ],
    IsDirectory: [ blue.method, meta.implemented ],
    FileExists: [ blue.method, meta.implemented ],
    FileExistsLocally: [ blue.method, meta.implemented ],
    FileNeedsDownload: [ blue.method, meta.implemented ],
    GetStreamFromPath: [ blue.method, meta.renamed("GetStreamFromPathW"), meta.adapted ]
  }
});

/**
 * The form to ask a file system for: the first accepted form it produces;
 * failing that, the first accepted form a bridge reaches from one it
 * produces; failing both, `null`.
 *
 * @param {string[]} produces The file system's declared forms.
 * @param {string[]} accept The caller's accepted forms, preferred first.
 * @returns {{produce: string, bridge: {to: string, convert: Function}|null}|null} The plan, or `null`.
 */
function matchForm(produces, accept)
{
  for (const form of accept)
  {
    if (produces.includes(form)) return { produce: form, bridge: null };
  }

  for (const form of accept)
  {
    for (const produced of produces)
    {
      const convert = BRIDGES[produced]?.[form];
      if (convert) return { produce: produced, bridge: { to: form, convert } };
    }
  }
  return null;
}

/**
 * Refuses a file system whose class does not declare its protocols and forms.
 *
 * @throws {TypeError} Naming what is missing.
 */
function assertDeclared(fileSystem)
{
  const { protocols, forms } = fileSystem.constructor;
  if (!Array.isArray(protocols) || protocols.length === 0)
  {
    throw new TypeError("BePaths: a file system's class must declare the protocols it serves (static protocols).");
  }
  if (!Array.isArray(forms) || forms.length === 0 || !forms.every(form => KNOWN_FORMS.has(form)))
  {
    throw new TypeError(`BePaths: a file system's class must declare the forms it produces from [${[ ...KNOWN_FORMS ].join(", ")}] (static forms).`);
  }
}

/** A paths-service error with its code and path. */
function pathsError(code, path, message)
{
  const error = new Error(message);
  error.code = code;
  error.path = path;
  return error;
}
