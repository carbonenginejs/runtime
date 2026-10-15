// Source: blue/include/IBlueResFileSystem.h
//
// One place res files can come from. Carbon's paths service holds a list of
// these - the local file system first, then any registered after it, such as
// the remote file cache (BluePaths.cpp:61, :364-385) - and asks each in turn.
//
// The orchestrator registers them; Blue and the resource manager never
// construct one. The local one is a host's (`BlueResFileSystemLocal` throws in
// a browser, which has no disk); the remote one is ported,
// `BlueResFileSystemRemote`; `CjsBlueResFileSystemFetch` is the default for
// `res:` and `http(s):` in a browser.
//
// BROWSER CHANGES, all forced by reading being asynchronous and remote:
//
// - `GetStreamFromPath` is asynchronous and answers `{ form, data }`, where
//   Carbon fills an `IBlueStream`. A browser read can arrive as bytes, text, a
//   `ReadableStream` or a decoded value, and turning one into another can cost
//   a full copy, so the caller asks for the form it wants and the file system
//   says which forms it can produce.
// - Each file system class DECLARES, as statics, the protocols it serves
//   (`protocols`) and the forms it produces (`forms`). The paths service reads
//   the declaration and never probes: Carbon asks every file system in turn,
//   which here would cost a network round trip per miss.
import { CjsSchema, meta, blue } from "#schema";

/**
 * The forms a file system can answer `GetStreamFromPath` in.
 *
 * Ours: Carbon has one form, the `IBlueStream`.
 */
export const BlueResFileSystemForm = Object.freeze({
  /** A `Uint8Array` of the file's bytes. */
  BYTES: "bytes",
  /** The file decoded as UTF-8 text. */
  TEXT: "text",
  /** A `ReadableStream` of the file's bytes, not yet read. */
  STREAM: "stream",
  /** A value the file system decoded itself, such as parsed JSON. */
  VALUE: "value"
});

/**
 * One `GetStreamFromPath` answer.
 *
 * @typedef {object} BlueResFileSystemResult
 * @property {string} form A `BlueResFileSystemForm`: the form `data` is in.
 * @property {*} data The file, in that form.
 */

/**
 * One `GetStreamFromPath` request.
 *
 * @typedef {object} BlueResFileSystemRequest
 * @property {string} form The `BlueResFileSystemForm` to answer in; always one the class declares.
 * @property {AbortSignal|null} [signal] Cancels the read.
 */

/** `IBlueResFileSystem` - one source of res files, per blue/include/IBlueResFileSystem.h. */
export class IBlueResFileSystem
{
  /**
   * The protocols this file system serves (`res`, `http`...), compared with
   * `BlueFileUtil.getResProtocol` of a path. Every class registered with the
   * paths service declares its own; `null` here, so an undeclared class is
   * refused at registration.
   *
   * Ours: the browser routing described at the top of this file.
   *
   * @type {string[]|null}
   */
  static protocols = null;

  /**
   * The `BlueResFileSystemForm`s this file system produces. Declared like
   * `protocols`.
   *
   * Ours: the browser forms described at the top of this file.
   *
   * @type {string[]|null}
   */
  static forms = null;

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
   * `GetStreamFromPathW` - the file in the requested form, or `null` when this
   * file system does not have it. Carbon returns false and leaves the stream
   * empty.
   *
   * Adapted: asynchronous, and answering in a requested form; see the top of
   * this file. A file system rejects when the read failed for another reason
   * than the file being absent (a server error, an abort), so the failure
   * reaches the caller instead of reading as "not here".
   *
   * @param {string} _path Res path.
   * @param {BlueResFileSystemRequest} _request The form to answer in, and a signal.
   * @returns {Promise<BlueResFileSystemResult|null>} The file, or `null`.
   */
  GetStreamFromPath(_path, _request) {}

  /**
   * `ResolvePathW` - where this file system keeps the file, or `null` when it
   * does not. Carbon returns false and leaves the out-parameter unset.
   *
   * @param {string} _path Res path.
   * @returns {string|null} The resolved path, or `null`.
   */
  ResolvePath(_path) {}
}

for (const method of [ "FileExists", "IsDirectory", "GetDirectoryContents", "GetStreamFromPath", "ResolvePath" ])
{
  CjsSchema.decorateMethod(IBlueResFileSystem, method, blue.method, meta.requires, meta.abstract);
}

// Carbon declares only the wide-character forms; a JS string covers both.
CjsSchema.decorateMethod(IBlueResFileSystem, "GetStreamFromPath", blue.method, meta.renamed("GetStreamFromPathW"));
CjsSchema.decorateMethod(IBlueResFileSystem, "ResolvePath", blue.method, meta.renamed("ResolvePathW"));

CjsSchema.blue.define(IBlueResFileSystem, {
  className: "IBlueResFileSystem",
  fields: {}
});
