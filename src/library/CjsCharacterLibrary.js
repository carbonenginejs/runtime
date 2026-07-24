import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";
import { CjsCharacterDependency } from "./CjsCharacterDependency.js";
import { CjsCharacterGraph } from "./CjsCharacterGraph.js";
import { CjsCharacterLibraryData } from "./CjsCharacterLibraryData.js";
import { CjsCharacterLodBundle } from "../parts/CjsCharacterLodBundle.js";
import { CjsCharacterRecipe } from "../recipes/CjsCharacterRecipe.js";
import { CjsCharacterRecipeResolution } from "../recipes/CjsCharacterRecipeResolution.js";
import { CjsCharacterResolutionIssue } from "../recipes/CjsCharacterResolutionIssue.js";
import { CjsCharacterResolvedPart } from "../parts/CjsCharacterResolvedPart.js";
import { CjsCharacterResolvedRule } from "../recipes/CjsCharacterResolvedRule.js";
import { CjsCharacterVisemeSet } from "../face/CjsCharacterVisemeSet.js";

const CATALOG_KEYS = [
    [ "sources", "ref" ],
    [ "partMetadata", "id" ],
    [ "parts", "id" ],
    [ "materials", "id" ],
    [ "projections", "id" ],
    [ "poses", "id" ],
    [ "presets", "id" ],
    [ "sculptFields", "id" ],
    [ "blendshapeLimits", "id" ],
    [ "uniqueCharacters", "id" ],
    [ "visemeSets", "id" ]
];

const KEYED_CATALOGS = [
    "materials", "projections", "poses", "presets", "sculptFields",
    "blendshapeLimits", "uniqueCharacters", "visemeSets"
];

@type.define({ className: "CjsCharacterLibrary", family: "character" })
/** Hydrates library data and owns transient catalog indexes. */
export class CjsCharacterLibrary extends CjsCharacterNode
{
    @type.objectRef("CjsCharacterLibraryData")
    @io.read
    data = null;

    #indexes = new Map();

    #partsByCategory = new Map();

    #partsBySex = new Map();

    #partsByTypeID = new Map();

    #partsByName = new Map();

    /** Expands a compact build artifact into the normalized runtime model. */
    static expandData(data)
    {
        if (Number(data?.schemaVersion) !== 2 || !data?.partSources)
        {
            return data;
        }

        const catalogs = Object.fromEntries(KEYED_CATALOGS.map(name => [
            name,
            ExpandCatalog(data[name] || {})
        ]));
        const partMetadata = [];
        const parts = [];
        const partAuthoring = {};

        for (const [ sourceID, source ] of Object.entries(data.partSources))
        {
            const [ sex, ...pathParts ] = sourceID.split("/");
            const partPath = source.path || pathParts.join("/");
            const baseMetadataID = source.metadata ? sourceID : null;

            if (source.metadata)
            {
                partMetadata.push({ id: sourceID, ...source.metadata });
            }

            if (source.authoring)
            {
                partAuthoring[sourceID] = CloneValue(source.authoring);
            }

            for (const [ versionID, version ] of Object.entries(source.versions || {}))
            {
                const resourceVersion = versionID === "default" ? null : versionID;
                const versionMetadataID = version.metadata ? `${sourceID}/${versionID}` : null;

                if (version.metadata)
                {
                    partMetadata.push({ id: versionMetadataID, ...version.metadata });
                }

                const resources = ResolveResources(source.resources || {}, version.resources || {});
                const lodBundles = ResolveLodBundles(resources);
                const resourcePaths = [
                    ...(resources.configPaths || []),
                    ...(resources.geometryPaths || []),
                    ...(resources.texturePaths || [])
                ];

                for (const [ typeID, type ] of Object.entries(version.types || {}))
                {
                    const colorVariant = type.colorVariant ?? null;
                    const derivedColorID = colorVariant ? `${sourceID}/${colorVariant}`.toLowerCase() : null;
                    const colorID = type.materialId || derivedColorID;
                    parts.push({
                        id: typeID,
                        typeID: type.typeID ?? null,
                        name: type.name || PosixBasename(typeID),
                        sex,
                        category: TypeCategory(typeID),
                        path: partPath,
                        resourceVersion,
                        colorVariant,
                        metadataId: versionMetadataID || baseMetadataID,
                        resourcePaths,
                        lodBundles,
                        colorIds: colorID && catalogs.materials.some(value => value.id === colorID)
                            ? [ colorID ]
                            : [],
                        projectionId: source.projectionId ?? null
                    });
                }
            }
        }

        return {
            schema: data.schema,
            schemaVersion: 1,
            sourceTarget: data.sourceTarget ?? null,
            sourceGame: data.sourceGame ?? null,
            sourceProvider: data.sourceProvider ?? null,
            sourceBuild: data.sourceBuild ?? null,
            generatedAt: data.generatedAt ?? null,
            ...(data.sourceRefs ? { sourceRefs: { ...data.sourceRefs } } : {}),
            ...(data.sources ? { sources: data.sources.map(value => ({ ...value })) } : {}),
            modifierNames: CloneValue(data.modifierNames || {}),
            faceSetup: CloneValue(data.faceSetup || {}),
            recipeLinks: CloneValue(data.recipeLinks || {}),
            partAuthoring,
            presentation: CloneValue(data.presentation || {}),
            partMetadata: partMetadata.sort(CompareId),
            parts: parts.sort(CompareId),
            ...catalogs
        };
    }

