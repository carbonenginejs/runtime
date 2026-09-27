// Source: resources/src/ResourceGroupImpl.h
// Source: resources/src/ResourceGroupImpl.cpp
// Source: resources/src/ResourceGroupFactory.h
//
// The work behind ResourceGroup: CSV and YAML import and export, the
// resource list and its running totals, merge, diff and removal.
//
// Adapted throughout: Carbon's output references are caller-owned
// `{ value }` boxes, `uintmax_t` values are BigInt (wrapping modulo 2^64 as
// Carbon's do), and the resource collection is a plain array. CSV rows are
// split by CjsResFileIndexFormat.readRow, the one spelling of Carbon's column
// rules, and this class applies the model rules on top. YAML is parsed with
// every scalar kept as its source text, as yaml-cpp's `as<std::string>()` reads
// it, and written through the `yaml` package, so the formatting is not
// byte-identical to yaml-cpp.
import { CjsSchema, carbon, impl } from "#schema";
import { parse, stringify } from "yaml";
import { CjsResFileIndexFormat } from "../../../resource/formats/resfileindex/CjsResFileIndexFormat.js";
import { DocumentParameter } from "./DocumentParameter.js";
import { Parameter } from "./ParameterInfo.js";
import { ResourceInfo } from "./ResourceInfo.js";
import { ResourceInfoParams } from "./ResourceInfoParams.js";
import { Result } from "./Result.js";
import { ResultType, StatusProgressType, S_DOCUMENT_VERSION } from "./enums.js";
import { StatusSettings } from "./StatusSettings.js";
import { VersionInternal } from "./VersionInternal.js";

/** `uintmax_t` arithmetic: Carbon's totals wrap modulo 2^64. */
const uintmax = value => BigInt.asUintN(64, value);

/** Type names of the resource classes Carbon's factory knows and this port does not (ResourceGroupFactory.cpp:109-138). */
const UNPORTED_RESOURCE_TYPES = new Set([ "BundleResourceGroup", "BinaryChunk", "PatchResourceGroup", "BinaryPatch", "ResourceGroup" ]);

/** `CarbonResources::ResourceGroup::ResourceGroupImpl` - a resource group's data and operations. */
export class ResourceGroupImpl
{
    /** `DocumentType` (ResourceGroupImpl.h:41-45); a namespace-scope enum in Carbon, held on the class here. */
    static DocumentType = Object.freeze({ CSV: 0, YAML: 1 });

    m_versionParameter = new DocumentParameter(Parameter.VERSION, ResourceGroupImpl.typeId());

    m_type = new DocumentParameter(Parameter.TYPE, ResourceGroupImpl.typeId());

    m_numberOfResources = new DocumentParameter(Parameter.NUMBER_OF_RESOURCES, ResourceGroupImpl.typeId());

    m_totalResourcesSizeCompressed = new DocumentParameter(Parameter.TOTAL_RESOURCE_SIZE_COMPRESSED, ResourceGroupImpl.typeId());

    m_totalResourcesSizeUncompressed = new DocumentParameter(Parameter.TOTAL_RESOURCE_SIZE_UNCOMPRESSED, ResourceGroupImpl.typeId());

    /** @type {ResourceInfo[]} */
    m_resourcesParameter = [];

    /** Carbon's constructor: the current document version, this type, and zeroed totals. */
    constructor()
    {
        this.m_versionParameter.m_value = new VersionInternal(S_DOCUMENT_VERSION);
        this.m_type.m_value = ResourceGroupImpl.typeId();
        this.m_numberOfResources.m_value = 0n;
        this.m_totalResourcesSizeCompressed.m_value = 0n;
        this.m_totalResourcesSizeUncompressed.m_value = 0n;
    }

    /** `TypeId`. */
    static typeId()
    {
        return "ResourceGroup";
    }

    /** `GetType`. */
    GetType()
    {
        return ResourceGroupImpl.typeId();
    }

