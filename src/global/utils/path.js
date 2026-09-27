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

/**
 * Carbon's `NormalizeResPath` (`blue/src/BlueFileUtil.cpp:25-117`), for the
 * callers that need its validity answer as well as its result: lowercase,
 * backslashes to slashes, repeated slashes dropped, `.` removed and `..`
 * resolved. A `dynamic:` path takes the same exemption as
 * {@link normalizeResourcePath}.
 *
 * Carbon returns false for a path that is not `res:/` or `dynamic:/`, or whose
 * `..` climbs above the root; this returns `null` in both cases, where Carbon
 * copies the input to its out-parameter. Lowercasing is `toLowerCase`, where
 * Carbon calls `std::tolower` per character; the two agree on ASCII, which is
 * all a res path holds.
 *
 * @param {string} path Res path.
 * @returns {string|null} The normalized path, or `null` when Carbon returns false.
 */
export function normalizeResPath(path)
{
    if (typeof path !== "string") return null;
    if (path.startsWith("dynamic:/") || path.startsWith("dynamic:\\")) return normalizeResourcePath(path);
    if (!path.startsWith("res:/") && !path.startsWith("res:\\")) return null;

    // Carbon keeps the result length before each component so `..` can
    // truncate back to it (cpp:85-93).
    let result = "res:/";
    const components = [];
    let start = 5;
    for (let index = 5; index <= path.length; index++)
    {
        const character = path[index];
        if (index !== path.length && character !== "/" && character !== "\\") continue;
        const component = path.slice(start, index);
        start = index + 1;
        if (component === "" || component === ".") continue;
        if (component === "..")
        {
            if (components.length === 0) return null;
            result = result.slice(0, components.pop());
            continue;
        }
        const previousLength = result.length;
        if (components.length !== 0) result += "/";
        result += component.toLowerCase();
        components.push(previousLength);
    }
    return result;
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
