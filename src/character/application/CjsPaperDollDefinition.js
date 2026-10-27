import { CjsPaperDollScars } from "./CjsPaperDollScars.js";
import { CjsPaperDollAging } from "./CjsPaperDollAging.js";
import { CjsPaperDollScarring } from "./CjsPaperDollScarring.js";
import { CjsPaperDollFreckles } from "./CjsPaperDollFreckles.js";
import { CjsPaperDollSkin } from "./CjsPaperDollSkin.js";
import { meta, type } from "#schema";
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
import { CjsPaperDollHair } from "./CjsPaperDollHair.js";
import { CjsPaperDollGlasses } from "./CjsPaperDollGlasses.js";
import { CjsPaperDollEarsLow } from "./CjsPaperDollEarsLow.js";
import { CjsPaperDollEarsHigh } from "./CjsPaperDollEarsHigh.js";
import { CjsPaperDollNose } from "./CjsPaperDollNose.js";
import { CjsPaperDollLips } from "./CjsPaperDollLips.js";
import { CjsPaperDollChin } from "./CjsPaperDollChin.js";
import { CjsPaperDollBrow } from "./CjsPaperDollBrow.js";
import { CjsPaperDollMask } from "./CjsPaperDollMask.js";
import { PaperDollPass } from "./paperDollOrder.js";

/**
 * Who and what one paper doll character is: its identity, its foundation and
 * part settings, and the order those parts bake in. It holds settings only;
 * what is built from them (targets, effects, captured passes) belongs to a
 * `CjsPaperDollInstance`.
 *
 * Each part class stamps its bake rank and the passes it feeds; the definition
 * orders a pass's parts by rank, overrides from `SetLayer` and occlusion, and
 * captures their settings for an instance to apply. Parts and the definition
 * record edits as dirty flags, which the one instance building from it
 * consumes.
 *
 * An application class (operator-approved character application); no Carbon
 * donor.
 */
@meta.define("CjsPaperDollDefinition")
export class CjsPaperDollDefinition
{
    /**
     * Our character texture quality: the size tier of the paper-doll maps a
     * character composes from (`4k`, `2k` for the unsuffixed files, `512`,
     * `256`). A map missing at that tier is taken from the nearest smaller one,
     * then the nearest larger. A character copies it when it is built, so a
     * change shows from the next build (CREATE: the library holds LOAD
     * settings back until it reboots). EVE has its own character quality
     * controls in client code; Carbon registers no such setting. The setting
     * registry records this non-Carbon name with carbon: false.
     */
    @meta.setting("characterTextureQuality", { applies: meta.setting.CREATE, values: [ "4k", "2k", "512", "256" ] })
    static characterTextureQuality = "4k";

    /** The character's name. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollEyes")
    eyes = new CjsPaperDollEyes();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollEyebrows")
    eyebrows = new CjsPaperDollEyebrows();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollBlush")
    blush = new CjsPaperDollBlush();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollArchetype")
    archetype = new CjsPaperDollArchetype();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollSkin")
    skin = new CjsPaperDollSkin();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollFreckles")
    freckles = new CjsPaperDollFreckles();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollAging")
    aging = new CjsPaperDollAging();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollScarring")
    scarring = new CjsPaperDollScarring();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollScars")
    scars = new CjsPaperDollScars();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollTattoo")
    tattoo = new CjsPaperDollTattoo();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollLipstick")
    lipstick = new CjsPaperDollLipstick();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollAugmentations")
    augmentations = new CjsPaperDollAugmentations();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollBodyAugmentation")
    bodyAugmentation = new CjsPaperDollBodyAugmentation();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollArmLeft")
    armLeft = new CjsPaperDollArmLeft();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollArmRight")
    armRight = new CjsPaperDollArmRight();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollEyeshadow")
    eyeshadow = new CjsPaperDollEyeshadow();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollEyeliner")
    eyeliner = new CjsPaperDollEyeliner();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollBottomUnderwear")
    bottomUnderwear = new CjsPaperDollBottomUnderwear();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollTopUnderwear")
    topUnderwear = new CjsPaperDollTopUnderwear();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollBottomMiddle")
    bottomMiddle = new CjsPaperDollBottomMiddle();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollTopMiddle")
    topMiddle = new CjsPaperDollTopMiddle();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollBottomOuter")
    bottomOuter = new CjsPaperDollBottomOuter();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollFeet")
    feet = new CjsPaperDollFeet();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollTopOuter")
    topOuter = new CjsPaperDollTopOuter();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollOuter")
    outer = new CjsPaperDollOuter();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollHair")
    hair = new CjsPaperDollHair();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollGlasses")
    glasses = new CjsPaperDollGlasses();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollEarsLow")
    earsLow = new CjsPaperDollEarsLow();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollEarsHigh")
    earsHigh = new CjsPaperDollEarsHigh();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollNose")
    nose = new CjsPaperDollNose();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollLips")
    lips = new CjsPaperDollLips();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollChin")
    chin = new CjsPaperDollChin();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollBrow")
    brow = new CjsPaperDollBrow();

    @meta.attribute(meta.READ)
    @type.object.embed("CjsPaperDollMask")
    mask = new CjsPaperDollMask();

    /** The collected parts, by member name. Each pass composes its parts by bake rank, not by this order. */
    static parts = [ "skin", "eyes", "eyebrows", "blush", "freckles", "aging", "scarring", "scars", "tattoo", "augmentations", "bodyAugmentation", "armLeft", "armRight", "eyeshadow", "eyeliner", "lipstick", "bottomUnderwear", "topUnderwear", "bottomMiddle", "topMiddle", "bottomOuter", "feet", "topOuter", "outer", "hair", "glasses", "earsLow", "earsHigh", "nose", "lips", "chin", "brow", "mask" ];