    /** `GetSize` - the number of resources held, duplicates included. */
    GetSize()
    {
        return this.m_resourcesParameter.length;
    }

    /** Iterates the resources in their current order; Carbon's `begin`/`end`. */
    [Symbol.iterator]()
    {
        return this.m_resourcesParameter[Symbol.iterator]();
    }

    /**
     * `AddResource` (ResourceGroupImpl.cpp:2919-2946): appends and counts the
     * resource before checking it, then adds its sizes to the totals.
     *
     * Bug, reproduced: after a YAML import without TotalResourcesSizeCompressed
     * the compressed total is unset, and adding a resource that has a
     * compressed size reads it anyway, which throws `bad_optional_access`
     * (CE-40).
     */
    AddResource(resource)
    {
        this.m_resourcesParameter.push(resource);
        this.m_numberOfResources.m_value = uintmax(this.m_numberOfResources.GetValue() + 1n);
        const size = {};
        const result = resource.GetUncompressedSize(size);
        if (result.type !== ResultType.SUCCESS) return result;
        this.m_totalResourcesSizeUncompressed.m_value = uintmax(this.m_totalResourcesSizeUncompressed.GetValue() + size.value);
        if (resource.GetCompressedSize(size).type === ResultType.SUCCESS)
        {
            this.m_totalResourcesSizeCompressed.m_value = uintmax(this.m_totalResourcesSizeCompressed.GetValue() + size.value);
        }
        return new Result();
    }

    /** `ImportFromData` - CSV or YAML text, by document type (ResourceGroupImpl.cpp:1178-1203). */
    ImportFromData(data, status = new StatusSettings(), documentType = ResourceGroupImpl.DocumentType.YAML)
    {
        if (documentType === ResourceGroupImpl.DocumentType.CSV) return this.ImportFromCSV(data, status);
        if (documentType === ResourceGroupImpl.DocumentType.YAML) return this.ImportFromYamlString(data, status);
        return new Result(ResultType.UNSUPPORTED_FILE_FORMAT);
    }

    /**
     * `ImportFromCSV` (ResourceGroupImpl.cpp:1322-1463): each non-empty line
     * becomes a resource, and the group becomes document version 0.1.0.
     *
     * Adapted: the columns are split by CjsResFileIndexFormat.readRow, whose
     * JSDoc lists Carbon's column rules; where it throws, Carbon returns
     * MALFORMED_RESOURCE_INPUT. The ResourceInfo constructor then leaves a zero
     * compressed size and a zero operation unset, as in Carbon.
     */
    ImportFromCSV(data, status = new StatusSettings())
    {
        status.Update(StatusProgressType.PERCENTAGE, 0, 10, "Importing Resource Group from CSV file.");
        const nested = new StatusSettings();
        status.Update(StatusProgressType.PERCENTAGE, 10, 90, "Importing Resource Group from CSV file.", nested);
        try
        {
            for (const line of String(data).split("\n"))
            {
                if (line === "") continue;
                let row;
                try
                {
                    row = CjsResFileIndexFormat.readRow(line);
                }
                catch
                {
                    return new Result(ResultType.MALFORMED_RESOURCE_INPUT);
                }
                const params = new ResourceInfoParams();
                params.relativePath = row.relativePath;
                params.prefix = row.prefix;
                params.location = row.location;
                params.checksum = row.checksum;
                params.uncompressedSize = row.uncompressedSize;
                params.compressedSize = row.compressedSize;
                params.binaryOperation = row.binaryOperation ?? 0;

                this.m_versionParameter.m_value = new VersionInternal(0, 1, 0);
                const result = this.AddResource(new ResourceInfo(params));
                if (result.type !== ResultType.SUCCESS) return result;
                nested.Update(StatusProgressType.UNBOUNDED, 0, 0, "Imported resource: " + params.relativePath);
            }
            return new Result();
        }
        finally
        {
            nested.Dispose();
        }
    }

