// Source: blue/src/RemoteFileCache.h, blue/src/RemoteFileCache.cpp,
//   blue/src/RemoteFileCache_Blue.cpp
//
// A build's file index, and the downloads it drives. The index maps each res
// path to the name its bytes are stored under - content-addressed, so two
// builds shipping the same bytes share one stored file - with the md5 and size
// of those bytes. Two questions come out of it, and they are different:
//
// - `FileExists`: the index lists the path, so the file can be had;
// - `IsCachedLocally`: its bytes are already in the cache folder
//   (`cache:/ResFiles/<cachedName>`), so it can be had without downloading.
//
// `GetStreamFromPath` answers from the cache folder when it can, and otherwise
// downloads from the server - falling back to a backup server - verifies,
// stores and returns the bytes.
//
// INSTANCES, NOT ONE GLOBAL. Carbon has one, `BeRemoteFileCache`
// (ResourceLoading.cpp:17-19), because a client runs one build. A host serving
// several builds at once holds one of these per build; they may share the
// local file system, since stored names are content addresses.
//
// WHAT THE HOST SUPPLIES. Carbon reaches the disk through `BePaths` and
// `BlueFileStream`, and the network through `BlueRemoteStream`. Here the host
// passes all three in:
//
// - `localFileSystem`: the byte store, as an `IBlueResFileSystem` plus
//   `WriteFile(path, bytes)` and `RemoveFile(path)`. Writing must be atomic -
//   Carbon writes a `.tmp` and renames it (cpp:507-583) - and that is the
//   host's job, because only the host has a file system to rename on.
// - `fetch`: a WHATWG fetch.
// - `md5`: bytes to a lowercase hex digest. Runtime computes no digests
//   (`global/utils/resFile.js`), so a host that verifies supplies one.
import { CjsSchema, carbon, impl } from "#schema";
import { normalizeResPath } from "#utils/path";

/**
 * `atoi`: leading whitespace, an optional sign, then digits; 0 when there are
 * none. Carbon reads the size column with it (cpp:371).
 */
