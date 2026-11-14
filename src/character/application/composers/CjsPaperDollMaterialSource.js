import { blue } from "#blue";
import { CjsPaperDollCompositor } from "../compositor/CjsPaperDollCompositor.js";
import { CjsPaperDollDefinition } from "../CjsPaperDollDefinition.js";
import { CjsPaperDollInstance } from "../CjsPaperDollInstance.js";
import { PaperDollBlend, PaperDollTarget } from "../paperDollOrder.js";
import { CjsCharacterLibraryManager } from "../../library/CjsCharacterLibraryManager.js";

/**
 * The layer source of a garment (`static blend` MATERIAL with the body target: underwear, body augmentations, arms,
 * middles, outers, feet). Each selected option draws its material layer (`CjsPaperDollCompositor.CreateMaterialLayer`)
 * into the body: its diffuse (the detail colourised through its zone map in the captured colours, or an authored
 * diffuse drawn as it is) and its body cut masks; and into the surface, under its coverage, a flat normal and a black
 * specular first, then its own normal and specular. Its maps are named by `CjsCharacterTextureRoles.garment`.
 *
 * Options, their palettes, parts, maps, cut masks, default palette and colour areas are the parts library's
 * (`blue.characterLibrary`: `FetchOptions`, where the underwear is one option per folder and each folder's `.type`s name
 * the bloodlines that wear it; `FetchPalettes`, `FetchOptionPart`, `FetchOptionMaps` by the garment rule,
 * `ResolveColors`, `FetchColorAreas`). Each option reads its part when first applied, and its maps load when first
 * drawn; until then it draws nothing, and `MapsWaiting` says it is owed.
 *
 * Moved from Graphene's `bodyComposition.js` (d2b1306) without a change of look; the rules above are its rules,
 * derived (today's look). Every garment starts with no option and off: what starts on, the underwear included, is the
 * character factory's defaults data. A loaded recipe's garments are not applied yet (the recipe reading moves to the
 * character factory).
 *
 * The mesh facts (model, utility shapes, promoted dependency shapes) are the host's until the instance owns meshes
 * (R6): `SetResolveHook` installs what reads them when an option resolves.
 *
 * Ours (no Carbon counterpart): Carbon ships no paper doll; the client's is Python. The name is a working name.
 */
export class CjsPaperDollMaterialSource
{

    static className = "CjsPaperDollMaterialSource";

    /** The definition part this source serves. */
    name = "";

    /** The compositor its layers are made with. @type {CjsPaperDollCompositor} */
    _compositor = null;

    /** The build served: its waits, content, cancellation (`closed`), notes and errors. */
    _build = null;

    /** The definition, rebuilt when an option's maps land. */
    _definition = null;

    /** Each option, by id. @type {Map<string, object>} */
    _options = new Map();

    /** The host's mesh-fact reader, or null. @type {?function(string, object): Promise<void>} */
    _hook = null;

    /**
     * @param {CjsPaperDollCompositor} compositor The compositor its layers are made with.
     * @param {object} build The build served.
     * @param {string} name The definition part.
     */
    constructor(compositor, build, name)
    {
        this._compositor = compositor;
        this._build = build;
        this.name = name;
    }

    /**
     * A source for every garment part (`static blend` MATERIAL with the body target), each configured and set on the
     * composition.
     * @param {import("./CjsPaperDollComposition.js").CjsPaperDollComposition} composition The composition.
     * @param {import("../CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The paper doll definition.
     * @param {object} build The build served.
     * @returns {Promise<Map<string, CjsPaperDollMaterialSource>>} The sources, by part.
     */
    static async prepareAll(composition, definition, build)
    {
        const sources = new Map();
        for (const name of CjsPaperDollDefinition.parts)
        {
            const type = definition[name].constructor;
            if (type.blend !== PaperDollBlend.MATERIAL || !(type.targets & PaperDollTarget.BODY)) continue;
            const source = new CjsPaperDollMaterialSource(composition.compositor, build, name);
            await source.Configure(definition);
            composition.SetSource(name, source);
            sources.set(name, source);
        }
        return sources;
    }

