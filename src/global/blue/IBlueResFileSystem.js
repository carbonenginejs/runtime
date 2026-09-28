// Source: blue/include/IBlueResFileSystem.h
//
// One place res files can come from. Carbon's paths service holds a list of
// these - the local file system first, then any registered after it, such as
// the remote file cache (BluePaths.cpp:61, :364-385) - and asks each in turn.
//
// The host supplies the local one: a browser has no disk, so what "this
// machine" means is the host's byte store, whatever it keeps. The remote one
// is ported, `BlueResFileSystemRemote`.
//
// `GetStreamFromPath` returns a promise here: reading bytes is asynchronous in
// every host this runs in.
import { CjsSchema, carbon, compose, impl } from "#schema";

/** `IBlueResFileSystem` - one source of res files, per blue/include/IBlueResFileSystem.h. */
export class IBlueResFileSystem
{
  /** `FileExists` - whether this file system can supply the file. */
  FileExists(_path) {}

  /** `IsDirectory` - whether this file system holds a directory at the path. */
  IsDirectory(_path) {}

  /**
   * `GetDirectoryContents` - adds the directory's entries to `results`.
   *
   * @param {string} _directory Res path of the directory.
   * @param {Set<string>} _results Entry names, added to.
   */
  GetDirectoryContents(_directory, _results) {}

  /**
   * `GetStreamFromPath` - the file's bytes, or `null` when this file system
   * cannot supply them. Carbon returns false and leaves the stream empty.
   *
   * @param {string} _path Res path.
   * @returns {Promise<Uint8Array|null>} The bytes, or `null`.
   */
  GetStreamFromPath(_path) {}

  /**
   * `ResolvePath` - where this file system keeps the file, or `null` when it
   * does not. Carbon returns false and leaves the out-parameter unset.
   *
   * @param {string} _path Res path.
   * @returns {string|null} The resolved path, or `null`.
   */
  ResolvePath(_path) {}
}

for (const method of [ "FileExists", "IsDirectory", "GetDirectoryContents", "GetStreamFromPath", "ResolvePath" ])
{
  CjsSchema.decorateMethod(IBlueResFileSystem, method, compose.abstract, impl.abstract);
}

// Carbon declares only the wide-character forms; a JS string covers both.
for (const method of [ "GetStreamFromPath", "ResolvePath" ])
{
  CjsSchema.decorateMethod(IBlueResFileSystem, method, carbon.renamed(`${method}W`));
}

CjsSchema.define(IBlueResFileSystem, {
  className: "IBlueResFileSystem",
  carbon: "IBlueResFileSystem",
  family: "blue",
  fields: {}
});
