// Source: blue/src/BlueResFileSystemRemote.h, blue/src/BlueResFileSystemRemote.cpp
//
// The remote file cache as one of the paths service's file systems. Every
// question goes to the cache; a `.red` path is asked about as its `.black`
// twin, and a listing reports `.black` files back as `.red`, since the cache
// holds only the compiled form.
//
// Adapted: it is given its cache, where Carbon's always asks the one global
// `BeRemoteFileCache`, so a host serving several builds can hold one per build.
import { CjsSchema, carbon, impl } from "#schema";
import { IBlueResFileSystem } from "./IBlueResFileSystem.js";

/** `SubstituteBlackForRedInFilename` (blue/src/BlueFileUtil.cpp:374-387). */
function substituteBlackForRedInFilename(filename)
{
  const dot = filename.lastIndexOf(".");
  if (dot !== -1 && filename.slice(dot) === ".red") return `${filename.slice(0, -3)}black`;
  return filename;
}

/** `SubstituteRedForBlackInFilename` (blue/src/BlueFileUtil.cpp:390-403). */
function substituteRedForBlackInFilename(filename)
{
  const dot = filename.lastIndexOf(".");
  if (dot !== -1 && filename.slice(dot) === ".black") return `${filename.slice(0, -5)}red`;
  return filename;
}

/** `BlueResFileSystemRemote` - a `RemoteFileCache` as a res file system. */
export class BlueResFileSystemRemote extends IBlueResFileSystem
{
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

  /** `GetStreamFromPathW` - the file's bytes through the cache, or `null` when it fails (cpp:38-43). */
  async GetStreamFromPath(resPath)
  {
    try
    {
      return await this._remoteFileCache.GetStreamFromPath(substituteBlackForRedInFilename(resPath));
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
  ResolvePath(path)
  {
    if (!this._remoteFileCache.FileExists(substituteBlackForRedInFilename(path))) return null;
    return this._remoteFileCache.GetLocallyCachedName(path);
  }
}

CjsSchema.define(BlueResFileSystemRemote, {
  className: "BlueResFileSystemRemote",
  carbon: "BlueResFileSystemRemote",
  family: "blue",
  fields: {},
  methods: {
    GetRemoteFileCache: [ impl.custom ],
    FileExists: [ carbon.method, impl.implemented ],
    IsDirectory: [ carbon.method, impl.implemented ],
    GetDirectoryContents: [ carbon.method, impl.implemented ],
    GetStreamFromPath: [ carbon.renamed("GetStreamFromPathW"), impl.implemented ],
    ResolvePath: [ carbon.renamed("ResolvePathW"), impl.adapted ]
  }
});
