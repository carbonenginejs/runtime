import { CjsCharacterLibraryConfiguration } from "./CjsCharacterLibraryConfiguration.js";
import { CjsCharacterPart } from "./CjsCharacterPart.js";
import { CjsCharacterModifier } from "./CjsCharacterModifier.js";
import { CjsSchema } from "#schema";
import { blue } from "#blue";
import { CjsCharacterLibraryBuilder } from "../library-builder/CjsCharacterLibraryBuilder.js";

import { CjsCharacterLibrary } from "./CjsCharacterLibrary.js";
import { normalizeResourcePath } from "#utils/path";

/** The specular colour of a palette that tints nothing: mid grey, opaque. */
const NEUTRAL_SPECULAR = [ .5, .5, .5, 1 ];

/** The shipped pattern textures; a palette's `pattern` names one (`caldari_C` is `caldari_c_z.dds`). */
const PATTERN_ROOT = "res:/graphics/character/patterns/";

/** Installs, loads, and queries one combined hydrated character library. */
export class CjsCharacterLibraryManager
{

    _sourceBuilder = null;

    _partJoins = new Map();

    /**
     * Reads one flat kind through its lazy Blue loader when present.
     * @param {string} kind Configured kind.
     * @param {string} name Canonical source identity or explicitly stored user name.
     * @returns {Promise<object>} Typed record; missing targets reject explicitly.
     */
    async GetKindRecord(kind, name)
    {
        const generation = this._installGeneration;
        let record = this._library.GetKindRecord(kind, name);
        if (record) return record;
        if (this._sourceBuilder)
        {
            if (!this._sourceBuilder.ListSourceNames(kind).includes(name))
                throw new Error(`Unresolved character ${kind} reference: ${name}`);
            await this._sourceBuilder.LoadRecord(kind, name);
            if (generation !== this._installGeneration) throw new Error("Character library was replaced during a kind load.");
            record = this._library.GetKindRecord(kind, name);
        }
        if (!record) throw new Error(`Unresolved character ${kind} reference: ${name}`);
        return record;
    }

    /**
     * Lists exact names after any shared source family has been identified.
     * @param {string} kind Configured kind.
     * @returns {Promise<Array<string>>} Names of this shape, not candidate variants.
     */
    async ListKindNames(kind)
    {
        const generation = this._installGeneration;
        if (this._sourceBuilder) await this._sourceBuilder.LoadKind(kind);
        if (generation !== this._installGeneration) throw new Error("Character library was replaced during a kind listing.");
        return this._library.ListKindNames(kind).sort();
    }

