import { meta } from "#schema";

/**
 * The paper-doll map size tiers, largest first, as `[characterTextureQuality value, file suffix]`: `_4k`, unsuffixed
 * (half of it), `_512`, `_256`. An array, not an object: an object lists the integer-like keys `512` and `256` first,
 * which broke the fallback order for every quality but `4k`.
 */
const TEXTURE_TIERS = [ [ "4k", "_4k" ], [ "2k", "" ], [ "512", "_512" ], [ "256", "_256" ] ];

/** The note on a derived fact: our own earlier code's behaviour, which the screenshots keep. */
const DERIVED = "matches Graphene's working behaviour, today's look (Graphene 6a47517 ";

/**
 * What a paper doll texture file is, from its name: `<family>_<region>_<suffix>[<tier>].png`. Every composer reads
 * texture roles here, never from a per-part table: give it a file and it returns the region, the suffix, the effect
 * property the composed map feeds, what each channel of the file holds and the compositor operation that draws it.
 * A name outside the table throws; nothing is guessed.
 *
 * Sources, cited per entry:
 * - Property names: the character effects' texture parameters, `src/character/discovery/shaders.yaml` (DiffuseMap,
 *   NormalMap, SpecularMap and CutMaskMap are the same names in every character effect that samples them; the fur
 *   shells bind `colorize_head_l` directly as `LengthTexture`, :1024, which is mesh binding, not composition).
 * - Channels and blends: the shipped compositing effects under `res:/graphics/effect/utility/compositing/` (their
 *   per-channel placement, blit arithmetic and states).
 * - Families, regions and suffixes: the file names under `res:/graphics/character/<sex>/paperdoll/` (resource
 *   index, build 3670638): families `comp` and `colorize`; regions `head`, `body`, `hair`, `acc`; tiers `_4k`,
 *   `_512`, `_256` and none (`CjsCharacterTextureRoles.splitTier`).
 *
 * The parts library's one texture-role table (character-structure-and-plugins.md, "One role per manager": the parts
 * library is the only code that parses content paths). The entries below carry their sources. The map size tiers
 * and the `characterTextureQuality` setting live here too.
 *
 * Ours (no Carbon counterpart): Carbon ships no paper doll; the client's is Python. The name is a working name.
 */
export class CjsCharacterTextureRoles
{

    /**
     * Our character texture quality: the size tier of the paper-doll maps a character composes from (`4k`, `2k` for the
     * unsuffixed files, `512`, `256`). A map missing at that tier is taken from the nearest smaller one, then the nearest
     * larger (`tierOrder`). A character copies it when it is built, so a change shows from the next build (CREATE: the
     * library holds LOAD settings back until it reboots). EVE has its own character quality controls in client code;
     * Carbon registers no such setting. The setting registry records this non-Carbon name with carbon: false. Moved
     * from `CjsPaperDollDefinition` with the tier helpers (non-carbon-extensions.md § *Character texture quality*).
     */
    @meta.setting("characterTextureQuality", { applies: meta.setting.CREATE, values: [ "4k", "2k", "512", "256" ], category: "characters" })
    static characterTextureQuality = "4k";

    /**
     * Whether an accessory's map for a region and role may be one with no region in its name (`normal_n`, `spec_s`,
     * `mask_f_n`) where it ships none named for the region or for accessories (`pickAccessoryMaps`). Derived, moved
     * from Graphene's accessories: neither the `.type` nor the metadata names an item's maps. Ours, with no Carbon
     * counterpart.
     */
    @meta.setting("characterAccessoryMapFallback", { applies: meta.setting.CREATE, category: "characters" })
    static characterAccessoryMapFallback = true;

    static className = "CjsCharacterTextureRoles";

    /** The regions a file name can carry, as authored. */
    static regions = [ "head", "body", "hair", "acc" ];

    /**
     * The character atlas's regions, as an area's `TransformUV0` places them: [u0, v0, u1, v1]. Found: every character
     * area's `TransformUV0` in build 3670638 is the identity or lies within one of these (moved from Graphene's
     * `atlasRegions.js`).
     * @type {Object<string, number[]>}
     */
    static atlas = { body: [ 0, 0, 0.5, 1 ], head: [ 0.5, 0, 1, 0.5 ], hair: [ 0.5, 0.5, 0.75, 1 ], acc: [ 0.75, 0.5, 1, 1 ] };

