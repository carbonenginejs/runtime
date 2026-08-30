const MUSIC_LIBRARY_SCHEMA = "carbonenginejs.musicLibrary";
const MUSIC_LIBRARY_VERSION = 1;

/**
 * Validates one caller-owned jukebox catalog.
 *
 * Track `url` and `path` values are acquisition hints. Runtime-audio never
 * resolves or fetches them; the caller-supplied track loader decides what they
 * mean.
 */
export function validateMusicLibrary(value)
{
    RequireRecord(value, "Music library");

    if (value.schema !== MUSIC_LIBRARY_SCHEMA)
    {
        throw new TypeError(
            `Unsupported music-library schema: ${value.schema}`,
        );
    }
    if (value.schemaVersion !== MUSIC_LIBRARY_VERSION)
    {
        throw new TypeError(
            `Unsupported music-library schema version: ${value.schemaVersion}`,
        );
    }

    RequireText(value.name, "Music library name");
    RequireText(value.version, "Music library version");

    if (!Array.isArray(value.playlists) || !value.playlists.length)
    {
        throw new TypeError(
            "Music library playlists must be a non-empty array",
        );
    }

    const playlistIDs = new Set();

    for (const [ playlistIndex, playlist ] of value.playlists.entries())
    {
        const label = `Music library playlist ${playlistIndex}`;

        RequireRecord(playlist, label);
        const playlistID = RequireText(playlist.id, `${label} id`);

        if (playlistIDs.has(playlistID))
        {
            throw new TypeError(
                `Music library has duplicate playlist id ${playlistID}`,
            );
        }
        playlistIDs.add(playlistID);
        RequireText(playlist.name, `${label} name`);

        if (!Array.isArray(playlist.songs) || !playlist.songs.length)
        {
            throw new TypeError(`${label} songs must be a non-empty array`);
        }

        const songIDs = new Set();

        for (const [ songIndex, song ] of playlist.songs.entries())
        {
            const songLabel = `${label} song ${songIndex}`;

            RequireRecord(song, songLabel);
            const songID = RequireText(song.id, `${songLabel} id`);

            if (songIDs.has(songID))
            {
                throw new TypeError(
                    `Music library playlist ${playlistID} has duplicate song id ${songID}`,
                );
            }
            songIDs.add(songID);
            RequireText(song.name, `${songLabel} name`);
            const path = OptionalText(song.path, `${songLabel} path`);
            const url = OptionalText(song.url, `${songLabel} url`);

            if (!path && !url)
            {
                throw new TypeError(
                    `${songLabel} must provide a path or url`,
                );
            }

            if (song.durationMs !== undefined
                && (!Number.isFinite(song.durationMs)
                    || song.durationMs <= 0))
            {
                throw new TypeError(
                    `${songLabel} durationMs must be a positive finite number`,
                );
            }
        }
    }

    return true;
}

/**
 * Returns a detached, deeply frozen jukebox catalog.
 *
 * Only JSON-compatible catalogs are accepted so the same object may be
 * supplied as imported JavaScript, downloaded JSON, or an API response.
 */
export function installMusicLibrary(value)
{
    validateMusicLibrary(value);

    let clone;

    try
    {
        clone = JSON.parse(JSON.stringify(value));
    }
    catch (error)
    {
        throw new TypeError(
            `Music library must be JSON-compatible: ${error.message}`,
        );
    }

    return DeepFreeze(clone);
}

function RequireRecord(value, label)
{
    if (!value || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError(`${label} must be an object`);
    }
    return value;
}

function RequireText(value, label)
{
    if (typeof value !== "string" || !value.trim())
    {
        throw new TypeError(`${label} must be a non-empty string`);
    }
    return value;
}

function OptionalText(value, label)
{
    if (value === undefined)
    {
        return "";
    }
    return RequireText(value, label);
}

function DeepFreeze(value)
{
    if (!value || typeof value !== "object" || Object.isFrozen(value))
    {
        return value;
    }

    for (const child of Object.values(value))
    {
        DeepFreeze(child);
    }
    return value;
}
