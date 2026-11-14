import { CjsPaperDollScars } from "./CjsPaperDollScars.js";
import { CjsPaperDollAging } from "./CjsPaperDollAging.js";
import { CjsPaperDollScarring } from "./CjsPaperDollScarring.js";
import { CjsPaperDollFreckles } from "./CjsPaperDollFreckles.js";
import { CjsPaperDollSkin } from "./CjsPaperDollSkin.js";
import { meta, type } from "#schema";
import { blue } from "#blue";
import { CjsPaperDollArchetype } from "./CjsPaperDollArchetype.js";
import { CjsPaperDollEyes } from "./CjsPaperDollEyes.js";
import { CjsPaperDollEyebrows } from "./CjsPaperDollEyebrows.js";
import { CjsPaperDollBlush } from "./CjsPaperDollBlush.js";
import { CjsPaperDollTattoo } from "./CjsPaperDollTattoo.js";
import { CjsPaperDollLipstick } from "./CjsPaperDollLipstick.js";
import { CjsPaperDollBottomUnderwear } from "./CjsPaperDollBottomUnderwear.js";
import { CjsPaperDollTopUnderwear } from "./CjsPaperDollTopUnderwear.js";
import { CjsPaperDollEyeshadow } from "./CjsPaperDollEyeshadow.js";
import { CjsPaperDollAugmentations } from "./CjsPaperDollAugmentations.js";
import { CjsPaperDollBodyAugmentation } from "./CjsPaperDollBodyAugmentation.js";
import { CjsPaperDollArmLeft } from "./CjsPaperDollArmLeft.js";
import { CjsPaperDollArmRight } from "./CjsPaperDollArmRight.js";
import { CjsPaperDollEyeliner } from "./CjsPaperDollEyeliner.js";
import { CjsPaperDollTopMiddle } from "./CjsPaperDollTopMiddle.js";
import { CjsPaperDollBottomMiddle } from "./CjsPaperDollBottomMiddle.js";
import { CjsPaperDollBottomOuter } from "./CjsPaperDollBottomOuter.js";
import { CjsPaperDollFeet } from "./CjsPaperDollFeet.js";
import { CjsPaperDollTopOuter } from "./CjsPaperDollTopOuter.js";
import { CjsPaperDollOuter } from "./CjsPaperDollOuter.js";
import { CjsPaperDollBeard } from "./CjsPaperDollBeard.js";
import { CjsPaperDollHair } from "./CjsPaperDollHair.js";
import { CjsPaperDollGlasses } from "./CjsPaperDollGlasses.js";
import { CjsPaperDollEarsLow } from "./CjsPaperDollEarsLow.js";
import { CjsPaperDollEarsHigh } from "./CjsPaperDollEarsHigh.js";
import { CjsPaperDollEars } from "./CjsPaperDollEars.js";
import { CjsPaperDollNose } from "./CjsPaperDollNose.js";
import { CjsPaperDollLips } from "./CjsPaperDollLips.js";
import { CjsPaperDollChin } from "./CjsPaperDollChin.js";
import { CjsPaperDollBrow } from "./CjsPaperDollBrow.js";
import { CjsPaperDollMask } from "./CjsPaperDollMask.js";
import { PaperDollTarget } from "./paperDollOrder.js";
import { CjsCharacterTextureRoles } from "../library/CjsCharacterTextureRoles.js";


/**
 * Who and what one paper doll character is: its identity, its foundation and
 * part settings, and the order those parts bake in. It holds settings only;
 * what is built from them (targets, effects, captured targets) belongs to a
 * `CjsPaperDollInstance`.
 *
 * Each part class stamps its bake rank and the targets it feeds; the definition
 * orders a target's parts by rank, overrides from `SetLayer` and occlusion, and
 * captures their settings for an instance to apply. Parts and the definition
 * record edits as dirty flags, which the one instance building from it
 * consumes.
 *
 * An application class; no Carbon
 * donor.
 */
@meta.define("CjsPaperDollDefinition")
export class CjsPaperDollDefinition
{

    _layers = new Map();

    _dirty = true;

    _targetDirty = 0;