    /**
     * The atlas region a `TransformUV0` lies in (`atlas`), `identity` for the whole image, or null for neither.
     * @param {ArrayLike<number>} transform The area's `TransformUV0`, [u0, v0, u1, v1].
     * @returns {?string} The region.
     */
    static uvRegion(transform)
    {
        const near = (a, b) => Math.abs(a - b) < 1e-4;
        if (near(transform[0], 0) && near(transform[1], 0) && near(transform[2], 1) && near(transform[3], 1)) return "identity";
        for (const [ name, [ u0, v0, u1, v1 ] ] of Object.entries(CjsCharacterTextureRoles.atlas))
        {
            if (transform[0] > u0 - 1e-4 && transform[1] > v0 - 1e-4 && transform[2] < u1 + 1e-4 && transform[3] < v1 + 1e-4) return name;
        }
        return null;
    }

    /**
     * A `.png` map path's stem and tier suffix: `.../colorize_body_l_4k.png` gives `.../colorize_body_l` and `_4k`; an
     * unsuffixed file gives an empty suffix. Ours, with the tiers of `characterTextureQuality` (non-carbon-extensions.md
     * § *Character texture quality*).
     * @param {string} path The map's `.png` path.
     * @returns {[string, string]} The stem and the tier suffix.
     */
    static splitTier(path)
    {
        const [ , stem, tier = "" ] = path.match(/^(.*?)(_4k|_512|_256)?\.png$/u);
        return [ stem, tier ];
    }

    /**
     * The tier suffixes to try for a quality: its own, then each smaller, then each larger. A map missing at the set size
     * is taken from the nearest size below, and from above only when nothing below exists (`shirtqf01` ships its zone
     * map unsuffixed only). Ours: the fallback order, with `characterTextureQuality` (non-carbon-extensions.md
     * § *Character texture quality*).
     * @param {string} [quality] A `characterTextureQuality` value; the setting's by default.
     * @returns {string[]} The tier suffixes in the order to try.
     * @throws {Error} For a quality that is not one of the setting's values.
     */
    static tierOrder(quality = CjsCharacterTextureRoles.characterTextureQuality)
    {
        const index = TEXTURE_TIERS.findIndex(([ value ]) => value === quality);
        if (index === -1) throw new Error("Unknown character texture quality " + quality);
        const tiers = TEXTURE_TIERS.map(([ , suffix ]) => suffix);
        return [ ...tiers.slice(index), ...tiers.slice(0, index).reverse() ];
    }

    /**
     * A map at the character texture quality: the first listed file of `tierOrder` for a map path written at any tier.
     * Ours (non-carbon-extensions.md § *Character texture quality*).
     * @param {string} path The map's `.png` path, at any tier.
     * @param {string[]} files The listed files holding it.
     * @returns {string|null} The file to load, or null when no tier exists.
     */
    static pickTier(path, files)
    {
        const [ stem ] = CjsCharacterTextureRoles.splitTier(path);
        return CjsCharacterTextureRoles.tierOrder().map(tier => stem + tier + ".png").find(file => files.includes(file)) ?? null;
    }

    /**
     * The files ending in `ending` plus a tier, at the first tier of `tierOrder` that has any. Ours
     * (non-carbon-extensions.md § *Character texture quality*).
     * @param {string[]} files The listed files.
     * @param {string} ending The name's end without tier or extension (`comp_head_d`).
     * @returns {string[]} The matches at that tier; empty when no tier has one.
     */
    static tierCandidates(files, ending)
    {
        for (const tier of CjsCharacterTextureRoles.tierOrder())
        {
            const found = files.filter(file => file.endsWith(ending + tier + ".png"));
            if (found.length) return found;
        }
        return [];
    }

