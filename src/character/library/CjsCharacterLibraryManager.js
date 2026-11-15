import { CjsCharacterLibraryConfiguration } from "./CjsCharacterLibraryConfiguration.js";
import { CjsCharacterPart } from "../model/catalog/CjsCharacterPart.js";
import { CjsCharacterModifier } from "../model/catalog/CjsCharacterModifier.js";
import { blue } from "#blue";
import { CjsCharacterLibraryBuilder } from "./CjsCharacterLibraryBuilder.js";
import { CjsCharacterColorVariation } from "../model/source/CjsCharacterColorVariation.js";
import { CjsCharacterTexture } from "../model/resources/CjsCharacterTexture.js";
import { CjsCharacterObjectBuilder } from "../formats/CjsCharacterObjectBuilder.js";
import { CjsCharacterPdpType } from "../formats/characterPdpType.js";

import { CjsCharacterLibrary } from "./CjsCharacterLibrary.js";
import { normalizeResourcePath } from "#utils/path";
import { CjsCharacterTextureRoles } from "./CjsCharacterTextureRoles.js";
import morphCorrectionDefaults from "../factory/defaults/morphCorrections.json" with { type: "json" };
import bodyCarrierDefaults from "../factory/defaults/bodyCarriers.json" with { type: "json" };
import meshDependantDefaults from "../factory/defaults/meshDependants.json" with { type: "json" };
import genericDefaults from "../factory/defaults/generic.js";
import partCategoryDefaults from "../factory/defaults/partCategories.json" with { type: "json" };
import defaultFemalePaperDoll from "../factory/defaults/defaultFemalePaperDoll.json" with { type: "json" };
import defaultMalePaperDoll from "../factory/defaults/defaultMalePaperDoll.json" with { type: "json" };
import { LOADOBJECT_INIT_FLAG } from "#consts/blue";
import { CjsCharacterMorphCorrections } from "../model/morph/CjsCharacterMorphCorrections.js";
import { CjsCharacterAppearanceResolver } from "../model/resolution/CjsCharacterAppearanceResolver.js";
import { PaperDollPaletteKind } from "./characterPalettes.js";
import { CjsSchema } from "#schema";
import { CjsCharacterGeneric } from "../model/source/CjsCharacterGeneric.js";
import { CjsGraph } from "../../global/model/graph/CjsGraph.js";
import { TriBatchType } from "#consts/graphics";

/** The default paper doll of each sex (`defaultPaperDoll`). */
const defaultPaperDolls = { female: defaultFemalePaperDoll, male: defaultMalePaperDoll };

/**
 * An area's shader values by name: textures as `res:` paths, parameters as four floats (a float parameter reads x).
 * @typedef {{ textures: Object<string, string>, parameters: Object<string, number[]> }} CjsCharacterAreaValues
 */

/**
 * One area of a model as `FetchModelAreas` answers it.
 * @typedef {{ batchType: number, name: string, index: number, count: number, shader: string, effect: string,
 *   region: ?string, setup: CjsCharacterAreaValues }} CjsCharacterModelArea
 */

/**
 * One mesh of a model as `FetchModelAreas` answers it.
 * @typedef {{ name: string, meshIndex: number, geometry: string, areas: CjsCharacterModelArea[] }} CjsCharacterModelMesh
 */

/**
 * One area shader rule compiled for lookup: the lists it picks areas by (empty for any) and the parameters it sets.
 * @typedef {{ categories: string[], batches: string[], regions: string[], parameters: Object<string, number[]> }} CjsCharacterAreaShaderRule
 */

/**
 * The area shaders' generic data compiled for lookup (`_AreaShaders`), by shader file name.
 * @typedef {{ defaultTextures: Object<string, string>, defaultParameters: Object<string, number[]>,
 *   rules: CjsCharacterAreaShaderRule[] }} CjsCharacterAreaShaderData
 */

/**
 * One paper doll category's rules in force (`factory/defaults/generic.js` says what each value means).
 * @typedef {{ options: (""|"type"|"folder"|"self"), maps: (""|"name"|"composed"|"variation"|"accessory"|"catalog"|"garment"),
 *   palettes: (""|"own"|"shared"|"variant"|"folders"|"styles"), areas: (""|"zone"|"detail"|"count"|"stated"|"none"),
 *   defaultColors: number[][], requiresModel: boolean, skipPatternedPalettes: boolean }} CjsCharacterCategoryRule
 */

/**
 * One area of the eye-wet borrow (`FetchEyeWet`): a model, a mesh by name, and an area by batch type and position.
 * @typedef {{ model: string, mesh: string, batchType: number, area: number }} CjsCharacterEyeWetArea
 */

/**
 * The bloodline name rules in force (`CjsCharacterGeneric.bloodlineRule`, `bloodlineMorphTargetRule`).
 * @typedef {{ bloodlineRule: string, bloodlineMorphTargetRule: string }} CjsCharacterBloodlineRules
 */

/**
 * A sex's resource facts as `GetSexFacts` answers them, in the record's shape (`CjsCharacterDataSex` says what each
 * value means).
 * @typedef {{ root: string, skeleton: string, genericHead: string, body: string, bodyFallbacks: Object<string, string>,
 *   defaultMorphs: Object<string, number>, eyeWetReference: string, eyeWetMesh: string }} CjsCharacterSexFacts
 */

/** Installs, loads, and queries one combined hydrated character library. */
export class CjsCharacterLibraryManager
{

    _sourceBuilder = null;

    _partJoins = new Map();

    /** Material-mask areas by detail and zone path (or zone path alone), derived once beside the records. */
    _materialMaskAreas = new Map();

    /** The parts library queries' answers, by query and arguments (`_Query`). */
    _queries = new Map();

    /** The paper doll category rules in force (`_Categories`), and the install generation they were built for. */
    _categories = null;

    _categoriesGeneration = -1;

    /** The area shaders' generic data in force (`_AreaShaders`), and the install generation it was built for. */
    _areaShaders = null;

    _areaShadersGeneration = -1;

    /** Each `TriBatchType` value's name, which area shader rules name batches by (`_ResolveAreaValues`). */
    static _batchNames = Object.fromEntries(Object.entries(TriBatchType).map(([ name, value ]) => [ value, name ]));

    /** The indexed paper doll files, sorted, for one install generation (`_PaperDollFiles`). */
    _paperDollFiles = null;

    /** The texture tables in force (`_TextureRoles`), and the install generation they were built for. */
    _textureRoles = null;

    _textureRolesGeneration = -1;

    /** The bloodline name rules in force (`_Bloodlines`), and the install generation they were built for. */
    _bloodlines = null;

    _bloodlinesGeneration = -1;

    /** The sex facts in force (`_Sexes`), and the install generation they were built for. */
    _sexes = null;

    _sexesGeneration = -1;

    /** The shipped generic (`_ShippedGeneric`), built once. */
    _shippedGeneric = null;

    /**
     * Reads one flat kind through its lazy Blue loader when present.
     * @param {string} kind Configured kind.
     * @param {string} name Canonical source identity or explicitly stored user name.
     * @returns {Promise<object>} The caller's own copy of the record (`copy`); missing targets reject explicitly.
     */
    async GetKindRecord(kind, name)
    {
        const generation = this._installGeneration;
        let record = this._library.GetKindRecord(kind, name);
        if (record) return CjsCharacterLibraryManager.copy(record);
        if (this._sourceBuilder)
        {
            if (!this._sourceBuilder.ListSourceNames(kind).includes(name))
                throw new Error(`Unresolved character ${kind} reference: ${name}`);
            await this._sourceBuilder.LoadRecord(kind, name);
            if (generation !== this._installGeneration) throw new Error("Character library was replaced during a kind load.");
            record = this._library.GetKindRecord(kind, name);
        }
        if (!record) throw new Error(`Unresolved character ${kind} reference: ${name}`);
        return CjsCharacterLibraryManager.copy(record);
    }

    /**
     * Lists a kind's exact names: the stored records' names, merged with the indexed source paths.
     * A kind whose record name is its path lists from the index without loading anything. Only the
     * shared families (cameras and cameraSequences, posts and scalarPosts) load their whole family
     * first, because which variant a file holds is known only once it is read.
     * @param {string} kind Configured kind.
     * @returns {Promise<Array<string>>} Sorted names of this shape, not candidate variants.
     */
    async ListKindNames(kind)
    {
        const generation = this._installGeneration;
        const shared = CjsCharacterLibraryBuilder.isSharedFamily(kind);
        if (this._sourceBuilder && shared) await this._sourceBuilder.LoadKind(kind);
        if (generation !== this._installGeneration) throw new Error("Character library was replaced during a kind listing.");
        const names = new Set(this._library.ListKindNames(kind));
        if (this._sourceBuilder && !shared)
        {
            const paths = this._sourceBuilder.ListSourceNames(kind);
            for (let i = 0; i < paths.length; i++) names.add(paths[i]);
        }
        return [...names].sort();
    }

    /**
     * Resolves an exact file reference without rewriting its authored field.
     * @param {string} path Canonical res path to a configured source or opaque resource.
     * @returns {Promise<object>} The caller's own copy of the target record; missing targets reject.
     */
    async ResolveReference(path)
    {
        if (this._sourceBuilder) return CjsCharacterLibraryManager.copy(await this._sourceBuilder.Resolve(path));
        for (const kind of Object.keys(CjsCharacterLibraryConfiguration.kinds))
        {
            const record = this._library.GetKindRecord(kind, path);
            if (record) return CjsCharacterLibraryManager.copy(record);
        }
        throw new Error(`Unresolved character reference: ${path}`);
    }

    /**
     * Resolves a .type's named colour using its explicit referenced paperdoll part.
     * @param {string} path Canonical .type source path.
     * @returns {Promise<object|null>} The colour target, or null for an empty reference.
     */
    async ResolveTypeColor(path)
    {
        const record = await this.GetType(path);
        if (!record.colorVariant) return null;
        const boundary = path.indexOf("/paperdoll/");
        if (boundary < 0) throw new Error(`Type has no paperdoll source context: ${path}`);
        const target = normalizeResourcePath(path.slice(0, boundary + 11) + record.partPath + "/" + record.colorVariant + ".color");
        return this.GetColorVariation(target);
    }

    /**
     * The morph corrections in force, by id: rules the morph bake applies on top of the shipped data
     * (`CjsCharacterMorphCorrections`), read from the defaults file `factory/defaults/morphCorrections.json`, which
     * only the library loads (character-structure-and-plugins: a correction is a setting with a default). No consumer
     * overrides them yet; an override comes with the generic when one does.
     * @type {Record<string, object>}
     */
    _morphCorrections = { ...morphCorrectionDefaults.corrections };

    /**
     * One mesh's morph offsets as the library hands them out: the shipped offsets with the corrections in force
     * applied, or null when no correction covers this morph (the shipped offsets then stand). The pipeline's morph
     * bake applies these values and runs no correction rules itself (character-structure-and-plugins: the library
     * has stuff, the engine builds from the values it is given).
     *
     * Ours (no Carbon counterpart); see `CjsCharacterMorphCorrections`.
     * @param {object} source The model's `TriGrannyRes`.
     * @param {string} path The model's resource path.
     * @param {number} meshIndex The mesh.
     * @param {number} morphIndex The morph target.
     * @returns {?{ position: Float32Array, normal: ?Float32Array, changed: number }} Corrected offsets, or null.
     */
    GetCorrectedMorphOffsets(source, path, meshIndex, morphIndex)
    {
        return CjsCharacterMorphCorrections.offsetsFor(source, path, meshIndex, morphIndex, this._morphCorrections);
    }

    /**
     * The body carriers in force: the nude parts every character wears under its garments (each with the dependant
     * categories it names as its own carriers), the dependant categories a garment's own body pieces come from
     * (`garmentDependants`), which carrier areas the composed cut mask clips (`cutMaskClip`, applied by
     * `CjsPaperDollInstance.cutMaskClipEffects`), and when a garment's mesh is its own copy of a carrier's
     * (`meshCopy`: the vertex share and the position scale it is measured at), whether the cut-mask shells draw
     * (`shells`), and the backing areas' cutout weight (`backingCutout`). Read from the defaults file
     * `factory/defaults/bodyCarriers.json`, which only the library loads; no consumer overrides it yet.
     * @type {{ parts: Array<{ path: string, dependants: string[] }>, garmentDependants: string[], cutMaskClip: { resource: string, influence: string, above: number, clip: string }, meshCopy: { share: number, positionScale: number }, shells: { draw: boolean }, backingCutout: { parameter: string, alpha: number } }}
     */
    _bodyCarriers = CjsCharacterLibraryManager.copy({
        parts: bodyCarrierDefaults.parts, garmentDependants: bodyCarrierDefaults.garmentDependants, cutMaskClip: bodyCarrierDefaults.cutMaskClip,
        meshCopy: bodyCarrierDefaults.meshCopy, shells: bodyCarrierDefaults.shells, backingCutout: bodyCarrierDefaults.backingCutout
    });

    /**
     * The dependant meshes the paper doll draws with their owner's diffuse (`CjsPaperDollInstance.meshDependantStates`):
     * each its path, owner member, the owner's state field, effect parameters and diffuse size. Read from the defaults
     * file `factory/defaults/meshDependants.json`, which only the library loads; no consumer overrides it yet.
     * @type {Array<{ path: string, owner: string, state: string, parameters: Object<string, number|number[]>, diffuseSize: number[] }>}
     */
    _meshDependants = CjsCharacterLibraryManager.copy(meshDependantDefaults.dependants);

