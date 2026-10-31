import { exposure as be } from "#be";
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
import { CjsSchema, meta } from "#schema";
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

  /**
   * `FileExists` - whether a search path holds the file (cpp).
   *
   * @notImplemented
   */
  FileExists(_filename) { return noDisk("FileExists"); }

  /**
   * `IsDirectory` - whether a search path holds a directory at the path.
   *
   * @notImplemented
   */
  IsDirectory(_dir) { return noDisk("IsDirectory"); }

  /**
   * `GetDirectoryContents` - adds the entries every search path holds for the directory.
   *
   * @notImplemented
   */
  GetDirectoryContents(_dir, _results) { return noDisk("GetDirectoryContents"); }

  /**
   * `GetStreamFromPathW` - the file's bytes from the first search path that holds it.
   *
   * @notImplemented
   * @renamed GetStreamFromPathW
   */
  async GetStreamFromPath(_resPath, _request) { return noDisk("GetStreamFromPath"); }

  /**
   * `ResolvePathW` - the disk path of the file in the first search path that
   * holds it, or of the path itself when it names an existing file. Carbon
   * writes the path to its `resolvedPath` output parameter and returns
   * whether it did; the output parameter is the return value here, and
   * `null` is Carbon's false.
   *
   * @notImplemented
   * @param {string} _path Res path.
   * @returns {string|null} The absolute disk path, or `null`.
   */
  ResolvePathW(_path) { return noDisk("ResolvePathW"); }

  /**
   * `ResolvePath` - the disk path of the file, or an empty string when
   * `ResolvePathW` finds none.
   *
   * @implemented
   * @param {string} path Res path.
   * @returns {string} The absolute disk path, or `""`.
   */
  ResolvePath(path)
  {
    // Carbon (BlueResFileSystemLocal.cpp:626-631): ResolvePathW into an empty string.
    const result = this.ResolvePathW(path);
    return result === null ? "" : result;
  }

  /**
   * `Initialize` - records the initial working directory and sets the default search paths.
   *
   * @notImplemented
   */
  Initialize(_initialPath) { return noDisk("Initialize"); }

  /**
   * `InitializeStdAppPaths` - ensures the standard app paths exist, with defaults.
   *
   * @notImplemented
   */
  InitializeStdAppPaths() { return noDisk("InitializeStdAppPaths"); }

  /**
   * `SetSearchPathW` - sets a protocol's search path: a semicolon-separated
   * list of folders or prefixes. An empty value removes the protocol's path.
   *
   * Carbon: BlueResFileSystemLocal::SetSearchPathW (blue/src/BlueResFileSystemLocal.cpp:170-202;
   * blue/src/BlueResFileSystemLocal.h:30). Exposed as "SetSearchPath"
   * (blue/src/BlueResFileSystemLocal_Blue.cpp:28-35, MAP_METHOD_AND_WRAP).
   *
   * @notSupported A browser has no disk, so a host must implement it (see the head of this file). `const char*` and `const wchar_t*` are both JS
   *   strings, so this returns the `SetSearchPath` call. Carbon returns a
   *   `Be::Result`; a host reports its failure ("Search paths contain a
   *   circular reference", "Unexpected error during search path expansion")
   *   by throwing an `Error` with that message.
   * @param {string} key Path prefix.
   * @param {string} value Semicolon separated list of paths or prefixes.
   * @returns {void}
   */
  SetSearchPathW(key, value)
  {
    return this.SetSearchPath(key, value);
  }

  /**
   * `SetSearchPath` - the body of `SetSearchPathW`, under the name Carbon exposes it by; a host overrides this. Ours, not a Carbon method.
   *
   * @cjs
   * @notSupported
   */
  SetSearchPath(_key, _value) { return noDisk("SetSearchPath"); }

  /**
   * `GetSearchPathW` - a protocol's search path as set.
   *
   * Carbon: BlueResFileSystemLocal::GetSearchPathW (blue/src/BlueResFileSystemLocal.cpp:204-207;
   * blue/src/BlueResFileSystemLocal.h:31). Exposed as "GetSearchPath"
   * (blue/src/BlueResFileSystemLocal_Blue.cpp:37-44, MAP_METHOD_AND_WRAP).
   *
   * @notSupported A browser has no disk, so a host must implement it (see the head of this file). Both string kinds are JS strings, so this returns
   *   the `GetSearchPath` call. Quirk, for a host to reproduce (cpp:206):
   *   Carbon reads `m_searchPaths[key]` with the key as given, not lower-cased
   *   as `SetSearchPathW` stores it, and `operator[]` inserts an empty entry for
   *   an unknown key.
   * @param {string} key Path prefix.
   * @returns {string} The value associated with the key.
   */
  GetSearchPathW(key)
  {
    return this.GetSearchPath(key);
  }

  /**
   * `GetSearchPath` - the body of `GetSearchPathW`, under the name Carbon exposes it by; a host overrides this. Ours, not a Carbon method.
   *
   * @cjs
   * @notSupported
   */
  GetSearchPath(_key) { return noDisk("GetSearchPath"); }

  /**
   * `ClearSearchPaths` - removes every search path.
   *
   * @notImplemented
   */
  ClearSearchPaths() { return noDisk("ClearSearchPaths"); }

  /**
   * `ResolvePathForWritingW` - the first disk path a file could be written to,
   * existing or not: the first expansion of the protocol's search path joined
   * to the rest, else the absolute path of the input.
   *
   * Carbon: BlueResFileSystemLocal::ResolvePathForWritingW (blue/src/BlueResFileSystemLocal.cpp:283-316;
   * blue/src/BlueResFileSystemLocal.h:34). Exposed as "ResolvePathForWriting"
   * (blue/src/BlueResFileSystemLocal_Blue.cpp:62-72, MAP_METHOD_AND_WRAP).
   *
   * @notSupported A browser has no disk, so a host must implement it (see the head of this file). Both string kinds are JS strings, so this returns
   *   the `ResolvePathForWriting` call.
   * @param {string} path Res path.
   * @returns {string} Path usable for the underlying file system.
   */
  ResolvePathForWritingW(path)
  {
    return this.ResolvePathForWriting(path);
  }

  /**
   * `ResolvePathForWriting` - the body of `ResolvePathForWritingW`, under the name Carbon exposes it by; a host overrides this. Ours, not a Carbon method.
   *
   * @cjs
   * @notSupported
   */
  ResolvePathForWriting(_path) { return noDisk("ResolvePathForWriting"); }

  /**
   * `ResolvePathToRootW` - a disk path back to a res path under the given
   * protocol; an empty string when no search-path folder of that protocol
   * matches.
   *
   * Carbon: BlueResFileSystemLocal::ResolvePathToRootW (blue/src/BlueResFileSystemLocal.cpp:318-355;
   * blue/src/BlueResFileSystemLocal.h:35). Exposed as "ResolvePathToRoot"
   * (blue/src/BlueResFileSystemLocal_Blue.cpp:74-82, MAP_METHOD_AND_WRAP).
   *
   * @notSupported A browser has no disk, so a host must implement it (see the head of this file). Both string kinds are JS strings, so this returns
   *   the `ResolvePathToRoot` call. Quirk, for a host to reproduce (cpp:28-35,
   *   338): `AreStringsEqualIgnoringCase` is a prefix test under MSVC
   *   (`_wcsnicmp` over `a.size()` characters) but a whole-string test
   *   elsewhere (`wcscasecmp`), so the same call matches a path under a
   *   search-path folder on one and only the folder itself on the other.
   * @param {string} root Path prefix.
   * @param {string} path Physical file path.
   * @returns {string} A path based on the given root, or `""`.
   */
  ResolvePathToRootW(root, path)
  {
    return this.ResolvePathToRoot(root, path);
  }

  /**
   * `ResolvePathToRoot` - the body of `ResolvePathToRootW`, under the name Carbon exposes it by; a host overrides this. Ours, not a Carbon method.
   *
   * @cjs
   * @notSupported
   */
  ResolvePathToRoot(_root, _path) { return noDisk("ResolvePathToRoot"); }

  /**
   * `GetExpandedSearchPaths()` - every protocol's expanded search path.
   *
   * @notImplemented
   * @returns {Map<string, string[]>} Expanded folders by lower-case protocol.
   */
  GetExpandedSearchPaths() { return noDisk("GetExpandedSearchPaths"); }

  /**
   * `GetExpandedSearchPaths(key, paths)` - one protocol's expanded search
   * path. Carbon appends it to the caller's `paths` output parameter; the
   * output parameter is the return value here, a new array.
   *
   * @notImplemented
   * @param {string} _key Protocol, compared lower-case.
   * @returns {string[]} The protocol's expanded folders; empty when it has none.
   */
  GetExpandedSearchPaths__Key(_key) { return noDisk("GetExpandedSearchPaths__Key"); }

  /**
   * `LogPaths` - writes the search paths to the log.
   *
   * @notImplemented
   */
  LogPaths() { return noDisk("LogPaths"); }

  /**
   * `GetInitialWorkingDirectory` - the working directory when the file system was initialized.
   *
   * @notImplemented
   */
  GetInitialWorkingDirectory() { return noDisk("GetInitialWorkingDirectory"); }

  /**
   * initialWorkingDirectory (MAP_PROPERTY_READONLY): Carbon's property over GetInitialWorkingDirectory, which the macro calls.
   * Carbon: MAP_PROPERTY_READONLY (blue/src/BlueResFileSystemLocal_Blue.cpp:14).
   *
   * @notImplemented
   */
  get initialWorkingDirectory()
  {
    return this.GetInitialWorkingDirectory();
  }

  /**
   * `GetAllSearchPaths` - every protocol's search path as set.
   *
   * @notImplemented
   */
  GetAllSearchPaths() { return noDisk("GetAllSearchPaths"); }

  /**
   * `GetExpandedSearchPathsAsDict` (Blue name `GetExpandedSearchPaths`) -
   * every protocol's expanded search path, for script.
   *
   * @implemented
   * @returns {Map<string, string[]>} Expanded folders by lower-case protocol.
   */
  GetExpandedSearchPathsAsDict()
  {
    // Carbon (BlueResFileSystemLocal.cpp:633-636): returns GetExpandedSearchPaths().
    return this.GetExpandedSearchPaths();
  }

  /**
   * `ListDirFromScript` (Blue name `listdir`) - a directory's entries, for script.
   *
   * @notImplemented
   */
  ListDirFromScript(_dir) { return noDisk("ListDirFromScript"); }
}

