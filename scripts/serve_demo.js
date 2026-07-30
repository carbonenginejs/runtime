// Tiny local server for the audio demo. The selected library is served from a
// stable URL; an optional game-resource cache is read-only. Missing resources
// fall back to the official CDN without mutating that cache.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const orgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const demoRoot = path.join(orgRoot, "runtime-audio", "demo");
const selectedLibraryPath = path.resolve(
  ReadOption("--library")
    ?? process.env.AUDIO_LIBRARY_PATH
    ?? path.join(demoRoot, "audio-library.json")
);
const libraryJsonPath = selectedLibraryPath.endsWith(".gz")
  ? selectedLibraryPath.slice(0, -3)
  : selectedLibraryPath;
const libraryGzipPath = selectedLibraryPath.endsWith(".gz")
  ? selectedLibraryPath
  : `${selectedLibraryPath}.gz`;
const conventionalResourceCache = path.join(
  orgRoot,
  ".cache",
  "tool-core",
  "ResFiles"
);
const resourceCacheOption = ReadOption("--cache")
  ?? process.env.AUDIO_RESOURCE_CACHE
  ?? (fs.existsSync(conventionalResourceCache)
    ? conventionalResourceCache
    : null);
const resourceCache = resourceCacheOption ? path.resolve(resourceCacheOption) : null;
const port = Number(ReadOption("--port") ?? process.env.PORT) || 8787;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".gz": "application/gzip",
  ".map": "application/json; charset=utf-8",
  ".otf": "font/otf",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".webm": "audio/webm"
};

let libraryPromise = null;

