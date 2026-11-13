// Real client resources for tests, through BePaths as the client loads them: the
// build's resfileindex goes into a RemoteFileCache, registered with blue.paths,
// whose downloads come from the local tools-core service. Tests skip only when
// that service is not running.
//
// Contents are NOT verified against the index md5: that hash describes the
// original file, and a served resfile need not match it. A test that depends on
// exact bytes checks them itself.
import { blue, BlueResFileSystemRemote, RemoteFileCache } from "../../npm/dist/blue/index.js";
import { localFileSystem } from "./localFileSystem.js";

const SERVER = process.env.CJS_TOOLS_SERVER ?? "http://127.0.0.1:5510";
const TARGET = "eve";

let pending = null;

/**
 * `fetch`, retried once when the request fails below HTTP (a reset or refused connection).
 *
 * tools-core sets no keep-alive timeout, so Node's 5 s default closes idle sockets. A test that blocks the event
 * loop for longer (synchronous decoding, posing) never sees the close, and its next request reuses the dead pooled
 * socket and fails with ECONNRESET. The retry opens a fresh connection. RemoteFileCache keeps Carbon's no-retry
 * shape; only this host fetch retries.
 *
 * @param {string|Request} input The request.
 * @param {object} [init] Its options.
 * @returns {Promise<Response>} The response.
 */
async function fetchRetryingOnce(input, init)
{
  try
  {
    return await globalThis.fetch(input, init);
  }
  catch (error)
  {
    if (!(error instanceof TypeError)) throw error;
    return globalThis.fetch(input, init);
  }
}

/**
 * Composes the client's resources once per process.
 *
 * @returns {Promise<{build: string, cache: RemoteFileCache, Read: (resPath: string) => Promise<Uint8Array>,
 *   Paths: (extension: string) => string[], Sample: (extension: string, count: number) => string[]} | {skip: string}>}
 */
export function clientResources()
{
  pending ??= compose();
  return pending;
}

async function compose()
{
  // CJS_CLIENT_BUILD pins the client build, e.g. while tools-core is still fetching a new one.
  let build = process.env.CJS_CLIENT_BUILD;
  if (!build) try
  {
    const answer = await fetch(`${SERVER}/${TARGET}/latest/build`, { signal: AbortSignal.timeout(10000) });
    if (!answer.ok) return { skip: `tools-core ${SERVER} answered ${answer.status} for the ${TARGET} build` };
    const describe = await answer.json();
    build = describe.builds?.resources ?? describe.build;
  }
  catch (error)
  {
    return { skip: `client resources need tools-core at ${SERVER} (${error.message})` };
  }

  const index = await fetch(`${SERVER}/${TARGET}/${build}/app/resfileindex.txt`, { signal: AbortSignal.timeout(120000) });
  if (!index.ok) return { skip: `no resfileindex for ${TARGET} build ${build} (${index.status})` };

  const cache = new RemoteFileCache({ localFileSystem: localFileSystem(), fetch: fetchRetryingOnce });
  cache.verifyContentsOnSave = false;
  cache.verifyContentsOnLoad = false;
  cache.SetServer(SERVER);
  cache.SetPrefix("/resfiles/");
  const indexText = await index.text();
  cache.AddFileIndex(indexText);
  let paths = null;

  // Effects are not in the app index; they are in the platform group
  // `resfileindex_windows.txt` (dx11/dx12 at sm_lo/sm_hi/sm_depth). Without it
  // only effect reads fail; everything else keeps working.
  let effectIndexError = null;
  try
  {
    const effects = await fetch(`${SERVER}/${TARGET}/${build}/app/resfileindex_windows.txt`, { signal: AbortSignal.timeout(120000) });
    if (effects.ok) cache.AddFileIndex(await effects.text());
    else effectIndexError = `no resfileindex_windows.txt for ${TARGET} build ${build} (${effects.status})`;
  }
  catch (error)
  {
    effectIndexError = `resfileindex_windows.txt for ${TARGET} build ${build} failed (${error.message})`;
  }
  blue.paths.RegisterFileSystem(new BlueResFileSystemRemote(cache));

  return {
    build,
    cache,
    /**
     * Every path of the app index with one extension, lower-cased and sorted, so a sample is the same each run.
     *
     * @param {string} extension The extension, with its dot, such as ".black".
     * @returns {string[]} The paths.
     */
    Paths(extension)
    {
      paths ??= indexText.split(/\r?\n/).map(line => line.slice(0, line.indexOf(",")).toLowerCase()).filter(Boolean).sort();
      return paths.filter(path => path.endsWith(extension));
    },
    /**
     * A fixed sample of the paths with one extension: every Nth in sorted order, at most `count`.
     *
     * @param {string} extension The extension, with its dot.
     * @param {number} count The most paths to return.
     * @returns {string[]} The sample; all of them when there are no more than `count`.
     */
    Sample(extension, count)
    {
      const all = this.Paths(extension);
      if (all.length <= count) return all;
      const sample = [];
      for (let i = 0; i < count; i++) sample.push(all[Math.floor(i * all.length / count)]);
      return sample;
    },
    /** The bytes of a client file; throws when the build does not ship it. */
    async Read(resPath)
    {
      if (!cache.FileExists(resPath))
      {
        if (effectIndexError && /\/effect\.[^/]+\//i.test(resPath)) throw new Error(`${resPath}: ${effectIndexError}`);
        throw new Error(`${resPath} is not in ${TARGET} build ${build}`);
      }
      const bytes = await cache.GetStreamFromPath(resPath);
      if (!bytes) throw new Error(`${resPath} could not be downloaded from ${SERVER}`);
      return Buffer.from(bytes);
    }
  };
}