    /**
     * `ImportFromYamlString` (ResourceGroupImpl.cpp:1551-1563). A parse error is
     * FAILED_TO_PARSE_YAML.
     *
     * Adapted: parsed with YAML's failsafe schema, so every scalar stays its
     * source text, as yaml-cpp nodes do until `as<T>()` converts them. A
     * checksum of `0123` stays `0123`.
     */
    ImportFromYamlString(data, status = new StatusSettings())
    {
        let document;
        try
        {
            document = parse(String(data), { schema: "failsafe" });
        }
        catch
        {
            return new Result(ResultType.FAILED_TO_PARSE_YAML);
        }
        return this.ImportFromYaml(document ?? {}, status);
    }

    /**
     * `ImportFromYaml` (ResourceGroupImpl.cpp:1565-1683): the header, then each
     * resource.
     *
     * Checked in Carbon's order: Type (MALFORMED_RESOURCE_GROUP when absent,
     * FILE_TYPE_MISMATCH when wrong), Version (absent is malformed; a major
     * version above Carbon's is DOCUMENT_VERSION_UNSUPPORTED; a newer minor
     * version warns), NumberOfResources, TotalResourcesSizeCompressed (absent
     * unsets the total), TotalResourcesSizeUnCompressed, the group's own
     * fields, and Resources. The header totals are only checked for presence:
     * the totals are rebuilt by AddResource.
     *
     * Quirk, reproduced: the clamped version the warning computes is never
     * used. Resources are read against the document's own version.
     */
    ImportFromYaml(document, status = new StatusSettings())
    {
        status.Update(StatusProgressType.PERCENTAGE, 0, 30, "Importing from Yaml file.");
        const has = tag => document !== null && typeof document === "object" && Object.hasOwn(document, tag);

        if (!has(this.m_type.GetTag())) return new Result(ResultType.MALFORMED_RESOURCE_GROUP);
        this.m_type.m_value = String(document[this.m_type.GetTag()]);
        if (this.m_type.GetValue() !== this.GetType()) return new Result(ResultType.FILE_TYPE_MISMATCH);

        if (!has(this.m_versionParameter.GetTag())) return new Result(ResultType.MALFORMED_RESOURCE_GROUP);
        const version = new VersionInternal();
        version.FromString(String(document[this.m_versionParameter.GetTag()]));
        this.m_versionParameter.m_value = version;
        if (this.m_versionParameter.GetValue().getMajor() > S_DOCUMENT_VERSION.major)
        {
            return new Result(ResultType.DOCUMENT_VERSION_UNSUPPORTED);
        }
        if (version.GreaterThan(new VersionInternal(S_DOCUMENT_VERSION)))
        {
            status.Update(StatusProgressType.WARNING, 0, 0, "Supplied resource group version greater than resources build max version. Some data may be lost during import.");
        }

        if (!has(this.m_numberOfResources.GetTag())) return new Result(ResultType.MALFORMED_RESOURCE_GROUP);
        if (!has(this.m_totalResourcesSizeCompressed.GetTag())) this.m_totalResourcesSizeCompressed.Reset();
        if (!has(this.m_totalResourcesSizeUncompressed.GetTag())) return new Result(ResultType.MALFORMED_RESOURCE_GROUP);

        const special = this.ImportGroupSpecialisedYaml(document);
        if (special.type !== ResultType.SUCCESS) return special;

        if (!has("Resources")) return new Result(ResultType.MALFORMED_RESOURCE_GROUP);
        const resources = Array.isArray(document.Resources) ? document.Resources : [];

        const nested = new StatusSettings();
        status.Update(StatusProgressType.PERCENTAGE, 30, 70, "Processing Resources.", nested);
        try
        {
            for (const node of resources)
            {
                const out = {};
                const created = this.CreateResourceFromYaml(node, out);
                if (created.type !== ResultType.SUCCESS) return created;
                const added = this.AddResource(out.value);
                if (added.type !== ResultType.SUCCESS) return added;
            }
        }
        finally
        {
            nested.Dispose();
        }
        return new Result();
    }