    /** Authored asset family. Changing it requires rebuilding the whole character instance. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    sex = "female";

    /** The character's name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollEyes")
    eyes = new CjsPaperDollEyes();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollEyebrows")
    eyebrows = new CjsPaperDollEyebrows();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollBlush")
    blush = new CjsPaperDollBlush();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollArchetype")
    archetype = new CjsPaperDollArchetype();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollSkin")
    skin = new CjsPaperDollSkin();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollFreckles")
    freckles = new CjsPaperDollFreckles();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollAging")
    aging = new CjsPaperDollAging();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollScarring")
    scarring = new CjsPaperDollScarring();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollScars")
    scars = new CjsPaperDollScars();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollTattoo")
    tattoo = new CjsPaperDollTattoo();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollLipstick")
    lipstick = new CjsPaperDollLipstick();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollAugmentations")
    augmentations = new CjsPaperDollAugmentations();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollBodyAugmentation")
    bodyAugmentation = new CjsPaperDollBodyAugmentation();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollArmLeft")
    armLeft = new CjsPaperDollArmLeft();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollArmRight")
    armRight = new CjsPaperDollArmRight();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollEyeshadow")
    eyeshadow = new CjsPaperDollEyeshadow();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollEyeliner")
    eyeliner = new CjsPaperDollEyeliner();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollBottomUnderwear")
    bottomUnderwear = new CjsPaperDollBottomUnderwear();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollTopUnderwear")
    topUnderwear = new CjsPaperDollTopUnderwear();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollBottomMiddle")
    bottomMiddle = new CjsPaperDollBottomMiddle();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollTopMiddle")
    topMiddle = new CjsPaperDollTopMiddle();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollBottomOuter")
    bottomOuter = new CjsPaperDollBottomOuter();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollFeet")
    feet = new CjsPaperDollFeet();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollTopOuter")
    topOuter = new CjsPaperDollTopOuter();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollOuter")
    outer = new CjsPaperDollOuter();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollHair")
    hair = new CjsPaperDollHair();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollBeard")
    beard = new CjsPaperDollBeard();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollGlasses")
    glasses = new CjsPaperDollGlasses();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollEarsLow")
    earsLow = new CjsPaperDollEarsLow();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollEarsHigh")
    earsHigh = new CjsPaperDollEarsHigh();

    // Ours: the game has no ears location (CjsPaperDollEars).
    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollEars")
    ears = new CjsPaperDollEars();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollNose")
    nose = new CjsPaperDollNose();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollLips")
    lips = new CjsPaperDollLips();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollChin")
    chin = new CjsPaperDollChin();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollBrow")
    brow = new CjsPaperDollBrow();

    @meta.mapAttribute(meta.READ)
    @type.object.embed("CjsPaperDollMask")
    mask = new CjsPaperDollMask();

    /**
     * Forces the selected foundation and every target on the next build.
     * @returns {void}
     */
    Rebuild()
    {
        this._dirty = true;
        this.archetype.Rebuild();
        for (const name of CjsPaperDollDefinition.parts) this[name].Rebuild();
    }

    /**
     * Whether the next build must rebuild every target: `Rebuild` was called, or
     * the selected foundation itself changed (a strength edit alone does not).
     * @returns {boolean}
     */
    IsForced()
    {
        return this._dirty || this.archetype.IsFoundationDirty();
    }

    /**
     * The targets a layer-rank edit invalidated since the last `ClearDirty`.
     * @returns {number} `PaperDollTarget` bits.
     */
    GetDirtyTargets()
    {
        return this._targetDirty;
    }

    /**
     * Acknowledges every pending edit: the definition's own flags, the
     * foundation's and each part's. A build calls it after capturing.
     * @returns {void}
     */
    ClearDirty()
    {
        this._dirty = false;
        this._targetDirty = 0;
        this.archetype.ClearDirty();
        for (const name of CjsPaperDollDefinition.parts) this[name].ClearDirty();
    }

    /**
     * A part's bake rank: its class's `layer`, or the override `SetLayer` installed.
     * @param {string} name The part's member name.
     * @returns {number|null}
     */
    GetLayer(name)
    {
        return this._layers.has(name) ? this._layers.get(name) : this[name].constructor.layer;
    }

    /**
     * Overrides a part's bake rank, to place a layer by eye against the game,
     * and rebuilds every target the part feeds. The class rank stays the default.
     * @param {string} name The part's member name.
     * @param {number} layer The rank to compose it at.
     * @returns {void}
     * @throws {RangeError} When the rank is not a finite number.
     */
    SetLayer(name, layer)
    {
        if (!Number.isFinite(layer)) throw new RangeError("A layer rank must be a finite number");
        this._layers.set(name, layer);
        this._targetDirty |= this[name].constructor.targets;
    }

    /**
     * Restores every part's class rank and rebuilds the targets the overrides touched.
     * @returns {void}
     */
    ResetLayers()
    {
        for (const name of this._layers.keys()) this._targetDirty |= this[name].constructor.targets;
        this._layers.clear();
    }

    /**
     * The parts feeding a target, in bake order; parts with no rank come first,
     * equal ranks keep `parts` order. Occlusion does not reorder: an occluded
     * part leaves the bake (`CjsPaperDollInstance.suppress`).
     * @param {PaperDollTarget} target The target whose parts are ordered.
     * @returns {string[]} The parts' member names, first drawn first.
     */
    GetLayerOrder(target)
    {
        return CjsPaperDollDefinition.parts.filter(name => this[name].constructor.targets & target)
            .sort((a, b) => (this.GetLayer(a) ?? -Infinity) - (this.GetLayer(b) ?? -Infinity) || 0);
    }

