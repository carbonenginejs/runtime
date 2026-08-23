export const CARBON_DOCUMENT_SCHEMA = "carbon.document";
export const CARBON_DOCUMENT_VERSION = 1;

/** Represents one neutral Carbon document graph for hydration and dehydration. */
export class CjsCarbonDocument
{
    constructor(options = {})
    {
        const normalized = CjsCarbonDocument.normalize(options);

        this.schema = CARBON_DOCUMENT_SCHEMA;
        this.version = CARBON_DOCUMENT_VERSION;
        this.format = normalized.format;
        this.roots = normalized.roots;
        this.nodes = normalized.nodes;

        if (normalized.refs) this.refs = normalized.refs;
        if (normalized.metadata) this.metadata = normalized.metadata;
        if (normalized.reports) this.reports = normalized.reports;
    }

    static create(options = {})
    {
        return new CjsCarbonDocument(options);
    }

    static createNode(options = {})
    {
        return CjsCarbonDocument.normalizeNode(options);
    }

    static createRef(id)
    {
        return { $ref: CjsCarbonDocument.normalizeId(id) };
    }

    static isDocument(value)
    {
        return Boolean(value && typeof value === "object" && value.schema === CARBON_DOCUMENT_SCHEMA);
    }

    static isRef(value)
    {
        return Boolean(value && typeof value === "object" && Object.keys(value).length === 1 && Object.hasOwn(value, "$ref"));
    }

    static normalize(value)
    {
        if (!value || typeof value !== "object")
        {
            throw new TypeError("CarbonDocument must be an object");
        }

        if (value.schema != null && !CjsCarbonDocument.isDocument(value))
        {
            throw new TypeError(`Unsupported document schema: ${String(value.schema || "unknown")}`);
        }

        return CjsCarbonDocument.normalizeOptions(value);
    }

    static normalizeOptions(options = {})
    {
        const result = {
            schema: CARBON_DOCUMENT_SCHEMA,
            version: CARBON_DOCUMENT_VERSION,
            format: CjsCarbonDocument.normalizeFormat(options.format),
            roots: CjsCarbonDocument.normalizeRoots(options.roots),
            nodes: CjsCarbonDocument.normalizeNodes(options.nodes)
        };

        const refs = CjsCarbonDocument.normalizeRefs(options.refs);
        const metadata = CjsCarbonDocument.normalizeRecord(options.metadata);
        const reports = CjsCarbonDocument.normalizeReports(options.reports);

        if (!CjsCarbonDocument.isEmptyRecord(refs)) result.refs = refs;
        if (!CjsCarbonDocument.isEmptyRecord(metadata)) result.metadata = metadata;
        if (reports.length) result.reports = reports;

        return result;
    }

    static normalizeNodes(nodes = [])
    {
        return CjsCarbonDocument.normalizeList(nodes).map(CjsCarbonDocument.normalizeNode);
    }

    static normalizeRoots(roots = [])
    {
        return CjsCarbonDocument.normalizeList(roots).map((root, index) => CjsCarbonDocument.normalizeRoot(root, index));
    }

    static normalizeRefs(refs = {})
    {
        return CjsCarbonDocument.normalizeRecord(refs);
    }

    static normalizeMetadata(metadata = {})
    {
        return CjsCarbonDocument.normalizeRecord(metadata);
    }

    static normalizeReports(reports = [])
    {
        return CjsCarbonDocument.normalizeList(reports, report => ({ ...report }));
    }

    static normalizeId(id)
    {
        if (typeof id === "number" && Number.isInteger(id) && id > 0) return id;

        const number = Number(id);
        if (Number.isInteger(number) && number > 0) return number;

        throw new TypeError(`Invalid CarbonDocument id: ${String(id)}`);
    }

    static normalizeNode(node)
    {
        const id = CjsCarbonDocument.normalizeId(node.id);
        const kind = String(node.kind || node.type || "");

        if (!kind)
        {
            throw new TypeError(`CarbonDocument node ${id} is missing a kind`);
        }

        const result = {
            id,
            kind,
            fields: CjsCarbonDocument.normalizeRecord(node.fields)
        };

        const source = CjsCarbonDocument.normalizeRecord(node.source);
        const meta = CjsCarbonDocument.normalizeRecord(node.meta);
        const raw = CjsCarbonDocument.normalizeNullableRecord(node.raw);

        if (!CjsCarbonDocument.isEmptyRecord(source)) result.source = source;
        if (!CjsCarbonDocument.isEmptyRecord(meta)) result.meta = meta;
        if (raw && !CjsCarbonDocument.isEmptyRecord(raw)) result.raw = raw;

        return result;
    }

    static normalizeRoot(root, index)
    {
        if (CjsCarbonDocument.isRef(root))
        {
            return { name: index === 0 ? "default" : `root${index}`, ref: CjsCarbonDocument.createRef(root.$ref) };
        }

        const name = String(root?.name || (index === 0 ? "default" : `root${index}`));
        const ref = root?.ref || root?.value || root?.root;

        if (!CjsCarbonDocument.isRef(ref))
        {
            throw new TypeError(`CarbonDocument root ${name} is missing a ref`);
        }

        return { name, ref: CjsCarbonDocument.createRef(ref.$ref) };
    }

    static normalizeFormat(format)
    {
        if (typeof format === "string") return { id: format, version: 1 };
        return {
            id: String(format?.id || "unknown"),
            version: format?.version ?? 1
        };
    }

    static clonePlainRecord(value)
    {
        return CjsCarbonDocument.normalizeRecord(value);
    }

    static normalizeRecord(value, defaults = {})
    {
        if (!CjsCarbonDocument.isObject(value) || Array.isArray(value))
        {
            return { ...defaults };
        }

        return { ...value, ...defaults };
    }

    static normalizeNullableRecord(value)
    {
        return value == null ? null : CjsCarbonDocument.normalizeRecord(value);
    }

    static normalizeList(value, map = null)
    {
        const list = CjsCarbonDocument.isArray(value) ? value : [];
        return map ? list.map(map) : list.slice();
    }

    static isObject(value)
    {
        return value !== null && typeof value === "object";
    }

    static isArray(value)
    {
        return Array.isArray(value);
    }

    static isEmptyRecord(value)
    {
        return !CjsCarbonDocument.isObject(value) || Array.isArray(value) || Object.keys(value).length === 0;
    }
}