    /**
     * `CreateResourceFromYaml` (ResourceGroupImpl.cpp:1534-1549), through
     * Carbon's factory `CreateResourceInfoFromYamlNode` and
     * `CreateResourceInfoFromString` (ResourceGroupFactory.cpp:86-138).
     *
     * A resource without a Type, or with a type Carbon does not know, is
     * MALFORMED_RESOURCE with Carbon's message. It is read against the group's
     * unclamped document version, as Carbon passes it.
     *
     * @throws {Error} For a type Carbon knows and this port does not: the bundle and patch resource classes.
     */
    CreateResourceFromYaml(node, out)
    {
        if (node === null || typeof node !== "object" || !Object.hasOwn(node, "Type"))
        {
            return new Result(ResultType.MALFORMED_RESOURCE, "Tried to load a resource info without a 'Type' attribute.");
        }
        const type = String(node.Type);
        if (UNPORTED_RESOURCE_TYPES.has(type)) throw new Error(`ResourceGroupImpl: resource type ${type} is not ported.`);
        if (type !== ResourceInfo.typeId()) return new Result(ResultType.MALFORMED_RESOURCE, `Unexpected Resource Info Type: '${type}'.`);

        const resource = new ResourceInfo();
        const imported = resource.ImportFromYaml(node, this.m_versionParameter.GetValue());
        if (imported.type !== ResultType.SUCCESS) return imported;
        out.value = resource;
        return new Result();
    }

    /** `ImportGroupSpecialisedYaml` - a plain group reads no fields of its own. */
    ImportGroupSpecialisedYaml(_document)
    {
        return new Result();
    }

    /** `ExportGroupSpecialisedYaml` - a plain group writes no fields of its own. */
    ExportGroupSpecialisedYaml(_out, _version)
    {
        return new Result();
    }

    /** `GetGroupSpecificResourcesToBundle` - a plain group adds none. */
    GetGroupSpecificResourcesToBundle(_out)
    {
        return new Result();
    }

    /** `ExportToData` - the group as YAML text (ResourceGroupImpl.cpp:1310-1320). */
    ExportToData(out, status = new StatusSettings(), version = new VersionInternal(S_DOCUMENT_VERSION))
    {
        return this.ExportYaml(version, out, status);
    }

    /**
     * `ExportYaml` (ResourceGroupImpl.cpp:1705-1819): the header, then each
     * resource at the output version, which is clamped to the group's own
     * version and to Carbon's current one. TotalResourcesSizeCompressed is
     * written only when set.
     *
     * Adapted: the header and resources are built as an object in Carbon's
     * emit order and serialized by the `yaml` package.
     */
    ExportYaml(version, out, status = new StatusSettings())
    {
        status.Update(StatusProgressType.PERCENTAGE, 0, 20, "Exporting Yaml");
        if (!version.isVersionValid()) return new Result(ResultType.DOCUMENT_VERSION_UNSUPPORTED);
        let selected = version;
        if (selected.GreaterThan(this.m_versionParameter.GetValue())) selected = this.m_versionParameter.GetValue();
        if (selected.GreaterThan(new VersionInternal(S_DOCUMENT_VERSION))) selected = new VersionInternal(S_DOCUMENT_VERSION);

        const document = {};
        document[this.m_versionParameter.GetTag()] = selected.ToString();
        document[this.m_type.GetTag()] = this.m_type.GetValue();
        document[this.m_numberOfResources.GetTag()] = this.m_numberOfResources.GetValue();
        if (this.m_totalResourcesSizeCompressed.HasValue())
        {
            document[this.m_totalResourcesSizeCompressed.GetTag()] = this.m_totalResourcesSizeCompressed.GetValue();
        }
        document[this.m_totalResourcesSizeUncompressed.GetTag()] = this.m_totalResourcesSizeUncompressed.GetValue();
        const special = this.ExportGroupSpecialisedYaml(document, selected);
        if (special.type !== ResultType.SUCCESS) return special;

        document.Resources = [];
        for (const resource of this.m_resourcesParameter)
        {
            const row = {};
            const result = resource.ExportToYaml(row, selected);
            if (result.type !== ResultType.SUCCESS) return result;
            document.Resources.push(row);
        }
        out.value = stringify(document);
        return new Result();
    }

