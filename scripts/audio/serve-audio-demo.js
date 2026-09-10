// Serves the audio demo page and its bundle.
//
// NOTHING GAME-DERIVED IS SERVED FROM HERE. The audio library and every media
// file come from the tools-core service the demo asks directly (default
// `http://127.0.0.1:5510`, overridable with `?audio-service=`), which reads the
// installed client. This process only hands the browser the page and the bundle,
// which is why it can serve the repository root read-only and nothing else.
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const demoPage = "/test/audio/demo/index.html";

function option(name, fallback)
{
    const index = process.argv.indexOf(name);

    return index === -1 ? fallback : process.argv[index + 1];
}

const port = Number(option("--port", 5504));

const TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2"
};

createServer((request, response) =>
{
    const requested = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const target = path.join(root, requested === "/" ? demoPage : requested);

    // A "../" in the request must not reach outside the repository.
    if (!path.resolve(target).startsWith(path.resolve(root)))
    {
        response.writeHead(403).end("outside root");

        return;
    }

    try
    {
        if (!statSync(target).isFile()) throw new Error("not a file");
    }
    catch
    {
        response.writeHead(404).end("not found");

        return;
    }

    response.writeHead(200, { "content-type": TYPES[path.extname(target)] ?? "application/octet-stream" });
    createReadStream(target).pipe(response);
}).listen(port, "127.0.0.1", () =>
{
    console.log(`Audio demo:  http://127.0.0.1:${port}${demoPage}`);
    console.log("Audio library and media come from tools-core on 127.0.0.1:5510 - start it with `npm run service` there.");
});