    /**
     * Each suffix's role. `families`: the name prefixes it is sourced for. `property`: the effect texture parameter
     * the composed map feeds. `channels`: what the file's channels hold. `operation`: the `CjsPaperDollCompositor`
     * method that draws it, or null for an input of another role's operation (`inputOf`). `plan`: `replace` (drawn
     * over what is under it) or `add` (added to it); one part's layers on one property draw replacements first, then
     * additions (character-compositing.md:593, `PlanNormal`). `covered`: drawn through the same option's diffuse
     * coverage when the option has a diffuse. `source`: where each fact is read. `derived`: the facts no source states,
     * which match the working behaviour of our own earlier code (today's look) and wait for a ruling. A key
     * `<family>_<suffix>` is a role for that family alone, read before the suffix's own (`comp_z`).
     */
    static table = {
        d: {
            families: [ "comp" ],
            property: "DiffuseMap",
            channels: { rgb: "colour", a: "coverage" },
            operation: "Simple",
            plan: "replace",
            covered: false,
            source: "simpleblit: RGB = Texture.rgb, SRC_ALPHA/INV_SRC_ALPHA (character-compositing.md:370, :395); "
                + "DiffuseMap (shaders.yaml partSlots)",
            derived: "its alpha is coverage: " + DERIVED + "augmentations.js:13)"
        },
        l: {
            families: [ "colorize", "comp" ],
            property: "DiffuseMap",
            channels: { rgb: "detail, multiplied by the colour areas", a: "coverage (UseMask 0 keeps the detail's alpha)" },
            operation: "Colorized",
            plan: "replace",
            covered: false,
            source: "colorizedblit D (character-compositing.md:367, :395)",
            derived: "drawn as it is (Simple) without a zone map or palette (CjsPaperDollCompositor.CreateMaterialLayer); "
                + "comp_body_l is a garment detail: " + DERIVED + "bodyComposition.js:74)"
        },
        z: {
            families: [ "colorize" ],
            property: "DiffuseMap",
            channels: { r: "colour area 1 weight", g: "colour area 2 weight", b: "colour area 3 weight", a: "where colourising applies" },
            operation: null,
            inputOf: "l",
            plan: "replace",
            covered: false,
            source: "colorizedblit Z, and the one-channel compact zone decode (character-compositing.md:367, :379-383)"
        },
        comp_z: {
            families: [ "comp" ],
            property: "DiffuseMap",
            channels: { r: "colour area 1 weight", g: "colour area 2 weight", b: "colour area 3 weight", a: "where colourising applies" },
            operation: null,
            inputOf: null,
            plan: "replace",
            covered: false,
            source: "the colorizedblit Z decode (character-compositing.md:367, :379-383); every head tattoo folder holds one "
                + "`comp_head_z` beside its `projection.proj` (resource index)",
            derived: "PROVISIONAL (Ruru, 2026-11-09): the zone of the head tattoo's bake, which is its colourised detail (no source states it): matches "
                + "Graphene's working behaviour, today's look (Graphene 5a7e30d tattoos.js); every head tattoo's is a 16x16 "
                + "map of one texel selecting colour area 1 everywhere (all 115, both sexes)"
        },
        n: {
            families: [ "comp" ],
            property: "NormalMap",
            channels: { rgb: "normal (or two-channel: R = X, A = Y, Z rebuilt)" },
            operation: "Simple",
            plan: "replace",
            covered: true,
            source: "covered SimpleBlit replacement (character-compositing.md:593); RGB at 4k, LA at base (:337-338)",
            derived: "the coverage is the option's own diffuse: " + DERIVED
                + "bodyComposition.js:146, hairSupport.js:144, beardSupport.js:67, augmentations.js:14)"
        },
        s: {
            families: [ "comp", "colorize" ],
            property: "SpecularMap",
            channels: { rgba: "specular (LA at base, RGBA in some variations)" },
            operation: "Simple",
            plan: "replace",
            covered: true,
            source: "LA versus RGBA (character-compositing.md:329-330); SpecularMap (shaders.yaml partSlots)",
            derived: "drawn by simpleblit, through the option's diffuse coverage as n; colorize_body_s is a boot's only "
                + "specular: " + DERIVED + "surfaceDetails.js:60, bodyComposition.js:63)"
        },
        tn: {
            families: [ "comp" ],
            property: "NormalMap",
            channels: { rg: "signed XY perturbation, (2 * value - 1) * strength / 2 (two-channel: A gives Y)" },
            operation: "Twist",
            plan: "add",
            covered: false,
            source: "twistnormalblit, two passes ONE/ONE ADD then REV_SUBTRACT, destination alpha kept "
                + "(character-compositing.md:373, :397)"
        },
        mn: {
            families: [ "comp" ],
            property: "NormalMap",
            channels: { rg: "normal XY, Z rebuilt", b: "coverage" },
            operation: "MaskedNormal",
            plan: "replace",
            covered: false,
            source: "maskednormalblit: XY = 2 * rg - 1, alpha = b * strength; SRC_ALPHA/INV_SRC_ALPHA, destination alpha "
                + "kept (character-compositing.md:372, :396)"
        },
        m: {
            families: [ "comp" ],
            property: "CutMaskMap",
            channels: { rgb: "black", a: "where the body is cut" },
            operation: "Simple",
            plan: "replace",
            covered: false,
            source: "black RGB, variable alpha, drawn through alpha onto a white target (character-compositing.md:341-348); "
                + "CutMaskMap (shaders.yaml partSlots)",
            derived: "the white target and a simpleblit: " + DERIVED + "bodyComposition.js:149, :335)"
        }
    };