    /**
     * `ExportCsv` (ResourceGroupImpl.cpp:1821-1872): only version 0.0.0, one
     * line per resource, appended to `out.value`.
     *
     * Quirk, reproduced: Carbon sorts the group's own list by relative path
     * inside this const method, so exporting reorders the group.
     */
    ExportCsv(version, out, status = new StatusSettings())
    {
        status.Update(StatusProgressType.PERCENTAGE, 0, 10, "Exporting  to CSV");
        if (version.getMajor() > 0 || version.getMinor() > 0 || version.getPatch() > 0) return new Result(ResultType.UNSUPPORTED_FILE_FORMAT);
        this.m_resourcesParameter.sort(ResourceGroupImpl._Compare);
        for (const resource of this.m_resourcesParameter)
        {
            const row = {};
            const result = resource.ExportToCsv(row, this.m_versionParameter.GetValue());
            if (result.type !== ResultType.SUCCESS) return result;
            out.value += row.value + "\n";
        }
        return new Result();
    }

    /**
     * `Merge` (ResourceGroupImpl.cpp:3071-3136): `std::set_union` of the two
     * sorted lists, taking the incoming group's resource where both have the
     * path, each copied into the merged group.
     */
    Merge(params, status = new StatusSettings())
    {
        status.Update(StatusProgressType.PERCENTAGE, 0, 20, "Merging resource groups.");
        if (!params.mergedResourceGroup) return new Result(ResultType.RESOURCE_GROUP_NOT_SET);
        if (!params.resourceGroupToMerge) return new Result(ResultType.RESOURCE_GROUP_NOT_SET);
        const incoming = [ ...params.resourceGroupToMerge.m_impl.m_resourcesParameter ].sort(ResourceGroupImpl._Compare);
        const current = [ ...this.m_resourcesParameter ].sort(ResourceGroupImpl._Compare);

        const union = [];
        let a = 0;
        let b = 0;
        while (a < incoming.length || b < current.length)
        {
            if (b === current.length) union.push(incoming[a++]);
            else if (a === incoming.length) union.push(current[b++]);
            else if (incoming[a].LessThan(current[b])) union.push(incoming[a++]);
            else if (current[b].LessThan(incoming[a])) union.push(current[b++]);
            else
            {
                union.push(incoming[a++]);
                b++;
            }
        }

        for (const resource of union)
        {
            const out = {};
            const copied = this.CreateResourceFromResource(resource, out);
            if (copied.type !== ResultType.SUCCESS) return copied;
            const added = params.mergedResourceGroup.m_impl.AddResource(out.value);
            if (added.type !== ResultType.SUCCESS) return added;
        }
        return new Result();
    }

    /**
     * `CreateResourceFromResource` (ResourceGroupImpl.cpp:1465-1532): a copy
     * through SetParametersFromResource at the group's version.
     *
     * @throws {Error} For the patch and bundle resource types, which are not ported.
     */
    CreateResourceFromResource(resource, out)
    {
        const type = {};
        const result = resource.GetType(type);
        if (result.type !== ResultType.SUCCESS) return result;
        if (type.value !== ResourceInfo.typeId()) throw new Error(`ResourceGroupImpl: resource type ${type.value} is not ported.`);
        out.value = new ResourceInfo();
        return out.value.SetParametersFromResource(resource, this.m_versionParameter.GetValue());
    }