    constructor(data = null)
    {
        super();

        if (data)
        {
            this.SetData(data);
        }
    }

    /** Replaces the library data and atomically rebuilds transient indexes. */
    SetData(value)
    {
        const prepared = value instanceof CjsCharacterLibraryData
            ? value
            : CjsCharacterLibrary.expandData(value || {});
        const data = prepared instanceof CjsCharacterLibraryData
            ? prepared
            : CjsCharacterLibraryData.from(prepared);
        const indexes = new Map();

        data.visemeSets = PrepareVisemeSets(data.visemeSets);

        for (const [ catalog, key ] of CATALOG_KEYS)
        {
            indexes.set(catalog, BuildIndex(catalog, data[catalog], key));
        }

        ValidatePartMetadataReferences(data.parts, indexes.get("partMetadata"));
        ValidatePartCatalogReferences(
            data.parts,
            indexes.get("materials"),
            indexes.get("projections")
        );
        ValidateRecipeLinkSets(data.recipeLinks, indexes.get("presets"));

        this.data = data;
        this.#indexes = indexes;
        this.#partsByCategory = GroupParts(data.parts, "category", NormalizeGroupKey);
        this.#partsBySex = GroupParts(data.parts, "sex", NormalizeGroupKey);
        this.#partsByTypeID = GroupOptionalParts(data.parts, "typeID");
        this.#partsByName = GroupOptionalParts(data.parts, "name", NormalizeName);

        return this;
    }

    /** Returns whether a catalog contains an ID. */
    Has(catalog, id)
    {
        return this.#indexes.get(catalog)?.has(String(id)) || false;
    }

    /** Returns one catalog value or null. */
    Get(catalog, id)
    {
        return this.#indexes.get(catalog)?.get(String(id)) || null;
    }

    /** Returns whether a part ID exists. */
    HasPart(id)
    {
        return this.Has("parts", id);
    }

    /** Returns one part definition or null. */
    GetPart(id)
    {
        return this.Get("parts", id);
    }

    /** Resolves a part by internal ID, exact type identity, or unambiguous name. */
    ResolvePart(selection)
    {
        if (selection && typeof selection === "object")
        {
            if (selection.id) return this.GetPart(selection.id);
            if (selection.typeID !== undefined && selection.typeID !== null)
            {
                return this.GetPartByTypeID(selection.typeID);
            }
            if (selection.name) return this.GetPartByName(selection.name);
            return null;
        }

        const value = String(selection ?? "");
        const byID = this.GetPart(value);

        if (byID)
        {
            return byID;
        }

        if (/^\d+$/u.test(value))
        {
            return this.GetPartByTypeID(value);
        }

        return this.GetPartByName(value);
    }

