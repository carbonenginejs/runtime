// Source: resources/src/ResourceInfo/ResourceInfo.h
// Source: resources/src/ResourceInfo/ResourceInfo.cpp
//
// One resource in a group: its relative path, stored location, checksum and
// sizes, and the optional binary operation and prefix. Each field is a
// DocumentParameter, so what a document of a given version reads and writes
// comes from ParameterInfo's table.
//
// Adapted throughout: Carbon's output references (`std::string& out`) are
// caller-owned `{ value }` boxes, `uintmax_t` sizes are BigInt, and Carbon's
// operators are the methods `Equals` and `LessThan`. The YAML methods take and
// fill a plain object whose keys are the wire tags, in place of a yaml-cpp
// node and emitter. Every scalar in it is the source text, as `as<std::string>()`
// reads it; see ResourceGroupImpl.ImportFromYamlString.
import { CjsSchema, carbon, impl } from "#schema";
import { DocumentParameter } from "./DocumentParameter.js";
import { Location } from "./Location.js";
import { Parameter } from "./ParameterInfo.js";
import { ResourceInfoParams } from "./ResourceInfoParams.js";
import { Result } from "./Result.js";
import { ResultType } from "./enums.js";

const UINT32_MAX = 4294967295n;
const UINTMAX_MAX = 18446744073709551615n;

/**
 * yaml-cpp's `as<unsigned>` over a scalar's text: decimal digits, an optional
 * `+`, within the type's range. Anything else throws, as yaml-cpp's
 * `TypedBadConversion` does. Carbon does not catch that exception in
 * `ImportFromYaml`, so neither does this port.
 *
 * Adapted: yaml-cpp also accepts hexadecimal and octal prefixes, which this
 * does not; resource documents write decimal.
 */
function asUnsigned(text, max, tag)
{
    if (typeof text !== "string" || !/^\+?\d+$/u.test(text)) throw new TypeError(`bad conversion: ${tag}`);
    const value = BigInt(text);
    if (value > max) throw new TypeError(`bad conversion: ${tag}`);
    return value;
}

/**
 * `std::filesystem::path` comparison: element by element, with `/` and `\`
 * both separators, as on Windows, repeated separators counted once, and each
 * element compared by code unit. So `a/b` sorts before `a-b` and `a.b`,
 * because it compares `a` with `a-b` first, where plain string order would put
 * it last.
 */
function comparePaths(left, right)
{
    const a = String(left).split(/[\\/]+/u);
    const b = String(right).split(/[\\/]+/u);
    for (let index = 0; index < a.length && index < b.length; index++)
    {
        if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
    }
    return a.length - b.length;
}

/** `CarbonResources::ResourceInfo` - one resource record in a group. */
export class ResourceInfo
{
    m_relativePath = new DocumentParameter(Parameter.RELATIVE_PATH, ResourceInfo.typeId());

    m_location = new DocumentParameter(Parameter.LOCATION, ResourceInfo.typeId());

    m_type = new DocumentParameter(Parameter.TYPE, ResourceInfo.typeId());

    m_checksum = new DocumentParameter(Parameter.CHECKSUM, ResourceInfo.typeId());

    m_compressedSize = new DocumentParameter(Parameter.COMPRESSED_SIZE, ResourceInfo.typeId());

    m_uncompressedSize = new DocumentParameter(Parameter.UNCOMPRESSED_SIZE, ResourceInfo.typeId());

    m_binaryOperation = new DocumentParameter(Parameter.BINARY_OPERATION, ResourceInfo.typeId());

    m_prefix = new DocumentParameter(Parameter.PREFIX, ResourceInfo.typeId());