    /**
     * The garment map names (the MATERIAL parts with the body target), by the map they give: each map is the first
     * name found searching the option's folders in order (its variation's, then its part's), then the size tiers
     * (`CjsCharacterTextureRoles.tierOrder`), then these names in order; `<part>` is the part folder's name, and `*` any
     * name (a folder holding two such candidates at one tier throws). A name these lists do not hold is not drawn.
     *
     * Derived, every entry (no source states them; Carbon ships no paper doll). Today's look first: Graphene d2b1306
     * `bodyComposition.js` `mapPaths` and `maskPaths`, with their exact precedence. Then the names the operator ruled
     * drawn (2026-11-09, "if they exist, we should use them"), each after today's names for its map, so they draw only
     * where today's draw nothing: `comb_body_s` as a `comp` specular, `colorize_body_d` and `<part>_d` as an authored
     * diffuse, `colorize_body_n`, `<part>_body_n`/`_s`, `comp_body_mn` (a masked normal), `_tn` (a twist normal, added
     * over the normal), and any other `<name>_n`/`_s` (the part-name mismatches: `spacesuit01f_n`, `catsuitf01_s`,
     * `robeam01_n` in `robef01`, `jacketmilf01_s` in `jacketmilf02`). An authored diffuse is colourised through a zone
     * map when the chain holds one, as today's `comp_body_d` is.
     */
    static garment = {
        /** The diffuse source: a colourise detail, or an authored diffuse. */
        detail: [ "colorize_body_l", "comp_body_l", "comp_body_d", "_l", "colorize_body_d", "<part>_d" ],
        /** The colourise detail's zone map. */
        zone: [ "colorize_body_z" ],
        /** The normal, drawn through the detail's coverage (`comp_body_mn`: a masked normal, through its own). */
        normal: [ "comp_body_n", "<part>_n", "_n", "colorize_body_n", "<part>_body_n", "comp_body_mn", "*_n" ],
        /** A twist normal, added over the normal. */
        twist: [ "comp_body_tn", "_tn" ],
        /** The specular, drawn through the detail's coverage. */
        specular: [ "comp_body_s", "<part>_s", "_s", "colorize_body_s", "comb_body_s", "<part>_body_s", "*_s" ],
        /** The body cut mask: the first folder's, then each dependant folder's (`maskPaths`). */
        cutMask: [ "comp_body_m" ]
    };