http.createServer(async (request, response) =>
{
  const requestUrl = new URL(request.url, "http://localhost");
  const url = decodeURIComponent(requestUrl.pathname);
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("cache-control", "no-store");

  if (url === "/audio-library.json.gz")
  {
    if (!fs.existsSync(libraryGzipPath))
    {
      response.writeHead(404).end("not found");
      return;
    }
    response.writeHead(200, { "content-type": "application/gzip" });
    fs.createReadStream(libraryGzipPath).pipe(response);
    return;
  }

  if (url === "/audio-library.json")
  {
    if (fs.existsSync(libraryJsonPath))
    {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      fs.createReadStream(libraryJsonPath).pipe(response);
      return;
    }
    if (fs.existsSync(libraryGzipPath))
    {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(gunzipSync(await fs.promises.readFile(libraryGzipPath)));
      return;
    }
    response.writeHead(404).end("not found");
    return;
  }

  if (url.startsWith("/bankwem/"))
  {
    try
    {
      const library = await LoadLibrary();
      const record = SelectVariant(
        library.embeddedMedia?.[url.slice("/bankwem/".length)],
        library.eventMediaLanguage
      );
      const bank = record && library.banks?.[record.bank];
      const bytes = bank && await ReadEmbedded(bank.storagePath, record.offset, record.byteLength);
      if (!bytes)
      {
        response.writeHead(404).end("not found");
        return;
      }
      response.writeHead(200, { "content-type": "application/octet-stream" });
      response.end(bytes);
    }
    catch
    {
      response.writeHead(404).end("not found");
    }
    return;
  }

  if (url.startsWith("/range/"))
  {
    const storagePath = url.slice("/range/".length);
    const offset = Number(requestUrl.searchParams.get("offset"));
    const byteLength = Number(requestUrl.searchParams.get("byteLength"));
    if (!IsStoragePath(storagePath)
      || !Number.isSafeInteger(offset)
      || offset < 0
      || !Number.isSafeInteger(byteLength)
      || byteLength <= 0)
    {
      response.writeHead(404).end("not found");
      return;
    }

    try
    {
      const bytes = await ReadEmbedded(storagePath, offset, byteLength);
      if (!bytes)
      {
        response.writeHead(404).end("not found");
        return;
      }
      response.writeHead(206, {
        "content-type": "application/octet-stream",
        "content-length": bytes.byteLength,
        "content-range": `bytes ${offset}-${offset + byteLength - 1}/*`
      });
      response.end(bytes);
    }
    catch
    {
      response.writeHead(404).end("not found");
    }
    return;
  }

  if (url.startsWith("/cache/"))
  {
    const storagePath = url.slice("/cache/".length);
    if (!IsStoragePath(storagePath))
    {
      response.writeHead(404).end("not found");
      return;
    }

    const file = ResolveCachedFile(storagePath);
    if (file && fs.existsSync(file))
    {
      response.writeHead(200, { "content-type": "application/octet-stream" });
      fs.createReadStream(file).pipe(response);
      return;
    }

    try
    {
      const bytes = await FetchResource(storagePath);
      response.writeHead(200, { "content-type": "application/octet-stream" });
      response.end(bytes);
    }
    catch
    {
      response.writeHead(404).end("not found");
    }
    return;
  }

  if (url.startsWith("/jukebox/"))
  {
    const parts = url.slice("/jukebox/".length).split("/");
    const playlistID = parts[0] ?? "";
    const trackID = parts[1] ?? "";
    if (parts.length !== 2
      || !/^[a-z0-9-]+$/i.test(playlistID)
      || !/^\d{3}$/.test(trackID))
    {
      response.writeHead(404).end("not found");
      return;
    }

    const directory = path.join(demoRoot, "music-cache", playlistID);
    const file = fs.existsSync(directory)
      ? fs.readdirSync(directory)
        .find(name =>
          name.startsWith(`${trackID}.`)
          && !name.endsWith(".info.json")
          && !name.endsWith(".part")
          && !name.endsWith(".ytdl"))
      : null;
    const resolved = file ? path.resolve(directory, file) : null;

    if (!resolved
      || !IsWithin(directory, resolved)
      || !fs.statSync(resolved).isFile())
    {
      response.writeHead(404).end(
        "track not downloaded; run npm run demo:music"
      );
      return;
    }

    response.writeHead(200, {
      "content-type": types[path.extname(resolved).toLowerCase()]
        ?? "application/octet-stream"
    });
    fs.createReadStream(resolved).pipe(response);
    return;
  }

  const relativeUrl = url === "/" ? "runtime-audio/demo/index.html" : url.replace(/^\/+/, "");
  const file = path.resolve(orgRoot, relativeUrl);
  if (!IsWithin(orgRoot, file) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
  {
    response.writeHead(404).end("not found");
    return;
  }
  response.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
}).listen(port, () =>
{
  console.log(`audio demo: http://localhost:${port}/`);
  console.log(`audio library: ${selectedLibraryPath}`);
  console.log(`resource cache: ${resourceCache ?? "disabled (CDN fallback only)"}`);
});

async function LoadLibrary()
{
  return libraryPromise ??= (async () =>
  {
    const bytes = fs.existsSync(libraryJsonPath)
      ? await fs.promises.readFile(libraryJsonPath)
      : gunzipSync(await fs.promises.readFile(libraryGzipPath));
    const library = JSON.parse(bytes.toString("utf8"));
    if (library.schema !== "carbonenginejs.audioLibrary" || library.schemaVersion !== 2)
    {
      throw new Error(`Unsupported audio library schema v${library.schemaVersion ?? "<missing>"}`);
    }
    return library;
  })();
}

function SelectVariant(value, language)
{
  if (!Array.isArray(value)) return value ?? null;
  return value.find(record => record.language === (language ?? ""))
    ?? value.find(record => !record.language)
    ?? value[0]
    ?? null;
}

async function ReadEmbedded(storagePath, offset, byteLength)
{
  if (!IsStoragePath(storagePath)) return null;
  const file = ResolveCachedFile(storagePath);
  if (file && fs.existsSync(file))
  {
    const bytes = Buffer.alloc(byteLength);
    const handle = await fs.promises.open(file, "r");
    try
    {
      const result = await handle.read(bytes, 0, byteLength, offset);
      return result.bytesRead === byteLength ? bytes : null;
    }
    finally
    {
      await handle.close();
    }
  }

  const bank = await FetchResource(storagePath);
  return offset + byteLength <= bank.byteLength
    ? bank.subarray(offset, offset + byteLength)
    : null;
}

async function FetchResource(storagePath)
{
  const remote = await fetch(`https://resources.eveonline.com/${storagePath}`);
  if (!remote.ok) throw new Error(String(remote.status));
  return Buffer.from(await remote.arrayBuffer());
}

function ResolveCachedFile(storagePath)
{
  if (!resourceCache) return null;
  const file = path.resolve(resourceCache, storagePath);
  return IsWithin(resourceCache, file) ? file : null;
}

function IsStoragePath(value)
{
  return /^[a-zA-Z0-9._/-]+$/.test(value)
    && !value.split(/[\\/]/).includes("..");
}

function IsWithin(root, file)
{
  const relative = path.relative(root, file);
  return relative !== ""
    && !relative.startsWith(`..${path.sep}`)
    && relative !== ".."
    && !path.isAbsolute(relative);
}

function ReadOption(name)
{
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