    /**
     * `DiffChangesAsLists` (ResourceGroupImpl.cpp:3138-3225): paths added or
     * changed since the other group go to `additions`, and paths it has that
     * this does not go to `subtractions`.
     *
     * Adapted: one walk over the two sorted lists, where Carbon runs `Diff`
     * (set_difference, set_intersection and lower_bound over whole resources,
     * cpp:3227-3425) and then collates. The lists agree while each path is
     * unique. They differ when a group holds a path twice, where Carbon's
     * lower_bound always pairs with the first copy. They also differ on a
     * checksum error, where this has already filled `subtractions`.
     */
    DiffChangesAsLists(params, status = new StatusSettings())
    {
        status.Update(StatusProgressType.PERCENTAGE, 0, 20, "Diffing changes as lists.");
        if (!params.resourceGroupToDiffAgainst) return new Result(ResultType.RESOURCE_GROUP_NOT_SET);
        if (!params.additions || !params.subtractions) return new Result(ResultType.REQUIRED_INPUT_PARAMETER_NOT_SET);
        const left = [ ...this.m_resourcesParameter ].sort(ResourceGroupImpl._Compare);
        const right = [ ...params.resourceGroupToDiffAgainst.m_impl.m_resourcesParameter ].sort(ResourceGroupImpl._Compare);
        let a = 0;
        let b = 0;
        const changes = [];
        const added = [];
        while (a < left.length || b < right.length)
        {
            if (b === right.length || (a < left.length && left[a].LessThan(right[b]))) added.push(left[a++].m_relativePath.GetValue());
            else if (a === left.length || right[b].LessThan(left[a])) params.subtractions.push(right[b++].m_relativePath.GetValue());
            else
            {
                const x = {};
                const y = {};
                const first = left[a].GetChecksum(x);
                const second = right[b].GetChecksum(y);
                if (first.type !== ResultType.SUCCESS) return first;
                if (second.type !== ResultType.SUCCESS) return second;
                if (x.value !== y.value) changes.push(left[a].m_relativePath.GetValue());
                a++;
                b++;
            }
        }
        for (const name of changes) params.additions.push(name);
        for (const name of added) params.additions.push(name);
        return new Result();
    }

    /**
     * `RemoveResource` (ResourceGroupImpl.cpp:3027-3069): removes the first
     * resource with the same relative path.
     *
     * Quirk, reproduced: the count is decremented before the sizes are read,
     * so a resource without a compressed size leaves the count one lower and
     * the resource still in the group.
     */
    RemoveResource(resource)
    {
        const index = this.m_resourcesParameter.findIndex(item => item.Equals(resource));
        if (index < 0) return new Result(ResultType.RESOURCE_NOT_FOUND);
        const found = this.m_resourcesParameter[index];
        this.m_numberOfResources.m_value = uintmax(this.m_numberOfResources.GetValue() - 1n);
        const uncompressed = {};
        const first = found.GetUncompressedSize(uncompressed);
        if (first.type !== ResultType.SUCCESS) return first;
        const compressed = {};
        const second = found.GetCompressedSize(compressed);
        if (second.type !== ResultType.SUCCESS) return second;
        this.m_totalResourcesSizeUncompressed.m_value = uintmax(this.m_totalResourcesSizeUncompressed.GetValue() - uncompressed.value);
        this.m_totalResourcesSizeCompressed.m_value = uintmax(this.m_totalResourcesSizeCompressed.GetValue() - compressed.value);
        this.m_resourcesParameter.splice(index, 1);
        return new Result();
    }

    /**
     * `RemoveResources` (ResourceGroupImpl.cpp:2948-3000): removes each listed
     * path; a missing one is an error only when `errorIfResourceNotFound`.
     */
    RemoveResources(params, status = new StatusSettings())
    {
        if (!params.resourcesToRemove) return new Result(ResultType.RESOURCE_LIST_NOT_SET);
        for (const relativePath of params.resourcesToRemove)
        {
            const value = new ResourceInfoParams();
            value.relativePath = relativePath;
            const result = this.RemoveResource(new ResourceInfo(value));
            if (result.type !== ResultType.SUCCESS && (result.type !== ResultType.RESOURCE_NOT_FOUND || params.errorIfResourceNotFound)) return result;
        }
        return new Result();
    }

