// Ours: a `res:` file system over a function a page supplies.
//
// A page with its own way of getting bytes - a dev server route, files bundled
// with the page, bytes generated on the fly - registers this instead of writing
// a file system class. Carbon has no such class: its hosts write file systems
// in C++.
//
// The function gets the path and returns the bytes, or `null` when it does not
// have the file; it may be asynchronous, and it may reject for any other
// failure.
import { CjsSchema } from "#schema";
import { BlueResFileSystemForm, IBlueResFileSystem } from "./IBlueResFileSystem.js";
import { normalizeResPath } from "#utils/path";

/** `CjsBlueResFileSystemCallback` - `res:` paths read through a page's function.
 *
 * Modelled on: IBlueResFileSystem (blue/include/IBlueResFileSystem.h:9)
 */
export class CjsBlueResFileSystemCallback extends IBlueResFileSystem
{
  /** The protocol served (see IBlueResFileSystem.js). */
  static protocols = [ "res" ];

  /** The function returns bytes (see IBlueResFileSystem.js). */
  static forms = [ BlueResFileSystemForm.BYTES ];

  /** @type {(path: string, signal: AbortSignal|null) => (Uint8Array|null|Promise<Uint8Array|null>)} */
  _read = null;

  /**
   * @param {(path: string, signal: AbortSignal|null) => (Uint8Array|null|Promise<Uint8Array|null>)} read
   *   The file's bytes, or `null` when the function does not have it.
   */
  constructor(read)
  {
    super();
    if (typeof read !== "function") throw new TypeError("CjsBlueResFileSystemCallback needs a read function.");
    this._read = read;
  }

  /**
   * `FileExists` - always false: the function can only be asked for bytes.
   *
   * @adapted
   */
  FileExists(_filename)
  {
    return false;
  }

  /**
   * `IsDirectory` - always false, as `FileExists`.
   *
   * @adapted
   */
  IsDirectory(_dir)
  {
    return false;
  }

  /**
   * `GetDirectoryContents` - adds nothing, as `FileExists`.
   *
   * @adapted
   */
  GetDirectoryContents(_dir, _results) {}

  /**
   * `ResolvePathW` - `null`: the function keeps no files anywhere a path names.
   *
   * @adapted
   */
  ResolvePathW(_path)
  {
    return null;
  }

  /**
   * `GetStreamFromPathW` - the function's bytes, or `null` when it returns
   * none. The function is asked for the normalized path (lower case, forward
   * slashes), as Carbon's remote file cache normalizes a path before its index
   * lookup (`RemoteFileCache::GetFileInfo`, `blue/src/RemoteFileCache.cpp:311-319`):
   * content stores paths such as `res:\Graphics\...\CostumeJF01.gr2`.
   *
   * @adapted
   * @renamed GetStreamFromPathW
   * @param {string} path Res path.
   * @param {import("./IBlueResFileSystem.js").BlueResFileSystemRequest} request Always the bytes form, and a signal.
   * @returns {Promise<import("./IBlueResFileSystem.js").BlueResFileSystemResult|null>} The bytes, or `null`.
   */
  async GetStreamFromPath(path, request)
  {
    const data = await this._read(normalizeResPath(path) ?? path, request.signal ?? null);
    if (data === null || data === undefined) return null;
    if (!(data instanceof Uint8Array)) throw new TypeError(`CjsBlueResFileSystemCallback: the read function must return a Uint8Array or null (${path}).`);
    return { form: BlueResFileSystemForm.BYTES, data };
  }
}

CjsSchema.meta.define(CjsBlueResFileSystemCallback, {
  className: "CjsBlueResFileSystemCallback",
  fields: {},
  methods: {
    FileExists: [],
    IsDirectory: [],
    GetDirectoryContents: [],
    ResolvePathW: [],
    GetStreamFromPath: []
  }
});
