import { CjsSchema, blue } from "#schema";
// Source: trinity/shadercompiler/CachingIncludeHandler.h
// Source: trinity/shadercompiler/CachingIncludeHandler.cpp

import { IncludedFile } from "./IncludedFile.js";

/**
 * Loads and caches `#include`d files: Carbon's `CachingIncludeHandler`.
 *
 * A relative include resolves against the directory of the file that
 * includes it, or against the root path for the entry file, as Carbon's does,
 * and `.` and `..` segments are folded, as `JoinPath`'s `PathCanonicalize`
 * does. An absolute path is used as written, as in Carbon.
 *
 * Adapted: Carbon's paths are Windows paths, and `PathIsRelative` treats only
 * a leading backslash or a drive letter as absolute (`/x` and `res:x` are
 * relative there). Paths here are URL-style, so a leading `/` or a scheme
 * such as `res:` makes a path absolute instead.
 *
 * Adapted: Carbon reads files from disk, synchronously, while parsing. Here
 * `read` supplies a file's text by full path (from a bundled library, a
 * prefetched map, or a resource manager's cache), so parsing stays
 * synchronous; gathering the files is the caller's job. A file's buffer is
 * `{ text }` with Carbon's leading newline, so a directive on its first line
 * is recognised.
 */
export class CachingIncludeHandler
{
    _read = null;

    /** Carbon's `m_fileFromPath`. @type {Map<string, IncludedFile>} */
    _fileFromPath = new Map();

    /** Carbon's `m_pathFromFile`: a file's buffer to its directory. @type {Map<object, string>} */
    _pathFromFile = new Map();

    _rootPath = "";

    /**
     * @param {(fullPath: string) => (string|null)} read Returns a file's text, or null when it does not exist.
     */
    constructor(read)
    {
        this._read = read;
    }

    /**
     * Carbon's `CachingIncludeHandler::Open`.
     *
     * `parentData` stands for Carbon's pointer to the including file's data:
     * the buffer and an offset into it. Carbon finds the parent's directory only
     * when the pointer is the start of a file it loaded; an include reached from
     * inside a macro points elsewhere and resolves against `""`.
     *
     * @param {string} fileName The path as written, without delimiters.
     * @param {{ buffer: object, offset: number }|null} [parentData=null] The including file's data.
     * @param {string|null} [rootPath=null] Directory for an include with no parent; the handler's root path otherwise.
     * @returns {IncludedFile|null} A copy of the file's entry, or null when not found.
     */
    Open(fileName, parentData = null, rootPath = null)
    {
        let fullPath;
        if (isRelative(fileName))
        {
            let parentPath;
            if (parentData === null)
            {
                parentPath = rootPath ?? this._rootPath;
            }
            else
            {
                const parent = parentData.offset === 1 ? this._pathFromFile.get(parentData.buffer) : undefined;
                parentPath = parent ?? "";
            }
            fullPath = joinPath(parentPath, fileName);
        }
        else
        {
            fullPath = fileName;
        }
        const cached = this._fileFromPath.get(fullPath);
        if (cached)
        {
            return cached.Copy();
        }
        const text = this._read(fullPath);
        if (text === null || text === undefined)
        {
            return null;
        }
        const info = new IncludedFile();
        info.fullPath = fullPath;
        info.data = { text: "\n" + text };
        info.size = text.length;
        this._fileFromPath.set(fullPath, info);
        this._pathFromFile.set(info.data, getDirPath(fullPath));
        return info.Copy();
    }

    /**
     * Carbon's `CachingIncludeHandler::AddPrefix`: puts text in front of an
     * already loaded file, keeping its directory.
     *
     * @param {string} fileName The file's path.
     * @param {string} prefix Text to put first.
     * @returns {IncludedFile|null} A copy of the file's entry, or null when it was not loaded.
     */
    AddPrefix(fileName, prefix)
    {
        const fullPath = isRelative(fileName) ? joinPath("", fileName) : fileName;
        const info = this._fileFromPath.get(fullPath);
        if (!info)
        {
            return null;
        }
        const data = { text: "\n" + prefix + info.data.text.slice(1) };
        info.size += prefix.length;
        this._pathFromFile.set(data, this._pathFromFile.get(info.data));
        this._pathFromFile.delete(info.data);
        info.data = data;
        return info.Copy();
    }

    /**
     * Carbon's `CachingIncludeHandler::SetRootPath`: the entry file's directory.
     *
     * @param {string} shaderPath The entry file's path.
     */
    SetRootPath(shaderPath)
    {
        this._rootPath = getDirPath(shaderPath);
    }

    /** Carbon's public nested `CachingIncludeHandler::IncludedFile`. */
    static IncludedFile = IncludedFile;
}

/**
 * Whether a path is relative: Carbon's `PathIsRelative`, for URL-style paths
 * (see the class comment).
 *
 * @param {string} path The path.
 * @returns {boolean} Whether it is relative.
 */
function isRelative(path)
{
    return !(path.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(path));
}

/**
 * Carbon's `GetDirPath`: everything up to and including the last separator.
 *
 * @param {string} path The path.
 * @returns {string} Its directory.
 */
function getDirPath(path)
{
    const normalised = path.replace(/\\/gu, "/");
    return normalised.slice(0, normalised.lastIndexOf("/") + 1);
}

/**
 * Carbon's `JoinPath`: `PathAppend`, then `PathCanonicalize`.
 *
 * @param {string} path1 Directory.
 * @param {string} path2 Relative path.
 * @returns {string} The joined path.
 */
function joinPath(path1, path2)
{
    if (path1 === "")
    {
        return canonicalize(path2);
    }
    return canonicalize(path1.replace(/\\/gu, "/").replace(/\/?$/u, "/") + path2);
}

/**
 * Folds `.` and `..` segments and normalises separators.
 *
 * @param {string} path The path.
 * @returns {string} The canonical path.
 */
function canonicalize(path)
{
    const scheme = /^[A-Za-z][A-Za-z0-9+.-]*:\/*/u.exec(path);
    const head = scheme ? scheme[0] : path.startsWith("/") ? "/" : "";
    const parts = [];
    for (const part of path.slice(head.length).replace(/\\/gu, "/").split("/"))
    {
        if (part === "" || part === ".")
        {
            continue;
        }
        if (part === "..")
        {
            parts.pop();
            continue;
        }
        parts.push(part);
    }
    return head + parts.join("/");
}

CjsSchema.blue.define(CachingIncludeHandler, {
    className: "CachingIncludeHandler",
    methods: {
        Open: [blue.method],
        AddPrefix: [blue.method],
        SetRootPath: [blue.method]
    }
});
