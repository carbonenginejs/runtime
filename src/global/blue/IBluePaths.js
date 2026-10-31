import { IRoot } from "./IRoot.js";
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
import { CjsSchema, meta } from "#schema";

/** `IBluePaths` - search paths, resolution, existence and streams, per blue/include/IBluePaths.h. */
export class IBluePaths extends IRoot
{
  /**
   * `InitializeStdAppPaths` - install the standard application search paths.
   *
   * @abstract
   */
  InitializeStdAppPaths() {}

  /**
   * `SetSearchPath` - bind a search-path key to a location.
   *
   * @renamed SetSearchPathW
   * @abstract
   */
  SetSearchPath(_key, _value) {}

  /**
   * `GetSearchPath` - the location bound to a search-path key.
   *
   * @renamed GetSearchPathW
   * @abstract
   */
  GetSearchPath(_key) {}

  /**
   * `ResolvePathW` - a res path resolved through the search paths.
   *
   * @abstract
   * @param {string} _path Res path.
   * @returns {string} The resolved path.
   */
  ResolvePathW(_path) {}

  /**
   * `ResolvePathForWritingW` - a res path resolved to where a write may go.
   *
   * @abstract
   * @param {string} _path Res path.
   * @returns {string} The resolved path.
   */
  ResolvePathForWritingW(_path) {}

  /**
   * `ResolvePathToRootW` - a file-system path resolved back to a res path
   * under one named root.
   *
   * @abstract
   * @param {string} _root Root key.
   * @param {string} _path File-system path.
   * @returns {string} The res path, or an empty string.
   */
  ResolvePathToRootW(_root, _path) {}

  /**
   * `GetExpandedSearchPaths` - every location a search-path key expands to.
   *
   * @abstract
   */
  GetExpandedSearchPaths(_key) {}

  /**
   * `GetDirectoryContents` - what a directory holds.
   *
   * @abstract
   */
  GetDirectoryContents(_directory) {}

  /**
   * `IsDirectory` - whether a path is a directory.
   *
   * @abstract
   */
  IsDirectory(_path) {}

  /**
   * `FileExists` - whether a file is reachable at all, including a black file standing in for a red one.
   *
   * @abstract
   */
  FileExists(_path) {}

  /**
   * `FileExistsLocally` - whether a file is on the local machine, rather than in a stuff file or a remote cache.
   *
   * @abstract
   */
  FileExistsLocally(_path) {}

  /**
   * `FileNeedsDownload` - whether reaching a file would require a download.
   *
   * @abstract
   */
  FileNeedsDownload(_path) {}

  /**
   * `GetStreamFromPath` - a stream over the file at a res path.
   *
   * @renamed GetStreamFromPathW
   * @abstract
   */
  GetStreamFromPath(_path) {}

  /**
   * `GetFileContentsWithYield` - the contents of a file, yielding while it is read.
   *
   * @abstract
   */
  GetFileContentsWithYield(_path) {}

  /**
   * `LogPaths` - write the current search paths to the log.
   *
   * @abstract
   */
  LogPaths() {}
}

for (const method of [
  "InitializeStdAppPaths", "SetSearchPath", "GetSearchPath", "ResolvePathW", "ResolvePathForWritingW",
  "ResolvePathToRootW", "GetExpandedSearchPaths", "GetDirectoryContents", "IsDirectory", "FileExists",
  "FileExistsLocally", "FileNeedsDownload", "GetStreamFromPath", "GetFileContentsWithYield", "LogPaths"
])
{
  CjsSchema.decorateMethod(IBluePaths, method, meta.abstract);
}

// Carbon declares only the wide-character forms; a JS string covers both.

CjsSchema.exposure.interface("IBluePaths")(IBluePaths);
