// Real client resources for tests, through BePaths as the client loads them: the
// build's resfileindex goes into a RemoteFileCache, registered with be.paths,
// whose downloads come from the local tools-core service. Tests skip only when
// that service is not running.
//
// Contents are NOT verified against the index md5: that hash describes the
// original file, and a served resfile need not match it. A test that depends on
// exact bytes checks them itself.
import { blue, BlueResFileSystemRemote, RemoteFileCache } from "../../npm/dist/global/blue/index.js";
import { localFileSystem } from "./localFileSystem.js";

const SERVER = process.env.CJS_TOOLS_SERVER ?? "http://127.0.0.1:5510";
const TARGET = "eve";

let pending = null;

/**
 * Composes the client's resources once per process.
 *
 * @returns {Promise<{build: string, cache: RemoteFileCache, Read: (resPath: string) => Promise<Uint8Array>} | {skip: string}>}
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

  const cache = new RemoteFileCache({ localFileSystem: localFileSystem(), fetch: globalThis.fetch });
  cache.verifyContentsOnSave = false;
  cache.verifyContentsOnLoad = false;
  cache.SetServer(SERVER);
  cache.SetPrefix("/resfiles/");
  cache.AddFileIndex(await index.text());

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
