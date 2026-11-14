import { blue } from "#blue";
import { CjsPaperDollCompositor } from "../compositor/CjsPaperDollCompositor.js";
import { CjsPaperDollMaterialLayer } from "../compositor/CjsPaperDollMaterialLayer.js";
import { CjsPaperDollDefinition } from "../CjsPaperDollDefinition.js";
import { PaperDollBlend, PaperDollPaletteKind, PaperDollPalettes } from "../paperDollOrder.js";
import { CjsPaperDollMakeupCatalog } from "./CjsPaperDollMakeupCatalog.js";
import { CjsCharacterTextureRoles } from "../../library/CjsCharacterTextureRoles.js";
import { CjsCharacterLibraryManager } from "../../library/CjsCharacterLibraryManager.js";

/**
 * The layer source of a colourised head part: each option's colourise detail (`l`) through its zone map (`z`), in the
 * captured colours, at the captured weight (colorizedblit: character-compositing.md:367; the roles through
 * `CjsCharacterTextureRoles`). It draws into the head diffuse only.
 *
 * Its options and their palette files come from where the part's palettes live (`static palettes`,
 * `PaperDollPalettes`): each option's own folder (eye shadow, eyeliner, lipstick: the parts library's options,
 * `FetchOptions`, and their palettes, `FetchPalettes`) or the category's catalog (blush, eyebrows: the makeup
 * catalog's options, every option's `.color` files and the category's `colors/`). Each palette is a raw record: its path, its file name, its kind
 * (`PaperDollPaletteKind`: the areas it sets, from its `_a`/`_bc` name) and those areas. An option's default palette
 * is a content fact only: its `default.color` (or the type's colour variant), else none; which palettes a menu shows,
 * how they are merged and labelled, and a default where there is none, are the UI's (operator: the UI makes the
 * configuration and UI decisions, not the engine).
 * An option's maps and colour areas are read the first time it is applied.
 *
 * An option with a specular map (`s`: lipstick) also draws into the head specular, in the applied palette's specular
 * colours: the specular colour (colorizedblit of `s`, masked by the detail's alpha, the lip shape) and the gloss
 * (blitintoalphawithzones of `s`, scaled per colour area by the specular colours' W, into the specular alpha). Moved as
 * it was from Graphene's `lipstick.js`, where it is read from the shipped shaders; the gloss packing is derived from
 * their disassembly. An option without one draws no specular: the male lipsticks have no `s` map (content: both male
 * lipstick folders hold only `colorize_head_l` and `colorize_head_z` with their palettes).
 *
 * A part with a carrier mesh (`static carrier`: the eyebrows) also gives what the brow carrier draws: the option's
 * colourised detail drawn unblended with its coverage (colorizedcopyblit), and its normal and specular as the mesh's
 * material. The carrier keeps the last applied option while the part is off or an option loads.
 *
 * The source lists options only: what a part starts as (its option, weight and colours) is the character factory's,
 * from its defaults or a loaded recipe's DNA.
 *
 * Ours (no Carbon counterpart): Carbon ships no paper doll; the client's is Python. The name is a working name.
 */
export class CjsPaperDollColorizedSource
{

    static className = "CjsPaperDollColorizedSource";

    /** The colour areas each palette kind sets. */
    static areas = { [PaperDollPaletteKind.WHOLE]: [ 1, 2, 3 ], [PaperDollPaletteKind.AREA_1]: [ 1 ], [PaperDollPaletteKind.AREAS_2_3]: [ 2, 3 ] };

    /**
     * A palette file's raw record: its path, its file name, its kind (the areas it sets, from its `_a`/`_bc` name;
     * derived, as in the game's creator) and those areas (`CjsCharacterLibraryManager.paletteRecord`).
     * @param {string} path The palette's `res:` path.
     * @returns {{ path: string, name: string, kind: number, areas: number[] }}
     */
    static record(path)
    {
        return CjsCharacterLibraryManager.paletteRecord(path);
    }

    /**
     * Neutral grey in all three areas: a paint's colours before a capture's.
     * @returns {Float32Array[]}
     */
    static neutral()
    {
        return [ 0, 1, 2 ].map(() => Float32Array.of(.5, .5, .5, 1));
    }

    /** The definition part this source serves. */
    name = "";

    /** The compositor its layers are made with. @type {CjsPaperDollCompositor} */
    _compositor = null;

    /** The build served: its waits and its content. */
    _build = null;

    /** Each style, by id: its parts library option, folder, palettes, and once applied its paint and cutout. @type {Map<string, object>} */
    _styles = new Map();

