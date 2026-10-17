import { CjsSchema, blue } from "#schema";
// Source: trinity/shadercompiler/OutputHLSL.h

/**
 * The text sink the code writer prints into: Carbon's `CodeStream`, a
 * `std::stringstream` with layout hooks.
 *
 * Carbon writes with `operator<<`, which picks a behaviour by argument type:
 * text and numbers append, a `FileLocation` calls `ChangeLocation`, and the
 * `Indent`, `Unindent` and `Endl` tags call the hooks of the same names. The
 * port calls those methods directly; `Write` is the text-and-number case.
 *
 * Abstract: `Endl`, `ChangeLocation`, `Indent` and `Unindent` are Carbon's
 * pure virtuals (OutputHLSL.h:23-26); `blue.abstract` installs their throwing
 * bodies.
 */
export class CodeStream
{
    shadingLanguage = null;

    _text = "";

    /**
     * @param {number} lang A `ShadingLanguage` value.
     */
    constructor(lang)
    {
        this.shadingLanguage = lang;
    }

    /**
     * `operator<<` for text, characters, integers and `InlineString`s.
     *
     * @param {string|number|import("../InlineString.js").InlineString} value The value; numbers print as C++ integers do.
     * @returns {CodeStream} This stream.
     */
    Write(value)
    {
        this._text += typeof value === "object" && value !== null ? value.ToString() : String(value);
        return this;
    }

    /**
     * `operator<<` for a `float`: `std::ostream`'s default format, `%g` with
     * six significant digits.
     *
     * @param {number} value The value.
     * @returns {CodeStream} This stream.
     */
    WriteFloat(value)
    {
        this._text += CodeStream.formatFloat(value);
        return this;
    }

    /**
     * `std::stringstream::str()`.
     *
     * @returns {string} Everything written.
     */
    GetString()
    {
        return this._text;
    }

    /** Carbon's pure virtual `Endl` (OutputHLSL.h:23). */
    Endl() {}

    /**
     * Carbon's pure virtual `ChangeLocation` (OutputHLSL.h:24).
     *
     * @param {import("../ParserState/FileLocation.js").FileLocation} _location The location of the node about to print.
     */
    ChangeLocation(_location) {}

    /** Carbon's pure virtual `Indent` (OutputHLSL.h:25). */
    Indent() {}

    /** Carbon's pure virtual `Unindent` (OutputHLSL.h:26). */
    Unindent() {}

    /**
     * C++ `std::ostream << float` with default flags: `%g`, precision 6, an
     * exponent of at least two digits, no trailing zeros.
     *
     * @param {number} value The value.
     * @returns {string} The text.
     */
    static formatFloat(value)
    {
        if (Number.isNaN(value))
        {
            return "nan";
        }
        if (!Number.isFinite(value))
        {
            return value < 0 ? "-inf" : "inf";
        }
        if (value === 0)
        {
            return Object.is(value, -0) ? "-0" : "0";
        }
        const exponent = Math.floor(Math.log10(Math.abs(Number(value.toPrecision(6)))));
        if (exponent < -4 || exponent >= 6)
        {
            const [mantissa, power] = value.toExponential(5).split("e");
            const trimmed = mantissa.includes(".") ? mantissa.replace(/\.?0+$/u, "") : mantissa;
            const sign = power[0] === "-" ? "-" : "+";
            const digits = power.replace(/^[+-]/u, "").padStart(2, "0");
            return `${trimmed}e${sign}${digits}`;
        }
        const fixed = value.toFixed(Math.max(0, 5 - exponent));
        return fixed.includes(".") ? fixed.replace(/\.?0+$/u, "") : fixed;
    }

    // Source: trinity/shadercompiler/OutputHLSL.h

    /**
     * Carbon's `enum class ShadingLanguage`: which language the code writer
     * produces.
     */
    static ShadingLanguage = Object.freeze({
        HLSL: 0,
        MSL: 1
    });
}

CjsSchema.blue.define(CodeStream, {
    className: "CodeStream",
    methods: {
        Endl: blue.abstract,
        ChangeLocation: blue.abstract,
        Indent: blue.abstract,
        Unindent: blue.abstract
    }
});
