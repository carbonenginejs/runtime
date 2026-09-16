/**
 * Normalizes slash direction and repeated separators without resolving dot
 * segments. URI-style scheme separators retain their authored slash count.
 */
export function normalizePath(value, options = {})
{
    let result = String(value ?? "").trim().replace(/\\/gu, "/");
    const scheme = /^([A-Za-z][A-Za-z0-9+.-]*:)(\/+)/u.exec(result);

    if (scheme)
    {
        const prefix = scheme[0];
        result = `${prefix}${result.slice(prefix.length).replace(/\/+/gu, "/")}`;
    }
    else
    {
        result = result.replace(/\/+/gu, "/");
    }

    return options.lowerCase ? result.toLowerCase() : result;
}

// "dynamic:/" and "dynamic:\\" are both nine characters.
const DYNAMIC_PREFIX_LENGTH = 9;

/**
 * Normalizes a case-insensitive URI-style resource path.
 *
 * Carbon's NormalizeResPath (`blue/src/BlueFileUtil.cpp:33-59`) exempts a
 * `dynamic:` path from all of it but the constructor name: only the characters
 * before the first separator after `dynamic:` are lowercased, and a backslash AT
 * that separator becomes a slash. Everything after keeps its authored case and
 * its slashes, which `dynamic:/gradient_1d/<base64>` depends on - base64 is
 * case-sensitive and its alphabet contains `/`, so lowercasing or collapsing
 * repeated slashes destroys the payload. A leading `dynamic:\\` stays a
 * backslash there, as Carbon leaves it.
 */
export function normalizeResourcePath(value)
{
    const path = String(value ?? "");
    if (path.startsWith("dynamic:/") || path.startsWith("dynamic:\\"))
    {
        let separator = -1;
        for (let index = DYNAMIC_PREFIX_LENGTH; index < path.length; index++)
        {
            const character = path[index];
            if (character === "/" || character === "\\")
            {
                separator = index;
                break;
            }
        }
        // No query at all: the whole path is the name.
        if (separator === -1) return path.toLowerCase();
        const tail = path.slice(separator);
        return path.slice(0, separator).toLowerCase()
            + (tail.startsWith("\\") ? `/${tail.slice(1)}` : tail);
    }
    return normalizePath(value, { lowerCase: true });
}

/** Returns the normalized extension of a URI-style resource path. */
export function getResourceExtension(value)
{
    const path = normalizeResourcePath(value);
    const queryIndex = path.search(/[?#]/u);
    const cleanPath = queryIndex === -1 ? path : path.slice(0, queryIndex);
    const slashIndex = cleanPath.lastIndexOf("/");
    const dotIndex = cleanPath.lastIndexOf(".");

    if (dotIndex === -1 || dotIndex < slashIndex)
    {
        return "";
    }

    return cleanPath.slice(dotIndex + 1);
}

/** Normalizes a resource extension without its optional leading dot. */
export function normalizeResourceExtension(value)
{
    return String(value ?? "")
        .trim()
        .replace(/^\./u, "")
        .toLowerCase();
}