    _layers = new Map();
    _dirty = true;
    _passDirty = 0;

    /**
     * Forces the selected foundation and every pass on the next build.
     * @returns {void}
     */
    Rebuild()
    {
        this._dirty = true;
        this.archetype.Rebuild();
        for (const name of CjsPaperDollDefinition.parts) this[name].Rebuild();
    }

    /**
     * Whether the next build must rebuild every pass: `Rebuild` was called, or
     * the selected foundation itself changed (a strength edit alone does not).
     * @returns {boolean}
     */
    IsForced()
    {
        return this._dirty || this.archetype.IsFoundationDirty();
    }

    /**
     * The passes a layer-rank edit invalidated since the last `ClearDirty`.
     * @returns {number} `PaperDollPass` bits.
     */
    GetDirtyPasses()
    {
        return this._passDirty;
    }

    /**
     * Acknowledges every pending edit: the definition's own flags, the
     * foundation's and each part's. A build calls it after capturing.
     * @returns {void}
     */
    ClearDirty()
    {
        this._dirty = false;
        this._passDirty = 0;
        this.archetype.ClearDirty();
        for (const name of CjsPaperDollDefinition.parts) this[name].ClearDirty();
    }

    /**
     * A part's bake rank: its class's `layer`, or the override `SetLayer` installed.
     * @param {string} name The part's member name.
     * @returns {number|null}
     */
    GetLayer(name) { return this._layers.has(name) ? this._layers.get(name) : this[name].constructor.layer; }

    /**
     * Overrides a part's bake rank, to place a layer by eye against the game,
     * and rebuilds every pass the part feeds. The class rank stays the default.
     * @param {string} name The part's member name.
     * @param {number} layer The rank to compose it at.
     * @returns {void}
     * @throws {RangeError} When the rank is not a finite number.
     */
    SetLayer(name, layer)
    {
        if (!Number.isFinite(layer)) throw new RangeError("A layer rank must be a finite number");
        this._layers.set(name, layer);
        this._passDirty |= this[name].constructor.passes;
    }

    /**
     * Restores every part's class rank and rebuilds the passes the overrides touched.
     * @returns {void}
     */
    ResetLayers()
    {
        for (const name of this._layers.keys()) this._passDirty |= this[name].constructor.passes;
        this._layers.clear();
    }

    /**
     * The parts feeding a pass, in bake order; parts with no rank come first,
     * equal ranks keep `parts` order, and an active occluder moves after the
     * active parts it occludes.
     * @param {PaperDollPass} pass The pass whose parts are ordered.
     * @returns {string[]} The parts' member names, first drawn first.
     */
    GetLayerOrder(pass)
    {
        const order = CjsPaperDollDefinition.parts.filter(name => this[name].constructor.passes & pass)
            .sort((a, b) => (this.GetLayer(a) ?? -Infinity) - (this.GetLayer(b) ?? -Infinity) || 0);
        // An active occluder draws after every active part it occludes, so in each shared pass it covers them
        // exactly where its own coverage is (operator, 2026-10-25: occlusion covers only what it covers).
        for (const occluder of [ ...order ])
        {
            const targets = this._Occludes(occluder);
            if (!targets.length) continue;
            const at = order.indexOf(occluder);
            const last = order.reduce((found, name, index) => name !== occluder && this._IsOccludedBy(name, targets) ? index : found, -1);
            if (last > at)
            {
                order.splice(at, 1);
                order.splice(last, 0, occluder);
            }
        }
        return order;
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
     * Whether a part's selected option matches an occlusion target, by its
     * class's recipe category or its option's path.
     * @param {string} name The part's member name.
     * @param {string[]} targets Occlusion targets of one occluder.
     * @returns {boolean} False while the part is off or has no selection.
     */
    _IsOccludedBy(name, targets)
    {
        const part = this[name];
        if (!part.enabled || !part.option) return false;
        const path = part.GetOptions().find(option => option.id === part.option)?.path ?? "";
        return targets.some(target => target === part.constructor.category || CjsPaperDollDefinition.occludes([ target ], path));
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
     * One pass's captured settings, copied so later edits cannot reach them:
     * `order` lists its parts in bake order, `occluded` the active occlusion
     * targets, then each part's capture under its name.
     * @param {PaperDollPass} pass The pass being captured.
     * @param {string[]} names Its parts in bake order, as `GetLayerOrder` returns them.
     * @returns {{order: string[], occluded: string[]}} The capture, with one entry per part name.
     */
    CapturePass(pass, names)
    {
        const state = { order: names, occluded: this.GetOccluded() };
        for (const name of names) state[name] = this[name].Capture(pass);
        return state;
    }
}