    /** The catalog's options by id (the catalog rule). @type {Map<string, object>} */
    _catalog = new Map();

    /** Whether the part's paint draws at its weight setting (`static weighted`); without it, at full strength. */
    _weighted = true;

    /** The part's class, for its facts (`carrier`). */
    _type = null;

    /** The option the carrier last drew. @type {?object} */
    _carrierStyle = null;

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
     * A source for every definition part that composes colourised from palette files (`static blend` COLORIZE and
     * `static palettes`), each configured and set on the composition.
     * @param {import("./CjsPaperDollComposition.js").CjsPaperDollComposition} composition The composition.
     * @param {import("../CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The paper doll definition.
     * @param {object} build The build served.
     * @returns {Promise<Map<string, CjsPaperDollColorizedSource>>} The sources, by part.
     */
    static async prepareAll(composition, definition, build)
    {
        const sources = new Map();
        for (const name of CjsPaperDollDefinition.parts)
        {
            const type = definition[name].constructor;
            if (type.blend !== PaperDollBlend.COLORIZE || !type.palettes) continue;
            const source = new CjsPaperDollColorizedSource(composition.compositor, build, name);
            await build.Ready(type.palettes === PaperDollPalettes.CATALOG ? source.ConfigureCatalog(definition) : source.Configure(definition));
            composition.SetSource(name, source);
            sources.set(name, source);
        }
        return sources;
    }

    /**
     * Takes the part's styles and their palettes from the parts library and configures the definition's component with
     * them: no option, off. What the part starts as is the character factory's (its defaults, or a loaded recipe's DNA).
     * @param {import("../CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The paper doll definition.
     * @returns {Promise<void>}
     * @throws {Error} For a style without palettes.
     */
    async Configure(definition)
    {
        const build = this._build, library = blue.characterLibrary, component = definition[this.name], category = CjsCharacterLibraryManager.partCategory(this.name);
        this._type = component.constructor;
        this._weighted = component.constructor.weighted === true;
        for (const style of await build.Ready(library.FetchOptions(build.content.sex, category)))
        {
            // Palettes by path only; a palette's colours are fetched when it is applied.
            const records = await build.Ready(library.FetchPalettes(style));
            if (!records.length) throw new Error("A " + this.name + " style without palettes " + style.folder);
            const defaultPalette = records.find(record => record.name === "default")?.path ?? null;
            this._styles.set(style.id, { id: style.id, option: style, folder: style.folder, records, defaultPalette, paint: null, region: null, skipped: [], specular: null, gloss: null });
        }
        component.Configure([ ...this._styles.values() ].map(style =>
        {
            const primary = style.records.filter(record => record.kind !== PaperDollPaletteKind.AREAS_2_3);
            const secondary = style.records.filter(record => record.kind === PaperDollPaletteKind.AREAS_2_3);
            return {
                id: style.id,
                ...(style.defaultPalette !== null ? { defaultPalette: style.defaultPalette } : {}),
                palettes: primary,
                ...(secondary.length ? { secondaryPalettes: secondary } : {})
            };
        }), { option: "", weight: 1, resolve: id => this._Resolve(this._styles.get(id)) });
        component.enabled = false;
    }

    /**
     * Reads one style's maps, colour areas and default palette the first time it is applied, and makes its paint.
     * @param {object} style The style.
     * @returns {Promise<{ colorAreas: number[] }>} The component option's resolved fields.
     * @throws {Error} For a style without one colourise detail and zone map.
     */
    async _Resolve(style)
    {
        const build = this._build, c = this._compositor, { roles, skipped } = await build.Ready(blue.characterLibrary.FetchOptionMaps(style.option));
        // Maps named outside the composed naming are not drawn (derived: today's look; eyeshadow_02's aa_female_head_s).
        style.skipped = skipped;
        const detailMap = CjsCharacterTextureRoles.one(roles, role => role.region === "head" && role.operation === "Colorized");
        const zoneMap = CjsCharacterTextureRoles.one(roles, role => role.region === "head" && role.inputOf === "l");
        if (!detailMap || !zoneMap) throw new Error("Incomplete " + this.name + " style " + style.folder);
        const [ detail, zone, initial, colorAreas ] = await Promise.all([
            build.Ready(c.Texture(detailMap.path)), build.Ready(c.Texture(zoneMap.path)),
            style.defaultPalette !== null ? build.Ready(blue.characterLibrary.FetchPalette(style.defaultPalette, { specular: true })) : { colors: CjsPaperDollColorizedSource.neutral(), specularColors: CjsPaperDollColorizedSource.neutral() },
            build.Ready(blue.characterLibrary.FetchMaterialMaskAreas__Zone(zoneMap.path))
        ]);
        build.CheckActive();
        style.region = CjsPaperDollCompositor.crop(detail);
        style.paint = await c.Colorized(detail, style.region, zone, CjsPaperDollCompositor.crop(zone), initial.colors);
        const specularMap = CjsCharacterTextureRoles.one(roles, role => role.region === "head" && role.property === "SpecularMap");
        if (specularMap)
        {
            const specular = await build.Ready(c.Texture(specularMap.path)), crop = CjsPaperDollCompositor.crop;
            style.specular = await c.ColorizedMasked(specular, crop(specular), zone, crop(zone), detail, style.region, initial.specularColors);
            style.gloss = await c.BlitIntoAlphaWithZones(specular, crop(specular), zone, crop(zone), detail, style.region, Float32Array.of(1, 1, 1, 0));
        }
        return { colorAreas };
    }

    /**
     * Lists the part's options by the catalog rule and configures the definition's component with them: no option, off.
     * @param {import("../CjsPaperDollDefinition.js").CjsPaperDollDefinition} definition The paper doll definition.
     * @returns {Promise<void>}
     */
    async ConfigureCatalog(definition)
    {
        const build = this._build, component = definition[this.name], category = CjsCharacterLibraryManager.partCategory(this.name);
        const catalog = await CjsPaperDollMakeupCatalog.read(category.split("/").at(-1), build);
        this._type = component.constructor;
        this._weighted = component.constructor.weighted === true;
        this._catalog = new Map(catalog.options.map(option => [ option.id, option ]));
        // The part starts with no option and off: what it starts as is the character factory's (its defaults, or a loaded
        // recipe's DNA).
        component.Configure(catalog.options.map(option => ({
            id: option.id,
            colorAreas: [],
            ...(option.defaultPalette !== null ? { defaultPalette: option.defaultPalette } : {}),
            palettes: option.palettes.map(record => CjsPaperDollColorizedSource.record(record.path))
        })), { option: "", weight: 0, resolve: id => this._ResolveCatalog(id) });
        component.enabled = false;
        // A carrier mesh needs a material before any option is applied (the head draws its brow target once at
        // preparation): the catalog's first is loaded for the carrier only, not selected; the part stays as configured.
        // Derived: which option's material the carrier starts with is ours (the first), not a source's.
        if (this._type.carrier === true && catalog.options.length) await this._ResolveCatalog(catalog.options[0].id);
    }

    /**
     * Reads one catalog option's maps the first time it is applied, and makes its paint.
     * @param {string} id The option.
     * @returns {Promise<{ colorAreas: number[] }>} The component option's resolved fields.
     * @throws {Error} For an option with geometry, dependants or maps other than a colourise detail and zone map.
     */
    async _ResolveCatalog(id)
    {
        const build = this._build, c = this._compositor, option = this._catalog.get(id);
        const dependants = option.metadata ? option.metadata.dependantModifiers : [], carrier = this._type.carrier === true;
        if (option.geometry.length || dependants.length) throw new Error("Unqualified " + this.name + " geometry or dependency " + option.definition);
        if (carrier && option.metadata && ![ -1, 2 ].includes(option.metadata.numColorAreas)) throw new Error("Unqualified " + this.name + " colour areas " + option.definition);
        const roles = Object.values(option.channels).map(value => CjsCharacterTextureRoles.lookup(value.path));
        // Without a carrier the option is a colourise detail and zone map only; a carrier's material adds n and s.
        const allowed = carrier ? [ "l", "z", "n", "s" ] : [ "l", "z" ];
        if (roles.some(role => !allowed.includes(role.suffix))) throw new Error("Unqualified " + this.name + " material channel " + option.definition);
        const detailMap = CjsCharacterTextureRoles.one(roles, role => role.operation === "Colorized");
        const zoneMap = CjsCharacterTextureRoles.one(roles, role => role.inputOf === "l");
        if (!detailMap || !zoneMap) throw new Error("Incomplete " + this.name + " inputs " + option.definition);
        const [ detail, zone ] = await Promise.all([ build.Ready(c.Texture(detailMap.path)), build.Ready(c.Texture(zoneMap.path)) ]);
        const region = CjsPaperDollCompositor.crop(detail), neutral = CjsPaperDollColorizedSource.neutral();
        const style = { id, region, paint: await c.Colorized(detail, region, zone, CjsPaperDollCompositor.crop(zone), neutral), carrier: null, material: null, skipped: [], specular: null, gloss: null };
        if (carrier)
        {
            const normalMap = CjsCharacterTextureRoles.one(roles, role => role.property === "NormalMap");
            const specularMap = CjsCharacterTextureRoles.one(roles, role => role.property === "SpecularMap");
            if (!normalMap || !specularMap) throw new Error("Incomplete " + this.name + " material " + option.definition);
            const [ normal, specular ] = await Promise.all([ build.Ready(c.Texture(normalMap.path)), build.Ready(c.Texture(specularMap.path)) ]);
            style.material = { NormalMap: normal, SpecularMap: await c.Material(specular) };
            // The carrier mesh samples its material over the whole image: a cutout map would need atlas placement.
            for (const resource of Object.values(style.material)) if (CjsPaperDollCompositor.crop(resource).some((value, i) => value !== CjsPaperDollCompositor.full[i]))
                throw new Error(this.name + " material requires atlas placement " + resource.GetPath());
            style.carrier = await c.ColorizedCopy(detail, region, zone, CjsPaperDollCompositor.crop(zone), neutral);
            this._carrierStyle ??= style;
        }
        this._styles.set(id, style);
        return { colorAreas: await c.ColorAreas(detail, zone) };
    }

    /**
     * The captured style's paint for the head diffuse, in the captured colours at the captured weight; none elsewhere,
     * for no style, or while the style's maps load.
     * @param {{ option: string, colors: Float32Array[], weight: number }} value The part's capture.
     * @param {string} region The output's region.
     * @param {string} channel The output's channel.
     * @returns {Array<{ effect: object, region: Float32Array }>}
     */
    GetLayers(value, region, channel)
    {
        const style = region === "head" && value.option ? this._styles.get(value.option) : undefined;
        if (style === undefined || style.paint === null) return [];
        if (channel === "SpecularMap")
        {
            // The specular passes take the applied palette's specular colours; custom colours or no palette draw none.
            if (style.specular === null || !value.palette || value.specularColors.length < 3) return [];
            CjsPaperDollMaterialLayer.setColors(style.specular, value.specularColors);
            style.gloss.SetParameter__Vector4("Color1", Float32Array.of(value.specularColors[0][3], value.specularColors[1][3], value.specularColors[2][3], 0));
            return [ { effect: style.specular, region: style.region }, { effect: style.gloss, region: style.region } ];
        }
        if (channel !== "DiffuseMap") return [];
        CjsPaperDollMaterialLayer.setColors(style.paint, value.colors);
        if (this._weighted) style.paint.SetParameter("Strength", value.weight);
        return [ { effect: style.paint, region: style.region } ];
    }

    /**
     * What the carrier mesh draws for a capture (a part with `static carrier`): the captured option's unblended
     * colourised detail in the captured colours, and its cutout; the last applied option's while the part is off or the
     * option loads. Derived: today's look (Graphene 6a47517 headComposition.js kept the last brow); the brow meshes are
     * hidden while the part is off, so the carrier's colour does not show then.
     * @param {{ option: string, colors: Float32Array[] }} value The part's capture.
     * @returns {{ effect: object, region: Float32Array, material: { NormalMap: object, SpecularMap: object } }}
     */
    GetCarrier(value)
    {
        const style = value.option ? this._styles.get(value.option) : undefined;
        if (style !== undefined && style.carrier !== null) this._carrierStyle = style;
        const carrier = this._carrierStyle;
        CjsPaperDollMaterialLayer.setColors(carrier.carrier, value.colors);
        return { effect: carrier.carrier, region: carrier.region, material: carrier.material };
    }

    /**
     * The prepared options, for the build report: each option's cutout, and the maps in its folder that are not
     * composed maps and so are not drawn (`CjsCharacterTextureRoles.readFolder`'s `skipped`).
     * @returns {object[]}
     */
    Describe()
    {
        return [ ...this._styles.values() ].filter(style => style.paint !== null)
            .map(style => ({ id: style.id, cutout: Array.from(style.region), skipped: style.skipped }));
    }

    /**
     * The carrier mesh's material: the normal and specular of the option the carrier last drew.
     * @returns {{ NormalMap: object, SpecularMap: object }}
     */
    GetCarrierMaterial()
    {
        return this._carrierStyle.material;
    }

    /**
     * Whether an option's paint is made (its first apply has finished loading it).
     * @param {string} id The option.
     * @returns {boolean}
     */
    IsPrepared(id)
    {
        const style = this._styles.get(id);
        return style !== undefined && style.paint !== null;
    }

}
