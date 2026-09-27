// A host's local file system for tests: the paths whose bytes are "on this
// machine", as `blue.paths.SetLocalFileSystem` expects.

/**
 * @param {Iterable<string>} paths Paths that exist locally.
 * @param {Map<string, Uint8Array>} [files=new Map()] Bytes for any of them.
 * @returns {object} An IBlueResFileSystem with WriteFile and RemoveFile.
 */
export function localFileSystem(paths = [], files = new Map())
{
  const present = new Set(paths);
  for (const path of files.keys()) present.add(path);
  return {
    present,
    files,
    FileExists: path => present.has(path),
    IsDirectory: () => false,
    GetDirectoryContents: () => {},
    GetStreamFromPath: async path => files.get(path) ?? null,
    ResolvePath: path => (present.has(path) ? path : null),
    WriteFile: async (path, bytes) =>
    {
      files.set(path, bytes);
      present.add(path);
      return true;
    },
    RemoveFile: async path =>
    {
      files.delete(path);
      present.delete(path);
    }
  };
}
