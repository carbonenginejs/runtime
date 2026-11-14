import { blue } from "#blue";
import { CjsPaperDollCompositor } from "../compositor/CjsPaperDollCompositor.js";
import { CjsPaperDollMaterialLayer } from "../compositor/CjsPaperDollMaterialLayer.js";
import { CjsPaperDollDefinition } from "../CjsPaperDollDefinition.js";
import { PaperDollBlend } from "../paperDollOrder.js";
import { CjsPaperDollColorizedSource } from "./CjsPaperDollColorizedSource.js";
import { CjsCharacterTextureRoles } from "../../library/CjsCharacterTextureRoles.js";
import { CjsCharacterLibraryManager } from "../../library/CjsCharacterLibraryManager.js";

/**
 * The layer source of a projected head part (`static blend` PROJECTION: head tattoos): each option's projection baked
 * into head UV space, colourised through the option's zone map (`comp_head_z`, `CjsCharacterTextureRoles`) in the
 * captured colours (colorizedblit: character-compositing.md:367). It draws into the head diffuse only, at full
 * strength: the part has no weight.
 *
 * Content (resource index): `tattoo/head/` holds one folder per option, each with its `types/<id>.type`, a
 * `projection.proj` and a `comp_head_z`, and the shared palettes in `colors/` (`PaperDollPalettes.CATALOG`; every one
 * an area-1 `_a` swatch). An option is a `.type`, as in every part. Two male folders have none and are not options,
 * reported by `Describe`: `tattooface01` (a `projection.proj` alone) and `tattoofacetest` (a projection and a zone).
 * The arm folders (`tattoo/armleft/`, `tattoo/armright/`) project onto the body and are not composed here. No option
 * names a default ink: what starts on is the character factory's defaults (operator, 2026-11-09).
 *
 * The source owns the bake target and every option's paint over it. The bake draw itself (the head mesh drawn with
 * the shipped `skinnedavatartattoobaking` effect from the option's projection) is the host's until the instance owns
 * meshes (R6): the host reads `GetBakeTarget` and `GetProjection` and installs `SetBaker`, which draws an option into
 * the target for the current face shape and answers whether it has (false while its inputs load).
 *
 * The source lists options only: what the part starts as is the character factory's, from its defaults or a loaded
 * recipe's DNA (no recipe in the build sets a tattoo: 0 of 37).
 *
 * Ours (no Carbon counterpart): Carbon ships no paper doll; the client's is Python. The name is a working name.
 */
export class CjsPaperDollProjectionSource
{

    static className = "CjsPaperDollProjectionSource";

    /**
     * The bake target's size. Derived: no source states it; moved as it was from Graphene's `tattoos.js` (today's look),
     * the head atlas's 2:1.
     */
    static bakeWidth = 2048;

    /** The bake target's height. */
    static bakeHeight = 1024;

    /** The definition part this source serves. */
    name = "";

    /** The compositor its layers are made with. @type {CjsPaperDollCompositor} */
    _compositor = null;

    /** The build served: its waits and its content. */
    _build = null;

    /** Each option, by id: its folder, projection, zone and once applied its paint. @type {Map<string, object>} */
    _options = new Map();

    /** Folders with a projection but no `.type`: not options (see the class). @type {string[]} */
    _unlisted = [];

    /** The bake target every option's paint reads. @type {?import("../compositor/CjsPaperDollCompositionTarget.js").CjsPaperDollCompositionTarget} */
    _bake = null;

    /** The host's bake draw: `(id) => boolean`, or null until installed. @type {?function(string): boolean} */
    _baker = null;

    /**
     * @param {CjsPaperDollCompositor} compositor The compositor its layers are made with.
     * @param {{ Ready: function(Promise<*>): Promise<*>, CheckActive: function(): void, content: { root: string, sex: string } }} build
     *   The build served.
     * @param {string} name The definition part.
     */
    constructor(compositor, build, name)
    {
        this._compositor = compositor;
        this._build = build;
        this.name = name;
    }

    /**
     * A source for every definition part that composes from a projection (`static blend` PROJECTION), each configured
     * and set on the composition.
     * @param {import("./CjsPaperDollComposition.js").CjsPaperDollComposition} composition The composition.
     * @param {import("../CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The paper doll definition.
     * @param {object} build The build served.
     * @returns {Promise<Map<string, CjsPaperDollProjectionSource>>} The sources, by part.
     */
    static async prepareAll(composition, definition, build)
    {
        const sources = new Map();
        for (const name of CjsPaperDollDefinition.parts)
        {
            if (definition[name].constructor.blend !== PaperDollBlend.PROJECTION) continue;
            const source = new CjsPaperDollProjectionSource(composition.compositor, build, name);
            await build.Ready(source.Configure(definition));
            composition.SetSource(name, source);
            sources.set(name, source);
        }
        return sources;
    }

