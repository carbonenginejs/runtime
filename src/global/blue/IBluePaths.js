// Source: blue/include/IBluePaths.h
//
// Paths as its CONSUMERS see it, and a separate service from the resource
// manager on purpose: Carbon reaches it through its own extern, `BePaths`
// (`:49`), beside `BeResMan`. "Does this res file exist" is a question about
// the machine, not about fetching, and keeping the two apart is what stops a
// caller needing the manager to ask it.
//
// The `W` variants collapse, as they do on the manager: they are Carbon's
// wide-character twins.
import { CjsSchema, compose, impl } from "#schema";

/** `IBluePaths` - search paths, resolution, existence and streams, per blue/include/IBluePaths.h. */
export class IBluePaths
{
  /** `InitializeStdAppPaths` - install the standard application search paths. */
  InitializeStdAppPaths() {}

  /** `SetSearchPath` - bind a search-path key to a location. */
  SetSearchPath(_key, _value) {}

  /** `GetSearchPath` - the location bound to a search-path key. */
  GetSearchPath(_key) {}

  /** `ResolvePath` - a res path resolved through the search paths. */
  ResolvePath(_path) {}

  /** `ResolvePathForWriting` - a res path resolved to where a write may go. */
  ResolvePathForWriting(_path) {}

  /** `ResolvePathToRoot` - a res path resolved against one named root. */
  ResolvePathToRoot(_root, _path) {}

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
  "InitializeStdAppPaths", "SetSearchPath", "GetSearchPath", "ResolvePath", "ResolvePathForWriting",
  "ResolvePathToRoot", "GetExpandedSearchPaths", "GetDirectoryContents", "IsDirectory", "FileExists",
  "FileExistsLocally", "FileNeedsDownload", "GetStreamFromPath", "GetFileContentsWithYield", "LogPaths"
])
{
  CjsSchema.decorateMethod(IBluePaths, method, compose.abstract, impl.abstract);
}

CjsSchema.define(IBluePaths, { className: "IBluePaths", carbon: "IBluePaths", family: "blue", fields: {} });