    /**
     * Takes the part's options and their palettes from the parts library and configures the definition's component with
     * them.
     * @param {import("../CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The paper doll definition.
     * @returns {Promise<void>}
     * @throws {Error} For an underwear folder without a palette.
     */
    async Configure(definition)
    {
        const component = definition[this.name], type = component.constructor, build = this._build, library = blue.characterLibrary, sex = build.content.sex;
        this._definition = definition;
        for (const value of await build.Ready(library.FetchOptions(sex, CjsCharacterLibraryManager.partCategory(this.name))))
        {
            const records = await build.Ready(library.FetchPalettes(value));
            if (value.typePath === null && !records.length) throw new Error("Underwear without a palette " + value.folder);
            this._options.set(value.id, { id: value.id, option: value, base: value.folder, type: value.typePath, records, bloodlines: value.bloodlines, path: value.path, resolved: null, maps: null });
        }
        // The `recipe` option: the part folder and variation a recipe sets when no `.type` presets them.
        // What it names is the component's `recipePath` and `recipeVariation`, read when it resolves.
        this._options.set("recipe", { id: "recipe", option: null, base: "", type: null, records: [], bloodlines: [], path: "", resolved: null, maps: null, recipe: true });
        // Every garment starts with no option and off: what starts on is the character factory's defaults
        // (no defaults picked in code; the underwear's bloodline pick went with them).
        const values = [ ...this._options.values() ];
        component.Configure(values.map(value => ({ id: value.id, path: value.path, palettes: [] })), {
            option: "",
            resolve: id => this._Resolve(this._options.get(id))
        });
        component.enabled = false;
    }

    /**
     * Installs the host's mesh-fact reader, awaited as each option resolves (see the class).
     * @param {function(string, object): Promise<void>} hook Called with the part and the resolved option.
     * @returns {void}
     */
    SetResolveHook(hook)
    {
        this._hook = hook;
    }

    /**
     * Reads one option's part from the parts library the first time it is applied: its folders and variation, its
     * dependants and occludes, its garment maps and cut masks, its default palette and colour areas; and, through the
     * host's hook, its mesh facts.
     * @param {object} option The option.
     * @returns {Promise<object>} The component option's resolved fields.
     */
    async _Resolve(option)
    {
        const build = this._build, library = blue.characterLibrary;
        if (option.recipe === true)
        {
            // The recipe option takes the part folder and variation the component names now.
            const component = this._definition[this.name];
            const target = await build.Ready(library.FetchRecipeOption(build.content.sex, CjsCharacterLibraryManager.partCategory(this.name), { path: component.recipePath, variation: component.recipeVariation }));
            if (target === null) throw new Error("No " + this.name + " part folder " + component.recipePath);
            Object.assign(option, { option: target, base: target.folder, path: target.path, records: await build.Ready(library.FetchPalettes(target)), resolved: null, maps: null });
        }
        const { records } = option;
        const [ part, { maps, masks, skipped, maskedNormal } ] = await Promise.all([ build.Ready(library.FetchOptionPart(option.option)), build.Ready(library.FetchOptionMaps(option.option)) ]);
        const defaultPalette = records.length ? (await build.Ready(library.ResolveColors(option.option))).palette : null;
        const colorAreas = maps.detail && maps.zone && defaultPalette ? await build.Ready(library.FetchColorAreas(option.option)) : [];
        // The option occludes what its dependants' metadata occludes as well (CjsPaperDollInstance.dependantOccludes).
        const dependantParts = await build.Ready(Promise.all(part.dependants
            .map(path => library.FetchDependantPart(build.content.sex, path, part.variation))));
        const occludes = [ ...new Set([ ...part.occludes, ...CjsPaperDollInstance.dependantOccludes(dependantParts.filter(Boolean)) ]) ];
        const resolved = { id: option.id, path: option.path, type: option.type, base: part.folders.at(-1), folders: part.folders, variation: part.variation,
            dependants: part.dependants, shapes: part.shapes, occludes, ownOccludes: part.occludes, defaultPalette, maps, masks, skipped, maskedNormal };
        if (this._hook !== null) await this._hook(this.name, resolved);
        // Drawn from here on: the maps load on the next draw.
        option.resolved = resolved;
        return {
            path: option.path,
            occludes,
            colorAreas,
            defaultPalette: colorAreas.length ? defaultPalette : undefined,
            palettes: colorAreas.length ? records : []
        };
    }