    /**
     * Carbon's constructor (ResourceInfo.cpp:62-92). A compressed size of 0 and
     * a binary operation of 0 are left unset, and an empty prefix is reset.
     *
     * Quirk, reproduced: a zero compressed size cannot be told apart from none,
     * so a resource read with `CompressedSize` 0 then fails ExportToCsv with
     * REQUIRED_RESOURCE_PARAMETER_NOT_SET.
     *
     * @param {ResourceInfoParams} [params] Initial values.
     */
    constructor(params = new ResourceInfoParams())
    {
        this.m_relativePath.m_value = params.relativePath;
        this.m_location.m_value = new Location(params.location);
        this.m_type.m_value = ResourceInfo.typeId();
        this.m_checksum.m_value = params.checksum;
        if (BigInt(params.compressedSize) > 0n) this.m_compressedSize.m_value = BigInt(params.compressedSize);
        this.m_uncompressedSize.m_value = BigInt(params.uncompressedSize);
        if (params.binaryOperation) this.m_binaryOperation.m_value = params.binaryOperation;
        if (params.prefix !== "") this.m_prefix.m_value = params.prefix;
        else this.m_prefix.Reset();
    }

    /** `TypeId` - the type name this class reads and writes. */
    static typeId()
    {
        return "Resource";
    }

    /** `GetRelativePath` - the relative path into `out.value`; RESOURCE_VALUE_NOT_SET when unset. */
    GetRelativePath(out)
    {
        return this._Read(this.m_relativePath, out);
    }

    /** `GetType` - the type name into `out.value`. */
    GetType(out)
    {
        return this._Read(this.m_type, out);
    }

    /** `GetChecksum` - the checksum into `out.value`. */
    GetChecksum(out)
    {
        return this._Read(this.m_checksum, out);
    }

    /** `GetPrefix` - the prefix into `out.value`. */
    GetPrefix(out)
    {
        return this._Read(this.m_prefix, out);
    }

    /** `GetBinaryOperation` - the binary operation into `out.value`. */
    GetBinaryOperation(out)
    {
        return this._Read(this.m_binaryOperation, out);
    }

    /** `GetCompressedSize` - the compressed size (BigInt) into `out.value`. */
    GetCompressedSize(out)
    {
        return this._Read(this.m_compressedSize, out);
    }

    /** `GetUncompressedSize` - the uncompressed size (BigInt) into `out.value`. */
    GetUncompressedSize(out)
    {
        return this._Read(this.m_uncompressedSize, out);
    }

    /** `GetLocation` - the stored location's text into `out.value`. */
    GetLocation(out)
    {
        if (!this.m_location.HasValue()) return new Result(ResultType.RESOURCE_VALUE_NOT_SET);
        out.value = this.m_location.GetValue().ToString();
        return new Result();
    }

    /** `SetRelativePath` - sets the path; the location is not recomputed, as in Carbon. */
    SetRelativePath(value)
    {
        this.m_relativePath.m_value = value;
    }

    /** `SetCompressedSize`. */
    SetCompressedSize(value)
    {
        this.m_compressedSize.m_value = BigInt(value);
    }

    /** `SetUncompressedSize`. */
    SetUncompressedSize(value)
    {
        this.m_uncompressedSize.m_value = BigInt(value);
    }

    /**
     * `SetDataChecksum` - sets the checksum and recomputes the location
     * (ResourceInfo.cpp:1272-1277). Carbon ignores UpdateLocation's result.
     */
    SetDataChecksum(value)
    {
        this.m_checksum.m_value = value;
        this.UpdateLocation();
    }

    /**
     * `UpdateLocation` - the location recomputed from the relative path and
     * checksum (ResourceInfo.cpp:1065-1087).
     *
     * Quirk, reproduced: the prefix is not part of the path it hashes, so a
     * prefixed resource gets a different location from the one a build writes.
     */
    UpdateLocation()
    {
        const out = {};
        const result = this.GetRelativePath(out);
        if (result.type !== ResultType.SUCCESS) return result;
        const location = new Location();
        const located = location.SetFromRelativePathAndDataChecksum(out.value, this.m_checksum.GetValue());
        if (located.type !== ResultType.SUCCESS) return located;
        this.m_location.m_value = location;
        return new Result();
    }

    /**
     * `operator==` - the same relative path; data is not compared
     * (ResourceInfo.cpp:1037-1049). Paths compare as `std::filesystem::path`.
     */
    Equals(other)
    {
        if (!this.m_relativePath.HasValue()) return false;
        if (!other.m_relativePath.HasValue()) return false;
        return comparePaths(this.m_relativePath.GetValue(), other.m_relativePath.GetValue()) === 0;
    }

