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
   * `ResolvePathW`, and Carbon's own `ResolvePath(const wchar_t*)`: the disk
   * path of the file, or `null`. JS cannot hold both names; both answer the
   * same question.
   */
  ResolvePath(_path) { return noDisk("ResolvePath"); }

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

  /** `GetExpandedSearchPaths()` - every protocol's expanded search path. */
  GetExpandedSearchPaths() { return noDisk("GetExpandedSearchPaths"); }

  /** `GetExpandedSearchPaths(key, paths)` - adds one protocol's expanded search path to `paths`. */
  GetExpandedSearchPaths__KeyPaths(_key, _paths) { return noDisk("GetExpandedSearchPaths__KeyPaths"); }

  /** `LogPaths` - writes the search paths to the log. */
  LogPaths() { return noDisk("LogPaths"); }

  /** `GetInitialWorkingDirectory` - the working directory when the file system was initialized. */
  GetInitialWorkingDirectory() { return noDisk("GetInitialWorkingDirectory"); }

  /** `GetAllSearchPaths` - every protocol's search path as set. */
  GetAllSearchPaths() { return noDisk("GetAllSearchPaths"); }

  /** `GetExpandedSearchPathsAsDict` (Blue name `GetExpandedSearchPaths`) - every protocol's expanded search path, for script. */
  GetExpandedSearchPathsAsDict() { return noDisk("GetExpandedSearchPathsAsDict"); }

  /** `ListDirFromScript` (Blue name `listdir`) - a directory's entries, for script. */
  ListDirFromScript(_dir) { return noDisk("ListDirFromScript"); }
}

CjsSchema.blue.define(BlueResFileSystemLocal, {
  className: "BlueResFileSystemLocal",
  fields: {},
  methods: {
    FileExists: [ blue.method, meta.notImplemented ],
    IsDirectory: [ blue.method, meta.notImplemented ],
    GetDirectoryContents: [ meta.notImplemented ],
    GetStreamFromPath: [ meta.renamed("GetStreamFromPathW"), meta.notImplemented ],
    ResolvePath: [ blue.method, meta.notImplemented ],
    Initialize: [ meta.notImplemented ],
    InitializeStdAppPaths: [ blue.method, meta.notImplemented ],
    SetSearchPath: [ blue.method, meta.renamed("SetSearchPathW"), meta.notImplemented ],
    GetSearchPath: [ blue.method, meta.renamed("GetSearchPathW"), meta.notImplemented ],
    ClearSearchPaths: [ blue.method, meta.notImplemented ],
    ResolvePathForWriting: [ blue.method, meta.renamed("ResolvePathForWritingW"), meta.notImplemented ],
    ResolvePathToRoot: [ blue.method, meta.renamed("ResolvePathToRootW"), meta.notImplemented ],
    GetExpandedSearchPaths: [ meta.notImplemented ],
    GetExpandedSearchPaths__KeyPaths: [ meta.notImplemented ],
    LogPaths: [ meta.notImplemented ],
    GetInitialWorkingDirectory: [ meta.notImplemented ],
    GetAllSearchPaths: [ blue.method, meta.notImplemented ],
    GetExpandedSearchPathsAsDict: [ blue.method, meta.notImplemented ],
    ListDirFromScript: [ blue.method, meta.notImplemented ]
  }
});
