import { CjsSchema, meta } from "#schema";
// Source: trinity/shadercompiler/InlineString.h

/**
 * A character range inside a source buffer: Carbon's `InlineString`.
 *
 * Carbon points two `const char*` at characters of the buffer it scans. The
 * port keeps the buffer and two offsets into it, because the scanner, the
 * macro expander, `#include` resolution and string-literal concatenation all
 * work on ranges of one buffer, and some of them span characters between
 * tokens.
 *
 * A buffer is a plain `{ text }` object. Its identity stands for a C buffer's
 * address: the include handler finds a file's directory by the buffer the
 * parent file lives in. Reading past `text.length` yields NUL, as reading the
 * terminating zero of a C string does.
 *
 * Carbon's empty string is `{ nullptr, nullptr }`; here that is a null
 * `buffer`. Carbon's `operator bool` is {@link InlineString#IsSet}.
 */
export class InlineString
{
    buffer = null;

    start = null;

    end = null;

    /**
     * @param {{ text: string } | null} [buffer=null] The buffer the range points into, or null for Carbon's null string.
     * @param {number} [start=0] Offset of the first character.
     * @param {number} [end=0] Offset one past the last character.
     */
    constructor(buffer = null, start = 0, end = 0)
    {
        this.buffer = buffer;

        this.start = start;

        this.end = end;
    }

    /**
     * Carbon's `operator bool`: whether the range points anywhere.
     *
     * @returns {boolean} False for the null string.
     */
    IsSet()
    {
        return this.buffer !== null;
    }

    /**
     * Returns a copy. Carbon copies `InlineString` by value; the copy shares
     * the buffer, exactly as two pointers into one buffer do.
     *
     * @returns {InlineString} An independent range over the same buffer.
     */
    Copy()
    {
        return new InlineString(this.buffer, this.start, this.end);
    }

    /**
     * The character code at an offset of the buffer, NUL past its end.
     *
     * @param {number} offset Absolute offset into the buffer.
     * @returns {number} The UTF-16 code unit, or 0.
     */
    CharAt(offset)
    {
        const text = this.buffer.text;
        return offset < text.length && offset >= 0 ? text.charCodeAt(offset) : 0;
    }

    /**
     * Carbon's free `ToString( const InlineString& )`, as a method on the range.
     *
     * @returns {string} The characters of the range.
     */
    ToString()
    {
        if (this.buffer === null)
        {
            return "";
        }
        return this.buffer.text.slice(this.start, this.end);
    }

    /**
     * Carbon's `operator==( const InlineString&, const InlineString& )`:
     * equal lengths, then `strncmp`, which stops at a NUL both share.
     *
     * @param {InlineString} other The range to compare with.
     * @returns {boolean} Whether the characters are equal.
     */
    Equals(other)
    {
        return strncmpEqual(this.ToString(), other.ToString(), false);
    }

    /**
     * Carbon's `operator==( const InlineString&, const char* )`: the C string
     * ends at its first NUL (`strlen`).
     *
     * @param {string} other The C string.
     * @returns {boolean} Whether the characters are equal.
     */
    Equals__Chars(other)
    {
        return strncmpEqual(this.ToString(), cString(other), false);
    }

    /**
     * Carbon's `operator<`: `strncmp` over the shorter length, then the shorter
     * string first. For the ASCII text a shader is written in, that is
     * JavaScript's code-unit string order.
     *
     * @param {InlineString} other The range to compare with.
     * @returns {boolean} Whether this range sorts first.
     */
    Less(other)
    {
        return this.ToString() < other.ToString();
    }

    /**
     * Carbon's `MakeInlineString( const char* string )`: the range over a C
     * string, which ends at its first NUL (`strlen`). The string gets a new
     * buffer, as a C string is its own storage.
     *
     * @param {string} string The C string.
     * @returns {InlineString} The range.
     */
    static makeInlineString(string)
    {
        const text = cString(string);
        return new InlineString({ text }, 0, text.length);
    }

    /**
     * Carbon's `MakeInlineString( const char* start, const char* end )`.
     *
     * @param {{ text: string }} buffer The buffer the range points into.
     * @param {number} start Offset of the first character.
     * @param {number} end Offset one past the last character.
     * @returns {InlineString} The range.
     */
    static makeInlineString__StartEnd(buffer, start, end)
    {
        return new InlineString(buffer, start, end);
    }