CjsSchema.exposure.mapInterface(IBlueResFileSystem)(BlueResFileSystemLocal);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "FileExists", be.mapMethodAndWrap("exists"), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "IsDirectory", be.mapMethodAndWrap("isdir"), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetDirectoryContents", meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetStreamFromPath", meta.renamed("GetStreamFromPathW"), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ResolvePathW", meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ResolvePath", be.mapMethodAndWrap(), meta.implemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "Initialize", meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "InitializeStdAppPaths", be.mapMethodAndWrap(), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "SetSearchPathW", be.mapMethodAndWrap("SetSearchPath"), meta.notSupported);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "SetSearchPath", meta.cjs, meta.notSupported);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetSearchPathW", be.mapMethodAndWrap("GetSearchPath"), meta.notSupported);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetSearchPath", meta.cjs, meta.notSupported);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ClearSearchPaths", be.mapMethodAndWrap(), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ResolvePathForWritingW", be.mapMethodAndWrap("ResolvePathForWriting"), meta.notSupported);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ResolvePathForWriting", meta.cjs, meta.notSupported);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ResolvePathToRootW", be.mapMethodAndWrap("ResolvePathToRoot"), meta.notSupported);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ResolvePathToRoot", meta.cjs, meta.notSupported);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetExpandedSearchPaths", meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetExpandedSearchPaths__Key", meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "LogPaths", meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetInitialWorkingDirectory", meta.notImplemented);
CjsSchema.decorateField(BlueResFileSystemLocal, "initialWorkingDirectory", be.mapPropertyReadOnly(), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetAllSearchPaths", be.mapMethodAndWrap(), meta.notImplemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "GetExpandedSearchPathsAsDict", be.mapMethodAndWrap("GetExpandedSearchPaths"), meta.implemented);
CjsSchema.decorateMethod(BlueResFileSystemLocal, "ListDirFromScript", be.mapMethodAndWrap("listdir"), meta.notImplemented);
CjsSchema.exposure.define("BlueResFileSystemLocal")(BlueResFileSystemLocal);
