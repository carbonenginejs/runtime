// Node-only demo preparation. This file is not included in the npm package.
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const playlistID = "eve-online-in-game-tracks";
const destination = path.join(root, "demo", "music-cache", playlistID);
const executable = ReadOption("--yt-dlp")
    ?? process.env.YT_DLP
    ?? "yt-dlp";
const playlist = ReadOption("--playlist")
    ?? "https://soundcloud.com/fenriscreations/sets/eve-online-in-game-tracks";

await fs.mkdir(destination, { recursive: true });

const exitCode = await Run(executable, [
    "--yes-playlist",
    "--continue",
    "--no-overwrites",
    "--write-info-json",
    "--write-playlist-metafiles",
    "--format",
    "download/bestaudio/best",
    "--output",
    path.join(destination, "%(playlist_index)03d.%(ext)s"),
    playlist,
]);

if (exitCode !== 0)
{
    process.exitCode = exitCode;
}
else
{
    const files = await fs.readdir(destination);
    const tracks = new Set(
        files
            .map(file => file.match(/^(\d{3})\.[^.]+$/)?.[1])
            .filter(Boolean),
    );

    console.log(
        `demo music cache: ${tracks.size}/75 tracks at ${destination}`,
    );
    if (tracks.size !== 75)
    {
        console.warn(
            "The source playlist did not yield all 75 catalog tracks.",
        );
    }
}

function Run(command, args)
{
    return new Promise((resolve, reject) =>
    {
        const child = spawn(command, args, {
            stdio: "inherit",
            windowsHide: true,
        });

        child.once("error", reject);
        child.once("exit", code => resolve(code ?? 1));
    });
}

function ReadOption(name)
{
    const index = process.argv.indexOf(name);

    return index === -1 ? null : process.argv[index + 1] ?? null;
}
