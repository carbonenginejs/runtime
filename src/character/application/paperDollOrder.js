/**
 * Bake order of the paper doll's skin layers: each part class stamps its rank
 * as `static layer`, and the doll composes a pass's layers in ascending rank.
 *
 * This is the composition order, not the recipe category order
 * (`CjsCharacterModifierOrder`), which files parts by where they are stored.
 * The ranks are the working order agreed with the operator on 2026-10-25 and
 * are confirmed layer by layer against the game. They are spaced so a layer
 * can be placed between two others without renumbering.
 *
 * @readonly
 * @enum {number}
 */
export const PaperDollLayer = Object.freeze({
    /** The base skin colour every other layer is drawn over. */
    SKINTONE: 0,
    /** A base layer: wrinkles and relief under all cosmetics. */
    AGING: 10,
    TATTOO: 30,
    EYEBROWS: 40,
    SCARRING: 50,
    FRECKLES: 60,
    BLUSH: 70,
    EYESHADOW: 90,
    EYELINER: 100,
    LIPSTICK: 110,
    /** Over the lipstick (operator, in game) and before every garment; its place against the scars is unconfirmed. */
    AUGMENTATIONS: 112,
    /** Body augmentations: with the face ones, before every garment. */
    BODYAUGMENTATION: 114,
    ARMLEFT: 116,
    ARMRIGHT: 118,
    SCARS: 120,
    /** Body: over the skin and its freckles; the bra goes over the underpants. */
    BOTTOMUNDERWEAR: 130,
    TOPUNDERWEAR: 140,
    /** Baked garments over the underwear: tights, then the top over them. Working ranks, to confirm in game. */
    BOTTOMMIDDLE: 150,
    TOPMIDDLE: 160
});

/**
 * The doll's update passes, as bits: a part class declares the passes its
 * settings feed as `static passes`. Each pass has its own binding.
 *
 * @readonly
 * @enum {number}
 */
export const PaperDollPass = Object.freeze({
    /** The archetype's resolved foundation: geometry, morphs and base maps. */
    FOUNDATION: 1,
    /** The skin colour maps, head and body. */
    SKIN: 2,
    /** Normal and specular contributions. */
    SURFACE: 4,
    /** The eye material. */
    EYES: 8,
    /** The composed head diffuse. */
    HEAD: 16,
    /** The composed body diffuse. */
    BODY: 32
});