    /**
     * One sex's body carriers, read once: each carrier with its model and decoded metadata, and the carrier rules in
     * force (`_bodyCarriers`). The carriers, in order: the nude parts; the dependants each names in its own carrier
     * categories (the torso's sleeves, from its metadata); then every other model folder in the garments' dependant
     * categories (`garmentDependants`), a garment's own body piece (`garment` true). A carrier's model is the first
     * `.black` directly in its folder other than a lower LOD (`_lodN`); its category is the dependant category the data
     * names that holds it, else its first folder. Derived: no content record lists the carriers; the folder rules are the ones Graphene's
     * body carriers used, moved here.
     *
     * Ours, as `FetchOptions`.
     *
     * @param {string} sex The paper doll's sex (`female`).
     * @returns {Promise<{ carriers: Array<{ path: string, category: string, garment: boolean, model: string, occludes: string[], shapes: { requests: object[], occlusions: object[] } }>, cutMaskClip: { resource: string, influence: string, above: number, clip: string }, meshCopy: { share: number, positionScale: number }, shells: { draw: boolean }, backingCutout: { parameter: string, alpha: number } }>}
     *   The carriers and the rules, the caller's own copy.
     * @throws {Error} For a carrier folder without a model, or a metadata entry no rule reads (`decodeModifiers`).
     */
    FetchBodyCarriers(sex)
    {
        return this._Query("bodyCarriers|" + sex, async () =>
        {
            const root = this.GetSexFacts(sex).root;
            const { parts, garmentDependants, cutMaskClip, meshCopy, shells, backingCutout } = this._bodyCarriers;
            const isModel = name => name.endsWith(".black") && !/_lod\d+\.black$/u.test(name);
            // The dependant categories the data names; any other carrier's category is its first folder.
            const categories = [ ...parts.flatMap(part => part.dependants), ...garmentDependants ];

            // The nude parts, then the dependants each names in its own carrier categories.
            const own = parts.map(part => part.path);
            for (const part of parts.filter(value => value.dependants.length))
            {
                const metadata = await this.FetchPartMetadata([ root + part.path + "/" ]);
                for (const dependant of metadata ? metadata.dependants.map(value => value.toLowerCase()) : [])
                    if (part.dependants.some(category => dependant.startsWith(category + "/"))) own.push(dependant);
            }

            // The garments' own body pieces: every model folder in their dependant categories.
            const paths = new Set(own);
            for (const category of garmentDependants)
            {
                const folder = root + category + "/";
                for (const file of this._PaperDollFiles(folder))
                {
                    const rest = file.slice(folder.length).split("/");
                    if (rest.length === 2 && isModel(rest[1])) paths.add(category + "/" + rest[0]);
                }
            }

            const carriers = [];
            for (const path of paths)
            {
                const folder = root + path + "/";
                const model = this._PaperDollFiles(folder).find(file => !file.slice(folder.length).includes("/") && isModel(file));
                if (!model) throw new Error("No body carrier model in " + folder);
                const metadata = await this.FetchPartMetadata([ folder ]);
                carriers.push({
                    path, category: categories.find(category => path.startsWith(category + "/")) ?? path.slice(0, path.indexOf("/")), garment: !own.includes(path), model,
                    occludes: metadata ? metadata.occludes : [], shapes: metadata ? metadata.shapes : { requests: [], occlusions: [] }
                });
            }
            return { carriers, cutMaskClip, meshCopy, shells, backingCutout };
        });
    }

    /**
     * One sex's drawn dependant meshes, read once: each entry in force (`_meshDependants`) with its versions, each
     * model its folder holds: its own as version 0 and each `vN/` folder's as version N, in version order (the
     * drape's tuck states: `standard`, then `v1/tuck`, `v2/bunchedup`, ...). Derived: no content record lists a
     * dependant's versions; the folder names are the rule Graphene's drape used, moved here.
     *
     * Ours, as `FetchOptions`.
     *
     * @param {string} sex The paper doll's sex (`female`).
     * @returns {Promise<Array<{ path: string, owner: string, state: string, parameters: Object<string, number|number[]>, diffuseSize: number[], versions: Array<{ index: number, name: string, model: string }> }>>}
     *   The entries (`model` the `.black` path, `name` its file name), the caller's own copy.
     * @throws {Error} For an entry whose models are not its folder's own and `v1`..`vN`.
     */
    FetchMeshDependants(sex)
    {
        const root = this.GetSexFacts(sex).root;
        return this._Query("meshDependants|" + sex, async () => this._meshDependants.map(entry =>
        {
            const folder = root + entry.path + "/";
            const versions = this._PaperDollFiles(folder).filter(file => file.endsWith(".black")).map(model =>
            {
                const relative = model.slice(folder.length), version = /^v(\d+)\//u.exec(relative);
                return { index: version ? Number(version[1]) : 0, name: relative.slice(relative.lastIndexOf("/") + 1, -".black".length), model };
            }).sort((a, b) => a.index - b.index);
            if (!versions.length || versions.some((version, index) => version.index !== index))
                throw new Error("Mesh dependant versions are not the folder and v1..vN: " + folder + " " + versions.map(version => version.model).join(", "));
            return { ...entry, versions };
        }));
    }

    /**
     * Lists part folders represented by indexed source files, including those with no metadata.
     * Type files belong to the folder above their explicit types subdirectory.
     * @returns {Array<string>} Canonical folder identities, without fetching bytes.
     */
    ListPartNames()
    {
        const names = new Set(this._library.ListKindNames("parts"));
        for (const kind of ["avatarPartMetaData", "types", "colorVariations", "projectedDecals", "blackResources", "textures"])
        {
            const paths = this._sourceBuilder ? this._sourceBuilder.ListSourceNames(kind) : this._library.ListKindNames(kind);
            for (const path of paths)
            {
                if (!path.includes("/paperdoll/")) continue;
                const typeDirectory = path.lastIndexOf("/types/");
                const folder = typeDirectory >= 0 ? path.slice(0, typeDirectory) : path.slice(0, path.lastIndexOf("/"));
                names.add(folder);
            }
        }
        return [...names].sort();
    }

    /**
     * Joins the original records of one exact part; never selects material or texture variants.
     * A relative part name is accepted only if the indexed suffix is unique.
     * @param {string} partPath Canonical part folder or unique paperdoll-relative path.
     * @returns {Promise<CjsCharacterPart>} The caller's own copy of the cached join.
     */
    async GetPart(partPath)
    {
        const requested = normalizeResourcePath(partPath).replace(/\/$/u, "");
        const names = this.ListPartNames();
        const matches = names.filter(name => name === requested || (!requested.includes(":") && name.endsWith("/paperdoll/" + requested)));
        if (matches.length !== 1) throw new Error(`${matches.length ? "Ambiguous" : "Unresolved"} character part: ${partPath}`);
        const name = matches[0];
        const stored = this._library.GetKindRecord("parts", name);
        if (stored) return CjsCharacterLibraryManager.copy(stored);
        if (!this._partJoins.has(name))
        {
            const operation = this.JoinPart(name);
            this._partJoins.set(name, operation);
            const clear = () => { if (this._partJoins.get(name) === operation) this._partJoins.delete(name); };
            operation.then(clear, clear);
        }
        return CjsCharacterLibraryManager.copy(await this._partJoins.get(name));
    }

