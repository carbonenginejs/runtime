// Tiny static server for the audio demo. Game-resource acquisition stays in
// tools-core and @carbonenginejs/tools-browser/audio; this server only exposes
// the selected library, optional local jukebox tracks, and repository assets.
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
  console.log("audio service: http://127.0.0.1:5510 (override with ?audio-service=<url>)");
});

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