    /**
     * `operator<` - ordered by relative path as `std::filesystem::path`
     * (ResourceInfo.cpp:1051-1063).
     *
     * Quirk, reproduced: with neither path set, the answer is false; with only
     * this one unset it is true; with only the other unset it is also true.
     */
    LessThan(other)
    {
        if (!this.m_relativePath.HasValue()) return other.m_relativePath.HasValue();
        if (!other.m_relativePath.HasValue()) return true;
        return comparePaths(this.m_relativePath.GetValue(), other.m_relativePath.GetValue()) < 0;
    }

    /**
     * `SetParametersFromResource` - copies another resource's fields that a
     * document of this version carries (ResourceInfo.cpp:906-1035). The type is
     * not copied: it stays this class's own.
     *
     * Quirk, reproduced: an unset binary operation returns SUCCESS
     * immediately, so nothing after it would run. It is the last field, so
     * nothing is skipped today.
     */
    SetParametersFromResource(other, documentVersion)
    {
        if (!other) return new Result(ResultType.FAIL);

        for (const [ parameter, getter ] of [
            [ this.m_relativePath, "GetRelativePath" ],
            [ this.m_location, "GetLocation" ],
            [ this.m_checksum, "GetChecksum" ],
            [ this.m_uncompressedSize, "GetUncompressedSize" ]
        ])
        {
            if (!parameter.IsParameterExpectedInDocumentVersion(documentVersion)) continue;
            const out = {};
            const result = other[getter](out);
            if (result.type !== ResultType.SUCCESS) return result;
            parameter.m_value = parameter === this.m_location ? new Location(out.value) : out.value;
        }

        if (this.m_compressedSize.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            const out = {};
            if (other.GetCompressedSize(out).type === ResultType.SUCCESS) this.m_compressedSize.m_value = out.value;
            else this.m_compressedSize.Reset();
        }

        if (this.m_prefix.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            const out = {};
            const result = other.GetPrefix(out);
            if (result.type === ResultType.SUCCESS) this.m_prefix.m_value = out.value;
            else if (result.type !== ResultType.RESOURCE_VALUE_NOT_SET) return result;
            else this.m_prefix.Reset();
        }

        if (this.m_binaryOperation.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            const out = {};
            const result = other.GetBinaryOperation(out);
            if (result.type !== ResultType.SUCCESS)
            {
                if (result.type === ResultType.RESOURCE_VALUE_NOT_SET)
                {
                    this.m_binaryOperation.Reset();
                    return new Result();
                }
                return result;
            }
            if (out.value !== 0) this.m_binaryOperation.m_value = out.value;
            else this.m_binaryOperation.Reset();
        }

        return new Result();
    }

    /**
     * `ExportToCsv` - `prefix:/path,location,checksum,uncompressed,compressed`
     * and `,operation` when set (ResourceInfo.cpp:1290-1360). Backslashes in the
     * path become slashes. The document version is not consulted, as in Carbon.
     */
    ExportToCsv(out, _documentVersion)
    {
        let result = this.m_prefix.HasValue() ? this.m_prefix.GetValue() + ":/" : "";
        if (!this.m_relativePath.HasValue()) return new Result(ResultType.REQUIRED_RESOURCE_PARAMETER_NOT_SET);
        const relativePath = {};
        const got = this.GetRelativePath(relativePath);
        if (got.type !== ResultType.SUCCESS) return got;
        result += String(relativePath.value).replaceAll("\\", "/") + ",";
        if (!this.m_location.HasValue()) return new Result(ResultType.REQUIRED_RESOURCE_PARAMETER_NOT_SET);
        result += this.m_location.GetValue().ToString() + ",";
        if (!this.m_checksum.HasValue()) return new Result(ResultType.REQUIRED_RESOURCE_PARAMETER_NOT_SET);
        result += this.m_checksum.GetValue() + ",";
        if (!this.m_uncompressedSize.HasValue()) return new Result(ResultType.REQUIRED_RESOURCE_PARAMETER_NOT_SET);
        result += this.m_uncompressedSize.GetValue() + ",";
        if (!this.m_compressedSize.HasValue()) return new Result(ResultType.REQUIRED_RESOURCE_PARAMETER_NOT_SET);
        result += this.m_compressedSize.GetValue();
        if (this.m_binaryOperation.HasValue()) result += "," + this.m_binaryOperation.GetValue();
        out.value = result;
        return new Result();
    }

