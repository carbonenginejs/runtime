// Source: blue/src/BlueResFileSystemLocal.h, blue/src/BlueResFileSystemLocal.cpp,
//   blue/src/BlueResFileSystemLocal_Blue.cpp
//
// The local disk as a res file system: search paths per protocol
// (`SetSearchPathW("res", "C:/eve/res/;...")`), expanded once, and a path
// resolved to the first search-path folder that holds it.
//
// NOT AVAILABLE IN A BROWSER, which has no disk. Every member is Carbon's and
// throws here; a Node or Electron host extends this class, implements the
// members over its own file system, and declares the protocols its search
// paths serve. Because the protocols are the host's, this class declares none
// and the paths service refuses to register it as it is.
//
// Carbon's paths service creates its local file system itself (BluePaths.cpp:
// 52-64); here the orchestrator registers one, or none.
import { CjsSchema, meta, blue } from "#schema";
import { BlueResFileSystemForm, IBlueResFileSystem } from "./IBlueResFileSystem.js";

/** Throws the "no disk" error for one member. */
function noDisk(member)
{
  throw new Error(`BlueResFileSystemLocal.${member}: a host must implement the local file system; a browser has no disk.`);
}

/**
 * `BlueResFileSystemLocal` - the local disk as a res file system. Every member
 * throws until a host extends the class; see the top of this file.
 */
export class BlueResFileSystemLocal extends IBlueResFileSystem
{
  /** Ours: a host declares the protocols its search paths serve (see IBlueResFileSystem.js). */
  static protocols = null;

  /** Ours: a disk read produces bytes (see IBlueResFileSystem.js). */
  static forms = [ BlueResFileSystemForm.BYTES ];

  /** `FileExists` - whether a search path holds the file (cpp). */
  FileExists(_filename) { return noDisk("FileExists"); }

  /** `IsDirectory` - whether a search path holds a directory at the path. */
  IsDirectory(_dir) { return noDisk("IsDirectory"); }

  /** `GetDirectoryContents` - adds the entries every search path holds for the directory. */
  GetDirectoryContents(_dir, _results) { return noDisk("GetDirectoryContents"); }

  /** `GetStreamFromPathW` - the file's bytes from the first search path that holds it. */
  async GetStreamFromPath(_resPath, _request) { return noDisk("GetStreamFromPath"); }

  /**
   * `ResolvePathW` - the disk path of the file in the first search path that
   * holds it, or of the path itself when it names an existing file. Carbon
   * writes the path to its `resolvedPath` output parameter and returns
   * whether it did; the output parameter is the return value here, and
   * `null` is Carbon's false.
   *
   * @param {string} _path Res path.
   * @returns {string|null} The absolute disk path, or `null`.
   */
  ResolvePathW(_path) { return noDisk("ResolvePathW"); }

  /**
   * `ResolvePath` - the disk path of the file, or an empty string when
   * `ResolvePathW` finds none.
   *
   * @param {string} path Res path.
   * @returns {string} The absolute disk path, or `""`.
   */
  ResolvePath(path)
  {
    // Carbon (BlueResFileSystemLocal.cpp:626-631): ResolvePathW into an empty string.
    const result = this.ResolvePathW(path);
    return result === null ? "" : result;
  }

  /** `Initialize` - records the initial working directory and sets the default search paths. */
  Initialize(_initialPath) { return noDisk("Initialize"); }

  /** `InitializeStdAppPaths` - ensures the standard app paths exist, with defaults. */
  InitializeStdAppPaths() { return noDisk("InitializeStdAppPaths"); }

  /** `SetSearchPathW` - sets a protocol's search path: a semicolon-separated list of folders or prefixes. */
  SetSearchPath(_key, _value) { return noDisk("SetSearchPath"); }

  /** `GetSearchPathW` - a protocol's search path as set. */
  GetSearchPath(_key) { return noDisk("GetSearchPath"); }

  /** `ClearSearchPaths` - removes every search path. */
  ClearSearchPaths() { return noDisk("ClearSearchPaths"); }

  /** `ResolvePathForWritingW` - the first disk path a file could be written to, existing or not. */
  ResolvePathForWriting(_path) { return noDisk("ResolvePathForWriting"); }

  /** `ResolvePathToRootW` - a disk path back to a res path under the given protocol. */
  ResolvePathToRoot(_root, _path) { return noDisk("ResolvePathToRoot"); }

  /**
   * `GetExpandedSearchPaths()` - every protocol's expanded search path.
   *
   * @returns {Map<string, string[]>} Expanded folders by lower-case protocol.
   */
  GetExpandedSearchPaths() { return noDisk("GetExpandedSearchPaths"); }

  /**
   * `GetExpandedSearchPaths(key, paths)` - one protocol's expanded search
   * path. Carbon appends it to the caller's `paths` output parameter; the
   * output parameter is the return value here, a new array.
   *
   * @param {string} _key Protocol, compared lower-case.
   * @returns {string[]} The protocol's expanded folders; empty when it has none.
   */
  GetExpandedSearchPaths__Key(_key) { return noDisk("GetExpandedSearchPaths__Key"); }

  /** `LogPaths` - writes the search paths to the log. */
  LogPaths() { return noDisk("LogPaths"); }

  /** `GetInitialWorkingDirectory` - the working directory when the file system was initialized. */
  GetInitialWorkingDirectory() { return noDisk("GetInitialWorkingDirectory"); }

  /** `GetAllSearchPaths` - every protocol's search path as set. */
  GetAllSearchPaths() { return noDisk("GetAllSearchPaths"); }

  /**
   * `GetExpandedSearchPathsAsDict` (Blue name `GetExpandedSearchPaths`) -
   * every protocol's expanded search path, for script.
   *
   * @returns {Map<string, string[]>} Expanded folders by lower-case protocol.
   */
  GetExpandedSearchPathsAsDict()
  {
    // Carbon (BlueResFileSystemLocal.cpp:633-636): returns GetExpandedSearchPaths().
    return this.GetExpandedSearchPaths();
  }

  /** `ListDirFromScript` (Blue name `listdir`) - a directory's entries, for script. */
  ListDirFromScript(_dir) { return noDisk("ListDirFromScript"); }
}

CjsSchema.exposure.mapInterface(IBlueResFileSystem)(BlueResFileSystemLocal);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "FileExists", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "IsDirectory", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetDirectoryContents", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetStreamFromPath", blue.method, meta.renamed("GetStreamFromPathW"), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ResolvePathW", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ResolvePath", blue.method, meta.implemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "Initialize", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "InitializeStdAppPaths", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "SetSearchPath", blue.method, meta.renamed("SetSearchPathW"), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetSearchPath", blue.method, meta.renamed("GetSearchPathW"), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ClearSearchPaths", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ResolvePathForWriting", blue.method, meta.renamed("ResolvePathForWritingW"), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ResolvePathToRoot", blue.method, meta.renamed("ResolvePathToRootW"), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetExpandedSearchPaths", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetExpandedSearchPaths__Key", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "LogPaths", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetInitialWorkingDirectory", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetAllSearchPaths", blue.method, meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetExpandedSearchPathsAsDict", blue.method, meta.implemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ListDirFromScript", blue.method, meta.notImplemented);
CjsSchema.exposure.define("BlueResFileSystemLocal")(BlueResFileSystemLocal);