    /**
     * An option's material layer once loaded; starts the load when the option is resolved and its maps are not, and
     * rebuilds the definition when it lands. Null until then, and after a failed load (reported once).
     * @param {object} option The option.
     * @returns {?object}
     */
    _Maps(option)
    {
        if (option.resolved === null) return null;
        option.maps ??= { state: "idle", value: null };
        const maps = option.maps;
        if (maps.state === "idle")
        {
            maps.state = "loading";
            this._LoadMaps(option).then(value =>
            {
                Object.assign(maps, { state: "ready", value });
                this._definition.Rebuild();
            }).catch(error =>
            {
                // A load cut short because the character closed begins again when next asked.
                if (this._build.closed) { maps.state = "idle"; return; }
                maps.state = "failed";
                this._build.Error("garment " + option.id + ": " + error.message);
                this._build.Note("garment " + option.id + " failed: " + error.message);
            });
        }
        return maps.value;
    }

    /**
     * Loads an option's maps and palettes and makes its material layer, its cut masks (its own, then each dependant
     * folder's, the parts library's `masks`) and the clears drawn under its coverage.
     * @param {object} option The option.
     * @returns {Promise<object>} The material layer, with `masks` and `clear`.
     * @throws {Error} For an option without a detail map.
     */
    async _LoadMaps(option)
    {
        const build = this._build, c = this._compositor, crop = CjsPaperDollCompositor.crop, { folders, defaultPalette, maps, masks, skipped, maskedNormal } = option.resolved;
        if (!maps.detail) throw new Error("Garment without a detail map " + folders[0]);
        // The default's colours, and which palettes are patterned (composed through patternblit).
        const paths = option.records.map(record => record.path), reads = [ ...new Set([ ...(defaultPalette ? [ defaultPalette ] : []), ...paths ]) ];
        const [ detail, zones, normal, specular, twist, ...read ] = await Promise.all([
            ...[ maps.detail, maps.zone, maps.normal, maps.specular, maps.twist ].map(path => path ? build.Ready(c.Texture(path)) : null),
            ...reads.map(path => build.Ready(blue.characterLibrary.FetchPalette(path)))
        ]);
        const palette = defaultPalette ? read[reads.indexOf(defaultPalette)].colors : null;
        const patterns = new Map(reads.map((path, index) => [ path, read[index].pattern ]).filter(([ path, pattern ]) => pattern && paths.includes(path)));
        const [ flatNormal, noSpecular ] = await Promise.all([ "0.5,0.5,1,1", "0,0,0,1" ].map(color => build.Ready(c.Texture("dynamic:/color/" + color))));
        const layer = await c.CreateMaterialLayer({ detail, zones, normal, specular }, palette, { coverage: true, patterns });
        // A masked normal (`mn`) carries its own coverage and encoding (maskednormalblit), not the detail's; a twist normal
        // (`tn`) adds over the normal (twistnormalblit). The `mn` and `tn` roles: `CjsCharacterTextureRoles.table`.
        if (normal !== null && maskedNormal) layer.NormalMap = { effect: await c.MaskedNormal(normal, crop(normal)), region: crop(normal) };
        const twistLayer = twist === null ? null : { effect: await c.Twist(twist, crop(twist)), region: crop(twist) };
        return Object.assign(layer, {
            masks: await Promise.all(masks.map(async path =>
            {
                const texture = await build.Ready(c.Texture(path));
                return { effect: await c.Simple(texture, crop(texture)), region: crop(texture), path };
            })),
            twist: twistLayer,
            clear: {
                NormalMap: { effect: await c.Simple(flatNormal, crop(detail), detail, crop(detail)), region: crop(detail) },
                SpecularMap: { effect: await c.Simple(noSpecular, crop(detail), detail, crop(detail)), region: crop(detail) }
            },
            skipped
        });
    }