    /**
     * `ImportFromYaml` - reads the fields a document of this version carries
     * (ResourceInfo.cpp:802-899). A missing required field is
     * MALFORMED_RESOURCE_INPUT; a missing binary operation or compressed size
     * is unset; a missing prefix leaves the prefix as it was.
     *
     * @param {Object<string, string>} resource Wire tag to scalar source text.
     * @param {import('./VersionInternal.js').VersionInternal} documentVersion The group's document version, unclamped, as Carbon passes it.
     * @returns {Result} The result.
     * @throws {TypeError} Where yaml-cpp's conversion throws; Carbon does not catch it either.
     */
    ImportFromYaml(resource, documentVersion)
    {
        const has = tag => Object.hasOwn(resource, tag);

        if (this.m_binaryOperation.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            const tag = this.m_binaryOperation.GetTag();
            if (has(tag)) this.m_binaryOperation.m_value = Number(asUnsigned(resource[tag], UINT32_MAX, tag));
            else this.m_binaryOperation.Reset();
        }

        for (const parameter of [ this.m_relativePath, this.m_location, this.m_type, this.m_checksum ])
        {
            if (!parameter.IsParameterExpectedInDocumentVersion(documentVersion)) continue;
            const tag = parameter.GetTag();
            if (!has(tag)) return new Result(ResultType.MALFORMED_RESOURCE_INPUT);
            const text = String(resource[tag]);
            parameter.m_value = parameter === this.m_location ? new Location(text) : text;
        }

        if (this.m_uncompressedSize.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            const tag = this.m_uncompressedSize.GetTag();
            if (!has(tag)) return new Result(ResultType.MALFORMED_RESOURCE_INPUT);
            this.m_uncompressedSize.m_value = asUnsigned(resource[tag], UINTMAX_MAX, tag);
        }

        if (this.m_compressedSize.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            const tag = this.m_compressedSize.GetTag();
            if (has(tag)) this.m_compressedSize.m_value = asUnsigned(resource[tag], UINTMAX_MAX, tag);
            else this.m_compressedSize.Reset();
        }

        if (this.m_prefix.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            const tag = this.m_prefix.GetTag();
            if (has(tag)) this.m_prefix.m_value = String(resource[tag]);
        }

        return new Result();
    }

    /**
     * `ExportToYaml` - writes the fields a document of this version carries,
     * in Carbon's order: RelativePath, Type, Location, Checksum,
     * UncompressedSize, then CompressedSize, BinaryOperation and Prefix when
     * set (ResourceInfo.cpp:1164-1266).
     *
     * @param {Object<string, unknown>} out Wire tag to value, filled in emit order.
     * @param {import('./VersionInternal.js').VersionInternal} documentVersion Output document version.
     * @returns {Result} The result.
     */
    ExportToYaml(out, documentVersion)
    {
        if (this.m_relativePath.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            if (!this.m_relativePath.HasValue()) return new Result(ResultType.REQUIRED_RESOURCE_PARAMETER_NOT_SET);
            const relativePath = {};
            const got = this.GetRelativePath(relativePath);
            if (got.type !== ResultType.SUCCESS) return got;
            out[this.m_relativePath.GetTag()] = String(relativePath.value).replaceAll("\\", "/");
        }
        if (this.m_type.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            if (!this.m_type.HasValue()) return new Result(ResultType.REQUIRED_RESOURCE_PARAMETER_NOT_SET);
            out[this.m_type.GetTag()] = this.m_type.GetValue();
        }
        if (this.m_location.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            if (!this.m_location.HasValue()) return new Result(ResultType.REQUIRED_RESOURCE_PARAMETER_NOT_SET);
            out[this.m_location.GetTag()] = this.m_location.GetValue().ToString();
        }
        if (this.m_checksum.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            if (!this.m_checksum.HasValue()) return new Result(ResultType.REQUIRED_RESOURCE_PARAMETER_NOT_SET);
            out[this.m_checksum.GetTag()] = this.m_checksum.GetValue();
        }
        if (this.m_uncompressedSize.IsParameterExpectedInDocumentVersion(documentVersion))
        {
            if (!this.m_uncompressedSize.HasValue()) return new Result(ResultType.REQUIRED_RESOURCE_PARAMETER_NOT_SET);
            out[this.m_uncompressedSize.GetTag()] = this.m_uncompressedSize.GetValue();
        }
        for (const parameter of [ this.m_compressedSize, this.m_binaryOperation, this.m_prefix ])
        {
            if (parameter.IsParameterExpectedInDocumentVersion(documentVersion) && parameter.HasValue())
            {
                out[parameter.GetTag()] = parameter.GetValue();
            }
        }
        return new Result();
    }