    /**
     * A garment option's maps by the garment names (`garment`), with today's precedence: folder, then tier, then name.
     * @param {string[]} folders The option's folders, most specific first, each ending in "/"; the last is the part's.
     * @param {string[]} files The listed files below them.
     * @returns {{ detail: ?string, zone: ?string, normal: ?string, twist: ?string, specular: ?string, cutMask: ?string }}
     *   Each map's path; null when no folder holds one.
     * @throws {Error} For a folder holding two candidates for a `*` name at one tier.
     */
    static pickGarmentMaps(folders, files)
    {
        const part = folders.at(-1).slice(0, -1).split("/").at(-1), tiers = CjsCharacterTextureRoles.tierOrder(), maps = {};
        const find = (folder, tier, name) =>
        {
            if (!name.startsWith("*")) return files.includes(folder + name + tier + ".png") ? folder + name + tier + ".png" : null;
            const found = files.filter(file => file.startsWith(folder) && file.lastIndexOf("/") === folder.length - 1 && file.endsWith(".png")
                && CjsCharacterTextureRoles.splitTier(file)[1] === tier && CjsCharacterTextureRoles.splitTier(file)[0].endsWith(name.slice(1)));
            if (found.length > 1) throw new Error("Ambiguous garment maps " + found.join(", "));
            return found[0] ?? null;
        };
        for (const [ key, names ] of Object.entries(CjsCharacterTextureRoles.garment))
        {
            const stems = names.map(name => name.replace("<part>", part));
            maps[key] = null;
            search: for (const folder of folders) for (const tier of tiers) for (const stem of stems)
            {
                const path = find(folder, tier, stem);
                if (path !== null) { maps[key] = path; break search; }
            }
        }
        return maps;
    }

    /**
     * The `.png` map names (tier dropped) directly in a garment option's folders that its picked maps do not use, for
     * the build report, in two lists: `overridden`, names a rule draws that a better map hid (a later folder, a worse
     * tier or a later name for the same map); and `unruled`, names no rule draws, which wait for a ruling.
     * @param {string[]} folders The option's folders.
     * @param {string[]} files The listed files below them.
     * @param {Array<?string>} used The picked map paths.
     * @returns {{ overridden: string[], unruled: string[] }} Each as `<folder>/<name>`, relative to the part folder's
     *   parent.
     */
    static garmentSkipped(folders, files, used)
    {
        const stems = new Set(used.filter(Boolean).map(path => CjsCharacterTextureRoles.splitTier(path)[0]));
        const part = folders.at(-1).slice(0, -1).split("/").at(-1), names = Object.values(CjsCharacterTextureRoles.garment).flat();
        const exact = new Set(names.filter(name => !name.startsWith("*")).map(name => name.replace("<part>", part)));
        const endings = names.filter(name => name.startsWith("*")).map(name => name.slice(1));
        const ruled = { has: name => exact.has(name) || endings.some(ending => name.endsWith(ending)) };
        const root = folders.at(-1).slice(0, folders.at(-1).slice(0, -1).lastIndexOf("/") + 1), overridden = new Set(), unruled = new Set();
        for (const folder of folders)
            for (const file of files)
                if (file.startsWith(folder) && file.lastIndexOf("/") === folder.length - 1 && file.endsWith(".png"))
                {
                    const [ stem ] = CjsCharacterTextureRoles.splitTier(file);
                    if (stems.has(stem)) continue;
                    (ruled.has(stem.slice(folder.length)) ? overridden : unruled).add(stem.slice(root.length));
                }
        return { overridden: [ ...overridden ], unruled: [ ...unruled ] };
    }

    /**
     * A texture file's role.
     * @param {string} path The file's `res:` path or name, at any tier.
     * @returns {{ path: string, family: string, region: string, suffix: string, tier: string, property: string,
     *   channels: object, operation: ?string, inputOf?: ?string, plan: string, covered: boolean, source: string,
     *   derived?: string }}
     * @throws {Error} For a name outside `<family>_<region>_<suffix>[<tier>].png`, or a suffix the table does not
     *   source for that family.
     */
    static lookup(path)
    {
        if (!path.endsWith(".png")) throw new Error("Not a paper doll texture name: " + path);
        const [ stem, tier ] = CjsCharacterTextureRoles.splitTier(path);
        const match = /^(comp|colorize)_([a-z]+)_([a-z]+)$/u.exec(stem.split("/").at(-1));
        if (!match) throw new Error("Not a paper doll texture name: " + path);
        const [ , family, region, suffix ] = match;
        if (!CjsCharacterTextureRoles.regions.includes(region)) throw new Error("Unknown paper doll texture region " + region + ": " + path);
        const role = CjsCharacterTextureRoles.table[family + "_" + suffix] ?? CjsCharacterTextureRoles.table[suffix];
        if (!role || !role.families.includes(family)) throw new Error("Unknown paper doll texture role " + family + "_" + suffix + ": " + path);
        return { path, family, region, suffix, tier, ...role };
    }

