// Source: blue/src/BlueResFileSystemRemote.h, blue/src/BlueResFileSystemRemote.cpp
//
// The remote file cache as one of the paths service's file systems. Every
// question goes to the cache; a `.red` path is asked about as its `.black`
// twin, and a listing reports `.black` files back as `.red`, since the cache
// holds only the compiled form.
//
// Adapted: it is given its cache, where Carbon's always asks the one global
// `BeRemoteFileCache`, so a host serving several builds can hold one per build.
import { CjsSchema, meta, blue } from "#schema";
import { BlueFileUtil } from "./BlueFileUtil.js";
import { BlueResFileSystemForm, IBlueResFileSystem } from "./IBlueResFileSystem.js";

const { substituteBlackForRedInFilename, substituteRedForBlackInFilename } = BlueFileUtil;

/** `BlueResFileSystemRemote` - a `RemoteFileCache` as a res file system. */
export class BlueResFileSystemRemote extends IBlueResFileSystem
{
  /** Ours: the index lists `res:` paths (see IBlueResFileSystem.js). */
  static protocols = [ "res" ];

  /** Ours: the cache holds bytes (see IBlueResFileSystem.js). */
  static forms = [ BlueResFileSystemForm.BYTES ];

  /** @type {import("./RemoteFileCache.js").RemoteFileCache} */
  _remoteFileCache = null;

  /**
   * @param {import("./RemoteFileCache.js").RemoteFileCache} remoteFileCache The cache this file system asks.
   */
  constructor(remoteFileCache)
  {
    super();
    this._remoteFileCache = remoteFileCache;
  }

  /** The cache this file system asks. */
  GetRemoteFileCache()
  {
    return this._remoteFileCache;
  }

  /** `FileExists` - whether the cache's index lists the file (cpp:13-16). */
  FileExists(filename)
  {
    return this._remoteFileCache.FileExists(substituteBlackForRedInFilename(filename));
  }

  /** `IsDirectory` - whether the cache's index has anything under the path (cpp:18-21). */
  IsDirectory(dir)
  {
    return this._remoteFileCache.IsDirectory(dir);
  }

  /**
   * `GetDirectoryContents` - adds the directory's entries, `.black` reported
   * as `.red`; a directory the cache does not have adds nothing (cpp:23-36).
   */
  GetDirectoryContents(dir, results)
  {
    let contents;
    try
    {
      contents = this._remoteFileCache.ListDir(dir);
    }
    catch
    {
      return;
    }
    for (const name of contents) results.add(substituteRedForBlackInFilename(name));
  }

  /**
   * `GetStreamFromPathW` - the file's bytes through the cache, or `null` when
   * the cache fails (cpp:38-43).
   *
   * Adapted: asynchronous, answering `{ form: "bytes", data }`, the only form
   * this file system declares. Like Carbon, every cache failure reads as
   * "not here", so the next file system is asked.
   *
   * @param {string} resPath Res path.
   * @param {import("./IBlueResFileSystem.js").BlueResFileSystemRequest} _request Always the bytes form.
   * @returns {Promise<import("./IBlueResFileSystem.js").BlueResFileSystemResult|null>} The bytes, or `null`.
   */
  async GetStreamFromPath(resPath, _request)
  {
    try
    {
      const data = await this._remoteFileCache.GetStreamFromPath(substituteBlackForRedInFilename(resPath));
      return { form: BlueResFileSystemForm.BYTES, data };
    }
    catch
    {
      return null;
    }
  }

  /**
   * `ResolvePathW` - the file's cache-folder name, or `null` when the index
   * does not list it (cpp:45-53).
   *
   * Adapted: the cache-folder name itself, where Carbon makes it absolute on
   * the local disk; resolving a folder alias belongs to the host store.
   *
   * Quirk, reproduced (cpp:47-49): the existence check substitutes `.black`
   * for `.red` but the name lookup does not, so a `.red` path resolves to
   * itself.
   */
  ResolvePathW(path)
  {
    if (!this._remoteFileCache.FileExists(substituteBlackForRedInFilename(path))) return null;
    return this._remoteFileCache.GetLocallyCachedName(path);
  }
}

CjsSchema.exposure.mapInterface(IBlueResFileSystem)(BlueResFileSystemRemote);
CjsSchema.blue.define(BlueResFileSystemRemote, {
  className: "BlueResFileSystemRemote",
  fields: {},
  methods: {
    GetRemoteFileCache: [],
    FileExists: [ blue.method, meta.implemented ],
    IsDirectory: [ blue.method, meta.implemented ],
    GetDirectoryContents: [ blue.method, meta.implemented ],
    GetStreamFromPath: [ blue.method, meta.renamed("GetStreamFromPathW"), meta.adapted ],
    ResolvePathW: [ blue.method, meta.adapted ]
  }
});
