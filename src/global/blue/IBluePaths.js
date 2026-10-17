// Source: blue/include/IBluePaths.h
//
// Paths as its CONSUMERS see it, and a separate service from the resource
// manager on purpose: Carbon reaches it through its own extern, `BePaths`
// (`:49`), beside `BeResMan`. "Does this res file exist" is a question about
// the machine, not about fetching, and keeping the two apart is what stops a
// caller needing the manager to ask it.
//
// Carbon declares only wide-character forms of most methods. The resolve
// methods keep Carbon's `W` names; `SetSearchPath`, `GetSearchPath` and
// `GetStreamFromPath` still carry the script spelling, marked `renamed`.
import { CjsSchema, meta, blue } from "#schema";

/** `IBluePaths` - search paths, resolution, existence and streams, per blue/include/IBluePaths.h. */
export class IBluePaths
{
  /** `InitializeStdAppPaths` - install the standard application search paths. */
  InitializeStdAppPaths() {}

  /** `SetSearchPath` - bind a search-path key to a location. */
  SetSearchPath(_key, _value) {}

  /** `GetSearchPath` - the location bound to a search-path key. */
  GetSearchPath(_key) {}

  /**
   * `ResolvePathW` - a res path resolved through the search paths.
   *
   * @param {string} _path Res path.
   * @returns {string} The resolved path.
   */
  ResolvePathW(_path) {}

  /**
   * `ResolvePathForWritingW` - a res path resolved to where a write may go.
   *
   * @param {string} _path Res path.
   * @returns {string} The resolved path.
   */
  ResolvePathForWritingW(_path) {}

  /**
   * `ResolvePathToRootW` - a file-system path resolved back to a res path
   * under one named root.
   *
   * @param {string} _root Root key.
   * @param {string} _path File-system path.
   * @returns {string} The res path, or an empty string.
   */
  ResolvePathToRootW(_root, _path) {}

  /** `GetExpandedSearchPaths` - every location a search-path key expands to. */
  GetExpandedSearchPaths(_key) {}

  /** `GetDirectoryContents` - what a directory holds. */
  GetDirectoryContents(_directory) {}

  /** `IsDirectory` - whether a path is a directory. */
  IsDirectory(_path) {}

  /** `FileExists` - whether a file is reachable at all, including a black file standing in for a red one. */
  FileExists(_path) {}

  /** `FileExistsLocally` - whether a file is on the local machine, rather than in a stuff file or a remote cache. */
  FileExistsLocally(_path) {}

  /** `FileNeedsDownload` - whether reaching a file would require a download. */
  FileNeedsDownload(_path) {}

  /** `GetStreamFromPath` - a stream over the file at a res path. */
  GetStreamFromPath(_path) {}

  /** `GetFileContentsWithYield` - the contents of a file, yielding while it is read. */
  GetFileContentsWithYield(_path) {}

  /** `LogPaths` - write the current search paths to the log. */
  LogPaths() {}
}

for (const method of [
  "InitializeStdAppPaths", "SetSearchPath", "GetSearchPath", "ResolvePathW", "ResolvePathForWritingW",
  "ResolvePathToRootW", "GetExpandedSearchPaths", "GetDirectoryContents", "IsDirectory", "FileExists",
  "FileExistsLocally", "FileNeedsDownload", "GetStreamFromPath", "GetFileContentsWithYield", "LogPaths"
])
{
  CjsSchema.decorateMethod(IBluePaths, method, blue.method, meta.requires, meta.abstract);
}

// Carbon declares only the wide-character forms; a JS string covers both.
CjsSchema.decorateMethod(IBluePaths, "SetSearchPath", blue.method, meta.renamed("SetSearchPathW"));
CjsSchema.decorateMethod(IBluePaths, "GetSearchPath", blue.method, meta.renamed("GetSearchPathW"));
CjsSchema.decorateMethod(IBluePaths, "GetStreamFromPath", blue.method, meta.renamed("GetStreamFromPathW"));

CjsSchema.blue.define(IBluePaths, { className: "IBluePaths", fields: {} });