    /**
     * Materializes a part join from loaded kind records, retaining nested relative names.
     * @param {string} name Canonical part folder.
     * @returns {Promise<CjsCharacterPart>} Stored join.
     */
    async JoinPart(name)
    {
        const generation = this._installGeneration;
        const part = new CjsCharacterPart();
        part.name = name;
        part._pdpType = CjsCharacterPdpType.PART;
        const metadataNames = this._sourceBuilder ? this._sourceBuilder.ListSourceNames("avatarPartMetaData") : this._library.ListKindNames("avatarPartMetaData");
        if (metadataNames.includes(name + "/metadata.yaml"))
        {
            part.metadata = await this.GetAvatarPartMetaData(name + "/metadata.yaml");
            // The part's own copies of its metadata's modifiers, as the character format read them (a weight the file
            // does not state stays null; CjsCharacterAppearanceResolver.dependantWeight resolves it).
            const copy = modifier => Object.assign(new CjsCharacterModifier(), { path: modifier.path, weight: modifier.weight });
            part.dependantModifiers = part.metadata.dependantModifiers.map(copy);
            part.occludesModifiers = part.metadata.occludesModifiers.map(copy);
        }
        for (const kind of ["types", "colorVariations", "projectedDecals"])
        {
            const paths = this._sourceBuilder ? this._sourceBuilder.ListSourceNames(kind) : this._library.ListKindNames(kind);
            for (const path of paths.filter(value => value.startsWith(name + "/")))
            {
                const local = path.slice(name.length + 1).replace(/^types\//u, "").replace(/\.[^/.]+$/u, "");
                if (part[kind].has(local)) throw new Error(`Duplicate ${kind} name in ${name}: ${local}`);
                part[kind].set(local, await this.GetKindRecord(kind, path));
            }
        }
        if (generation !== this._installGeneration) throw new Error("Character library was replaced during a part join.");
        return this._library.AddKind("parts", name, part);
    }

    /**
     * The category a paper doll part reads (`factory/defaults/partCategories.json`): the path below the sex's paper
     * doll root of its options. The parts' own classes declare none; the library answers. The shipped defaults only: a
     * library's generic overrides category rules (`GetCategoryRules`), not which category a part reads.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @param {string} member A `CjsPaperDollDefinition.parts` member (`hair`, `topMiddle`).
     * @returns {string} The category path (`hair`, `topmiddle`).
     * @throws {Error} For a member the defaults do not list.
     */
    static partCategory(member)
    {
        const category = partCategoryDefaults.parts[member];
        if (category === undefined) throw new Error("No paper doll part " + member);
        return category;
    }

    /**
     * A sex's default paper doll: the DNA every character of that sex starts from (`factory/defaults/
     * defaultFemalePaperDoll.json`, `defaultMalePaperDoll.json`), which only the library loads. The factory merges a DNA
     * over it (`CjsCharacterFactory.merge`).
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @param {string} sex The sex.
     * @returns {{ sex: string, description: string, parts: Object<string, object> }} A copy the caller may change.
     * @throws {Error} For a sex the library does not know.
     */
    static defaultPaperDoll(sex)
    {
        if (!Object.hasOwn(defaultPaperDolls, sex)) throw new Error("Unknown character sex " + sex);
        return structuredClone(defaultPaperDolls[sex]);
    }

    /**
     * A sex's resource facts in force: the installed generic's (`CjsCharacterGeneric.sexes`, a `CjsCharacterDataSex`
     * each, which says what each value means) over the shipped defaults (`_Sexes`).
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @param {string} sex The sex.
     * @returns {CjsCharacterSexFacts} A copy the caller may change.
     * @throws {Error} For a sex the library does not know.
     */
    GetSexFacts(sex)
    {
        const facts = this._Sexes().get(sex);
        if (facts === undefined) throw new Error("Unknown character sex " + sex);
        return {
            root: facts.root, skeleton: facts.skeleton, genericHead: facts.genericHead, body: facts.body,
            bodyFallbacks: Object.fromEntries(facts.bodyFallbacks.map(entry => [ entry.name, entry.value ])),
            defaultMorphs: Object.fromEntries(facts.defaultMorphs.map(entry => [ entry.name, entry.value ])),
            eyeWetReference: facts.eyeWetReference, eyeWetMesh: facts.eyeWetMesh
        };
    }

    /**
     * A palette file's record: its path, its file name, its kind (the areas it sets, from its `_a`/`_bc` name;
     * derived, as in the game's creator) and those areas.
     * @param {string} path The palette's `res:` path.
     * @returns {{ path: string, name: string, kind: number, areas: number[] }}
     */
    static paletteRecord(path)
    {
        const name = path.slice(path.lastIndexOf("/") + 1, -".color".length);
        const kind = name.endsWith("_a") ? PaperDollPaletteKind.AREA_1 : name.endsWith("_bc") ? PaperDollPaletteKind.AREAS_2_3 : PaperDollPaletteKind.WHOLE;
        return { path, name, kind, areas: kind === PaperDollPaletteKind.AREA_1 ? [ 1 ] : kind === PaperDollPaletteKind.AREAS_2_3 ? [ 2, 3 ] : [ 1, 2, 3 ] };
    }

    /**
     * A category's options, from the index alone (no file is read): each option's id, its `.type` (null for a
     * folder option), its folder and its path below the root, and for a folder option the bloodlines its `.type`
     * names say wear it. Sorted by `.type` path, or by folder. A category that `requiresModel` (`GetCategoryRules`) offers
     * only the types whose part ships a mesh, which reads their `.type`s.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): the game's paper doll is Python client
     * code, not Carbon. The listing each paper doll source made for itself, moved into the parts library.
     *
     * @param {"female"|"male"} sex The sex.
     * @param {string} category The category path below the root (a key of `GetCategoryRules`).
     * @returns {Promise<Array<{ sex: string, category: string, id: string, typePath: ?string, typePaths: string[], folder: string, path: string, bloodlines: string[] }>>}
     *   The options; the caller's own copy.
     * @throws {Error} For a category the library has no rule for.
     */
    async FetchOptions(sex, category)
    {
        const rule = this._CategoryRule(category, "options");
        return (await this._Query("options|" + sex + "|" + category, async () =>
        {
            const root = this.GetSexFacts(sex).root, folder = root + category + "/", files = this._PaperDollFiles(folder);
            const option = (id, typePath, typePaths, optionFolder, bloodlines) =>
                ({ sex, category, id, typePath, typePaths, folder: optionFolder, path: optionFolder.slice(root.length, -1), bloodlines });
            if (rule.options === "self") return [ option(category.split("/").at(-1), null, [], folder, []) ];
            const types = files.filter(path => path.endsWith(".type"));
            if (rule.options === "type")
            {
                // A type's folder is the one its `types/` folder sits in, as the part join slices it.
                const listed = types.map(path => option(path.slice(path.lastIndexOf("/") + 1, -".type".length), path, [ path ], path.slice(0, path.lastIndexOf("/types/") + 1), []));
                if (!rule.requiresModel) return listed;
                // Derived (moved from Graphene's accessories): an item is offered only when its variation's or its part's
                // folder holds a mesh (a `.black` that is not a lower LOD); this reads each `.type`.
                const shown = await Promise.all(listed.map(async value => (await this.FetchOptionPart(value)).folders
                    .some(dir => this._PaperDollFiles(dir).some(path => path.lastIndexOf("/") === dir.length - 1 && path.endsWith(".black") && !/_lod\d+\.black$/u.test(path)))));
                return listed.filter((_, index) => shown[index]);
            }
            return [ ...new Set(files.map(path => path.slice(0, path.indexOf("/", folder.length) + 1))) ].map(dir =>
            {
                const id = dir.slice(folder.length, -1), own = types.filter(path => path.startsWith(dir + "types/"));
                // The bloodline is the type's name, after the folder's name where it carries it (`bikinibottomcf01_deteis`,
                // male `deteis`); a type named as its folder names none (`topzh`).
                const bloodlines = own.map(path => path.slice(path.lastIndexOf("/") + 1, -".type".length))
                    .map(name => name.startsWith(id + "_") ? name.slice(id.length + 1) : name).filter(name => name !== id);
                return option(id, null, own, dir, bloodlines);
            });
        })).slice();
    }

    /**
     * A category's first-level folders that hold files but no `.type`, so no option (two male `tattoo/head` folders,
     * `tattooface01` and `tattoofacetest`, and every `colors/`): each folder's id (its name), its folder and its
     * path below the root, and its projection where it has one. From the index alone.
     *
     * Ours, as `FetchOptions`.
     *
     * @param {"female"|"male"} sex The sex.
     * @param {string} category The category path below the root, one whose options are `.type`s.
     * @returns {Promise<Array<{ id: string, folder: string, path: string, projection: ?string }>>} The folders.
     * @throws {Error} For a category whose options are not `.type`s.
     */
    async FetchFoldersWithoutOptions(sex, category)
    {
        if (this._CategoryRule(category, "options").options !== "type") throw new Error("The paper doll category " + category + " does not list options by .type");
        const root = this.GetSexFacts(sex).root, folder = root + category + "/", files = this._PaperDollFiles(folder);
        const typed = new Set(files.filter(path => path.endsWith(".type")).map(path => path.slice(0, path.lastIndexOf("/types/") + 1)));
        return [ ...new Set(files.filter(path => path.indexOf("/", folder.length) >= 0).map(path => path.slice(0, path.indexOf("/", folder.length) + 1))) ]
            .filter(dir => !typed.has(dir))
            .map(dir => ({ id: dir.slice(folder.length, -1), folder: dir, path: dir.slice(root.length, -1), projection: files.includes(dir + "projection.proj") ? dir + "projection.proj" : null }));
    }

    /**
     * An option's part facts, read once: its `.type`'s part, variation and colour variant (empty for a folder
     * option), its folders (the variation's own folder first where it has one, then the part folder), the first of
     * those folders' metadata with its occludes, dependants and utility shapes (`decodeModifiers`), its projection and its
     * models (the part folder's `.black` and `.gr2` files).
     *
     * Ours, as `FetchOptions`.
     *
     * @param {object} option An option from `FetchOptions`.
     * @returns {Promise<{ part: string, variation: string, colorVariant: string, folders: string[], metadataPath: ?string, metadata: ?object, occludes: string[], dependants: string[], numColorAreas: number, shapes: object, projection: ?string, models: string[] }>}
     *   The facts, the caller's own copy.
     * @throws {Error} For a metadata entry no rule reads (`decodeModifiers`).
     */
    FetchOptionPart(option)
    {
        return this._Query("part|" + CjsCharacterLibraryManager._OptionKey(option), async () =>
        {
            const root = this.GetSexFacts(option.sex).root;
            let part = option.path, variation = "", colorVariant = "", folders = [ option.folder ];
            if (option.typePath === null && option.variation)
            {
                // A recipe option (`FetchRecipeOption`): its variation's folder first where it has one.
                variation = option.variation;
                const own = option.folder + variation + "/";
                if (this._PaperDollFiles(own).length) folders = [ own, option.folder ];
            }
            else if (option.typePath !== null)
            {
                ({ partPath: part, variation, colorVariant } = await this.FetchType(option.typePath));
                // Res paths are case-insensitive and indexed lowercase; seven tattoo types name their part in mixed case.
                part = part.toLowerCase();
                const base = root + part + "/", own = base + variation + "/";
                // A variation without its own folder (v0) is the part's folder itself.
                folders = variation && this._PaperDollFiles(own).length ? [ own, base ] : [ base ];
            }
            const files = this._PaperDollFiles(folders.at(-1));
            const metadataPath = folders.map(folder => folder + "metadata.yaml").find(path => files.includes(path)) ?? null;
            const metadata = metadataPath ? await this.FetchAvatarPartMetaData(metadataPath) : null;
            const decoded = metadata ? CjsCharacterLibraryManager.decodeModifiers(metadata, metadataPath) : { occludes: [], dependants: [], shapes: { requests: [], occlusions: [] } };
            const base = folders.at(-1), direct = files.filter(path => path.lastIndexOf("/") === base.length - 1);
            return {
                part, variation, colorVariant, folders, metadataPath, metadata,
                occludes: decoded.occludes, dependants: decoded.dependants, numColorAreas: metadata ? metadata.numColorAreas : -1,
                shapes: decoded.shapes,
                projection: files.includes(base + "projection.proj") ? base + "projection.proj" : null,
                models: direct.filter(path => /\.(black|gr2)$/u.test(path))
            };
        });
    }

    /**
     * A part's or dependant's `metadata.yaml` lists, resolved: the character format has read each entry as its path
     * and stated weight (`CjsCharacterYamlFormat.decodeModifier`: `name###0.3`, `name#0.2`, an empty `name#`), so
     * the paper doll and every consumer take values, never strings to parse (character-structure-and-plugins: the
     * library has stuff, the engine builds from the values it is given).
     * `occludes` and `dependants` are the entries outside `utilityshapes/`, cut to their paths; `shapes` the utility
     * requests (`CjsCharacterAppearanceResolver.decodeUtilityShape`) and occlusions (`decodeUtilityOcclusion`). A
     * dependant's every `dependantModifiers` entry is a utility request (the tuck rule), and its occlusions protect no
     * owner. Every entry decodes or throws: every rule is handled.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @param {{ dependantModifiers: Array<{ path: string, weight: ?number }>, occludesModifiers: Array<{ path: string, weight: ?number }> }} metadata
     *   The two lists, as the character format reads them.
     * @param {string} metadataPath The file they were read from, for errors.
     * @param {string} [dependant=""] The dependant's modifier path, or "" for a worn part.
     * @returns {{ occludes: string[], dependants: string[], shapes: { requests: object[], occlusions: object[] } }}
     * @throws {Error} For an entry no rule reads, naming the dependant kind, the entry and the file.
     */
    static decodeModifiers(metadata, metadataPath, dependant = "")
    {
        const isUtility = entry => /^utilityshapes\//iu.test(entry.path);
        const cut = entries => [ ...new Set(entries.filter(entry => !isUtility(entry)).map(entry => entry.path)) ];
        const missing = (list, entry) => new Error("No paper doll rule for the " + (dependant ? dependant.split("/").slice(0, 2).join("/") + " " : "")
            + list + " entry " + entry.path + (entry.weight === null ? "" : " (weight " + entry.weight + ")") + " in " + metadataPath);
        const requests = [], occlusions = [];
        for (const entry of dependant ? metadata.dependantModifiers : metadata.dependantModifiers.filter(isUtility))
        {
            const request = CjsCharacterAppearanceResolver.decodeUtilityShape(entry);
            if (request === null) throw missing("dependantModifiers", entry);
            requests.push(request);
        }
        for (const entry of metadata.occludesModifiers.filter(isUtility))
        {
            const occlusion = CjsCharacterAppearanceResolver.decodeUtilityOcclusion(entry);
            if (occlusion === null) throw missing("occludesModifiers", entry);
            occlusions.push(dependant ? { ...occlusion, protectedOwner: null } : occlusion);
        }
        return { occludes: cut(metadata.occludesModifiers), dependants: dependant ? [] : cut(metadata.dependantModifiers), shapes: { requests, occlusions } };
    }

    /**
     * A dependant's metadata, read once: the dependant folder's `metadata.yaml` for the owner's variation where that
     * folder has one, else the unversioned one, decoded. Null where neither exists.
     *
     * Ours, as `FetchOptions`.
     *
     * @param {string} sex The paper doll's sex (`female`).
     * @param {string} path The dependant's modifier path as the owner names it (`accessories/masks/mask_big_F`).
     * @param {string} variation The owner's variation (`v6`), or "".
     * @returns {Promise<?{ path: string, metadataPath: string, occludes: string[], dependants: string[], shapes: object }>}
     *   The lower-case path, the file read and its lists decoded (`decodeModifiers`); the caller's own copy.
     * @throws {Error} For an entry no rule reads (`decodeModifiers`).
     */
    FetchDependantPart(sex, path, variation)
    {
        const lower = path.toLowerCase();
        return this._Query("dependant|" + sex + "|" + lower + "|" + variation, async () =>
        {
            const folder = this.GetSexFacts(sex).root + lower + "/", files = this._PaperDollFiles(folder);
            const metadataPath = [ ...(variation ? [ folder + variation + "/" ] : []), folder ].map(value => value + "metadata.yaml").find(value => files.includes(value));
            if (!metadataPath) return null;
            const metadata = await this.FetchAvatarPartMetaData(metadataPath);
            return { path: lower, metadataPath, ...CjsCharacterLibraryManager.decodeModifiers(metadata, metadataPath, lower) };
        });
    }

    /**
     * A part folder's metadata, read once: the first of the folders holding a `metadata.yaml`, decoded, for a consumer
     * that names its folders itself (hair, beards, accessories, the foundation, the body carriers). Its occludes,
     * dependants and utility shapes come from `decodeModifiers`; `dependantParts` are its dependants outside
     * `utilityshapes/` with their weights (`CjsCharacterAppearanceResolver.dependantWeight`: `archetypes/cdshape###1.0` at 1.0, an entry stating none at 1), and its two scalar fields
     * are as the file states them (`numColorAreas` -1 and an empty source path where it states none). Null where no
     * folder holds one.
     *
     * Ours, as `FetchOptions`.
     *
     * @param {string[]} folders The folders' `res:` paths, most specific first, each with its trailing slash.
     * @returns {Promise<?{ metadataPath: string, occludes: string[], dependants: string[], dependantParts: Array<{ path: string, weight: number }>, shapes: { requests: object[], occlusions: object[] }, numColorAreas: number, alternativeTextureSourcePath: string }>}
     *   The decoded metadata, the caller's own copy.
     * @throws {Error} For an entry no rule reads (`decodeModifiers`).
     */
    FetchPartMetadata(folders)
    {
        return this._Query("metadata|" + folders.join("|"), async () =>
        {
            const metadataPath = folders.map(folder => folder + "metadata.yaml").find(path => this._PaperDollFiles(path.slice(0, path.lastIndexOf("/") + 1)).includes(path));
            if (!metadataPath) return null;
            const metadata = await this.FetchAvatarPartMetaData(metadataPath);
            const dependantParts = metadata.dependantModifiers.filter(entry => !/^utilityshapes\//iu.test(entry.path))
                .map(entry => ({ path: entry.path, weight: CjsCharacterAppearanceResolver.dependantWeight(entry) }));
            return {
                metadataPath, ...CjsCharacterLibraryManager.decodeModifiers(metadata, metadataPath), dependantParts,
                numColorAreas: metadata.numColorAreas, alternativeTextureSourcePath: metadata.alternativeTextureSourcePath
            };
        });
    }

    /**
     * An option's maps at the character texture quality, by its category's rule (`GetCategoryRules`):
     * - `name`: `{ paths }`, one map per name, a variation's replacing the part folder's;
     * - `composed`: `{ roles, skipped }`, the option folder's composed maps by role, and those not named so;
     * - `variation`: `{ roles, skipped }`, as `composed` over the option's folders (`FetchOptionPart`), a name in the
     *   variation's folder replacing the part folder's;
     * - `accessory`: `{ folders, regions }`, the item's folders (`_AccessoryFolders`) and its maps by region and role
     *   (`CjsCharacterTextureRoles.pickAccessoryMaps`);
     * - `catalog`: `{ channels }`, one map per stem directly in the part folder;
     * - `garment`: `{ maps, skipped, masks, maskedNormal }`, the garment maps by key, the folder's other maps (overridden
     *   or unruled), its body cut masks (its own, then each dependant folder's; utility shapes are not folders), and
     *   whether its normal is a masked normal (`comp_body_mn`).
     *
     * Ours, as `FetchOptions`. The rules are `CjsCharacterTextureRoles`'.
     *
     * @param {object} option An option from `FetchOptions`.
     * @returns {Promise<object>} The maps, the caller's own copy.
     * @throws {Error} For a map decal variation with no folder that is not `v0`, a catalog option with a variation
     *   or an ambiguous stem, or a map name the role lookup does not know.
     */
    async FetchOptionMaps(option)
    {
        const rule = this._CategoryRule(option.category, "maps").maps, tier = CjsCharacterTextureRoles.tierOrder()[0];
        return this._Query("maps|" + tier + "|" + CjsCharacterLibraryManager._OptionKey(option), async () =>
        {
            if (rule === "composed") return CjsCharacterTextureRoles.readFolder(this._TextureRoles(), option.folder, this._PaperDollFiles(option.folder));
            if (rule === "accessory")
            {
                const folders = await this._AccessoryFolders(option);
                return { folders, regions: CjsCharacterTextureRoles.pickAccessoryMaps(this._TextureRoles(), folders, folder => this._PaperDollFiles(folder)) };
            }
            if (rule === "variation")
            {
                // Derived (moved from Graphene's hair): a name is found in the variation's folder, else the part folder.
                const roles = new Map(), skipped = new Set();
                for (const folder of (await this.FetchOptionPart(option)).folders)
                {
                    const read = CjsCharacterTextureRoles.readFolder(this._TextureRoles(), folder, this._PaperDollFiles(folder));
                    for (const role of read.roles)
                    {
                        const stem = CjsCharacterTextureRoles.splitTier(role.path)[0];
                        const name = stem.slice(stem.lastIndexOf("/") + 1);
                        if (!roles.has(name)) roles.set(name, role);
                    }
                    for (const name of read.skipped) skipped.add(name);
                }
                return { roles: [ ...roles.values() ], skipped: [ ...skipped ] };
            }
            const facts = await this.FetchOptionPart(option), base = facts.folders.at(-1), files = this._PaperDollFiles(base);
            const inFolder = folder => files.filter(file => file.startsWith(folder) && file.lastIndexOf("/") === folder.length - 1 && file.endsWith(".png"));
            if (rule === "name")
            {
                const variant = facts.variation ? base + facts.variation + "/" : base, own = inFolder(variant);
                if (variant !== base && !own.length && facts.variation !== "v0") throw new Error("Map decal type " + option.typePath + " names a variation with no folder");
                const pick = list => new Map([ ...new Set(list.map(file => CjsCharacterTextureRoles.splitTier(file)[0].split("/").at(-1))) ]
                    .map(name => [ name, CjsCharacterTextureRoles.pickTier(list[0].slice(0, list[0].lastIndexOf("/") + 1) + name + ".png", list) ]));
                return { paths: [ ...new Map([ ...(variant !== base ? pick(inFolder(base)) : []), ...(own.length ? pick(own) : []) ]).values() ] };
            }
            if (rule === "catalog")
            {
                if (facts.variation) throw new Error("Unqualified makeup variation: " + option.typePath);
                const direct = inFolder(base), channels = {};
                for (const stem of new Set(direct.map(path => CjsCharacterTextureRoles.splitTier(path)[0].slice(base.length))))
                {
                    const candidates = CjsCharacterTextureRoles.tierCandidates(direct, stem);
                    if (candidates.length !== 1) throw new Error("Ambiguous makeup channel: " + base + stem);
                    channels[stem] = candidates[0];
                }
                return { channels };
            }
            const maps = CjsCharacterTextureRoles.pickGarmentMaps(this._TextureRoles(), facts.folders, files), root = this.GetSexFacts(option.sex).root;
            const fromDependants = facts.dependants.filter(path => !/^utilityshapes\//iu.test(path)).map(path =>
            {
                const dir = root + path.toLowerCase() + "/";
                return CjsCharacterTextureRoles.pickGarmentMaps(this._TextureRoles(), [ dir ], this._PaperDollFiles(dir)).cutMask;
            });
            return {
                maps,
                skipped: CjsCharacterTextureRoles.garmentSkipped(this._TextureRoles(), facts.folders, files, [ ...Object.values(maps) ]),
                masks: [ ...new Set([ maps.cutMask, ...fromDependants ].filter(Boolean)) ],
                // A masked normal (`comp_body_mn`) carries its own coverage and encoding (the texture roles, `GetTextureRoles`).
                maskedNormal: maps.normal !== null && CjsCharacterTextureRoles.splitTier(maps.normal)[0].endsWith("/comp_body_mn")
            };
        });
    }

    /**
     * An option's palettes by path, with their kinds (`paletteRecord`), by its category's rule (`GetCategoryRules`): `own`,
     * the `.color` files directly in its folder; `shared`, those, then those in the category's `colors/`; `variant`,
     * its own where its `.type`'s colour variant names one of them, else the category's `colors/`; `folders`, the
     * `.color` files directly in each of an accessory's folders (`_AccessoryFolders`); `styles`, every option's of the
     * category, each the palette its `.type`'s colour variant names (else `default`) in its folders (beards). No colour
     * is read except where `skipPatternedPalettes` says.
     *
     * Ours, as `FetchOptions`.
     *
     * @param {object} option An option from `FetchOptions`.
     * @returns {Promise<Array<{ path: string, name: string, kind: number, areas: number[] }>>} The palettes; a new
     *   list per call.
     */
    async FetchPalettes(option)
    {
        return (await this._Query("palettes|" + CjsCharacterLibraryManager._OptionKey(option), async () =>
        {
            const shared = this.GetSexFacts(option.sex).root + option.category + "/colors/";
            const own = this._PaperDollFiles(option.folder).filter(path => path.endsWith(".color") && path.lastIndexOf("/") === option.folder.length - 1);
            const rule = this._CategoryRule(option.category, "palettes").palettes;
            if (rule === "styles")
            {
                // Derived (moved from Graphene's beards): any style may wear any style's default palette.
                // The option's own comes first, so that its `default` is the one `ResolveColors` names.
                const paths = [], styles = await this.FetchOptions(option.sex, option.category);
                for (const style of [ option, ...styles.filter(value => value.typePath !== option.typePath) ])
                {
                    const facts = await this.FetchOptionPart(style), name = (facts.colorVariant || "default") + ".color";
                    const found = facts.folders.map(folder => folder + name).find(path => this._PaperDollFiles(path.slice(0, path.lastIndexOf("/") + 1)).includes(path));
                    if (found) paths.push(found);
                }
                return [ ...new Set(paths) ].map(path => CjsCharacterLibraryManager.paletteRecord(path));
            }
            if (rule === "folders")
            {
                const paths = (await this._AccessoryFolders(option)).flatMap(folder => this._PaperDollFiles(folder)
                    .filter(path => path.endsWith(".color") && path.lastIndexOf("/") === folder.length - 1));
                const unique = [ ...new Set(paths) ];
                // Derived (moved from Graphene's accessories): a patterned palette is not offered where the category
                // says so (`skipPatternedPalettes`), because nothing composes its pattern yet; this reads each palette.
                const offered = this._Categories().get(option.category).skipPatternedPalettes
                    ? await Promise.all(unique.map(async path => (await this.FetchPalette(path, { pattern: "skip" })) !== null)) : unique.map(() => true);
                return unique.filter((_, index) => offered[index]).map(path => CjsCharacterLibraryManager.paletteRecord(path));
            }
            const category = rule === "own" ? [] : this._PaperDollFiles(shared).filter(path => path.endsWith(".color"));
            if (rule === "variant")
            {
                // Derived (moved from Graphene's hair): a style whose type names a palette of its own (aura_hp's `aura`)
                // is coloured from its folder; the rest from the shared swatches (hair_bob_02's own rbvf.color is unused).
                const colorVariant = option.typePath !== null ? (await this.FetchOptionPart(option)).colorVariant : "";
                const named = own.some(path => path.slice(path.lastIndexOf("/") + 1, -".color".length) === colorVariant);
                return (named ? own : category).map(path => CjsCharacterLibraryManager.paletteRecord(path));
            }
            return [ ...new Set([ ...own, ...category ]) ].map(path => CjsCharacterLibraryManager.paletteRecord(path));
        })).slice();
    }

    /**
     * The colour areas (1 to 3) an option paints, decoded once, by its category's rule (`GetCategoryRules`): `zone`, the
     * areas its zone map selects (`FetchMaterialMaskAreas__Zone`: layers that paint every pixel of their zone);
     * `detail`, the areas its colourise detail paints through its zone (`FetchMaterialMaskAreas`), each region's
     * pair joined, or for a garment its metadata's `numColorAreas` where stated; `count`, its metadata's
     * `numColorAreas` where stated, else as `detail`; `stated`, its part folder's metadata's `numColorAreas` where
     * stated and it ships a palette (`FetchPalettes`), else none; `none`, no colour.
     *
     * Ours, as `FetchOptions`.
     *
     * @param {object} option An option from `FetchOptions`.
     * @returns {Promise<number[]>} The areas, ascending; a new list per call.
     */
    async FetchColorAreas(option)
    {
        const rule = this._CategoryRule(option.category, "areas");
        if (rule.areas === "none") return [];
        return (await this._Query("areas|" + CjsCharacterTextureRoles.tierOrder()[0] + "|" + CjsCharacterLibraryManager._OptionKey(option), async () =>
        {
            if (rule.areas === "stated")
            {
                // Derived (moved from Graphene's accessories): no metadata, or one that does not state it, is no colour.
                const facts = await this.FetchOptionPart(option), own = await this.FetchPartMetadata([ facts.folders.at(-1) ]);
                const count = own ? own.numColorAreas : -1;
                return count > 0 && (await this.FetchPalettes(option)).length ? Array.from({ length: count }, (_, index) => index + 1) : [];
            }
            if (rule.areas === "count")
            {
                // Derived (moved from Graphene's hair): a style whose metadata is absent or silent takes its zone map's.
                const count = (await this.FetchOptionPart(option)).numColorAreas;
                if (count >= 0) return Array.from({ length: count }, (_, index) => index + 1);
            }
            const maps = await this.FetchOptionMaps(option);
            if (rule.maps === "garment")
            {
                if (!maps.maps.detail || !maps.maps.zone) return [];
                const count = (await this.FetchOptionPart(option)).numColorAreas;
                return count < 0 ? this.FetchMaterialMaskAreas(maps.maps.detail, maps.maps.zone) : Array.from({ length: count }, (_, index) => index + 1);
            }
            const roles = rule.maps === "catalog" ? Object.values(maps.channels).map(path => CjsCharacterTextureRoles.lookup(this._TextureRoles(), path)) : maps.roles;
            const areas = new Set();
            for (const region of new Set(roles.filter(role => role.operation === "Colorized" || role.inputOf === "l").map(role => role.region)))
            {
                const detail = CjsCharacterTextureRoles.one(roles, role => role.region === region && role.operation === "Colorized");
                const zone = CjsCharacterTextureRoles.one(roles, role => role.region === region && role.inputOf === "l");
                if (!zone || rule.areas !== "zone" && !detail) continue;
                const found = rule.areas === "zone" ? await this.FetchMaterialMaskAreas__Zone(zone.path) : await this.FetchMaterialMaskAreas(detail.path, zone.path);
                for (const area of found) areas.add(area);
            }
            return [ ...areas ].sort();
        })).slice();
    }

    /**
     * An option's colours: the library's own result, then the provided values laid over it. The library's result is
     * the named palette's colours, else the palette its `.type`'s colour variant names, else its `default` palette
     * (`default_a` for a shared ink), else its category's fallback (`_FallbackPalette`), else its category's
     * `defaultColors` (the lashes' black), else none; a palette sets only its own areas (`paletteRecord`). Then each provided colour is laid over the area it is for, where the option paints that area
     * (`FetchColorAreas`); the rest are ignored. Provided values are not otherwise read.
     *
     * Ours, derived (non-carbon-extensions.md § *The shared character library*): Carbon has no counterpart. The shape
     * follows ccpwgl's `EveSOFDataGeneric.GetShaderConfig` (its result, then the provided values that the shader uses
     * assigned over it), which is a loose guide, not a source.
     *
     * @param {object} option An option from `FetchOptions`.
     * @param {object} [provided] What the caller has.
     * @param {string} [provided.palette] A palette name (a recipe's colour variation); an unknown name falls back.
     * @param {Array<?ArrayLike<number>>} [provided.colors] Colours for areas 1 to 3 (a recipe's own colours).
     * @param {Array<?ArrayLike<number>>} [provided.specularColors] Specular colours for areas 1 to 3.
     * @returns {Promise<{ palette: ?string, colors: Array<?Float32Array>, specularColors: Array<?Float32Array>, pattern: ?object }>}
     *   The palette used (its path), and per area its colour and specular colour, null where nothing sets it.
     */
    async ResolveColors(option, { palette = "", colors = null, specularColors = null } = {})
    {
        const palettes = await this.FetchPalettes(option), named = name => name ? palettes.find(record => record.name === name) ?? null : null;
        const colorVariant = option.typePath !== null ? (await this.FetchOptionPart(option)).colorVariant : "";
        const chosen = named(palette) ?? named(colorVariant) ?? named("default") ?? named("default_a") ?? this._FallbackPalette(option, palettes);
        const result = { palette: chosen ? chosen.path : null, colors: [ null, null, null ], specularColors: [ null, null, null ], pattern: null };
        if (chosen)
        {
            const values = await this.FetchPalette(chosen.path, { specular: true });
            for (const area of chosen.areas)
            {
                result.colors[area - 1] = values.colors[area - 1];
                result.specularColors[area - 1] = values.specularColors[area - 1];
            }
            result.pattern = values.pattern;
        }
        else
        {
            const defaults = this._Categories().get(option.category).defaultColors;
            for (let index = 0; index < defaults.length; index++) result.colors[index] = Float32Array.from(defaults[index]);
        }
        if (colors === null && specularColors === null) return result;
        for (const area of await this.FetchColorAreas(option))
        {
            if (colors !== null && colors[area - 1]) result.colors[area - 1] = Float32Array.from(colors[area - 1]);
            if (specularColors !== null && specularColors[area - 1]) result.specularColors[area - 1] = Float32Array.from(specularColors[area - 1]);
        }
        return result;
    }

    /**
     * A model's meshes and their areas, read once from its `.black` through blue.resMan, built without initializing
     * (`LoadObject` with `LDOBJ_DONT_INITIALIZE`, BlueResMan.cpp:776-780: no object's Initialize runs, so here its effects and textures are not requested). Per mesh: its name,
     * its `meshIndex` (Carbon's `Tr2MeshBase` binds a mesh to its geometry by this index, `Tr2MeshBase.cpp:154`, and an
     * area by its index, :283; that is the Incarna-era engine, and whether today's client binds the same way is not
     * established) and its geometry; per area, in the order `Tr2MeshBase.GetAreas` lists them by batch type: its batch
     * type (`TriBatchType`), name, index, count, shader file, effect name, the atlas region its `TransformUV0` places it
     * in (`CjsCharacterTextureRoles.placeInRegion`; null for none) and its setup for a part of the given category: the
     * values `_ResolveAreaValues` resolves from what the area authors, less those the authored effect already holds, so
     * setting them makes the effect the resolved one. An area without an effect answers an empty shader, effect and
     * setup. A model without meshes (a beard's bare effect, a `Tr2Effect`) answers none.
     *
     * Ours, as `FetchOptions`.
     *
     * @param {string} path The `.black`'s `res:` path.
     * @param {string} category The category of the part the model belongs to (`topinner`, `hair`).
     * @returns {Promise<{ model: string, meshes: CjsCharacterModelMesh[] }>}
     *   The areas, the caller's own copy.
     * @throws {Error} For a model that is neither a `Tr2SkinnedModel` nor a `Tr2Effect`, an area whose shader has no
     *   generic data (`_ResolveAreaValues`), or one whose resolved value would change a parameter it authors as other
     *   than a Vector4, or a default would set one it authors as neither a Vector4 nor a float (none in the shipped
     *   content).
     */
    FetchModelAreas(path, category)
    {
        return this._Query("model|" + category + "|" + path, async () =>
        {
            const root = await blue.resMan.LoadObject(path, LOADOBJECT_INIT_FLAG.LDOBJ_DONT_INITIALIZE), className = CjsSchema.getClassName(root.constructor);
            // A beard's model is a bare effect, with no meshes.
            if (className === "Tr2Effect") return { model: path, meshes: [] };
            if (className !== "Tr2SkinnedModel") throw new Error("Unsupported character model " + className + ": " + path);
            const meshes = [];
            for (const mesh of root.meshes)
            {
                const areas = [];
                for (let batchType = 0; batchType < TriBatchType.TRIBATCHTYPE_COUNT_OF_BATCH_TYPES; batchType++)
                {
                    for (const area of mesh.GetAreas(batchType))
                    {
                        const effect = area.effect;
                        const record = { batchType, name: area.name, index: area.index, count: area.count, shader: "", effect: "", region: null, setup: { textures: {}, parameters: {} } };
                        // An area without an effect has nothing to set.
                        if (!effect) { areas.push(record); continue; }
                        record.shader = effect.effectFilePath.slice(effect.effectFilePath.lastIndexOf("/") + 1).toLowerCase();
                        record.effect = effect.name;

                        // What the area authors: its textures' paths, its Vector4 parameters, and its float parameters in
                        // the Vector4 form Carbon gives a float (`AddParameterFloat`).
                        const authored = { textures: {}, parameters: {} }, floats = new Set(), others = new Set();
                        for (const resource of effect.resources)
                        {
                            if (CjsSchema.getClassName(resource.constructor) === "TriTextureParameter") authored.textures[resource.name] = resource.resourcePath;
                        }
                        for (const parameter of effect.parameters)
                        {
                            const className = CjsSchema.getClassName(parameter.constructor);
                            if (className === "Tr2Vector4Parameter") authored.parameters[parameter.name] = Array.from(parameter.value);
                            else if (className === "Tr2FloatParameter") { const x = parameter.GetValue(); authored.parameters[parameter.name] = [ x, x, x, x ]; floats.add(parameter.name); }
                            else others.add(parameter.name);
                        }

                        // The resolved values the authored effect does not already hold, compared at float precision.
                        const resolved = this._ResolveAreaValues(record.shader, category, batchType, authored);
                        const holds = (name, value) => floats.has(name) ? authored.parameters[name][0] === Math.fround(value[0])
                            : authored.parameters[name] !== undefined && authored.parameters[name].every((component, index) => component === Math.fround(value[index]));
                        record.region = resolved.region;
                        record.setup.textures = Object.fromEntries(Object.entries(resolved.textures).filter(([ name, value ]) => authored.textures[name] !== value));
                        record.setup.parameters = Object.fromEntries(Object.entries(resolved.parameters).filter(([ name, value ]) => !holds(name, value)));

                        // The setup sets Vector4s; one that would change a parameter authored in another form is an error.
                        for (const name of Object.keys(record.setup.parameters))
                        {
                            if (floats.has(name) || others.has(name)) throw new Error("Area " + area.name + " of " + path + " authors " + name + " as other than a Vector4");
                        }
                        areas.push(record);
                    }
                }
                meshes.push({ name: mesh.name, meshIndex: mesh.meshIndex, geometry: mesh.geometryResPath, areas });
            }
            return { model: path, meshes };
        });
    }

    /**
     * Where a sex's generic head takes its eye-wet effect from (`GetSexFacts` `eyeWetReference`, `eyeWetMesh`): the
     * generic head's eye-wet area (its model, by the folder rule of `FetchOptionAreas`, the mesh the data names and its
     * first transparent area), and
     * the area of the reference model whose effect it takes: the reference's one mesh of the same `meshIndex` on the
     * generic head's geometry, its first transparent area. Read once. The head's areas are set up as a head part's
     * (`FetchModelAreas`), so a head area whose shader has no generic data fails this query too.
     *
     * A workaround, not the client's: the generic head authors its eye-wet area with `SkinnedAvatarBRDF.fx`, and the
     * effect a baked character-select model gives the same area is borrowed. Build 3698585: female mesh 8 takes
     * `head5`'s `eyewetnessshader_dxt5n.fx`, male mesh 5 `head5`'s `eyewetnessshader.fx`.
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @param {string} sex The sex.
     * @returns {Promise<{ head: CjsCharacterEyeWetArea, reference: CjsCharacterEyeWetArea }>} The two areas, the
     *   caller's own copy.
     * @throws {Error} For a reference that is not a `Tr2IntSkinnedObject`, a model without exactly one area the borrow
     *   names, or a reference mesh whose name is not unique. The generic's sexes must give every sex its `eyeWetReference`
     *   and `eyeWetMesh`.
     */
    FetchEyeWet(sex)
    {
        return this._Query("eyeWet|" + sex, async () =>
        {
            const { root, genericHead, eyeWetReference, eyeWetMesh } = this.GetSexFacts(sex);
            const TRANSPARENT = TriBatchType.TRIBATCHTYPE_TRANSPARENT;

            // The generic head, as an option of its folder: its category is the folder's first.
            const folder = root + genericHead + "/", category = genericHead.slice(0, genericHead.indexOf("/"));
            const head = await this.FetchOptionAreas({ sex, category, typePath: null, folder, path: genericHead });
            const named = head ? head.meshes.filter(mesh => mesh.name === eyeWetMesh) : [];
            const wet = named.length === 1 ? named[0] : undefined;
            if (!wet || !wet.areas.some(area => area.batchType === TRANSPARENT)) throw new Error("No one eye-wet area " + eyeWetMesh + " in " + folder);

            // The reference's one mesh of that index on the same geometry, with an effect on its first transparent area.
            const reference = await blue.resMan.LoadObject(eyeWetReference, LOADOBJECT_INIT_FLAG.LDOBJ_DONT_INITIALIZE);
            const className = CjsSchema.getClassName(reference.constructor);
            if (className !== "Tr2IntSkinnedObject") throw new Error("The eye-wet reference " + eyeWetReference + " is a " + className + ", not a Tr2IntSkinnedObject");
            const geometry = normalizeResourcePath(wet.geometry);
            const matching = reference.visualModel.meshes.filter(mesh => mesh.meshIndex === wet.meshIndex && normalizeResourcePath(mesh.geometryResPath) === geometry);
            const area = matching.length === 1 ? matching[0].transparentAreas[0] : undefined;
            if (!area || !area.effect) throw new Error("No one eye-wet area of meshIndex " + wet.meshIndex + " in " + eyeWetReference);
            if (reference.visualModel.meshes.filter(mesh => mesh.name === matching[0].name).length !== 1) throw new Error("The eye-wet mesh name " + matching[0].name + " is not unique in " + eyeWetReference);

            return {
                head: { model: head.model, mesh: wet.name, batchType: TRANSPARENT, area: 0 },
                reference: { model: eyeWetReference, mesh: matching[0].name, batchType: TRANSPARENT, area: 0 }
            };
        });
    }

    /**
     * An option's model and its areas (`FetchModelAreas`, set up for the option's category): the `.black` (not a
     * `_lodN` one) directly in the option's first folder that has one (its variation's, then its part's), or none. Of two in a folder, the one named as the
     * folder. Derived: four folders ship two (build 3670638): female `hair_dreadlocks_01` and `hair_long_01` and male
     * `dependants/ragdoll/ragdollthicktop` (each with a `_nosim` model), and male `outer/jacketcm01_r` (its own and
     * `jacketcm01.black`).
     *
     * Ours, as `FetchOptions`.
     *
     * @param {object} option An option from `FetchOptions`.
     * @returns {Promise<?{ model: string, meshes: CjsCharacterModelMesh[] }>} The areas, or null for an option without a
     *   model.
     */
    async FetchOptionAreas(option)
    {
        const folders = option.typePath !== null ? (await this.FetchOptionPart(option)).folders : [ option.folder ];
        for (const folder of folders)
        {
            const models = this._PaperDollFiles(folder).filter(path => path.endsWith(".black") && path.lastIndexOf("/") === folder.length - 1 && !/_lod\d+\.black$/u.test(path));
            const named = folder + folder.slice(0, -1).split("/").at(-1) + ".black";
            if (models.length) return this.FetchModelAreas(models.includes(named) ? named : models[0], option.category);
        }
        return null;
    }

    /**
     * An archetype's bloodline: the head whose metadata depends on the archetype (`head`, `head/caldari_deteis`),
     * the bloodline that head names (`bloodline`, its folder's last word: `deteis`, as the underwear types name
     * bloodlines) and the morph target the archetype drives (`morphTarget`, its code in capitals then `Shape`:
     * `archetypes/cdshape` is `CDShape`). The archetype's own `types/<bloodline>.type` is not used: the male
     * archetypes ship none, and two female ones are spelled apart from every other file (`deites`, `verokior`).
     * Derived: no content record names an archetype's head, bloodline or morph; the two name rules are the code
     * Graphene's foundation used, moved here behind this query, and the generic names which are in force
     * (`CjsCharacterGeneric.bloodlineRule` `headFolderLastWord`, `bloodlineMorphTargetRule` `archetypeCodeUpperShape`).
     *
     * Ours, as `FetchOptions`.
     *
     * @param {"female"|"male"} sex The sex.
     * @param {string} archetype The archetype folder below the root (`archetypes/cdshape`).
     * @returns {Promise<?{ bloodline: string, head: string, morphTarget: string }>} The bloodline, or null for an
     *   archetype no head depends on.
     * @throws {Error} For an archetype more than one head depends on, or a rule name the library has no rule for.
     */
    FetchBloodline(sex, archetype)
    {
        return this._Query("bloodline|" + sex + "|" + archetype, async () =>
        {
            const { bloodlineRule, bloodlineMorphTargetRule } = this._Bloodlines();
            if (bloodlineRule !== "headFolderLastWord") throw new Error("No bloodline rule " + bloodlineRule);
            if (bloodlineMorphTargetRule !== "archetypeCodeUpperShape") throw new Error("No morph target rule " + bloodlineMorphTargetRule);

            const heads = this.GetSexFacts(sex).root + "head/";
            const paths = this._PaperDollFiles(heads).filter(path => path.endsWith("/metadata.yaml") && path.indexOf("/", heads.length) === path.length - "/metadata.yaml".length);
            const found = [];
            for (const path of paths)
            {
                const metadata = await this.FetchAvatarPartMetaData(path);
                if (metadata.dependantModifiers.some(value => value.path === archetype)) found.push(path.slice(heads.length, -"/metadata.yaml".length));
            }
            if (found.length > 1) throw new Error("Archetype " + archetype + " has more than one head: " + found.join(", "));
            if (!found.length) return null;
            const code = archetype.slice(archetype.lastIndexOf("/") + 1, -"shape".length);
            return { bloodline: found[0].slice(found[0].lastIndexOf("_") + 1), head: "head/" + found[0], morphTarget: code.toUpperCase() + "Shape" };
        });
    }

    /**
     * The category and option a recipe entry selects: the first option whose `.type` names the same part and
     * variation (an empty variation is `v0`) and, where the type names a colour variant, the same colour variation;
     * or the folder option of the entry's part. A type without a colour variant (every makeup type) leaves the
     * colour to the entry: its colour variation then names one of the option's palettes. Found from the shipped
     * recipes (`dnafiles/`, `paperdolllibrary/prs/`): no makeup type names a colour variant, and their entries name
     * palettes (`default`, `black`). An entry no type presets (a garment palette its type does not pair with that
     * variation) selects no option. Names compare without case, as res paths do. The first entry of a category reads
     * every `.type` in it (cached; 204 for female `outer`).
     *
     * Ours, as `FetchOptions`.
     *
     * @param {"female"|"male"} sex The sex.
     * @param {{ path: string, variation?: string, colorVariation?: string }} entry The recipe entry.
     * @returns {Promise<?{ category: string, option: ?string, path?: string, nude?: true }>} The selection: its category,
     *   and its option (with the option's path below the root) or null when no option matches (always null in a category
     *   with no option rule: `head`). `nude` marks an entry naming its category's bare part (`feet/feet_nude`; derived: the
     *   content's `_nude` folders name no option). Null for a path in no category.
     */
    async ResolveRecipeEntry(sex, { path, variation = "", colorVariation = "" })
    {
        const lower = path.toLowerCase(), wanted = colorVariation.toLowerCase();
        const category = [ ...this._Categories().keys() ].filter(name => lower.startsWith(name + "/")).sort((a, b) => b.length - a.length)[0];
        if (!category) return null;
        if (this._Categories().get(category).options === "") return { category, option: null };
        const unmatched = lower.endsWith("_nude") ? { category, option: null, nude: true } : { category, option: null };
        const same = (a, b) => (a || "v0").toLowerCase() === (b || "v0").toLowerCase();
        for (const option of await this.FetchOptions(sex, category))
        {
            if (option.typePath === null)
            {
                if (option.path === lower) return { category, option: option.id, path: option.path };
                continue;
            }
            const facts = await this.FetchOptionPart(option);
            if (facts.part === lower && same(facts.variation, variation) && (!facts.colorVariant || facts.colorVariant.toLowerCase() === wanted)) return { category, option: option.id, path: option.path };
        }
        return unmatched;
    }

    /**
     * A recipe option: the option a recipe entry selects when no `.type` presets it (a garment palette its type does
     * not pair with that variation). It names the entry's part folder and variation
     * directly, as an option record the other queries take (`FetchOptionPart`, `FetchOptionMaps`, `FetchPalettes`), with
     * the id `recipe`. Null when the content has no such folder (a part the build does not ship).
     *
     * Ours, as `FetchOptions`.
     *
     * @param {"female"|"male"} sex The sex.
     * @param {string} category The category path below the root, one with an option rule.
     * @param {{ path: string, variation?: string }} entry The recipe entry's part path and variation.
     * @returns {Promise<?{ sex: string, category: string, id: string, typePath: null, typePaths: string[], folder: string, path: string, bloodlines: string[], variation: string }>}
     */
    async FetchRecipeOption(sex, category, { path, variation = "" })
    {
        this._CategoryRule(category, "options");
        const lower = path.toLowerCase(), folder = this.GetSexFacts(sex).root + lower + "/";
        if (!this._PaperDollFiles(folder).length) return null;
        return { sex, category, id: "recipe", typePath: null, typePaths: [], folder, path: lower, bloodlines: [], variation: variation.toLowerCase() };
    }

    /**
     * An option's identity for the query caches: its sex, category, id, folder and variation (a recipe option is told
     * apart by its folder and variation).
     * @param {{ sex: string, category: string, id: string, folder: string, variation?: string }} option The option.
     * @returns {string}
     */
    static _OptionKey(option)
    {
        return [ option.sex, option.category, option.id, option.folder, option.variation ?? "" ].join("|");
    }

    /**
     * The palette an option takes when none is named and it ships no `default`, by its category's rules: a garment
     * (maps `garment`) its first; a category whose palettes are `variant` (hair) its first area-1 swatch (`_a`). Else
     * none. Derived, our picks, not a source's: garments, 15 female and 12 male in build 3670638 (the recipe-colours
     * ruling is open); hair, moved from Graphene's hair.
     * @param {object} option An option from `FetchOptions`.
     * @param {Array<{ path: string, name: string, kind: number, areas: number[] }>} palettes Its palettes (`FetchPalettes`).
     * @returns {?{ path: string, name: string, kind: number, areas: number[] }} The fallback, or null.
     */
    _FallbackPalette(option, palettes)
    {
        const rule = this._Categories().get(option.category);
        if (rule.maps === "garment") return palettes[0] ?? null;
        if (rule.palettes === "variant") return palettes.find(record => record.kind === PaperDollPaletteKind.AREA_1) ?? null;
        return null;
    }

    /**
     * An accessory's folders, in the order its maps and palettes are searched: its variation's folder and its part
     * folder (`FetchOptionPart`), the part folder's metadata's `alternativeTextureSourcePath`, and the folder holding
     * its `types/`; each once, and only those the index lists files in. Derived, moved from Graphene's accessories.
     * @param {object} option An option from `FetchOptions`.
     * @returns {Promise<string[]>} The folders' `res:` paths, each with its trailing slash.
     */
    async _AccessoryFolders(option)
    {
        const facts = await this.FetchOptionPart(option), own = await this.FetchPartMetadata([ facts.folders.at(-1) ]);
        const root = this.GetSexFacts(option.sex).root, source = own ? own.alternativeTextureSourcePath : "";
        const folders = [ ...facts.folders, ...(source ? [ root + source.toLowerCase().replace(/\/?$/u, "/") ] : []), option.folder ];
        return [ ...new Set(folders) ].filter(folder => this._PaperDollFiles(folder).length);
    }

    /**
     * The area shaders' generic data in force, by shader file name: the shipped defaults
     * (`factory/defaults/generic.js`, in the generic's own shape, built into `CjsCharacterDataShader` objects by
     * the graph), each replaced by the installed library's generic shader of the same name, through one compiler.
     * Built once per install, as Carbon compiles its generic data once (`EveSOFDataMgr::GenerateGenericData`,
     * EveSOFDataMgr.cpp:1892-2103).
     * @returns {Map<string, CjsCharacterAreaShaderData>}
     *   The data; not to be changed.
     */
    _AreaShaders()
    {
        if (this._areaShaders === null || this._areaShadersGeneration !== this._installGeneration)
        {
            const parameters = list => Object.fromEntries(list.map(parameter => [ parameter.name, Array.from(parameter.value) ]));
            // A rule's batch and region names must be ones the areas carry, or the rule would silently pick nothing.
            const regions = [ "identity", ...Object.keys(this._TextureRoles().atlas) ];
            const known = (shader, kind, names, valid) =>
            {
                for (const name of names) if (!valid.includes(name)) throw new Error("Area shader " + shader + " has a rule with an unknown " + kind + " " + name);
                return [ ...names ];
            };
            const compile = shader => ({
                defaultTextures: Object.fromEntries(shader.defaultTextures.map(texture => [ texture.name, texture.resFilePath ])),
                defaultParameters: parameters(shader.defaultParameters),
                rules: shader.rules.map(rule => ({
                    categories: rule.categories.map(entry => entry.str),
                    batches: known(shader.shader, "batch", rule.batches.map(entry => entry.str), Object.keys(TriBatchType)),
                    regions: known(shader.shader, "region", rule.regions.map(entry => entry.str), regions),
                    parameters: parameters(rule.parameters)
                }))
            });
            const shipped = this._ShippedGeneric();
            const shaders = new Map();
            for (const shader of [ ...shipped.areaShaders, ...this._library.generic.areaShaders ]) shaders.set(shader.shader, compile(shader));
            this._areaShaders = shaders;
            this._areaShadersGeneration = this._installGeneration;
        }
        return this._areaShaders;
    }

    /**
     * One area's values, in the order Carbon resolves a generic shader for an area (`EveSOFDNA::GetGenericAreaShaderData`,
     * EveSOFDNA.cpp:613-621, applied at EveSOF.cpp:816-883: the hull's values, which the generic defaults do not
     * replace; ccpwgl's `EveSOFDataGenericShader.Assign` has the same order): the shader's default textures and
     * parameters (`_AreaShaders`), the values provided for the area over them, `TransformUV0` as the provided rect's
     * placement in its region (`CjsCharacterTextureRoles.placeInRegion`; ours), then each rule whose lists all hold the
     * area's part category, batch and region (ours, `CjsCharacterDataShaderRule`). A parameter nobody gives keeps the
     * compiled shader's own default (Tr2Effect.cpp:1818-1857). The values provided are an authored area's
     * (`FetchModelAreas`) or a new part's, so both resolve the same way.
     * @adapted an empty texture path is not provided, so the default fills it: Carbon's `AddResourceTexture2D` keeps an
     *   empty one (Tr2Effect.cpp:424-439), and the content leaves `FresnelLookupMap` empty on most areas; and the provided
     *   parameters are not filtered by the shader's `parameters` (EveSOF.cpp:818-826), which the paper doll leaves empty;
     *   and a shader without generic data throws, failing the whole model, where Carbon logs it and stops building that
     *   batch type's areas, keeping those already built (EveSOF.cpp:785-790).
     * @param {string} shader The area's shader file name, lowercase.
     * @param {string} category The category of the part the area belongs to.
     * @param {number} batchType The area's `TriBatchType`.
     * @param {CjsCharacterAreaValues} provided The values given for the area.
     * @returns {CjsCharacterAreaValues & { region: ?string }} The area's region (null outside every one) and its values;
     *   the caller's own.
     * @throws {Error} For a shader without generic data.
     */
    _ResolveAreaValues(shader, category, batchType, provided)
    {
        const data = this._AreaShaders().get(shader);
        if (data === undefined) throw new Error("No generic area shader data for " + shader);
        const given = Object.entries(provided.textures).filter(([ , path ]) => path);
        const textures = { ...data.defaultTextures, ...Object.fromEntries(given) };
        const parameters = CjsCharacterLibraryManager.copy({ ...data.defaultParameters, ...provided.parameters });

        const placement = provided.parameters.TransformUV0 ? CjsCharacterTextureRoles.placeInRegion(this._TextureRoles(), provided.parameters.TransformUV0) : null;
        if (placement !== null) parameters.TransformUV0 = placement.transform;

        const batch = CjsCharacterLibraryManager._batchNames[batchType], region = placement ? placement.region : null;
        const holds = (list, value) => list.length === 0 || list.includes(value);
        for (const rule of data.rules)
        {
            if (holds(rule.categories, category) && holds(rule.batches, batch) && holds(rule.regions, region)) Object.assign(parameters, CjsCharacterLibraryManager.copy(rule.parameters));
        }
        return { region, textures, parameters };
    }

    /**
     * The paper doll category rules in force, by category path below the sex's paper doll root (`_Categories`): the
     * shipped defaults (`factory/defaults/generic.js`, which says what each value means) with the installed
     * library's generic categories over them. An empty rule is no rule.
     *
     * Ours, as `FetchOptions`.
     * @returns {Map<string, CjsCharacterCategoryRule>} The rules, the caller's own copy.
     */
    GetCategoryRules()
    {
        return CjsCharacterLibraryManager.copy(this._Categories());
    }

    /**
     * The paper doll category rules in force, by category path: the shipped defaults (`factory/defaults/generic.js`,
     * in the generic's own shape, built into `CjsCharacterDataCategory` objects by the graph), each replaced by the
     * installed library's generic category of the same name. Built once per install. A category that lists no
     * `defaultColors` has none; one that lists no `requiresModel` or `skipPatternedPalettes` has them off (the record's
     * defaults).
     * @returns {Map<string, CjsCharacterCategoryRule>} The rules; not to be changed.
     */
    _Categories()
    {
        if (this._categories === null || this._categoriesGeneration !== this._installGeneration)
        {
            const shipped = this._ShippedGeneric();
            const rules = new Map();
            for (const category of [ ...shipped.categories, ...this._library.generic.categories ])
            {
                rules.set(category.name, {
                    options: category.options, maps: category.maps, palettes: category.palettes, areas: category.areas,
                    defaultColors: category.defaultColors.map(color => Array.from(color)),
                    requiresModel: category.requiresModel, skipPatternedPalettes: category.skipPatternedPalettes
                });
            }
            this._categories = rules;
            this._categoriesGeneration = this._installGeneration;
        }
        return this._categories;
    }

    /**
     * A category's rules in force (`_Categories`), with the one a query needs.
     * @param {string} category The category path below the root.
     * @param {"options"|"maps"|"palettes"|"areas"} kind The rule the query needs.
     * @returns {{ options: string, maps: string, palettes: string, areas: string }} The rules; not to be changed.
     * @throws {Error} For a category the library does not list, or one with no rule of that kind.
     */
    _CategoryRule(category, kind)
    {
        const rule = this._Categories().get(category);
        if (!rule) throw new Error("No paper doll category " + category);
        if (rule[kind] === "") throw new Error("No " + kind + " rule for the paper doll category " + category);
        return rule;
    }

    /**
     * The paper doll texture tables in force (`CjsCharacterTextureRoles` reads every map name by them): the installed
     * library's generic texture members when it holds texture roles, else the shipped `factory/defaults/generic.js`,
     * whole (`_TextureRoles`).
     *
     * Ours (no Carbon counterpart): the client's paper doll is Python.
     * @returns {import("./CjsCharacterTextureRoles.js").CjsCharacterTextureRoleSet} A copy the caller may change.
     * @throws {Error} For an installed set that is not complete (`_TextureRoles`).
     */
    GetTextureRoles()
    {
        return CjsCharacterLibraryManager.copy(this._TextureRoles());
    }

    /**
     * The texture tables in force, built once per install as `_Sexes` is: the installed library's generic texture
     * members (`textureRoles`, `textureRegions`, `textureAtlas`, `textureAtlasTolerance`, `textureGarmentMaps`) when it
     * holds texture roles, else the shipped defaults (in the generic's own shape, built by the graph); one set, never
     * mixed. An installed set must be complete: roles, regions, an atlas, garment names and a tolerance above 0.
     * @returns {import("./CjsCharacterTextureRoles.js").CjsCharacterTextureRoleSet} The tables; not to be changed.
     * @throws {Error} For an installed set that holds roles but lacks one of the other members.
     */
    _TextureRoles()
    {
        if (this._textureRoles === null || this._textureRolesGeneration !== this._installGeneration)
        {
            const installed = this._library.generic;
            const generic = installed.textureRoles.length ? installed
                : this._ShippedGeneric();
            if (!generic.textureRegions.length || !generic.textureAtlas.length || !generic.textureGarmentMaps.length || !(generic.textureAtlasTolerance > 0))
                throw new Error("An installed library's texture roles need their regions, atlas, atlas tolerance and garment names too");

            this._textureRoles = {
                regions: generic.textureRegions.map(entry => entry.str),
                atlas: Object.fromEntries(generic.textureAtlas.map(entry => [ entry.name, Array.from(entry.value) ])),
                atlasTolerance: generic.textureAtlasTolerance,
                table: Object.fromEntries(generic.textureRoles.map(role => [ role.name, {
                    families: role.families.map(entry => entry.str), property: role.property,
                    channels: Object.fromEntries(role.channels.map(entry => [ entry.name, entry.value ])),
                    operation: role.operation, inputOf: role.inputOf, plan: role.plan, covered: role.covered,
                    source: role.source, derived: role.derived
                } ])),
                garment: {}
            };
            // One garment name per entry, in order, grouped by the map it gives.
            for (const entry of generic.textureGarmentMaps) (this._textureRoles.garment[entry.name] ??= []).push(entry.value);
            this._textureRolesGeneration = this._installGeneration;
        }
        return this._textureRoles;
    }

    /**
     * The bloodline name rules in force, built once per install as `_Sexes` is: the shipped defaults
     * (`factory/defaults/generic.js`, in the generic's own shape, built by the graph), each value the installed
     * library's generic sets (`CjsCharacterGeneric.bloodlineRule`, `bloodlineMorphTargetRule`, not empty) replacing
     * its default.
     * @returns {CjsCharacterBloodlineRules} The rule names; not to be changed.
     */
    _Bloodlines()
    {
        if (this._bloodlines === null || this._bloodlinesGeneration !== this._installGeneration)
        {
            const shipped = this._ShippedGeneric();
            const installed = this._library.generic;
            this._bloodlines = {
                bloodlineRule: installed.bloodlineRule || shipped.bloodlineRule,
                bloodlineMorphTargetRule: installed.bloodlineMorphTargetRule || shipped.bloodlineMorphTargetRule
            };
            this._bloodlinesGeneration = this._installGeneration;
        }
        return this._bloodlines;
    }

    /**
     * The sex facts in force, by sex, built once per install as `_Categories` is: the shipped defaults
     * (`factory/defaults/generic.js`, in the generic's own shape, built into `CjsCharacterDataSex` objects by the
     * graph), each replaced whole by the installed library's generic sex of the same name. The installed library is
     * not changed.
     * @returns {Map<string, CjsCharacterDataSex>} The facts; not to be changed.
     */
    _Sexes()
    {
        if (this._sexes === null || this._sexesGeneration !== this._installGeneration)
        {
            const shipped = this._ShippedGeneric();
            const sexes = new Map(shipped.sexes.map(entry => [ entry.name, entry ]));
            for (const entry of this._library.generic.sexes) sexes.set(entry.name, entry);
            this._sexes = sexes;
            this._sexesGeneration = this._installGeneration;
        }
        return this._sexes;
    }

    /**
     * The indexed paper doll files below a folder, sorted, with a stored `.black` listed as `.black` (the remote file
     * system lists it as `.red`, `BlueResFileSystemRemote.cpp:23-36`). The one listing every query is built on.
     * @param {string} folder The folder's `res:` path, with its trailing slash.
     * @returns {string[]} The files.
     */
    _PaperDollFiles(folder)
    {
        this._StartLazySource();
        if (this._paperDollFiles === null || this._paperDollFiles.generation !== this._installGeneration)
        {
            const names = new Set();
            for (const kind of Object.keys(CjsCharacterLibraryConfiguration.kinds))
            {
                const paths = this._sourceBuilder ? this._sourceBuilder.ListSourceNames(kind) : this._library.ListKindNames(kind);
                for (const path of paths) if (path.includes("/paperdoll/")) names.add(path.replace(/\.red$/u, ".black"));
            }
            this._paperDollFiles = { generation: this._installGeneration, files: [ ...names ].sort() };
        }
        return this._paperDollFiles.files.filter(path => path.startsWith(folder));
    }

    /**
     * One cached query: concurrent requests share it, a failed one is forgotten.
     * @param {string} key The query and its arguments.
     * @param {function(): Promise<*>} make The query.
     * @returns {Promise<*>} The cached answer.
     */
    _Query(key, make)
    {
        if (!this._queries.has(key))
        {
            const operation = make();
            this._queries.set(key, operation);
            operation.catch(() => { if (this._queries.get(key) === operation) this._queries.delete(key); });
        }
        return this._queries.get(key).then(CjsCharacterLibraryManager.copy);
    }

    /**
     * The shipped generic (`factory/defaults/generic.js`, in the generic's own values shape), built with the graph once,
     * so a member the generic does not declare fails the build. Every lookup in force lays the installed generic over it.
     * @returns {CjsCharacterGeneric} The shipped generic; not to be changed.
     */
    _ShippedGeneric()
    {
        if (this._shippedGeneric === null) this._shippedGeneric = CjsGraph.from(CjsCharacterGeneric, genericDefaults);
        return this._shippedGeneric;
    }

    /**
     * A caller's own copy of a library answer: a record rebuilt field by field over its declared fields (its `_pdpID`
     * and `_pdpType` among them), a typed array, array, Map or plain object copied item by item, any other value as it
     * is. Records are not copied through their values: those do not rebuild the records a Map holds
     * (`CjsCharacterPart.colorVariations`). Every answer is one, so changing it never changes the library: that is an explicit library call.
     * Measured at about 15 µs per call over a character's queries (build 3670638).
     * @param {*} value The answer.
     * @returns {*} The copy.
     */
    static copy(value)
    {
        if (value === null || typeof value !== "object") return value;
        if (ArrayBuffer.isView(value)) return value.slice();
        if (Array.isArray(value)) return value.map(CjsCharacterLibraryManager.copy);
        if (value instanceof Map) return new Map(Array.from(value, ([ key, item ]) => [ key, CjsCharacterLibraryManager.copy(item) ]));
        if (CjsSchema.getClassName(value.constructor) !== null)
        {
            const result = new value.constructor();
            for (const field of CjsSchema.getSchema(value.constructor).fields) result[field.name] = CjsCharacterLibraryManager.copy(value[field.name]);
            return result;
        }
        return Object.fromEntries(Object.entries(value).map(([ key, item ]) => [ key, CjsCharacterLibraryManager.copy(item) ]));
    }

    /**
     * Returns one avatarPartMetaData record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetAvatarPartMetaData(name)
    {
        return this.GetKindRecord("avatarPartMetaData", name);
    }

    /**
     * One part folder's `metadata.yaml`, as its typed record, from the one library every character shares.
     * A field the file does not state holds its class default (`numColorAreas` -1).
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): the metadata read Graphene's
     * composers made for themselves (graphene `resourceListing.js`, `ReadMetadata`), moved onto the
     * library. It starts the shared library's lazy source, as every Fetch does.
     *
     * @param {string} path The `metadata.yaml`'s canonical `res:` path.
     * @returns {Promise<import("../model/catalog/CjsAvatarPartMetaData.js").CjsAvatarPartMetaData>} The record; a
     *   path that is not indexed rejects.
     */
    async FetchAvatarPartMetaData(path)
    {
        this._StartLazySource();
        return this.GetAvatarPartMetaData(path);
    }

    /** @returns {Promise<Array<string>>} Exact avatarPartMetaData names after source identification. */
    ListAvatarPartMetaDataNames()
    {
        return this.ListKindNames("avatarPartMetaData");
    }

    /**
     * Returns one colorVariations record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetColorVariation(name)
    {
        return this.GetKindRecord("colorVariations", name);
    }

    /** @returns {Promise<Array<string>>} Exact colorVariations names after source identification. */
    ListColorVariationNames()
    {
        return this.ListKindNames("colorVariations");
    }

    /**
     * A `.color` palette's colours, as a colourise layer takes them: three RGBA colours of four finite
     * numbers each, as every shipped character palette has (all 2555 in build 3650286; 2326 also carry
     * specular colours, all of the same shape).
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): the game's paper doll is Python
     * client code, not Carbon. This is the palette read Graphene's composers made for themselves
     * (graphene `palettes.js`, `readPaletteFile`), moved onto the one library so every character shares
     * one loaded record. The decode runs on each call, so an edited record answers its new colours.
     *
     * @param {string} path The palette's canonical `res:` path.
     * @param {object} [options] What the caller can compose.
     * @param {"allow"|"skip"|"reject"} [options.pattern="allow"] A patterned palette, drawn with CCP's
     *   patternblit: read its colours anyway, answer null, or throw.
     * @param {boolean} [options.neutralSpecular=false] Throw unless every specular colour is neutral, for a
     *   layer that cannot compose a specular tint.
     * @param {boolean} [options.specular=false] Also read the three specular colours, which the palette must
     *   then have.
     * @returns {Promise<?{ colors: Float32Array[], specularColors: ?Float32Array[], pattern: ?object }>} The
     *   colours, and the pattern of a patterned palette that is allowed; null for a skipped pattern.
     * @throws {Error} For a palette the options refuse.
     */
    async FetchPalette(path, { pattern = "allow", neutralSpecular = false, specular = false } = {})
    {
        this._StartLazySource();
        const value = await this.GetColorVariation(path);
        if (value.pattern && pattern === "skip") return null;
        if (value.pattern && pattern === "reject") throw new Error("Palette needs pattern composition: " + path);
        const specularColors = [ value.specularColor1, value.specularColor2, value.specularColor3 ];
        if (neutralSpecular && specularColors.some(color => color.some((channel, i) => channel !== CjsCharacterColorVariation.neutralSpecular[i])))
            throw new Error("Palette needs specular tint composition: " + path);
        // Copies: the record's own colours are never handed out.
        return {
            colors: [ Float32Array.from(value.color1), Float32Array.from(value.color2), Float32Array.from(value.color3) ],
            specularColors: specular ? specularColors.map(color => Float32Array.from(color)) : null,
            pattern: value.pattern ? CjsCharacterColorVariation.patternOf(value) : null
        };
    }

    /**
     * The colour areas (1 to 3) a detail map paints through its zone map: the material-mask decode
     * (`CjsCharacterTexture.usedColourAreas`) over both ready textures, read from blue.resMan by path and
     * released after the decode. Each pair is decoded once for every character; a failed decode is retried.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): Graphene's composers decoded each pair
     * themselves (`textureComposer.colorAreas`); the material mask is part data the library resolves.
     *
     * @param {string} detailPath The detail map's `res:` path, as the composer loads it.
     * @param {string} zonePath The zone map's `res:` path.
     * @returns {Promise<number[]>} The used areas, ascending; a new list per call.
     */
    async FetchMaterialMaskAreas(detailPath, zonePath)
    {
        this._StartLazySource();
        return (await this._MaterialMaskAreas(detailPath + "|" + zonePath, async () =>
        {
            const [ detail, zones ] = await Promise.all([ LoadTexture(detailPath), LoadTexture(zonePath) ]);
            return CjsCharacterTexture.usedColourAreas(detail, zones, CjsCharacterTexture.encodingOf(detail), CjsCharacterTexture.encodingOf(zones));
        })).slice();
    }

    /**
     * The colour areas (1 to 3) a zone map alone selects (`CjsCharacterTexture.areasOfZone`), for layers that
     * paint every pixel of their zone (head tattoos, lipstick, eye makeup). Decoded once per zone, as
     * `FetchMaterialMaskAreas`.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): Graphene's `zoneAreas.js`
     * (`AreasOfZone`), moved onto the library.
     *
     * @param {string} zonePath The zone map's `res:` path.
     * @returns {Promise<number[]>} The selected areas, ascending; a new list per call.
     * @throws {Error} When the zone selects no area.
     */
    async FetchMaterialMaskAreas__Zone(zonePath)
    {
        this._StartLazySource();
        return (await this._MaterialMaskAreas(zonePath, async () => CjsCharacterTexture.areasOfZone(await LoadTexture(zonePath), zonePath))).slice();
    }

    /**
     * One cached material-mask decode: concurrent requests share it, a failed one is forgotten.
     * @param {string} key The paths it was decoded from.
     * @param {function(): Promise<number[]>} decode The decode.
     * @returns {Promise<number[]>} The cached areas.
     */
    _MaterialMaskAreas(key, decode)
    {
        if (!this._materialMaskAreas.has(key))
        {
            const operation = decode();
            this._materialMaskAreas.set(key, operation);
            operation.catch(() => { if (this._materialMaskAreas.get(key) === operation) this._materialMaskAreas.delete(key); });
        }
        return this._materialMaskAreas.get(key);
    }

    /**
     * Returns one baseColors record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetBaseColor(name)
    {
        return this.GetKindRecord("baseColors", name);
    }

    /** @returns {Promise<Array<string>>} Exact baseColors names after source identification. */
    ListBaseColorNames()
    {
        return this.ListKindNames("baseColors");
    }

    /**
     * A part's `.type` file, as its typed record, from the one library every character shares.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): the read Graphene's composers made
     * for themselves (graphene `readYaml` on `.type` files), moved onto the library. It starts the shared library's lazy source, as
     * every Fetch does.
     *
     * @param {string} path The file's canonical `res:` path.
     * @returns {Promise<object>} The record, whose `value` is the file's tuple (part path, variation, colour variant; every shipped type has these three, build 3670638); a path that is not indexed rejects.
     */
    async FetchType(path)
    {
        this._StartLazySource();
        return this.GetType(path);
    }

    /**
     * Returns one types record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetType(name)
    {
        return this.GetKindRecord("types", name);
    }

    /** @returns {Promise<Array<string>>} Exact types names after source identification. */
    ListTypeNames()
    {
        return this.ListKindNames("types");
    }

    /**
     * A `.proj` projected decal (a tattoo's projection), as its typed record, from the one library every character shares.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): the read Graphene's composers made
     * for themselves (graphene `tattoos.js`, `readYaml` on the profile's projection), moved onto the library. It starts the shared library's lazy source, as
     * every Fetch does.
     *
     * @param {string} path The file's canonical `res:` path.
     * @returns {Promise<object>} The `CjsProjectedDecal` record; a path that is not indexed rejects.
     */
    async FetchProjectedDecal(path)
    {
        this._StartLazySource();
        return this.GetProjectedDecal(path);
    }

    /**
     * Returns one projectedDecals record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetProjectedDecal(name)
    {
        return this.GetKindRecord("projectedDecals", name);
    }

    /** @returns {Promise<Array<string>>} Exact projectedDecals names after source identification. */
    ListProjectedDecalNames()
    {
        return this.ListKindNames("projectedDecals");
    }

    /**
     * Returns one cameras record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetCamera(name)
    {
        return this.GetKindRecord("cameras", name);
    }

    /** @returns {Promise<Array<string>>} Exact cameras names after source identification. */
    ListCameraNames()
    {
        return this.ListKindNames("cameras");
    }

    /**
     * Returns one cameraSequences record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetCameraSequence(name)
    {
        return this.GetKindRecord("cameraSequences", name);
    }

    /** @returns {Promise<Array<string>>} Exact cameraSequences names after source identification. */
    ListCameraSequenceNames()
    {
        return this.ListKindNames("cameraSequences");
    }

    /**
     * Returns one positions record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetPosition(name)
    {
        return this.GetKindRecord("positions", name);
    }

    /** @returns {Promise<Array<string>>} Exact positions names after source identification. */
    ListPositionNames()
    {
        return this.ListKindNames("positions");
    }

    /**
     * Returns one poses record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetPose(name)
    {
        return this.GetKindRecord("poses", name);
    }

    /** @returns {Promise<Array<string>>} Exact poses names after source identification. */
    ListPoseNames()
    {
        return this.ListKindNames("poses");
    }

    /**
     * Returns one light rig by its canonical identity: a copy, whose `lights` a user adds to a scene of their own.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<import("../model/source/CjsCharacterLightRig.js").CjsCharacterLightRig>} The rig.
     */
    GetLight(name)
    {
        return this.GetKindRecord("lights", name);
    }

    /** @returns {Promise<Array<string>>} Exact lights names after source identification. */
    ListLightNames()
    {
        return this.ListKindNames("lights");
    }

    /**
     * Returns one backgrounds record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetBackground(name)
    {
        return this.GetKindRecord("backgrounds", name);
    }

    /** @returns {Promise<Array<string>>} Exact backgrounds names after source identification. */
    ListBackgroundNames()
    {
        return this.ListKindNames("backgrounds");
    }

    /**
     * Returns one post by its canonical identity, in either layout: the library files a scalar-layout post under
     * `scalarPosts`, its layout, and both are `CjsCharacterPost` records.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<import("../model/source/CjsCharacterPost.js").CjsCharacterPost>} The caller's own copy of the post.
     * @throws {Error} For a name that is no post.
     */
    async GetPost(name)
    {
        const found = () => this._library.GetKindRecord("posts", name) || this._library.GetKindRecord("scalarPosts", name);
        if (!found() && this._sourceBuilder && this._sourceBuilder.ListSourceNames("posts").includes(name))
        {
            const generation = this._installGeneration;
            await this._sourceBuilder.LoadRecord("posts", name);
            if (generation !== this._installGeneration) throw new Error("Character library was replaced during a kind load.");
        }
        const record = found();
        if (!record) throw new Error(`Unresolved character posts reference: ${name}`);
        return CjsCharacterLibraryManager.copy(record);
    }

    /** @returns {Promise<Array<string>>} Every post's name, in either layout, after source identification. */
    async ListPostNames()
    {
        return [ ...await this.ListKindNames("posts"), ...await this.ListKindNames("scalarPosts") ].sort();
    }

    /**
     * Returns one characters record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetCharacter(name)
    {
        return this.GetKindRecord("characters", name);
    }

    /** @returns {Promise<Array<string>>} Exact characters names after source identification. */
    ListCharacterNames()
    {
        return this.ListKindNames("characters");
    }

    /**
     * Returns one scenes record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetScene(name)
    {
        return this.GetKindRecord("scenes", name);
    }

    /** @returns {Promise<Array<string>>} Exact scenes names after source identification. */
    ListSceneNames()
    {
        return this.ListKindNames("scenes");
    }

    /**
     * Returns one curveSetMetadata record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetCurveSetMetadata(name)
    {
        return this.GetKindRecord("curveSetMetadata", name);
    }

    /** @returns {Promise<Array<string>>} Exact curveSetMetadata names after source identification. */
    ListCurveSetMetadataNames()
    {
        return this.ListKindNames("curveSetMetadata");
    }

    /**
     * Returns one curveCacheLists record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetCurveCacheList(name)
    {
        return this.GetKindRecord("curveCacheLists", name);
    }

    /** @returns {Promise<Array<string>>} Exact curveCacheLists names after source identification. */
    ListCurveCacheListNames()
    {
        return this.ListKindNames("curveCacheLists");
    }

    /**
     * Returns one materialSets record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetMaterialSet(name)
    {
        return this.GetKindRecord("materialSets", name);
    }

    /** @returns {Promise<Array<string>>} Exact materialSets names after source identification. */
    ListMaterialSetNames()
    {
        return this.ListKindNames("materialSets");
    }

    /**
     * Returns one animationInfo record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetAnimationInfo(name)
    {
        return this.GetKindRecord("animationInfo", name);
    }

    /** @returns {Promise<Array<string>>} Exact animationInfo names after source identification. */
    ListAnimationInfoNames()
    {
        return this.ListKindNames("animationInfo");
    }

    /**
     * Returns one movementStates record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetMovementStates(name)
    {
        return this.GetKindRecord("movementStates", name);
    }

    /** @returns {Promise<Array<string>>} Exact movementStates names after source identification. */
    ListMovementStatesNames()
    {
        return this.ListKindNames("movementStates");
    }

    /**
     * Returns one animationData record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetAnimationData(name)
    {
        return this.GetKindRecord("animationData", name);
    }

    /** @returns {Promise<Array<string>>} Exact animationData names after source identification. */
    ListAnimationDataNames()
    {
        return this.ListKindNames("animationData");
    }

    /**
     * Returns one animationOffsets record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetAnimationOffsets(name)
    {
        return this.GetKindRecord("animationOffsets", name);
    }

    /** @returns {Promise<Array<string>>} Exact animationOffsets names after source identification. */
    ListAnimationOffsetsNames()
    {
        return this.ListKindNames("animationOffsets");
    }

    /**
     * Returns one bindPoses record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetBindPose(name)
    {
        return this.GetKindRecord("bindPoses", name);
    }

    /** @returns {Promise<Array<string>>} Exact bindPoses names after source identification. */
    ListBindPoseNames()
    {
        return this.ListKindNames("bindPoses");
    }

    /**
     * Returns one postBaseNames record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetPostBaseNames(name)
    {
        return this.GetKindRecord("postBaseNames", name);
    }

    /** @returns {Promise<Array<string>>} Exact postBaseNames names after source identification. */
    ListPostBaseNamesNames()
    {
        return this.ListKindNames("postBaseNames");
    }

    /**
     * Returns one blendShapes record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetBlendShapes(name)
    {
        return this.GetKindRecord("blendShapes", name);
    }

    /** @returns {Promise<Array<string>>} Exact blendShapes names after source identification. */
    ListBlendShapesNames()
    {
        return this.ListKindNames("blendShapes");
    }

    /**
     * Returns one faceMappings record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetFaceMapping(name)
    {
        return this.GetKindRecord("faceMappings", name);
    }

    /** @returns {Promise<Array<string>>} Exact faceMappings names after source identification. */
    ListFaceMappingNames()
    {
        return this.ListKindNames("faceMappings");
    }

    /**
     * Returns one faceTweakSettings record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetFaceTweakSettings(name)
    {
        return this.GetKindRecord("faceTweakSettings", name);
    }

    /** @returns {Promise<Array<string>>} Exact faceTweakSettings names after source identification. */
    ListFaceTweakSettingsNames()
    {
        return this.ListKindNames("faceTweakSettings");
    }

    /**
     * Returns one modifierNames record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetModifierNames(name)
    {
        return this.GetKindRecord("modifierNames", name);
    }

    /** @returns {Promise<Array<string>>} Exact modifierNames names after source identification. */
    ListModifierNamesNames()
    {
        return this.ListKindNames("modifierNames");
    }

    /**
     * Returns one sculptingLimits record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetSculptingLimits(name)
    {
        return this.GetKindRecord("sculptingLimits", name);
    }

    /** @returns {Promise<Array<string>>} Exact sculptingLimits names after source identification. */
    ListSculptingLimitsNames()
    {
        return this.ListKindNames("sculptingLimits");
    }

    /**
     * Returns one fieldSets record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetFieldSet(name)
    {
        return this.GetKindRecord("fieldSets", name);
    }

    /** @returns {Promise<Array<string>>} Exact fieldSets names after source identification. */
    ListFieldSetNames()
    {
        return this.ListKindNames("fieldSets");
    }

    /**
     * Returns one clips record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetClip(name)
    {
        return this.GetKindRecord("clips", name);
    }

    /** @returns {Promise<Array<string>>} Exact clips names after source identification. */
    ListClipNames()
    {
        return this.ListKindNames("clips");
    }

    /**
     * Returns one rigs record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetRig(name)
    {
        return this.GetKindRecord("rigs", name);
    }

    /** @returns {Promise<Array<string>>} Exact rigs names after source identification. */
    ListRigNames()
    {
        return this.ListKindNames("rigs");
    }

    /**
     * Returns one gstates record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetGState(name)
    {
        return this.GetKindRecord("gstates", name);
    }

    /** @returns {Promise<Array<string>>} Exact gstates names after source identification. */
    ListGStateNames()
    {
        return this.ListKindNames("gstates");
    }

    /**
     * Returns one textures record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetTexture(name)
    {
        return this.GetKindRecord("textures", name);
    }

    /** @returns {Promise<Array<string>>} Exact textures names after source identification. */
    ListTextureNames()
    {
        return this.ListKindNames("textures");
    }

    /**
     * Returns one blackResources record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetBlackResource(name)
    {
        return this.GetKindRecord("blackResources", name);
    }

    /** @returns {Promise<Array<string>>} Exact blackResources names after source identification. */
    ListBlackResourceNames()
    {
        return this.ListKindNames("blackResources");
    }

    /**
     * Returns one geometryResources record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetGeometryResource(name)
    {
        return this.GetKindRecord("geometryResources", name);
    }

    /** @returns {Promise<Array<string>>} Exact geometryResources names after source identification. */
    ListGeometryResourceNames()
    {
        return this.ListKindNames("geometryResources");
    }

    /**
     * Returns one staticResources record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetStaticResource(name)
    {
        return this.GetKindRecord("staticResources", name);
    }

    /** @returns {Promise<Array<string>>} Exact staticResources names after source identification. */
    ListStaticResourceNames()
    {
        return this.ListKindNames("staticResources");
    }

    _library = new CjsCharacterLibrary();

    _installGeneration = 0;

    /**
     * Creates a manager over a library: its values or a hydrated one, or a source builder's (`options.sourceBuilder`).
     * @param {?(object|CjsCharacterLibrary)} [library=null] The library.
     * @param {{ sourceBuilder?: CjsCharacterLibraryBuilder }} [options={}] Options.
     */
    constructor(library = null, options = {})
    {
        if (options === null || typeof options !== "object" || Array.isArray(options))
        {
            throw new TypeError("Character library manager options must be an object");
        }

        if (options.sourceBuilder)
        {
            this._sourceBuilder = options.sourceBuilder;
            library = this._sourceBuilder.GetLibrary();
        }
        if (library !== null && library !== undefined)
        {
            this.InstallLibrary(library);
        }
    }

    /**
     * Registers the character formats on Blue's resMan: every character text extension builds through
     * `CjsCharacterObjectBuilder` with this library's configuration, whose kind this library's source answers. Called by `CjsLibrary` when it
     * creates the library; the library's source itself still starts on first need.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*; current-work § *Character formats live
     * in the character library*): `CjsLibrary` lists no character formats.
     *
     * @param {object} services Blue (`blue`): its installed resMan receives the registrations.
     * @returns {CjsCharacterLibraryManager} This library.
     */
    Initialize(services)
    {
        CjsCharacterObjectBuilder.registerObjectBuilders(services.resMan, path =>
        {
            this._StartLazySource();
            return this._sourceBuilder ? this._sourceBuilder.GetSourceKind(path) : null;
        }, CjsCharacterLibraryConfiguration);
        return this;
    }

    /**
     * The shared library's lazy start: with nothing installed and no source builder, the first Fetch
     * indexes the character sources through Blue's installed paths and resMan, loading no record yet.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*).
     */
    _StartLazySource()
    {
        if (this._sourceBuilder || this._installGeneration !== 0) return;
        const builder = new CjsCharacterLibraryBuilder({ paths: blue.paths, resMan: blue.resMan });
        builder.Index();
        this._sourceBuilder = builder;
        this.InstallLibrary(builder.GetLibrary());
    }

    /**
     * Installs a library: a hydrated one, or its data (a prebuilt or cached library, `CjsCharacterLibrary.GetData`), read once.
     * @param {object|CjsCharacterLibrary} value The library.
     * @returns {CjsCharacterLibrary} The installed library.
     */
    InstallLibrary(value)
    {
        const installed = value instanceof CjsCharacterLibrary ? value : new CjsCharacterLibrary().SetData(value);
        this._installGeneration += 1;
        this._library = installed;
        this._partJoins.clear();
        this._materialMaskAreas.clear();
        this._queries.clear();
        if (this._sourceBuilder && this._sourceBuilder.GetLibrary() !== installed) this._sourceBuilder = null;
        return installed;
    }

    /** Returns the currently installed combined library. */
    GetLibrary()
    {
        return this._library;
    }

    /** The registered name: the manager is never hydrated, so it is not a schema class (class-ownership.md § *Class-shape rules*). */
    static className = "CjsCharacterLibraryManager";
}

/**
 * A ready texture resource from blue.resMan, as a composer loads it (the path's resource, waited on).
 * @param {string} path The texture's `res:` path.
 * @returns {Promise<object>} The ready resource, with its CPU bitmap.
 */
async function LoadTexture(path)
{
    const resource = blue.resMan.GetResource(path);
    await blue.resMan.Ready(resource);
    return resource;
}