    /**
     * Lists the head options and the shared palettes, makes the bake target and configures the definition's component:
     * no option, off.
     * @param {import("../CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The paper doll definition.
     * @returns {Promise<void>}
     * @throws {Error} For an option without a projection or a zone map.
     */
    async Configure(definition)
    {
        const build = this._build, library = blue.characterLibrary, component = definition[this.name], category = CjsCharacterLibraryManager.partCategory(this.name);
        // The head tattoos are the tattoo category's head folder (the parts library's `tattoo/head`).
        const head = category + "/head", sex = build.content.sex, options = await build.Ready(library.FetchOptions(sex, head));
        for (const option of options)
        {
            const [ part, maps ] = await Promise.all([ build.Ready(library.FetchOptionPart(option)), build.Ready(library.FetchOptionMaps(option)) ]);
            const zone = CjsCharacterTextureRoles.one(maps.roles, role => role.family === "comp" && role.suffix === "z");
            if (!part.projection || !zone) throw new Error("Incomplete " + this.name + " option " + option.folder);
            this._options.set(option.id, { id: option.id, folder: option.folder, projection: part.projection, zone: zone.path, paint: null });
        }
        this._unlisted = (await build.Ready(library.FetchFoldersWithoutOptions(sex, head))).filter(folder => folder.projection !== null).map(folder => folder.id);
        // The shared palettes are every option's (`FetchPalettes`: the category's `colors/`).
        const palettes = options.length ? await build.Ready(library.FetchPalettes(options[0])) : [];
        this._bake = this._compositor.TargetTexture(CjsPaperDollProjectionSource.bakeWidth, CjsPaperDollProjectionSource.bakeHeight);
        // No option, off: what the part starts as is the character factory's (its defaults, or a loaded recipe's DNA).
        component.Configure([ ...this._options.keys() ].sort().map(id => ({ id, palettes })), { option: "", resolve: id => this._Resolve(this._options.get(id)) });
        component.enabled = false;
    }

    /**
     * Reads one option's zone map and colour areas the first time it is applied, and makes its paint over the bake.
     * @param {object} option The option.
     * @returns {Promise<{ colorAreas: number[] }>} The component option's resolved fields.
     */
    async _Resolve(option)
    {
        const build = this._build, c = this._compositor;
        const [ zone, colorAreas ] = await Promise.all([
            build.Ready(c.Texture(option.zone)), build.Ready(blue.characterLibrary.FetchMaterialMaskAreas__Zone(option.zone))
        ]);
        build.CheckActive();
        option.paint = await c.Colorized(this._bake.resource, CjsPaperDollCompositor.full, zone, CjsPaperDollCompositor.crop(zone), CjsPaperDollColorizedSource.neutral());
        return { colorAreas };
    }

    /**
     * The bake target the host draws an option's projection into.
     * @returns {import("../compositor/CjsPaperDollCompositionTarget.js").CjsPaperDollCompositionTarget}
     */
    GetBakeTarget()
    {
        return this._bake;
    }

    /**
     * An option's projection file.
     * @param {string} id The option.
     * @returns {string} Its `projection.proj` path.
     */
    GetProjection(id)
    {
        return this._options.get(id).projection;
    }

    /**
     * Installs the host's bake draw (see the class).
     * @param {function(string): boolean} baker Draws an option into the bake target for the current face shape;
     *   answers whether it has.
     * @returns {void}
     */
    SetBaker(baker)
    {
        this._baker = baker;
    }

    /**
     * The captured option's paint for the head diffuse, in the captured colours over its bake; none elsewhere, for no
     * option, while the option's maps or bake inputs load, or before the host installs its bake. It calls the host's
     * baker, a GPU draw into the bake target, as a side effect; the baker's cache (option and face shape) holds that to
     * one draw per change, so a recompose without one draws nothing new.
     * @param {{ option: string, colors: Float32Array[] }} value The part's capture.
     * @param {string} region The output's region.
     * @param {string} channel The output's channel.
     * @returns {Array<{ effect: object, region: Float32Array }>}
     */
    GetLayers(value, region, channel)
    {
        if (region !== "head" || channel !== "DiffuseMap" || !value.option || this._baker === null) return [];
        const option = this._options.get(value.option);
        if (option.paint === null || !this._baker(value.option)) return [];
        CjsPaperDollMaterialLayer.setColors(option.paint, value.colors);
        return [ { effect: option.paint, region: CjsPaperDollCompositor.full } ];
    }

    /**
     * The options and the folders that are not options, for the build report.
     * @returns {{ options: string[], unlisted: string[] }}
     */
    Describe()
    {
        return { options: [ ...this._options.keys() ].sort(), unlisted: this._unlisted.slice() };
    }

    /**
     * Whether an option's paint is made (its first apply has finished loading it).
     * @param {string} id The option.
     * @returns {boolean}
     */
    IsPrepared(id)
    {
        const option = this._options.get(id);
        return option !== undefined && option.paint !== null;
    }

}