function atoi(text)
{
  const match = /^[\t\n\v\f\r ]*([+-]?\d+)/u.exec(text);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/**
 * `std::string::find` from `start`, with `npos` as -1. Carbon's column split
 * relies on `npos + 1` wrapping to 0 (cpp:356-366), so a caller emulates that.
 */
function find(text, character, start)
{
  if (start > text.length) return -1;
  return text.indexOf(character, start);
}

/** `std::string::substr(start, count)`, where a count of -1 is `npos`. */
function substr(text, start, count)
{
  return count === -1 ? text.slice(start) : text.slice(start, start + count);
}

/**
 * `RemoteFileCache` - a build's file index, and the downloads and local cache
 * it drives. One instance per build.
 */
export class RemoteFileCache
{
  /** Server, and optionally port, to get files from. */
  server = "http://127.0.0.1:5000";

  /** Backup server to get files from when the download from `server` fails. Empty for none. */
  backupServer = "";

  /** Prefix added to file names requested from the server. */
  prefix = "/res/";

  /** Folder where downloaded files are cached. */
  cacheFolder = "cache:/ResFiles";

  /** Whether to call the server-failed callback when a download from the primary server fails. */
  registerDownloadErrors = true;

  /** Failures from the primary server before the backup server replaces it; -1 never. */
  primaryServerFailThreshold = 10;

  /** Bytes successfully downloaded from the server. */
  bytesDownloaded = 0;

  /** Files successfully downloaded from the server. */
  filesDownloaded = 0;

  /** Bytes successfully cached after download. */
  bytesCached = 0;

  /** Files successfully cached after download. */
  filesCached = 0;

  /** Files used from the cache rather than downloaded. */
  filesUsedFromCache = 0;

  /** Log all headers received from the server on network problems. */
  fullHeaderLogging = false;

  /** Verify downloaded contents against the md5 before caching them. */
  verifyContentsOnSave = true;

  /** Verify cached contents against the md5 the first time they are used. */
  verifyContentsOnLoad = true;

  _numSequentialPrimaryServerDownloadErrors = 0;

  /** @type {Map<string, {cachedName: string, checksum: string, size: number, verified: boolean}>} */
  _fileIndex = new Map();

  /** @type {Map<string, Set<string>>} */
  _folderIndex = new Map();

  _onServerFailedCallback = null;

  _localFileSystem = null;

  _fetch = null;

  _md5 = null;

  /**
   * @param {object} [options={}] Host I/O.
   * @param {object|null} [options.localFileSystem=null] Byte store: `IBlueResFileSystem` plus `WriteFile` and `RemoveFile`.
   * @param {Function|null} [options.fetch=null] WHATWG fetch.
   * @param {((bytes: Uint8Array) => string)|null} [options.md5=null] Lowercase hex md5 of bytes.
   */
  constructor(options = {})
  {
    this._localFileSystem = options.localFileSystem ?? null;
    this._fetch = options.fetch ?? null;
    this._md5 = options.md5 ?? null;
  }

  /**
   * `DownloadFileIndex` - adds the index at `server + prefix + index`, using
   * the copy in the cache folder when there is one and caching it when there
   * is not (cpp:48-91).
   *
   * Adapted: asynchronous, and the index text is decoded as UTF-8 where Carbon
   * reads bytes. Carbon caches the downloaded index without checking it; so
   * does this.
   *
   * @param {string} index Index file name.
   * @returns {Promise<boolean>} Whether an index was added.
   */
  async DownloadFileIndex(index)
  {
    const url = this.server + this.prefix + index;
    const cachedName = `${this.cacheFolder}/${index}`;

    let bytes = null;
    if (this._localFileSystem.FileExists(cachedName))
    {
      bytes = await this._CreateFileStreamForCachedFile(cachedName, "");
    }

    if (bytes === null)
    {
      bytes = await this._OpenRemote(url);
      if (bytes === null) return false;
      await this._CacheContentsOfRemoteStream(bytes, cachedName, "remote file index");
    }

    this._AddFileIndexImpl(new TextDecoder().decode(bytes));
    return true;
  }

  /**
   * `AddFileIndex` - adds an index from its text.
   *
   * @param {string} fileIndex Index contents.
   */
  AddFileIndex(fileIndex)
  {
    this._AddFileIndexImpl(fileIndex);
  }

  /** `SetCacheFolder` - sets the folder downloaded files are cached in. */
  SetCacheFolder(folderName)
  {
    this.cacheFolder = folderName;
  }

  /** `SetServer` - sets the server files are downloaded from. */
  SetServer(url)
  {
    this.server = url;
  }

  /** `SetPrefix` - sets the prefix added to file names requested from the server. */
  SetPrefix(prefix)
  {
    this.prefix = prefix;
  }

  /**
   * `GetStreamFromPathW` - the file's bytes, from the cache folder when they
   * are there and verify, otherwise downloaded, verified and cached
   * (cpp:108-227).
   *
   * Adapted: asynchronous, returning the bytes and rejecting with Carbon's
   * failure message where Carbon returns a `Be::Result` beside an out-stream.
   *
   * Quirk, reproduced (cpp:158-196): the count of sequential primary-server
   * failures resets only when a download fails with no backup server set -
   * never on a success - so with a backup server it counts every failure
   * since start, sequential or not.
   *
   * @param {string} resPath Res path.
   * @returns {Promise<Uint8Array>} The file's bytes.
   * @throws {Error} "File does not exist on remote server", "Size does not match
   *   expected value", "Checksum does not match expected value" or
   *   "Couldn't download file".
   */
  async GetStreamFromPath(resPath)
  {
    const info = this._GetFileInfo(resPath);
    if (!info) throw new Error("File does not exist on remote server");

    const resId = info.cachedName;
    const cachedName = `${this.cacheFolder}/${resId}`;

    if (this._localFileSystem.FileExists(cachedName))
    {
      const checksum = this.verifyContentsOnLoad && !info.verified ? info.checksum : "";
      try
      {
        const bytes = await this._CreateFileStreamForCachedFile(cachedName, checksum);
        info.verified = true;
        return bytes;
      }
      catch
      {
        await this._localFileSystem.RemoveFile(cachedName);
      }
    }

    const expectedSize = info.size;
    let bytes = await this._TryDownload(this.server, resId, expectedSize, resPath);
    if (bytes === null)
    {
      if (this.backupServer !== "")
      {
        if (this.primaryServerFailThreshold > -1)
        {
          this._numSequentialPrimaryServerDownloadErrors++;
          if (this._numSequentialPrimaryServerDownloadErrors > this.primaryServerFailThreshold)
          {
            this.server = this.backupServer;
          }
        }

        if (this.registerDownloadErrors && this._onServerFailedCallback)
        {
          this._onServerFailedCallback("Primary", resPath, this.server);
        }

        bytes = await this._TryDownload(this.backupServer, resId, expectedSize, resPath);
        if (bytes === null && this.registerDownloadErrors && this._onServerFailedCallback)
        {
          this._onServerFailedCallback("Backup", resPath, this.backupServer);
        }
      }
      else
      {
        this._numSequentialPrimaryServerDownloadErrors = 0;
      }
    }

    if (bytes === null) throw new Error("Couldn't download file");

    const size = bytes.byteLength;
    ++this.filesDownloaded;
    this.bytesDownloaded += size;

    if (size !== info.size) throw new Error("Size does not match expected value");

    if (this.verifyContentsOnSave && this._Md5(bytes) !== info.checksum)
    {
      throw new Error("Checksum does not match expected value");
    }

    await this._CacheContentsOfRemoteStream(bytes, cachedName, resPath);
    return bytes;
  }

  /**
   * `FileExists` - whether the index lists the file, so it can be had
   * (cpp:285-288). Says nothing about whether its bytes are here.
   */
  FileExists(resPath)
  {
    return this._GetFileInfo(resPath) !== null;
  }

  /**
   * `IsCachedLocally` - whether the file's bytes are in the cache folder
   * (cpp:290-293).
   *
   * Adapted: asks the local file system directly, where Carbon asks
   * `BePaths->FileExistsLocally`. The answer is the same: a cache-folder name
   * is never in an index, so Carbon's paths service falls through to its local
   * file system.
   */
  IsCachedLocally(resPath)
  {
    return this._localFileSystem.FileExists(this.GetLocallyCachedName(resPath));
  }

  /**
   * `GetLocallyCachedName` - where the file's bytes are cached, or the path
   * itself when the index does not list it (cpp:295-309).
   */
  GetLocallyCachedName(resPath)
  {
    const info = this._GetFileInfo(resPath);
    if (!info) return resPath;
    return `${this.cacheFolder}/${info.cachedName}`;
  }

  /** `IsDirectory` - whether any listed path is under this one (cpp:470-485). */
  IsDirectory(resPath)
  {
    let validatedPath = normalizeResPath(resPath);
    if (validatedPath === null) return false;
    if (!validatedPath.endsWith("/")) validatedPath += "/";
    return this._folderIndex.has(validatedPath);
  }

  /**
   * `ListDir` - a directory's files and folders, folders without their
   * trailing slash (cpp:421-456).
   *
   * Adapted: returns the names, and throws Carbon's failure message, where
   * Carbon fills a list and returns a `Be::Result`. Sorted as `std::set`
   * orders them.
   *
   * @param {string} resPath Res path of the directory.
   * @returns {string[]} Entry names.
   * @throws {Error} "Not a valid res path" or "Directory not found".
   */
  ListDir(resPath)
  {
    let validatedPath = normalizeResPath(resPath);
    if (validatedPath === null) throw new Error("Not a valid res path");
    if (!validatedPath.endsWith("/")) validatedPath += "/";

    const entries = this._folderIndex.get(validatedPath);
    if (!entries) throw new Error("Directory not found");

    const contents = [];
    for (const name of [ ...entries ].sort())
    {
      contents.push(name.endsWith("/") ? name.slice(0, -1) : name);
    }
    return contents;
  }

  /**
   * `RegisterOnServerFailedCallback` - called with `("Primary"|"Backup",
   * resPath, server)` when a download fails and a backup server is set.
   *
   * @param {((which: string, resPath: string, server: string) => void)|null} callback Callback.
   */
  RegisterOnServerFailedCallback(callback)
  {
    this._onServerFailedCallback = callback;
  }

  /**
   * `CreateFileStreamForCachedFile` - the cached bytes, verified against
   * `checksum` unless it is empty (cpp:253-283).
   *
   * Adapted: one read, where Carbon retries opening five times, 10 ms apart,
   * against another process still writing. A host store writes atomically, so
   * a file that exists is complete.
   *
   * @returns {Promise<Uint8Array|null>} The bytes, or `null` when the file cannot be read.
   * @throws {Error} "File is corrupt" when the checksum does not match.
   */
  async _CreateFileStreamForCachedFile(cachedName, checksum)
  {
    const bytes = await this._localFileSystem.GetStreamFromPath(cachedName);
    if (bytes === null) return null;
    if (checksum !== "" && this._Md5(bytes) !== checksum) throw new Error("File is corrupt");
    ++this.filesUsedFromCache;
    return bytes;
  }

  /** `GetFileInfo` - the index entry for a res path, after normalizing it (cpp:311-326). */
  _GetFileInfo(resPath)
  {
    const validatedPath = normalizeResPath(resPath);
    if (validatedPath === null) return null;
    return this._fileIndex.get(validatedPath) ?? null;
  }

  /**
   * `AddFileIndexImpl` - reads `resPath,cachedName,checksum,size` lines into
   * the index; a later entry for a path replaces an earlier one (cpp:328-377).
   *
   * Reproduced exactly: keys are stored as written, not normalized, so an
   * index must already hold normalized paths; a `\r` is kept on the last
   * column read; and a line with fewer than four columns wraps back to its
   * start, because `npos + 1` is 0 - `a,b` reads checksum `a` and size `b`.
   */
  _AddFileIndexImpl(contents)
  {
    for (const line of contents.split("\n"))
    {
      if (line === "") continue;

      let start = 0;
      let commaPos = find(line, ",", start);
      const resPath = substr(line, start, commaPos === -1 ? -1 : commaPos - start);

      start = commaPos + 1;
      commaPos = find(line, ",", start);
      const cachedName = substr(line, start, commaPos === -1 ? -1 : commaPos - start);

      start = commaPos + 1;
      commaPos = find(line, ",", start);
      const checksum = substr(line, start, commaPos === -1 ? -1 : commaPos - start);

      start = commaPos + 1;
      commaPos = find(line, ",", start);
      const sizeAsString = substr(line, start, commaPos === -1 ? -1 : commaPos - start);

      this._fileIndex.set(resPath, { cachedName, checksum, size: atoi(sizeAsString), verified: false });
      this._AddResPathToFolderIndex(resPath);
    }
  }

  /**
   * `AddResPathToFolderIndex` - records each folder of a path with the entry
   * under it; folder entries keep their trailing slash (cpp:389-419).
   */
  _AddResPathToFolderIndex(resPath)
  {
    let slashIx = resPath.indexOf("/");
    while (slashIx !== -1)
    {
      const folder = resPath.slice(0, slashIx + 1);
      const start = slashIx + 1;
      slashIx = resPath.indexOf("/", start);
      const component = slashIx === -1 ? resPath.slice(start) : resPath.slice(start, slashIx + 1);

      let entries = this._folderIndex.get(folder);
      if (!entries)
      {
        entries = new Set();
        this._folderIndex.set(folder, entries);
      }
      entries.add(component);
    }
  }

  /**
   * `CacheContentsOfRemoteStream` - stores downloaded bytes under their cached
   * name, unless something already has (cpp:503-583).
   *
   * Adapted: the host's `WriteFile` does Carbon's write-to-`.tmp`-then-rename,
   * and reports whether it stored the bytes.
   */
  async _CacheContentsOfRemoteStream(bytes, cachedName, _resPath)
  {
    if (this._localFileSystem.FileExists(cachedName)) return;
    if (await this._localFileSystem.WriteFile(cachedName, bytes))
    {
      ++this.filesCached;
      this.bytesCached += bytes.byteLength;
    }
  }

  /** `TryDownload` - the bytes at `server + prefix + filename`, or `null` (cpp:600-607). */
  _TryDownload(server, filename, _expectedSize, _resPath)
  {
    return this._OpenRemote(server + this.prefix + filename);
  }

  /**
   * `BlueRemoteStream::Open` as the cache uses it: the response bytes, or
   * `null` when the request fails.
   *
   * Adapted: Carbon's download-time thresholds (warn and abort on long
   * downloads) belong to its remote stream and are not ported.
   */
  async _OpenRemote(url)
  {
    try
    {
      const response = await this._fetch(url);
      if (!response.ok) return null;
      return new Uint8Array(await response.arrayBuffer());
    }
    catch
    {
      return null;
    }
  }

  /**
   * The md5 of bytes, from the host.
   *
   * @throws {Error} When verification needs a digest and the host supplied none.
   */
  _Md5(bytes)
  {
    if (!this._md5) throw new Error("RemoteFileCache verifies contents, and needs an md5 from its host to do so.");
    return this._md5(bytes);
  }
}

CjsSchema.define(RemoteFileCache, {
  className: "RemoteFileCache",
  carbon: "RemoteFileCache",
  family: "blue",
  fields: {},
  methods: {
    DownloadFileIndex: [ carbon.method, impl.adapted ],
    AddFileIndex: [ carbon.method, impl.implemented ],
    SetCacheFolder: [ carbon.method, impl.implemented ],
    SetServer: [ carbon.method, impl.implemented ],
    SetPrefix: [ carbon.method, impl.implemented ],
    GetStreamFromPath: [ carbon.renamed("GetStreamFromPathW"), impl.adapted ],
    FileExists: [ carbon.method, impl.implemented ],
    IsCachedLocally: [ carbon.method, impl.adapted ],
    GetLocallyCachedName: [ carbon.method, impl.implemented ],
    IsDirectory: [ carbon.method, impl.implemented ],
    ListDir: [ carbon.method, impl.adapted ],
    RegisterOnServerFailedCallback: [ carbon.method, impl.implemented ]
  }
});
