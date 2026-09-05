// DEPRECATED carbon.document boundary. The collapse into plain CjsModel
// values is decided and partially executed - the envelope was
// over-engineered, and a _type-tagged values graph carries everything it
// did. Kept only until the interchange retirement completes its inventory
// (docs/contracts/model-values-interchange.md owns the rule: no document
// producer or consumer retires without inventory and replacement proof;
// docs/research/schema-hydration-consolidation-plan-2026-09-05.md holds
// the enumerated remaining surfaces). Do not add new consumers.
export const CARBON_DOCUMENT_SCHEMA = "carbon.document";
export const CARBON_DOCUMENT_VERSION = 1;

/** Represents one neutral Carbon document graph for hydration and dehydration. */
export class CjsCarbonDocument
{
    /** Creates a normalized Carbon document container from the supplied sections. */
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

    /** Builds a normalized Carbon document from a plain options record. */
    static create(options = {})
    {
        return new CjsCarbonDocument(options);
    }

    /** Creates one normalized document node with stable identity and fields. */
    static createNode(options = {})
    {
        return CjsCarbonDocument.normalizeNode(options);
    }

    /** Creates a document reference record for a normalized node identifier. */
    static createRef(id)
    {
        return { $ref: CjsCarbonDocument.normalizeId(id) };
    }

    /** Reports whether a value declares the Carbon document schema identity. */
    static isDocument(value)
    {
        return Boolean(value && typeof value === "object" && value.schema === CARBON_DOCUMENT_SCHEMA);
    }

    /** Reports whether a value has the one-key document-reference shape. */
    static isRef(value)
    {
        return Boolean(value && typeof value === "object" && Object.keys(value).length === 1 && Object.hasOwn(value, "$ref"));
    }

    /** Normalizes a document instance or plain document-shaped value. */
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

    /**
     * Normalizes every optional document section into its canonical
     * representation.
     */
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

    /**
     * Normalizes the document node collection while preserving its declared
     * order.
     */
    static normalizeNodes(nodes = [])
    {
        return CjsCarbonDocument.normalizeList(nodes).map(CjsCarbonDocument.normalizeNode);
    }

    /** Normalizes the named document root collection. */
    static normalizeRoots(roots = [])
    {
        return CjsCarbonDocument.normalizeList(roots).map((root, index) => CjsCarbonDocument.normalizeRoot(root, index));
    }

    /** Normalizes the document reference collection. */
    static normalizeRefs(refs = {})
    {
        return CjsCarbonDocument.normalizeRecord(refs);
    }

    /** Normalizes optional document metadata into a detached plain record. */
    static normalizeMetadata(metadata = {})
    {
        return CjsCarbonDocument.normalizeRecord(metadata);
    }

    /** Normalizes diagnostic report entries into detached plain records. */
    static normalizeReports(reports = [])
    {
        return CjsCarbonDocument.normalizeList(reports, report => ({ ...report }));
    }

    /** Validates and normalizes a document node identifier. */
    static normalizeId(id)
    {
        if (typeof id === "number" && Number.isInteger(id) && id > 0) return id;

        const number = Number(id);
        if (Number.isInteger(number) && number > 0) return number;

        throw new TypeError(`Invalid CarbonDocument id: ${String(id)}`);
    }

    /**
     * Normalizes one node's identity, type, fields, and optional source
     * metadata.
     */
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

    /** Normalizes one named root and its node reference. */
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

    /** Coerces a document format identifier into its normalized record form. */
    static normalizeFormat(format)
    {
        if (typeof format === "string") return { id: format, version: 1 };
        return {
            id: String(format?.id || "unknown"),
            version: format?.version ?? 1
        };
    }

    /**
     * Copies an optional plain record without retaining caller-owned object
     * identity.
     */
    static clonePlainRecord(value)
    {
        return CjsCarbonDocument.normalizeRecord(value);
    }

    /** Clones an object record or returns the supplied defaults for other values. */
    static normalizeRecord(value, defaults = {})
    {
        if (!CjsCarbonDocument.isObject(value) || Array.isArray(value))
        {
            return { ...defaults };
        }

        return { ...value, ...defaults };
    }

    /** Normalizes an optional plain record while preserving an absent value. */
    static normalizeNullableRecord(value)
    {
        return value == null ? null : CjsCarbonDocument.normalizeRecord(value);
    }

    /** Normalizes a required list by applying a value normalizer to each entry. */
    static normalizeList(value, map = null)
    {
        const list = CjsCarbonDocument.isArray(value) ? value : [];
        return map ? list.map(map) : list.slice();
    }

    /** Reports whether a value is a non-null object, including an array. */
    static isObject(value)
    {
        return value !== null && typeof value === "object";
    }

    /** Reports whether a value is an array. */
    static isArray(value)
    {
        return Array.isArray(value);
    }

    /** Reports whether a plain record has no own enumerable entries. */
    static isEmptyRecord(value)
    {
        return !CjsCarbonDocument.isObject(value) || Array.isArray(value) || Object.keys(value).length === 0;
    }
}