    /**
     * The captured option's layers: its diffuse and cut masks into the body, and into the surface its coverage clears
     * then its normal or specular; none elsewhere, for no option, or while it resolves or its maps load.
     * @param {{ option: string, colors: Float32Array[] }} value The part's capture.
     * @param {string} region The output's region.
     * @param {string} channel The output's channel.
     * @returns {Array<{ effect: object, region: Float32Array }>}
     */
    GetLayers(value, region, channel)
    {
        if (region !== "body" || !value.option) return [];
        const option = this._options.get(value.option);
        const layer = option === undefined ? null : this._Maps(option);
        if (layer === null) return [];
        if (channel === "DiffuseMap") return [ { effect: layer.DiffuseFor(value), region: layer.DiffuseMap.region } ];
        if (channel === "CutMaskMap") return layer.masks.map(mask => ({ effect: mask.effect, region: mask.region }));
        if (channel !== "NormalMap" && channel !== "SpecularMap") return [];
        // Under the garment's cutout, the layers below are cleared first; a twist normal adds over the normal.
        const layers = layer[channel] ? [ layer.clear[channel], layer[channel] ] : [ layer.clear[channel] ];
        if (channel === "NormalMap" && layer.twist !== null) layers.push(layer.twist);
        return layers;
    }

    /**
     * The captured option's colourised diffuse and its region, once its maps are loaded; null before. The host's drape
     * (a mesh: R6) draws it.
     * @param {{ option: string, colors: Float32Array[] }} value The part's capture.
     * @returns {?{ effect: object, region: Float32Array }}
     */
    GetDiffuse(value)
    {
        const option = value.option ? this._options.get(value.option) : undefined;
        const layer = option === undefined ? null : this._Maps(option);
        return layer === null ? null : { effect: layer.DiffuseFor(value), region: layer.DiffuseMap.region };
    }

    /**
     * The cut mask paths a captured option draws, once its maps are loaded, for the build report.
     * @param {{ option: string }} value The part's capture.
     * @returns {string[]}
     */
    GetCutMaskPaths(value)
    {
        const option = value.option ? this._options.get(value.option) : undefined;
        const layer = option === undefined || option.maps === null ? null : option.maps.value;
        return layer === null ? [] : layer.masks.map(mask => mask.path);
    }

    /**
     * An option's resolved record (folders, variation, dependants, occludes, maps), or null before it resolves.
     * @param {string} id The option.
     * @returns {?object}
     */
    GetResolved(id)
    {
        const option = this._options.get(id);
        return option === undefined ? null : option.resolved;
    }

    /**
     * Whether a resolved option's maps are still owed (starting their load): idle or loading. A failed load does not
     * wait.
     * @param {string} id The option.
     * @returns {boolean}
     */
    MapsWaiting(id)
    {
        const option = this._options.get(id);
        if (option === undefined || option.resolved === null) return false;
        return this._Maps(option) === null && (option.maps.state === "idle" || option.maps.state === "loading");
    }

    /**
     * The loaded options, for the build report: each option's maps, and the map names in its folders it does not draw
     * (`skipped`: `overridden` by a better map, or `unruled`, waiting for a ruling).
     * @returns {object[]}
     */
    Describe()
    {
        return [ ...this._options.values() ].filter(option => option.maps !== null && option.maps.value !== null)
            .map(option => ({ id: option.id, maps: option.resolved.maps, skipped: option.maps.value.skipped }));
    }

}
