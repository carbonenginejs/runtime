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

/** Normalizes a case-insensitive URI-style resource path. */
export function normalizeResourcePath(value)
{
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