    /**
     * Carbon's `IEquals( const InlineString&, const InlineString& )`:
     * `std::equal` with `tolower`, over every character.
     *
     * @param {InlineString} a First range.
     * @param {InlineString} b Second range.
     * @returns {boolean} Whether they match ignoring ASCII case.
     */
    static iEquals(a, b)
    {
        const left = a.ToString();
        const right = b.ToString();
        return left.length === right.length && asciiLower(left) === asciiLower(right);
    }

    /**
     * Carbon's `IEquals( const InlineString&, const char* )`.
     *
     * @param {InlineString} a The range.
     * @param {string} b The C string, ending at its first NUL.
     * @returns {boolean} Whether they match ignoring ASCII case.
     */
    static iEquals__Chars(a, b)
    {
        const left = a.ToString();
        const right = cString(b);
        return left.length === right.length && asciiLower(left) === asciiLower(right);
    }

    /**
     * Carbon's `ILess`: case-insensitive lexicographic order using `tolower`.
     *
     * @param {InlineString} a First range.
     * @param {InlineString} b Second range.
     * @returns {boolean} Whether `a` sorts before `b` ignoring ASCII case.
     */
    static iLess(a, b)
    {
        return asciiLower(a.ToString()) < asciiLower(b.ToString());
    }

    /**
     * Carbon's `EqualsCaseInsensitive( const InlineString&, const InlineString& )`:
     * equal lengths, then `_strnicmp`, which stops at a NUL both share.
     *
     * @param {InlineString} str0 First range.
     * @param {InlineString} str1 Second range.
     * @returns {boolean} Whether they match ignoring ASCII case.
     */
    static equalsCaseInsensitive(str0, str1)
    {
        return strncmpEqual(str0.ToString(), str1.ToString(), true);
    }

    /**
     * Carbon's `EqualsCaseInsensitive( const InlineString&, const char* )`.
     *
     * @param {InlineString} str0 The range.
     * @param {string} str1 The C string, ending at its first NUL.
     * @returns {boolean} Whether they match ignoring ASCII case.
     */
    static equalsCaseInsensitive__Chars(str0, str1)
    {
        return strncmpEqual(str0.ToString(), cString(str1), true);
    }

    /**
     * Carbon's `ContainsSubstring`.
     *
     * @param {InlineString} name The range to search.
     * @param {string} substr The text to find.
     * @returns {boolean} Whether `substr` occurs in `name`.
     */
    static containsSubstring(name, substr)
    {
        return name.ToString().includes(cString(substr));
    }
}

/**
 * A JavaScript string read as a C string: up to its first NUL, as `strlen`
 * measures it.
 *
 * @param {string} text The text.
 * @returns {string} The text before the first NUL.
 */
function cString(text)
{
    const nul = text.indexOf("\u0000");
    return nul < 0 ? text : text.slice(0, nul);
}

/**
 * The equality tests built on `strncmp` and `_strnicmp`: equal lengths, then
 * equal characters up to the first NUL both strings share there.
 *
 * @param {string} a First string.
 * @param {string} b Second string.
 * @param {boolean} ignoreCase Whether to fold ASCII case, as `_strnicmp` does.
 * @returns {boolean} Whether they compare equal.
 */
function strncmpEqual(a, b, ignoreCase)
{
    if (a.length !== b.length)
    {
        return false;
    }
    const left = ignoreCase ? asciiLower(a) : a;
    const right = ignoreCase ? asciiLower(b) : b;
    for (let i = 0; i < left.length; ++i)
    {
        if (left.charCodeAt(i) !== right.charCodeAt(i))
        {
            return false;
        }
        if (left.charCodeAt(i) === 0)
        {
            return true;
        }
    }
    return true;
}

/**
 * Lower-cases ASCII letters only, as C `tolower` does in the "C" locale.
 *
 * @param {string} text The text to fold.
 * @returns {string} The folded text.
 */
function asciiLower(text)
{
    return text.replace(/[A-Z]/gu, c => String.fromCharCode(c.charCodeAt(0) + 32));
}

CjsSchema.blue.define(InlineString, {
    className: "InlineString",
    methods: {
        IsSet: [meta.renamed("operator bool")]
    }
});