    /**
     * Resolves an exact file reference without rewriting its authored field.
     * @param {string} path Canonical res path to a configured source or opaque resource.
     * @returns {Promise<object>} Target record; missing targets reject.
     */
    async ResolveReference(path)
    {
        if (this._sourceBuilder) return this._sourceBuilder.Resolve(path);
        for (const kind of Object.keys(CjsCharacterLibraryConfiguration.kinds))
        {
            const record = this._library.GetKindRecord(kind, path);
            if (record) return record;
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
        if (!record.value[2]) return null;
        const boundary = path.indexOf("/paperdoll/");
        if (boundary < 0) throw new Error(`Type has no paperdoll source context: ${path}`);
        const target = normalizeResourcePath(path.slice(0, boundary + 11) + record.value[0] + "/" + record.value[2] + ".color");
        return this.GetColorVariation(target);
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
     * Joins original data and opaque paths for one exact part; never selects material or texture variants.
     * A relative part name is accepted only if the indexed suffix is unique.
     * @param {string} partPath Canonical part folder or unique paperdoll-relative path.
     * @returns {Promise<CjsCharacterPart>} Cached join with raw source records unchanged.
     */
    async GetPart(partPath)
    {
        const requested = normalizeResourcePath(partPath).replace(/\/$/u, "");
        const names = this.ListPartNames();
        const matches = names.filter(name => name === requested || (!requested.includes(":") && name.endsWith("/paperdoll/" + requested)));
        if (matches.length !== 1) throw new Error(`${matches.length ? "Ambiguous" : "Unresolved"} character part: ${partPath}`);
        const name = matches[0];
        const stored = this._library.GetKindRecord("parts", name);
        if (stored) return stored;
        if (!this._partJoins.has(name))
        {
            const operation = this.JoinPart(name);
            this._partJoins.set(name, operation);
            const clear = () => { if (this._partJoins.get(name) === operation) this._partJoins.delete(name); };
            operation.then(clear, clear);
        }
        return this._partJoins.get(name);
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
        const metadataNames = this._sourceBuilder ? this._sourceBuilder.ListSourceNames("avatarPartMetaData") : this._library.ListKindNames("avatarPartMetaData");
        if (metadataNames.includes(name + "/metadata.yaml"))
        {
            part.metadata = await this.GetAvatarPartMetaData(name + "/metadata.yaml");
            part.dependantModifiers = part.metadata.dependantModifiers.map(value => CjsCharacterLibraryManager.parseModifier(value));
            part.occludesModifiers = part.metadata.occludesModifiers.map(value => CjsCharacterLibraryManager.parseModifier(value));
        }
        for (const kind of ["types", "colorVariations", "projectedDecals", "blackResources", "textures"])
        {
            const paths = this._sourceBuilder ? this._sourceBuilder.ListSourceNames(kind) : this._library.ListKindNames(kind);
            for (const path of paths.filter(value => value.startsWith(name + "/")))
            {
                if (kind === "blackResources") part.blackPaths.push(path);
                else if (kind === "textures") part.texturePaths.push(path);
                else
                {
                    const local = path.slice(name.length + 1).replace(/^types\//u, "").replace(/\.[^/.]+$/u, "");
                    if (part[kind].has(local)) throw new Error(`Duplicate ${kind} name in ${name}: ${local}`);
                    part[kind].set(local, await this.GetKindRecord(kind, path));
                }
            }
        }
        if (generation !== this._installGeneration) throw new Error("Character library was replaced during a part join.");
        return this._library.AddKind("parts", name, part);
    }

    /**
     * Splits the observed ###number suffix without normalizing the raw modifier path.
     * @param {string} value Authored dependency or occlusion string.
     * @returns {CjsCharacterModifier} Parsed path and finite weight; invalid suffixes reject.
     */
    static parseModifier(value)
    {
        if (typeof value !== "string" || !value) throw new TypeError("Character modifier must be a nonempty string.");
        const match = value.match(/^(.+?)###([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)$/u);
        if (!match && value.includes("#")) throw new TypeError(`Unsupported character modifier suffix: ${value}`);
        const modifier = new CjsCharacterModifier();
        modifier.path = match ? match[1] : value;
        modifier.weight = match ? Number(match[2]) : 1;
        if (!Number.isFinite(modifier.weight)) throw new TypeError(`Invalid modifier weight: ${value}`);
        return modifier;
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
     * @throws {Error} For a malformed palette, or one the options refuse.
     */
    async FetchPalette(path, { pattern = "allow", neutralSpecular = false, specular = false } = {})
    {
        this._StartLazySource();
        const value = await this.GetColorVariation(path);
        if (value.pattern && pattern === "skip") return null;
        if (value.pattern && pattern === "reject") throw new Error("Palette needs pattern composition: " + path);
        if (neutralSpecular && value.specularColors.some(color => color.some((channel, i) => channel !== NEUTRAL_SPECULAR[i])))
            throw new Error("Palette needs specular tint composition: " + path);
        return {
            colors: ColorTriple(value.colors, path),
            specularColors: specular ? ColorTriple(value.specularColors, path) : null,
            pattern: value.pattern ? PatternOf(value, path) : null
        };
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
     * Returns one recipes record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetRecipe(name)
    {
        return this.GetKindRecord("recipes", name);
    }

    /** @returns {Promise<Array<string>>} Exact recipes names after source identification. */
    ListRecipeNames()
    {
        return this.ListKindNames("recipes");
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
     * Returns one lights record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
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
     * Returns one posts record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetPost(name)
    {
        return this.GetKindRecord("posts", name);
    }

    /** @returns {Promise<Array<string>>} Exact posts names after source identification. */
    ListPostNames()
    {
        return this.ListKindNames("posts");
    }

    /**
     * Returns one scalarPosts record by its canonical identity.
     * @param {string} name Stored or indexed source name.
     * @returns {Promise<object>} Typed record.
     */
    GetScalarPost(name)
    {
        return this.GetKindRecord("scalarPosts", name);
    }

    /** @returns {Promise<Array<string>>} Exact scalarPosts names after source identification. */
    ListScalarPostNames()
    {
        return this.ListKindNames("scalarPosts");
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

    _resourceLoader = null;

    _resourceManager = null;

    _loadOperations = new Map();

    _installGeneration = 0;

    /** Creates a manager from an optional combined library and structural loader. */
    constructor(library = null, options = {})
    {
        if (options === null || typeof options !== "object" || Array.isArray(options))
        {
            throw new TypeError("Character library manager options must be an object");
        }

        if (Object.hasOwn(options, "resourceLoader"))
        {
            this.SetResourceLoader(options.resourceLoader);
        }
        if (Object.hasOwn(options, "resourceManager"))
        {
            this.SetResourceManager(options.resourceManager);
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

    /** Supplies the object loader used to obtain a combined library resource. */
    SetResourceLoader(loader)
    {
        if (loader !== null && typeof loader !== "function")
        {
            throw new TypeError("Character library resource loader must be a function or null");
        }

        this._resourceLoader = loader;
        return this;
    }

    /** Supplies the runtime resource manager used for incremental resource-data inspection. */
    SetResourceManager(resMan = null)
    {
        this._resourceManager = resMan;
        this._library.SetResourceManager(resMan);
        return this;
    }

    /**
     * The shared library's lazy start: with nothing installed and no source builder, the first Fetch
     * indexes the character sources through Blue's installed paths and resMan, loading no record yet.
     *
     * Ours (non-carbon-extensions.md § *The shared character library*): stands in for
     * `Initialize(blue, options)`, which comes with the runtime root.
     */
    _StartLazySource()
    {
        if (this._sourceBuilder || this._installGeneration !== 0) return;
        const builder = new CjsCharacterLibraryBuilder({ paths: blue.paths, resMan: blue.resMan });
        builder.Index();
        this._sourceBuilder = builder;
        this.InstallLibrary(builder.GetLibrary());
    }

    /** Installs a hydrated library directly, or hydrates the same-shaped JSON values once. */
    InstallLibrary(value)
    {
        const installed = PrepareLibrary(value);
        this._installGeneration += 1;
        installed.SetResourceManager(this._resourceManager);
        this._library = installed;
        this._partJoins.clear();
        if (this._sourceBuilder && this._sourceBuilder.GetLibrary() !== installed) this._sourceBuilder = null;
        return installed;
    }

    /** Returns the currently installed combined library. */
    GetLibrary()
    {
        return this._library;
    }

    /** Loads and installs a combined library through the configured synchronous loader. */
    LoadLibrary(filePath)
    {
        if (!this._resourceLoader)
        {
            return false;
        }

        const path = NormalizeLibraryPath(filePath);
        const value = this._resourceLoader(path);

        if (value && typeof value.then === "function")
        {
            throw new TypeError("CjsCharacterLibraryManager.LoadLibrary requires a synchronous loader");
        }

        if (!value)
        {
            return false;
        }

        this.InstallLibrary(value);
        return true;
    }

    /** Loads and installs one combined library while deduplicating equivalent in-flight paths. */
    async LoadLibraryAsync(filePath)
    {
        const loader = this._resourceLoader;

        if (!loader)
        {
            return false;
        }

        const path = NormalizeLibraryPath(filePath);
        const existing = this._loadOperations.get(path);

        if (existing)
        {
            return existing;
        }

        const generation = ++this._installGeneration;
        const operation = Promise.resolve()
            .then(() => loader(path))
            .then(value =>
            {
                if (!value)
                {
                    return false;
                }

                const installed = PrepareLibrary(value);

                if (this._installGeneration !== generation)
                {
                    return false;
                }

                installed.SetResourceManager(this._resourceManager);
                this._library = installed;
                this._partJoins.clear();
                if (this._sourceBuilder && this._sourceBuilder.GetLibrary() !== installed) this._sourceBuilder = null;
                return true;
            });
        this._loadOperations.set(path, operation);

        const clear = () =>
        {
            if (this._loadOperations.get(path) === operation)
            {
                this._loadOperations.delete(path);
            }
        };

        operation.then(clear, clear);
        return operation;
    }

    /** Hydrates and adds one item to the installed editor library. */
    Create(documentName, values = {}, options = {})
    {
        return this._library.Create(documentName, values, options);
    }

    /** Adds one already-hydrated item to the installed editor library. */
    Add(documentName, record, options = {})
    {
        return this._library.Add(documentName, record, options);
    }

    /** Detaches one item from the installed editor library. */
    Remove(documentName, record, options = {})
    {
        return this._library.Remove(documentName, record, options);
    }

    /** Deletes one item from the installed editor library. */
    Delete(documentName, record, options = {})
    {
        return this._library.Delete(documentName, record, options);
    }

    /** Clears one document in the installed editor library. */
    Clear(documentName, options = {})
    {
        return this._library.Clear(documentName, options);
    }

    /** Returns one installed library document collection. */
    GetDocument(name)
    {
        return this._library.GetDocument(name);
    }

    /** Returns one installed record by document name and named record identity. */
    Get(documentName, recordID)
    {
        return this._library.Get(documentName, recordID);
    }

    /** Returns the installed library's unresolved relationship for one member, or null. */
    GetUnresolvedRelationship(documentName, recordID, field)
    {
        return this._library.GetUnresolvedRelationship(documentName, recordID, field);
    }

    /** Lists the installed combined-library document collections. */
    ListDocuments()
    {
        return this._library.ListDocuments();
    }

    /** Returns whether the installed library contains one named record. */
    Has(documentName, recordID)
    {
        return this._library.Has(documentName, recordID);
    }

    /** Rebuilds one or every installed private record index after editor mutation. */
    Reindex(documentName = null)
    {
        this._library.Reindex(documentName);
        return this;
    }

    /** Returns or discovers extension-neutral character data for one resource path. */
    InspectResourceForData(resourcePath, options = {})
    {
        return this._library.InspectResourceForData(resourcePath, options);
    }

}

function NormalizeLibraryPath(value)
{
    if (typeof value !== "string" || !value.trim())
    {
        throw new TypeError("Character library path must be a non-empty string");
    }

    const path = normalizeResourcePath(value);

    if (!path)
    {
        throw new TypeError("Character library path must be a non-empty string");
    }

    return path;
}

function PrepareLibrary(value)
{
    if (value === null || typeof value !== "object" || Array.isArray(value))
    {
        throw new TypeError("Character library must be an object");
    }

    if (value.schema !== "carbonenginejs.characterLibrary"
        || ![ 7, 8, 9, 10, 11, 12, 13 ].includes(value.schemaVersion))
    {
        throw new TypeError(
            "Character library must use carbonenginejs.characterLibrary schema version 7, 8, 9, 10, 11, 12, or 13"
        );
    }

    const installed = value instanceof CjsCharacterLibrary
        ? value
        : CjsCharacterLibrary.from(CjsCharacterLibrary.validateValues(value));

    installed.Reindex();
    return installed;
}

/**
 * A patterned palette's pattern, as patternblit takes it. `patternColors` holds patternblit's five colours, then
 * the placement and the rotation: the three pattern colours (the pattern texture's R, G and B select them), then
 * colour areas 2 and 3; the palette's own `colors` are what the item shows without its pattern. That reading is
 * ours, from the data: the third colour is set wherever the pattern uses its B channel (31 of 31 shipped
 * palettes), and the last two match the names (`stealth` dark, `white` white, `blueorange` blue and orange)
 * where `colors` do not (`stealth` area 2 is red).
 * @param {{ pattern: string, patternColors: any[] }} value The palette.
 * @param {string} path The palette, for errors.
 * @returns {{ map: string, colors: Float32Array[], areas: Float32Array[], transform: Float32Array, rotation: number }}
 *   The pattern texture, its three colours, the colours of areas 2 and 3, its placement (offset x, y; repeat x, y)
 *   and its rotation in degrees.
 * @throws {Error} Unless the pattern colours, placement and rotation are well formed.
 */
function PatternOf(value, path)
{
    const list = value.patternColors;
    if (!Array.isArray(list) || list.length !== 7) throw new Error("Malformed pattern colours " + path);
    const transform = list[5];
    const rotation = list[6];
    if (!Array.isArray(transform) || transform.length !== 4 || !transform.every(Number.isFinite) || !Number.isFinite(rotation))
        throw new Error("Malformed pattern placement " + path);
    return {
        map: PATTERN_ROOT + String(value.pattern).toLowerCase() + "_z.dds",
        colors: ColorTriple(list.slice(0, 3), path),
        areas: ColorTriple([ list[3], list[4], [ 0, 0, 0, 1 ] ], path).slice(0, 2),
        transform: Float32Array.from(transform),
        rotation
    };
}

/**
 * Three RGBA colours as Float32Arrays.
 * @param {any} list The palette's colour list.
 * @param {string} path The palette, for the error.
 * @returns {Float32Array[]} The colours.
 * @throws {Error} Unless the list is three colours of four finite numbers.
 */
function ColorTriple(list, path)
{
    if (!Array.isArray(list) || list.length !== 3 || list.some(color => !Array.isArray(color) || color.length !== 4 || !color.every(Number.isFinite)))
        throw new Error("Malformed palette " + path);
    return list.map(color => Float32Array.from(color));
}

export default CjsCharacterLibraryManager;

CjsSchema.meta.define("CjsCharacterLibraryManager")(CjsCharacterLibraryManager);

// The one character library (Blue's characterLibrary slot), filled when the character module loads.
blue.characterLibrary = new CjsCharacterLibraryManager();