    /**
     * The maps a folder holds directly, one per name at the character texture quality: the composed ones (`comp_` and
     * `colorize_` names) with their roles, and the others, which are not composed maps, by name for the caller to
     * refuse or report (`aa_female_head_s` in eyeshadow_02). A composed name the lookup does not source throws.
     * @param {string} folder The folder's `res:` path, ending in "/".
     * @param {string[]} files The listed files.
     * @returns {{ roles: Array<ReturnType<typeof CjsCharacterTextureRoles.lookup>>, skipped: string[] }} The composed
     *   maps' roles, and the other map names.
     * @throws {Error} For a composed map name the lookup does not source.
     */
    /**
     * An accessory's maps by region (`regions`) and role (`l`, `z`, `d`, `n`, `s`), each at the character texture
     * quality, searched across its folders in order: the name for the region (`colorize_<region>_l`,
     * `comp_<region>_n`), else the accessory name (`colorize_acc_l`: a piercing's area may sit in the body region),
     * else, while `characterAccessoryMapFallback` is on, a name with no region ending in the role (not `_mn` or `_tn`).
     * Another region's named maps never stand in. Derived, moved from Graphene's accessories.
     * @param {string[]} folders The item's folders, first searched first.
     * @param {function(string): string[]} list The listed files below a folder.
     * @returns {Object<string, Object<string, ?{ path: string, fallback: boolean }>>} Per region and role the map,
     *   and whether it was not named for the region; null where none is found.
     */
    static pickAccessoryMaps(folders, list)
    {
        const all = folders.flatMap(dir => list(dir).filter(file => file.lastIndexOf("/") === dir.length - 1 && file.endsWith(".png")));
        const tiers = CjsCharacterTextureRoles.tierOrder();
        const stem = file => { const [ name ] = CjsCharacterTextureRoles.splitTier(file); return name.slice(name.lastIndexOf("/") + 1); };
        const pick = test => tiers.map(tier => all.find(file => CjsCharacterTextureRoles.splitTier(file)[1] === tier && test(stem(file)))).find(Boolean) ?? null;
        const qualified = new RegExp("^(colorize|comp)_(" + CjsCharacterTextureRoles.regions.join("|") + ")_", "u");
        const result = {};
        for (const region of CjsCharacterTextureRoles.regions)
        {
            result[region] = {};
            for (const role of [ "l", "z", "d", "n", "s" ])
            {
                const family = role === "l" || role === "z" ? "colorize_" : "comp_";
                const named = pick(name => name === family + region + "_" + role);
                const found = named ?? pick(name => name === family + "acc_" + role) ?? (CjsCharacterTextureRoles.characterAccessoryMapFallback
                    ? pick(name => name.endsWith("_" + role) && !/_(mn|tn)$/u.test(name) && !qualified.test(name)) : null);
                result[region][role] = found ? { path: found, fallback: !named } : null;
            }
        }
        return result;
    }


    static readFolder(folder, files)
    {
        const maps = files.filter(file => file.startsWith(folder) && file.lastIndexOf("/") === folder.length - 1 && file.endsWith(".png"));
        const names = [ ...new Set(maps.map(file => CjsCharacterTextureRoles.splitTier(file)[0])) ];
        const composed = names.filter(stem => /^(comp|colorize)_/u.test(stem.slice(folder.length)));
        return {
            roles: composed.map(stem => CjsCharacterTextureRoles.lookup(CjsCharacterTextureRoles.pickTier(stem + ".png", maps))),
            skipped: names.filter(stem => !composed.includes(stem)).map(stem => stem.slice(folder.length))
        };
    }

    /**
     * The one map among roles that matches, or null.
     * @param {Array<ReturnType<typeof CjsCharacterTextureRoles.lookup>>} roles The maps' roles.
     * @param {function(object): boolean} match The test.
     * @returns {?ReturnType<typeof CjsCharacterTextureRoles.lookup>}
     * @throws {Error} For more than one match.
     */
    static one(roles, match)
    {
        const found = roles.filter(match);
        if (found.length > 1) throw new Error("Ambiguous paper doll maps " + found.map(role => role.path).join(", "));
        return found[0] ?? null;
    }

}