    /** Returns the unique part carrying an exact type identity. */
    GetPartByTypeID(typeID)
    {
        return ResolveUniquePart(this.#partsByTypeID.get(String(typeID)) || [], `typeID ${typeID}`);
    }

    /** Returns every part carrying an exact type identity. */
    GetPartsByTypeID(typeID)
    {
        return (this.#partsByTypeID.get(String(typeID)) || []).slice();
    }

    /** Returns the unique part with a case-insensitive name. */
    GetPartByName(name)
    {
        const identity = ResolveOptionalNameCandidates(this.LookupName(name), name);

        return identity ? this.GetPart(identity.partID) : null;
    }

    /** Returns every part with a case-insensitive name. */
    GetPartsByName(name)
    {
        return this.LookupName(name).map(value => this.GetPart(value.partID));
    }

    /** Returns every exact case-insensitive character name identity. */
    LookupName(name)
    {
        return BuildNameCandidates(this.#partsByName.get(NormalizeName(name)) || []);
    }

    /** Returns every punctuation- and spacing-normalized character identity. */
    SearchName(name)
    {
        const normalized = NormalizeSearchName(name);
        const matches = new Map();

        for (const [ candidate, parts ] of this.#partsByName)
        {
            if (NormalizeSearchName(candidate) !== normalized)
            {
                continue;
            }

            for (const part of parts)
            {
                matches.set(part.id, part);
            }
        }

        return BuildNameCandidates([ ...matches.values() ]);
    }

    /** Resolves one exact name to a unique character identity. */
    ResolveName(name)
    {
        return ResolveNameCandidates(this.LookupName(name), name);
    }

    /** Resolves one normalized name to a unique character identity. */
    ResolveSearchName(name)
    {
        return ResolveNameCandidates(this.SearchName(name), name);
    }

    /** Returns the available atomic LOD bundles for one part. */
    GetPartLodBundles(selection)
    {
        return (this.ResolvePart(selection)?.lodBundles || []).slice();
    }

    /** Resolves one part LOD as an atomic configuration and geometry bundle. */
    ResolvePartLodBundle(selection, requestedLod)
    {
        const part = this.ResolvePart(selection);

        if (!part)
        {
            return null;
        }

        return CjsCharacterLodBundle.resolve(part.lodBundles, requestedLod);
    }

    /**
     * Resolves one explicit library identity into an adapter-safe graph part.
     * Model dependencies always come from one complete LOD bundle.
     */
    ResolveGraphPart(selection, { lod = null, weight = 1 } = {})
    {
        const part = this.ResolvePart(selection);

        if (!part)
        {
            return null;
        }

        const lodBundle = this.ResolvePartLodBundle(part.id, lod);

        if (!lodBundle && HasGeometryResources(part))
        {
            throw new Error(
                `Character part "${part.id}" has model resources but no complete LOD bundle`
            );
        }

        const metadata = part.metadataId ? this.GetPartMetadata(part.metadataId) : null;
        const materials = UniqueStrings(part.colorIds);
        const projection = part.projectionId ? this.GetProjection(part.projectionId) : null;
        const bundledPaths = new Set((part.lodBundles || []).flatMap(bundle => [
            bundle.configurationPath,
            bundle.geometryPath
        ].filter(Boolean)));
        const resourcePaths = UniquePaths(part.resourcePaths).filter(path => !bundledPaths.has(path));
        const dependencies = BuildPartDependencies(part, lodBundle, materials
            .map(id => this.GetMaterial(id)).filter(Boolean), projection, resourcePaths);

        return CjsCharacterResolvedPart.from({
            partID: part.id,
            typeID: part.typeID,
            name: part.name,
            sex: part.sex,
            category: part.category,
            path: part.path,
            resourceVersion: part.resourceVersion,
            colorVariant: part.colorVariant,
            weight: NormalizeWeight(weight),
            lodBundle: lodBundle?.GetValues() ?? null,
            metadata: metadata?.GetValues() ?? null,
            materialIDs: materials,
            projectionID: projection?.id ?? null,
            resourcePaths,
            dependencies: dependencies.map(value => value.GetValues())
        });
    }

    /** Returns the prepared index-aligned links for one preset. */
    GetRecipeLinks(selection)
    {
        const recipe = typeof selection === "string" ? this.GetPreset(selection) : selection;
        const id = String(recipe?.id ?? selection ?? "");

        return this.data?.recipeLinks instanceof Map
            ? this.data.recipeLinks.get(id) ?? null
            : this.data?.recipeLinks?.[id] ?? null;
    }

    /**
     * Resolves only compiler-prepared recipe links. Ambiguity and missing
     * semantics remain typed blocking issues instead of guessed selections.
     */
    ResolveRecipe(selection, { lod = null } = {})
    {
        const recipe = ResolvePreparedRecipe(this, selection);
        const links = this.GetRecipeLinks(recipe);
        const parts = [];
        const rules = [];
        const morphs = new Map();
        const materialIDs = new Set();
        const issues = [];
        const linksByIndex = new Map((links?.entries || []).map(link => [ link.entryIndex, link ]));

        for (let entryIndex = 0; entryIndex < recipe.entries.length; entryIndex++)
        {
            const entry = recipe.entries[entryIndex];
            const link = linksByIndex.get(entryIndex);

            if (!link)
            {
                issues.push(CreateResolutionIssue(entryIndex, "missing-link",
                    `Recipe entry ${entryIndex} has no prepared link`));
                continue;
            }

            if (link.status !== "resolved")
            {
                issues.push(CreateResolutionIssue(
                    entryIndex,
                    link.issueCode || link.status || "unresolved",
                    `Recipe entry ${entryIndex} is ${link.status || "unresolved"}`,
                    link.candidatePartIDs
                ));
                continue;
            }

            if (link.kind === "part")
            {
                try
                {
                    const part = this.ResolveGraphPart(link.partID, { lod, weight: entry.weight });
                    if (!part)
                    {
                        issues.push(CreateResolutionIssue(entryIndex, "missing-part",
                            `Prepared part "${link.partID}" is not in the library`));
                        continue;
                    }
                    if (!HasMatchingSex(recipe.sex, part.sex))
                    {
                        issues.push(CreateResolutionIssue(entryIndex, "part-sex-mismatch",
                            `Prepared part "${part.partID}" has sex "${part.sex}", expected "${recipe.sex}"`));
                        continue;
                    }
                    part.recipeEntryIndex = entryIndex;
                    parts.push(part);
                }
                catch (error)
                {
                    issues.push(CreateResolutionIssue(entryIndex, "part-resolution-failed",
                        error?.message || `Recipe entry ${entryIndex} could not resolve its part`));
                }
                continue;
            }

            if (link.kind === "morph")
            {
                if (link.morphName)
                {
                    morphs.set(link.morphName, entry.weight);
                }
                else
                {
                    issues.push(CreateResolutionIssue(entryIndex, "missing-morph-name",
                        `Recipe entry ${entryIndex} has no prepared morph name`));
                }
                continue;
            }

            if (link.kind === "rule")
            {
                const metadata = this.GetPartMetadata(link.metadataID);
                if (!metadata)
                {
                    issues.push(CreateResolutionIssue(entryIndex, "missing-rule-metadata",
                        `Prepared metadata "${link.metadataID}" is not in the library`));
                    continue;
                }
                rules.push(CjsCharacterResolvedRule.from({
                    recipeEntryIndex: entryIndex,
                    sourceID: link.sourceID || link.metadataID,
                    weight: entry.weight,
                    metadata: metadata.GetValues()
                }));
                continue;
            }

            if (link.kind === "material")
            {
                if (!this.GetMaterial(link.materialID))
                {
                    issues.push(CreateResolutionIssue(entryIndex, "missing-material",
                        `Prepared material "${link.materialID}" is not in the library`));
                    continue;
                }
                materialIDs.add(link.materialID);
                continue;
            }

            issues.push(CreateResolutionIssue(entryIndex, "unsupported-link-kind",
                `Recipe entry ${entryIndex} has unsupported prepared kind "${link.kind}"`));
        }

        if (!links)
        {
            issues.unshift(CreateResolutionIssue(-1, "missing-link-set",
                `Recipe "${recipe.id}" has no prepared link set`));
        }

        return CjsCharacterRecipeResolution.from({
            recipe: recipe.GetValues(),
            parts: parts.map(value => value.GetValues()),
            rules: rules.map(value => value.GetValues()),
            morphs,
            materialIDs: [ ...materialIDs ].sort(Compare),
            issues: issues.map(value => value.GetValues()),
            complete: !issues.some(value => value.blocking)
        });
    }

    /** Builds a graph from a prepared resolution, rejecting blocking issues by default. */
    BuildGraphFromResolution(value, options = {})
    {
        const resolution = value instanceof CjsCharacterRecipeResolution
            ? value
            : CjsCharacterRecipeResolution.from(value || {});
        const recipe = resolution.recipe;
        const parts = resolution.parts.slice();
        const sex = ResolveRequestedGraphSex(recipe, options.sex);
        const issues = resolution.issues.slice();
        AppendPartSexIssues(issues, parts, sex);
        const blocking = issues.filter(issue => issue.blocking);
        const complete = resolution.complete && blocking.length === 0;

        if (options.strict !== false && !complete)
        {
            if (blocking.length)
            {
                throw new Error(`Character recipe resolution has ${blocking.length} blocking issue(s)`);
            }

            throw new Error("Character recipe resolution is marked incomplete");
        }

        const materialIDs = new Set([
            ...resolution.materialIDs,
            ...parts.flatMap(part => part.materialIDs)
        ]);
        const projectionIDs = new Set(parts.map(part => part.projectionID).filter(Boolean));
        const dependencies = UniqueDependencies(parts.flatMap(part => part.dependencies));

        return CjsCharacterGraph.from({
            id: options.id ?? recipe?.id ?? "",
            name: options.name ?? recipe?.name ?? "",
            sex,
            recipe: recipe?.GetValues?.() ?? recipe ?? null,
            parts: parts.map(part => part.GetValues()),
            rules: resolution.rules.map(rule => rule.GetValues()),
            morphs: resolution.morphs,
            materials: [ ...materialIDs ].sort(Compare)
                .map(id => RequireCatalogValue(this, "material", id).GetValues()),
            projections: [ ...projectionIDs ].sort(Compare)
                .map(id => RequireCatalogValue(this, "projection", id).GetValues()),
            dependencies: dependencies.map(dependency => dependency.GetValues()),
            resolutionIssues: issues.map(issue => issue.GetValues()),
            complete
        });
    }

    /** Resolves a prepared recipe and immediately builds its graph. */
    BuildGraphFromRecipe(selection, options = {})
    {
        return this.BuildGraphFromResolution(this.ResolveRecipe(selection, options), options);
    }

    /**
     * Builds a standalone graph from explicit part identities.
     * Authored recipe category/path semantics are intentionally not inferred.
     */
    BuildGraphFromParts(selections, options = {})
    {
        if (!Array.isArray(selections))
        {
            throw new TypeError("Character graph part selections must be an array");
        }

        const parts = [];
        const seenParts = new Set();

        for (const value of selections)
        {
            const request = NormalizeGraphSelection(value, options.lod);
            const part = this.ResolveGraphPart(request.selection, request);

            if (!part)
            {
                throw new ReferenceError(`Character graph part selection not found: ${DescribeSelection(request.selection)}`);
            }

            if (seenParts.has(part.partID))
            {
                throw new Error(`Character graph contains duplicate part "${part.partID}"`);
            }

            seenParts.add(part.partID);
            parts.push(part);
        }

        const recipe = ResolveGraphRecipe(this, options.recipe);
        const sex = ResolveGraphSex(recipe, options.sex, parts);
        const materialIDs = new Set(parts.flatMap(value => value.materialIDs));
        const projectionIDs = new Set(parts.map(value => value.projectionID).filter(Boolean));
        const dependencies = UniqueDependencies(parts.flatMap(value => value.dependencies));

        return CjsCharacterGraph.from({
            id: options.id ?? recipe?.id ?? "",
            name: options.name ?? recipe?.name ?? "",
            sex,
            recipe: recipe?.GetValues() ?? null,
            parts: parts.map(value => value.GetValues()),
            rules: [],
            morphs: new Map(),
            materials: [ ...materialIDs ].map(id => RequireCatalogValue(this, "material", id).GetValues()),
            projections: [ ...projectionIDs ].map(id => RequireCatalogValue(this, "projection", id).GetValues()),
            dependencies: dependencies.map(value => value.GetValues()),
            resolutionIssues: [],
            complete: true
        });
    }

    /** Returns one part-metadata record or null. */
    GetPartMetadata(id)
    {
        return this.Get("partMetadata", id);
    }

    /** Returns one material record or null. */
    GetMaterial(id)
    {
        return this.Get("materials", id);
    }

    /** Returns one projection record or null. */
    GetProjection(id)
    {
        return this.Get("projections", id);
    }

    /** Returns one pose record or null. */
    GetPose(id)
    {
        return this.Get("poses", id);
    }

    /** Returns one character preset or null. */
    GetPreset(id)
    {
        return this.Get("presets", id);
    }

    /** Returns one sculpt field or null. */
    GetSculptField(id)
    {
        return this.Get("sculptFields", id);
    }

    /** Returns one blendshape-limits record or null. */
    GetBlendshapeLimits(id)
    {
        return this.Get("blendshapeLimits", id);
    }

    /** Returns one unique prebuilt character or null. */
    GetUniqueCharacter(id)
    {
        return this.Get("uniqueCharacters", id);
    }

    /** Returns one exact authored viseme set or null. */
    GetVisemeSet(id)
    {
        return this.Get("visemeSets", id);
    }

    /** Returns one portrait/presentation profile or null. */
    GetPresentationProfile(group, id)
    {
        const profiles = this.data.presentation?.[String(group)];

        if (profiles instanceof Map)
        {
            return profiles.get(String(id)) ?? null;
        }

        return profiles?.[String(id)] ?? null;
    }

    /** Returns parts in one exact category or, optionally, its descendants. */
    GetPartsByCategory(category, { recursive = false } = {})
    {
        const key = NormalizeGroupKey(category);

        if (!recursive)
        {
            return (this.#partsByCategory.get(key) || []).slice();
        }

        return this.data.parts.filter(part =>
        {
            const value = NormalizeGroupKey(part.category);
            return value === key || value.startsWith(`${key}/`);
        });
    }

    /** Returns a defensive copy of parts for one sex class. */
    GetPartsBySex(sex)
    {
        return (this.#partsBySex.get(NormalizeGroupKey(sex)) || []).slice();
    }

}

function CreateResolutionIssue(entryIndex, code, message, candidatePartIDs = [])
{
    return CjsCharacterResolutionIssue.from({
        entryIndex,
        code,
        message,
        blocking: true,
        candidatePartIDs: UniqueStrings(candidatePartIDs)
    });
}

function BuildIndex(catalog, values, key)
{
    const result = new Map();
    for (const value of values || [])
    {
        const id = String(value?.[key] || "");

        if (!id)
        {
            throw new Error(`CjsCharacterLibrary ${catalog} entry is missing ${key}`);
        }

        if (result.has(id))
        {
            throw new Error(`CjsCharacterLibrary duplicate ${catalog} id "${id}"`);
        }

        result.set(id, value);
    }

    return result;
}

function GroupParts(parts, key, normalize = String)
{
    const result = new Map();
    for (const part of parts || [])
    {
        const value = normalize(String(part?.[key] || ""));

        if (!result.has(value))
        {
            result.set(value, []);
        }

        result.get(value).push(part);
    }

    return result;
}

function NormalizeGroupKey(value)
{
    return String(value || "").trim().toLowerCase();
}

function GroupOptionalParts(parts, key, normalize = String)
{
    const result = new Map();

    for (const part of parts || [])
    {
        if (part?.[key] === undefined || part[key] === null || part[key] === "")
        {
            continue;
        }

        const value = normalize(String(part[key]));

        if (!result.has(value))
        {
            result.set(value, []);
        }

        result.get(value).push(part);
    }

    return result;
}

function ResolveUniquePart(parts, label)
{
    if (!parts.length)
    {
        return null;
    }

    if (parts.length !== 1)
    {
        throw new Error(`CjsCharacterLibrary ${label} is ambiguous across ${parts.length} parts`);
    }

    return parts[0];
}

function BuildNameCandidates(parts)
{
    return Object.freeze(parts.map(part => Object.freeze({
        kind: "character",
        typeID: part.typeID ?? null,
        partID: part.id
    })).sort((left, right) => Compare(left.partID, right.partID)));
}

function ResolveOptionalNameCandidates(candidates, name)
{
    if (!candidates.length)
    {
        return null;
    }

    return ResolveNameCandidates(candidates, name);
}

function ResolveNameCandidates(candidates, name)
{
    if (!candidates.length)
    {
        throw new Error(`Character name "${name}" not found`);
    }

    if (candidates.length > 1)
    {
        throw new Error(
            `Character name "${name}" is ambiguous (${candidates.length} identities)`
        );
    }

    return candidates[0];
}

function NormalizeName(value)
{
    const name = String(value ?? "").trim();

    if (!name)
    {
        throw new TypeError("Character name must be non-empty");
    }

    return name.toLocaleLowerCase("en-US");
}

function NormalizeSearchName(value)
{
    return NormalizeName(value)
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .replace(/\s+/gu, " ");
}

function Compare(left, right)
{
    return String(left).localeCompare(String(right), "en", { numeric: true });
}

function ValidatePartMetadataReferences(parts, metadata)
{
    for (const part of parts || [])
    {
        if (part.metadataId && !metadata.has(part.metadataId))
        {
            throw new Error(`CjsCharacterLibrary part "${part.id}" references unknown metadata "${part.metadataId}"`);
        }
    }
}

function ValidatePartCatalogReferences(parts, materials, projections)
{
    for (const part of parts || [])
    {
        for (const materialID of part.colorIds || [])
        {
            if (!materials.has(materialID))
            {
                throw new Error(
                    `CjsCharacterLibrary part "${part.id}" references unknown material "${materialID}"`
                );
            }
        }

        if (part.projectionId && !projections.has(part.projectionId))
        {
            throw new Error(
                `CjsCharacterLibrary part "${part.id}" references unknown projection "${part.projectionId}"`
            );
        }
    }
}

function ValidateRecipeLinkSets(recipeLinks, presets)
{
    const values = recipeLinks instanceof Map
        ? recipeLinks.entries()
        : Object.entries(recipeLinks || {});

    for (const [ presetID, linkSet ] of values)
    {
        const preset = presets.get(String(presetID));
        if (!preset)
        {
            throw new Error(`CjsCharacterLibrary recipe links reference unknown preset "${presetID}"`);
        }
        if (linkSet.presetID && linkSet.presetID !== presetID)
        {
            throw new Error(`CjsCharacterLibrary recipe link key "${presetID}" does not match presetID "${linkSet.presetID}"`);
        }
        if (!HasMatchingSex(preset.sex, linkSet.sex))
        {
            throw new Error(
                `CjsCharacterLibrary recipe "${presetID}" link sex "${linkSet.sex}" does not match preset sex "${preset.sex}"`
            );
        }

        const indexes = new Set();
        for (const link of linkSet.entries || [])
        {
            if (!Number.isInteger(link.entryIndex)
                || link.entryIndex < 0
                || link.entryIndex >= preset.entries.length)
            {
                throw new Error(`CjsCharacterLibrary recipe "${presetID}" has invalid entryIndex ${link.entryIndex}`);
            }
            if (indexes.has(link.entryIndex))
            {
                throw new Error(`CjsCharacterLibrary recipe "${presetID}" has duplicate entryIndex ${link.entryIndex}`);
            }
            indexes.add(link.entryIndex);
        }
    }
}

function PrepareVisemeSets(visemeSets)
{
    return (visemeSets || []).map(value => CjsCharacterVisemeSet.prepare(value));
}

function NormalizeGraphSelection(value, defaultLod)
{
    if (value && typeof value === "object" && Object.hasOwn(value, "selection"))
    {
        return {
            selection: value.selection,
            lod: value.lod ?? value.requestedLod ?? defaultLod ?? null,
            weight: value.weight ?? 1
        };
    }

    return {
        selection: value,
        lod: value && typeof value === "object"
            ? value.lod ?? value.requestedLod ?? defaultLod ?? null
            : defaultLod ?? null,
        weight: value && typeof value === "object" ? value.weight ?? 1 : 1
    };
}

function ResolveGraphRecipe(library, value)
{
    if (value === null || value === undefined)
    {
        return null;
    }

    if (value instanceof CjsCharacterRecipe)
    {
        return value;
    }

    if (typeof value === "string")
    {
        const recipe = library.GetPreset(value);

        if (!recipe)
        {
            throw new ReferenceError(`Character recipe "${value}" not found`);
        }

        return recipe;
    }

    return CjsCharacterRecipe.from(value);
}

function ResolvePreparedRecipe(library, value)
{
    const id = typeof value === "string"
        ? value
        : value?.id;

    if (id === null || id === undefined || String(id) === "")
    {
        throw new TypeError("Character recipe resolution requires a library preset identity");
    }

    const recipe = library.GetPreset(id);

    if (!recipe)
    {
        throw new ReferenceError(`Character recipe "${id}" not found`);
    }

    return recipe;
}

function ResolveRequestedGraphSex(recipe, requestedSex)
{
    const recipeSex = String(recipe?.sex || "");

    if (requestedSex !== null && requestedSex !== undefined)
    {
        if (typeof requestedSex !== "string" || !requestedSex.trim())
        {
            throw new TypeError("Character graph sex must be a non-empty string");
        }
        if (!HasMatchingSex(recipeSex, requestedSex))
        {
            throw new Error(
                `Character graph sex "${requestedSex}" does not match recipe sex "${recipeSex}"`
            );
        }
        return requestedSex;
    }

    return recipeSex;
}

function ResolveGraphSex(recipe, requestedSex, parts)
{
    const recipeSex = String(recipe?.sex || "");
    const selectedSex = requestedSex ?? recipeSex;
    const partSexes = UniqueStrings(parts.map(value => value.sex).filter(Boolean));

    if (requestedSex !== null && requestedSex !== undefined)
    {
        if (typeof requestedSex !== "string" || !requestedSex.trim())
        {
            throw new TypeError("Character graph sex must be a non-empty string");
        }
        if (!HasMatchingSex(recipeSex, requestedSex))
        {
            throw new Error(
                `Character graph sex "${requestedSex}" does not match recipe sex "${recipeSex}"`
            );
        }
    }

    if (!selectedSex && partSexes.length > 1)
    {
        throw new Error(`Character graph mixes ${partSexes.length} sex classes`);
    }

    const sex = selectedSex || partSexes[0] || "";
    const mismatch = parts.find(part => !HasMatchingSex(sex, part.sex));

    if (mismatch)
    {
        throw new Error(
            `Character part "${mismatch.partID}" has sex "${mismatch.sex}", expected "${sex}"`
        );
    }

    return sex;
}

function AppendPartSexIssues(issues, parts, sex)
{
    if (!sex)
    {
        return;
    }

    const existing = new Set(issues
        .filter(issue => issue.code === "part-sex-mismatch")
        .map(issue => issue.entryIndex));

    for (const part of parts)
    {
        if (HasMatchingSex(sex, part.sex) || existing.has(part.recipeEntryIndex))
        {
            continue;
        }

        issues.push(CreateResolutionIssue(
            part.recipeEntryIndex,
            "part-sex-mismatch",
            `Prepared part "${part.partID}" has sex "${part.sex}", expected "${sex}"`
        ));
    }
}

function HasMatchingSex(expected, actual)
{
    if (!expected || !actual)
    {
        return true;
    }

    return String(expected).trim().toLowerCase() === String(actual).trim().toLowerCase();
}

function BuildPartDependencies(part, lodBundle, materials, projection, resourcePaths)
{
    const values = [];

    if (lodBundle)
    {
        values.push(CreateDependency(part.id, lodBundle.configurationPath, "configuration", "model"));
        values.push(CreateDependency(part.id, lodBundle.geometryPath, "geometry", "model"));
    }

    for (const path of resourcePaths)
    {
        values.push(CreateDependency(part.id, path, InferDependencyKind(path), "part"));
    }

    for (const material of materials)
    {
        for (const path of UniquePaths(material.resourcePaths))
        {
            values.push(CreateDependency(part.id, path, InferDependencyKind(path), `material:${material.id}`));
        }
    }

    if (projection?.texturePath)
    {
        values.push(CreateDependency(part.id, projection.texturePath, "texture", `projection:${projection.id}`));
    }

    if (projection?.maskPath)
    {
        values.push(CreateDependency(part.id, projection.maskPath, "texture", `projection-mask:${projection.id}`,
            projection.maskPathEnabled));
    }

    return UniqueDependencies(values);
}

function CreateDependency(partID, path, kind, role, required = true)
{
    return CjsCharacterDependency.from({
        id: `${kind}:${path}`,
        path,
        kind,
        required,
        role,
        source: { partID }
    });
}

function UniqueDependencies(values)
{
    const result = new Map();

    for (const value of values)
    {
        const dependency = value instanceof CjsCharacterDependency
            ? value
            : CjsCharacterDependency.from(value);
        const key = `${dependency.kind}:${dependency.path}`;

        if (!result.has(key))
        {
            result.set(key, dependency);
        }
    }

    return [ ...result.values() ].sort((left, right) => Compare(left.id, right.id));
}

function HasGeometryResources(part)
{
    return (part.lodBundles || []).length > 0
        || (part.resourcePaths || []).some(path =>
        {
            const extension = GetExtension(path);
            return extension === ".gr2" || extension === ".cmf";
        });
}

function InferDependencyKind(path)
{
    const extension = GetExtension(path);

    if (extension === ".black" || extension === ".red") return "configuration";
    if (extension === ".gr2" || extension === ".cmf") return "geometry";
    if ([ ".dds", ".png", ".jpg", ".jpeg", ".tga", ".vta" ].includes(extension)) return "texture";
    return "resource";
}

function GetExtension(path)
{
    const clean = String(path || "").split(/[?#]/u, 1)[0];
    const dot = clean.lastIndexOf(".");
    return dot === -1 ? "" : clean.slice(dot).toLowerCase();
}

function UniquePaths(values)
{
    return UniqueStrings((values || []).map(value => String(value || "")).filter(Boolean));
}

function UniqueStrings(values)
{
    return [ ...new Set(values || []) ].sort(Compare);
}

function NormalizeWeight(value)
{
    const weight = Number(value);

    if (!Number.isFinite(weight))
    {
        throw new TypeError(`Character part weight must be finite, received ${value}`);
    }

    return weight;
}

function RequireCatalogValue(library, label, id)
{
    const value = label === "material" ? library.GetMaterial(id) : library.GetProjection(id);

    if (!value)
    {
        throw new ReferenceError(`Character ${label} "${id}" not found`);
    }

    return value;
}

function DescribeSelection(value)
{
    if (value && typeof value === "object")
    {
        if (value.id) return `id ${value.id}`;
        if (value.typeID !== undefined && value.typeID !== null) return `typeID ${value.typeID}`;
        if (value.name) return `name ${value.name}`;
    }

    return String(value);
}

function CloneValue(value)
{
    if (Array.isArray(value))
    {
        return value.map(CloneValue);
    }

    if (value && typeof value === "object")
    {
        return Object.fromEntries(Object.entries(value).map(([ key, item ]) => [
            key,
            CloneValue(item)
        ]));
    }

    return value;
}

function ResolveResources(inherited, overrides)
{
    const result = Object.fromEntries([ "configPaths", "geometryPaths", "texturePaths" ].map(key => [
        key,
        Object.hasOwn(overrides, key) ? overrides[key] : inherited[key] || []
    ]));
    const modelsOverridden = Object.hasOwn(overrides, "configPaths")
        || Object.hasOwn(overrides, "geometryPaths");

    result.lodBundles = Object.hasOwn(overrides, "lodBundles")
        ? overrides.lodBundles
        : !modelsOverridden && Object.hasOwn(inherited, "lodBundles")
            ? inherited.lodBundles
            : [];

    return result;
}

function ResolveLodBundles(resources)
{
    if (Array.isArray(resources.lodBundles) && resources.lodBundles.length)
    {
        return resources.lodBundles.map(CloneValue);
    }

    return CjsCharacterLodBundle
        .fromResources(resources.configPaths, resources.geometryPaths)
        .map(value => value.GetValues());
}

function ExpandCatalog(records)
{
    return Object.entries(records).map(([ id, record ]) => ({ id, ...record })).sort(CompareId);
}

function TypeCategory(typeID)
{
    const relative = typeID.split("/").slice(1);
    return relative.slice(0, -2).join("/");
}

function CompareId(a, b)
{
    return String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0;
}

function PosixBasename(value)
{
    const input = String(value || "");
    return input.slice(input.lastIndexOf("/") + 1);
}