    /**
     * What a part's selected option occludes: the `occludesModifiers` of its
     * metadata (recipe categories or part paths), empty while it is off.
     * @param {string} name The part's member name.
     * @returns {string[]} Its occlusion targets; empty while it is off or has no selection.
     */
    _Occludes(name)
    {
        const part = this[name];
        if (!part.enabled || !part.option) return [];
        return part.GetOptions().find(option => option.id === part.option)?.occludes ?? [];
    }

    /**
     * Every occlusion target of the active options, sorted: recipe categories
     * and modifier paths, including geometry the doll does not collect (the
     * brow base a face paint occludes).
     * @returns {string[]} The targets, each once.
     */
    GetOccluded()
    {
        return [ ...new Set(CjsPaperDollDefinition.parts.flatMap(name => this._Occludes(name))) ].sort();
    }

    /**
     * One target's captured settings, copied so later edits cannot reach them:
     * `order` lists its parts in bake order, `occluded` the active occlusion
     * targets, then each part's capture under its name.
     * @param {PaperDollTarget} target The target being captured.
     * @param {string[]} names Its parts in bake order, as `GetLayerOrder` returns them.
     * @returns {{order: string[], occluded: string[]}} The capture, with one entry per part name.
     */
    CaptureTarget(target, names)
    {
        const state = { order: names, occluded: this.GetOccluded() };
        for (const name of names) state[name] = this[name].Capture(target);
        return state;
    }

    /**
     * Whether occlusion targets cover a modifier path: a target names the path
     * itself or a folder above it (`accessories/browbase` covers
     * `accessories/browbase/browbase_01`).
     * @param {string[]} targets Occlusion targets, as `GetOccluded` returns them.
     * @param {string} path A modifier path below the paper doll root.
     * @returns {boolean}
     */
    static occludes(targets, path)
    {
        return path !== "" && targets.some(target => target === path || path.startsWith(target + "/"));
    }

    /**
     * The paper-doll map size: the parts library's setting (`CjsCharacterTextureRoles.characterTextureQuality`), read
     * and written through here until the host modules that read it here move (R6).
     * @type {string}
     */
    static get characterTextureQuality() { return CjsCharacterTextureRoles.characterTextureQuality; }

    static set characterTextureQuality(value) { CjsCharacterTextureRoles.characterTextureQuality = value; }

    /** The parts library's `splitTier`, until the host modules that call it here move (R6). @param {string} path @returns {[string, string]} */
    static splitTier(path) { return CjsCharacterTextureRoles.splitTier(path); }

    /** The parts library's `tierOrder`, until the host modules that call it here move (R6). @param {string} [quality] @returns {string[]} */
    static tierOrder(quality) { return CjsCharacterTextureRoles.tierOrder(quality); }

    /** The parts library's `pickTier`, until the host modules that call it here move (R6). @param {string} path @param {string[]} files @returns {?string} */
    static pickTier(path, files) { return CjsCharacterTextureRoles.pickTier(path, files); }

    /** The parts library's `tierCandidates`, until the host modules that call it here move (R6). @param {string[]} files @param {string} ending @returns {string[]} */
    static tierCandidates(files, ending) { return CjsCharacterTextureRoles.tierCandidates(files, ending); }

    /**
     * Every file below a `res:` directory, from the resource index, sorted: Blue's `paths.Filter` walks it through
     * Carbon's `BluePaths::GetDirectoryContents` (`blue/src/BluePaths.cpp:111-117`), so option and inventory lists
     * come from the indexed build. The remote file system lists a stored `.black` as `.red`
     * (`BlueResFileSystemRemote.cpp:23-36`) and character content loads the stored `.black`, so the names are mapped
     * back before sorting, which orders `.black` before `.gr2` and `.png` as the stored names do.
     * Ours (moved from Graphene's `resourceListing.js`, character-structure-and-plugins.md R5).
     * @param {string} directory A lowercase `res:` directory, with or without its trailing slash.
     * @param {{ Filter: function(string, function(string): boolean): string[] }} [paths] The paths service listed;
     *   Blue's own by default.
     * @returns {string[]} Full `res:` paths of every file below it.
     */
    static listFiles(directory, paths = blue.paths)
    {
        return paths.Filter(directory, () => true).map(path => path.replace(/\.red$/u, ".black")).sort();
    }

    /** The collected parts, by member name. Each target composes its parts by bake rank, not by this order. */
    static parts = [ "skin", "eyes", "eyebrows", "blush", "freckles", "aging", "scarring", "scars", "tattoo", "augmentations", "bodyAugmentation", "armLeft", "armRight", "eyeshadow", "eyeliner", "lipstick", "bottomUnderwear", "topUnderwear", "bottomMiddle", "topMiddle", "bottomOuter", "feet", "topOuter", "outer", "hair", "beard", "glasses", "earsLow", "earsHigh", "ears", "nose", "lips", "chin", "brow", "mask" ];

}
