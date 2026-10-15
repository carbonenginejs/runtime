// A host's local file system for tests: the paths whose bytes are "on this
// machine", as `be.paths.SetLocalFileSystem` and `RemoteFileCache` expect.
import { BlueResFileSystemForm, IBlueResFileSystem } from "../../npm/dist/global/blue/index.js";

/** An in-memory host file system: `res:` and the cache folder's `cache:`, as bytes. */
class TestLocalFileSystem extends IBlueResFileSystem
{
  static protocols = [ "res", "cache" ];

  static forms = [ BlueResFileSystemForm.BYTES ];

  constructor(present, files)
  {
    super();
    this.present = present;
    this.files = files;
  }

  FileExists(path) { return this.present.has(path); }

  IsDirectory() { return false; }

  GetDirectoryContents() {}

  async GetStreamFromPath(path)
  {
    const data = this.files.get(path);
    return data === undefined ? null : { form: BlueResFileSystemForm.BYTES, data };
  }

  ResolvePath(path) { return this.present.has(path) ? path : null; }

  async WriteFile(path, bytes)
  {
    this.files.set(path, bytes);
    this.present.add(path);
    return true;
  }

  async RemoveFile(path)
  {
    this.files.delete(path);
    this.present.delete(path);
  }
}

/**
 * @param {Iterable<string>} paths Paths that exist locally.
 * @param {Map<string, Uint8Array>} [files=new Map()] Bytes for any of them.
 * @returns {TestLocalFileSystem} An IBlueResFileSystem with WriteFile and RemoveFile.
 */
export function localFileSystem(paths = [], files = new Map())
{
  const present = new Set(paths);
  for (const path of files.keys()) present.add(path);
  return new TestLocalFileSystem(present, files);
}