    /** `GetLargestResourceSize` (ResourceGroupImpl.cpp:3002-3025): the largest uncompressed size into `out.value`. */
    GetLargestResourceSize(out)
    {
        out.value = 0n;
        for (const resource of this.m_resourcesParameter)
        {
            const size = {};
            const result = resource.GetUncompressedSize(size);
            if (result.type !== ResultType.SUCCESS) return result;
            if (size.value > out.value) out.value = size.value;
        }
        return new Result();
    }

    /**
     * `ImportFromFile` (ResourceGroupImpl.cpp:1205-1264): `.txt` is CSV;
     * `.yml`, `.yaml` and no extension are YAML.
     *
     * Adapted: asynchronous, reading through the host's injected
     * `params.read(filename)`, which returns text or UTF-8 bytes. Bytes are
     * decoded strictly: invalid UTF-8 is FAILED_TO_OPEN_FILE, not replacement
     * characters.
     *
     * @throws {TypeError} When no reader was injected.
     */
    async ImportFromFile(params, status = new StatusSettings())
    {
        status.Update(StatusProgressType.PERCENTAGE, 0, 20, "Importing Resource Group from file.");
        if (!params.filename) return new Result(ResultType.FILE_NOT_FOUND);
        if (typeof params.read !== "function") throw new TypeError("ImportFromFile requires an injected read(filename) function");
        let data;
        try
        {
            data = await params.read(params.filename);
            if (data instanceof Uint8Array) data = new TextDecoder("utf-8", { fatal: true }).decode(data);
            if (typeof data !== "string") throw new TypeError("Reader must return text or Uint8Array");
        }
        catch
        {
            return new Result(ResultType.FAILED_TO_OPEN_FILE);
        }
        const name = String(params.filename).replaceAll("\\", "/").split("/").pop();
        const dot = name.lastIndexOf(".");
        const extension = dot <= 0 ? "" : name.slice(dot);
        const nested = new StatusSettings();
        status.Update(StatusProgressType.PERCENTAGE, 20, 80, "Importing Resource Group from file.", nested);
        try
        {
            if (extension === ".txt") return this.ImportFromCSV(data, nested);
            if (extension === ".yml" || extension === ".yaml" || extension === "") return this.ImportFromYamlString(data, nested);
            return new Result(ResultType.UNSUPPORTED_FILE_FORMAT);
        }
        finally
        {
            nested.Dispose();
        }
    }

    /**
     * `ExportToFile` (ResourceGroupImpl.cpp:1266-1308): CSV for version 0.0.x,
     * YAML otherwise.
     *
     * Adapted: asynchronous, writing through the host's injected
     * `params.write(filename, text)`; a throw or `false` is FAILED_TO_SAVE_FILE.
     *
     * @throws {TypeError} When no writer was injected.
     */
    async ExportToFile(params, status = new StatusSettings())
    {
        if (typeof params.write !== "function") throw new TypeError("ExportToFile requires an injected write(filename, text) function");
        status.Update(StatusProgressType.PERCENTAGE, 0, 10, "Exporting Resource Group to file: " + params.filename);
        const version = params.outputDocumentVersion;
        const data = { value: "" };
        const nested = new StatusSettings();
        status.Update(StatusProgressType.PERCENTAGE, 10, 90, "Exporting Resource Group to file: " + params.filename, nested);
        let result;
        try
        {
            result = version.getMajor() === 0 && version.getMinor() === 0
                ? this.ExportCsv(version, data, nested)
                : this.ExportYaml(version, data, nested);
        }
        finally
        {
            nested.Dispose();
        }
        if (result.type !== ResultType.SUCCESS) return result;
        try
        {
            if (await params.write(params.filename, data.value) === false) return new Result(ResultType.FAILED_TO_SAVE_FILE);
        }
        catch
        {
            return new Result(ResultType.FAILED_TO_SAVE_FILE);
        }
        return new Result();
    }

