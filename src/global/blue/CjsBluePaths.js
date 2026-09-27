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
import { CjsSchema, carbon, impl } from "#schema";
import { IBluePaths } from "./IBluePaths.js";

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
   * `GetStreamFromPathW` - the file's bytes from the first file system that
   * supplies them, or `null` (cpp:227-268).
   *
   * Adapted: without Carbon's language-code substitution
   * (`AdjustFilenameForLanguageCode`), which picks a localized sibling of a
   * `res:` path; nothing here localizes resources.
   *
   * @param {string} path Res path.
   * @returns {Promise<Uint8Array|null>} The bytes, or `null`.
   */
  async GetStreamFromPath(path)
  {
    for (const fileSystem of this._resFileSystems)
    {
      const bytes = await fileSystem.GetStreamFromPath(path);
      if (bytes !== null) return bytes;
    }
    return null;
  }
}

CjsSchema.define(CjsBluePaths, {
  className: "CjsBluePaths",
  carbon: "BluePaths",
  family: "blue",
  fields: {},
  methods: {
    SetLocalFileSystem: [ impl.custom ],
    GetLocalFileSystem: [ impl.custom ],
    SetRemoteFileCache: [ impl.custom ],
    GetRemoteFileCache: [ impl.custom ],
    RegisterFileSystem: [ carbon.method, impl.adapted ],
    UnregisterFileSystem: [ carbon.method, impl.adapted ],
    IsFileSystemRegistered: [ carbon.method, impl.adapted ],
    GetDirectoryContents: [ carbon.method, impl.implemented ],
    IsDirectory: [ carbon.method, impl.implemented ],
    FileExists: [ carbon.method, impl.implemented ],
    FileExistsLocally: [ carbon.method, impl.implemented ],
    FileNeedsDownload: [ carbon.method, impl.implemented ],
    GetStreamFromPath: [ carbon.method, impl.adapted ]
  }
});