    /** A field's value into `out.value`, or RESOURCE_VALUE_NOT_SET; Carbon's getters each do this inline. */
    _Read(parameter, out)
    {
        if (!parameter.HasValue()) return new Result(ResultType.RESOURCE_VALUE_NOT_SET);
        out.value = parameter.GetValue();
        return new Result();
    }

    /** `GetDataStream` - not ported: needs Carbon's streams and CDN access. */
    GetDataStream()
    {
        throw new Error("ResourceInfo.GetDataStream is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `GetData` - not ported: needs Carbon's streams and CDN access. */
    GetData()
    {
        throw new Error("ResourceInfo.GetData is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `PutDataStream` - not ported: needs Carbon's streams and CDN access. */
    PutDataStream()
    {
        throw new Error("ResourceInfo.PutDataStream is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `PutData` - not ported: needs Carbon's streams and CDN access. */
    PutData()
    {
        throw new Error("ResourceInfo.PutData is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `SetParametersFromData` - not ported: needs hashing and compression of file contents. */
    SetParametersFromData()
    {
        throw new Error("ResourceInfo.SetParametersFromData is not implemented: it needs hashing and compression of file contents.");
    }

    /** `SetParametersFromSourceStream` - not ported: needs hashing and compression of file contents. */
    SetParametersFromSourceStream()
    {
        throw new Error("ResourceInfo.SetParametersFromSourceStream is not implemented: it needs hashing and compression of file contents.");
    }

    /** `GetDataLocalRelative` - not ported: it needs Carbon's streams and CDN access. */
    GetDataLocalRelative()
    {
        throw new Error("ResourceInfo.GetDataLocalRelative is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `GetDataLocalCdn` - not ported: it needs Carbon's streams and CDN access. */
    GetDataLocalCdn()
    {
        throw new Error("ResourceInfo.GetDataLocalCdn is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `GetDataRemoteCdn` - not ported: it needs Carbon's streams and CDN access. */
    GetDataRemoteCdn()
    {
        throw new Error("ResourceInfo.GetDataRemoteCdn is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `GetDataStreamLocalRelative` - not ported: it needs Carbon's streams and CDN access. */
    GetDataStreamLocalRelative()
    {
        throw new Error("ResourceInfo.GetDataStreamLocalRelative is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `GetDataStreamLocalCdn` - not ported: it needs Carbon's streams and CDN access. */
    GetDataStreamLocalCdn()
    {
        throw new Error("ResourceInfo.GetDataStreamLocalCdn is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `GetDataStreamRemoteCdn` - not ported: it needs Carbon's streams and CDN access. */
    GetDataStreamRemoteCdn()
    {
        throw new Error("ResourceInfo.GetDataStreamRemoteCdn is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `PutDataLocalRelative` - not ported: it needs Carbon's streams and CDN access. */
    PutDataLocalRelative()
    {
        throw new Error("ResourceInfo.PutDataLocalRelative is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `PutDataLocalCdn` - not ported: it needs Carbon's streams and CDN access. */
    PutDataLocalCdn()
    {
        throw new Error("ResourceInfo.PutDataLocalCdn is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `PutDataStreamLocalRelative` - not ported: it needs Carbon's streams and CDN access. */
    PutDataStreamLocalRelative()
    {
        throw new Error("ResourceInfo.PutDataStreamLocalRelative is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `PutDataStreamLocalCdn` - not ported: it needs Carbon's streams and CDN access. */
    PutDataStreamLocalCdn()
    {
        throw new Error("ResourceInfo.PutDataStreamLocalCdn is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `PutDataStreamRemoteCdn` - not ported: it needs Carbon's streams and CDN access. */
    PutDataStreamRemoteCdn()
    {
        throw new Error("ResourceInfo.PutDataStreamRemoteCdn is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `PutDataRemoteCdn` - not ported: it needs Carbon's streams and CDN access. */
    PutDataRemoteCdn()
    {
        throw new Error("ResourceInfo.PutDataRemoteCdn is not implemented: it needs Carbon's streams and CDN access.");
    }

    /** `GetDestinationPath` - not ported: needs Carbon's destination settings. */
    GetDestinationPath()
    {
        throw new Error("ResourceInfo.GetDestinationPath is not implemented: it needs Carbon's destination settings.");
    }
}

CjsSchema.define(ResourceInfo, {
    className: "ResourceInfo",
    carbon: "ResourceInfo",
    family: "tools",
    fields: {},
    methods: {
        typeId: [ carbon.method, impl.implemented ],
        GetRelativePath: [ carbon.method, impl.adapted ],
        GetType: [ carbon.method, impl.adapted ],
        GetChecksum: [ carbon.method, impl.adapted ],
        GetPrefix: [ carbon.method, impl.adapted ],
        GetBinaryOperation: [ carbon.method, impl.adapted ],
        GetCompressedSize: [ carbon.method, impl.adapted ],
        GetUncompressedSize: [ carbon.method, impl.adapted ],
        GetLocation: [ carbon.method, impl.adapted ],
        SetRelativePath: [ carbon.method, impl.implemented ],
        SetCompressedSize: [ carbon.method, impl.implemented ],
        SetUncompressedSize: [ carbon.method, impl.implemented ],
        SetDataChecksum: [ carbon.method, impl.implemented ],
        UpdateLocation: [ carbon.method, impl.implemented ],
        Equals: [ impl.adapted ],
        LessThan: [ impl.adapted ],
        SetParametersFromResource: [ carbon.method, impl.implemented ],
        ExportToCsv: [ carbon.method, impl.adapted ],
        ImportFromYaml: [ carbon.method, impl.adapted ],
        ExportToYaml: [ carbon.method, impl.adapted ],
        _Read: [ impl.custom ],
        GetDataStream: [ carbon.method, impl.notImplemented ],
        GetData: [ carbon.method, impl.notImplemented ],
        PutDataStream: [ carbon.method, impl.notImplemented ],
        PutData: [ carbon.method, impl.notImplemented ],
        SetParametersFromData: [ carbon.method, impl.notImplemented ],
        SetParametersFromSourceStream: [ carbon.method, impl.notImplemented ],
        GetDataLocalRelative: [ carbon.method, impl.notImplemented ],
        GetDataLocalCdn: [ carbon.method, impl.notImplemented ],
        GetDataRemoteCdn: [ carbon.method, impl.notImplemented ],
        GetDataStreamLocalRelative: [ carbon.method, impl.notImplemented ],
        GetDataStreamLocalCdn: [ carbon.method, impl.notImplemented ],
        GetDataStreamRemoteCdn: [ carbon.method, impl.notImplemented ],
        PutDataLocalRelative: [ carbon.method, impl.notImplemented ],
        PutDataLocalCdn: [ carbon.method, impl.notImplemented ],
        PutDataStreamLocalRelative: [ carbon.method, impl.notImplemented ],
        PutDataStreamLocalCdn: [ carbon.method, impl.notImplemented ],
        PutDataStreamRemoteCdn: [ carbon.method, impl.notImplemented ],
        PutDataRemoteCdn: [ carbon.method, impl.notImplemented ],
        GetDestinationPath: [ carbon.method, impl.notImplemented ]
    }
});