    /** `std::sort` comparator over `ResourceInfo::operator<`. */
    static _Compare(a, b)
    {
        return a.LessThan(b) ? -1 : b.LessThan(a) ? 1 : 0;
    }

    /** `CreateFromDirectory` - not ported: needs a file system to walk and file hashing. */
    CreateFromDirectory()
    {
        throw new Error("ResourceGroupImpl.CreateFromDirectory is not implemented: it needs a file system to walk and file hashing.");
    }

    /** `CreateBundle` - not ported: needs chunking and compression. */
    CreateBundle()
    {
        throw new Error("ResourceGroupImpl.CreateBundle is not implemented: it needs chunking and compression.");
    }

    /** `ConstructPatchResourceInfo` - not ported: the patch resource classes are not ported. */
    ConstructPatchResourceInfo()
    {
        throw new Error("ResourceGroupImpl.ConstructPatchResourceInfo is not implemented: the patch resource classes are not ported.");
    }

    /** `CreatePatch` - not ported: needs binary diffing. */
    CreatePatch()
    {
        throw new Error("ResourceGroupImpl.CreatePatch is not implemented: it needs binary diffing.");
    }

    /** `Diff` - not ported; DiffChangesAsLists walks the lists itself. */
    Diff()
    {
        throw new Error("ResourceGroupImpl.Diff is not implemented; DiffChangesAsLists walks the lists itself.");
    }

    /** `CreateFromFilter` - not ported: ResourceFilter is not ported. */
    static createFromFilter()
    {
        throw new Error("ResourceGroupImpl.createFromFilter is not implemented: ResourceFilter is not ported.");
    }
}

CjsSchema.define(ResourceGroupImpl, {
    className: "ResourceGroupImpl",
    carbon: "ResourceGroupImpl",
    family: "tools",
    fields: {},
    methods: {
        typeId: [ carbon.method, impl.implemented ],
        GetType: [ carbon.method, impl.implemented ],
        GetSize: [ carbon.method, impl.implemented ],
        AddResource: [ carbon.method, impl.implemented ],
        ImportFromData: [ carbon.method, impl.implemented ],
        ImportFromCSV: [ carbon.method, impl.adapted ],
        ImportFromYamlString: [ carbon.method, impl.adapted ],
        ImportFromYaml: [ carbon.method, impl.adapted ],
        CreateResourceFromYaml: [ carbon.method, impl.adapted ],
        ImportGroupSpecialisedYaml: [ carbon.method, impl.implemented ],
        ExportGroupSpecialisedYaml: [ carbon.method, impl.implemented ],
        GetGroupSpecificResourcesToBundle: [ carbon.method, impl.implemented ],
        ExportToData: [ carbon.method, impl.implemented ],
        ExportYaml: [ carbon.method, impl.adapted ],
        ExportCsv: [ carbon.method, impl.adapted ],
        Merge: [ carbon.method, impl.implemented ],
        CreateResourceFromResource: [ carbon.method, impl.adapted ],
        DiffChangesAsLists: [ carbon.method, impl.adapted ],
        RemoveResource: [ carbon.method, impl.implemented ],
        RemoveResources: [ carbon.method, impl.implemented ],
        GetLargestResourceSize: [ carbon.method, impl.adapted ],
        ImportFromFile: [ carbon.method, impl.adapted ],
        ExportToFile: [ carbon.method, impl.adapted ],
        _Compare: [ impl.custom ],
        CreateFromDirectory: [ carbon.method, impl.notImplemented ],
        CreateBundle: [ carbon.method, impl.notImplemented ],
        ConstructPatchResourceInfo: [ carbon.method, impl.notImplemented ],
        CreatePatch: [ carbon.method, impl.notImplemented ],
        Diff: [ carbon.method, impl.notImplemented ],
        createFromFilter: [ carbon.method, impl.notImplemented ]
    }
});
