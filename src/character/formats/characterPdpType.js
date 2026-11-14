/**
 * The file shapes the character readers know: one value per shape, set on each record the reader makes
 * (`CjsCharacterRecord._pdpType`), so a record loaded anywhere still says which shape it was read from. Each
 * reader configuration names its kinds' values (`CjsCharacterLibraryConfiguration.kinds`, the character factory's
 * `recipeConfiguration`). `PART` is the parts library's join of a part folder, which has no file of its own.
 *
 * Ours (non-carbon-extensions.md § *The shared character library*): the client's paper doll
 * is Python, so Carbon has no counterpart.
 */
export const CjsCharacterPdpType = Object.freeze({
    /** Not read from a file, or not yet stored. */
    NONE: 0,
    PART: 1,
    AVATAR_PART_META_DATA: 2,
    COLOR_VARIATION: 3,
    BASE_COLOR: 4,
    TYPE: 5,
    PROJECTED_DECAL: 6,
    /** A camera written as named keys. */
    CAMERA: 7,
    /** A camera written as a six-slot list. */
    CAMERA_SEQUENCE: 8,
    POSITION: 9,
    POSE: 10,
    BACKGROUND: 11,
    /** A post written with a boolean `lut` and a four-component `lut_influence`. */
    POST: 12,
    /** A post written with a string `lut` and a scalar `lut_influence` (always the empty post). */
    POST_SCALAR: 13,
    PRESET: 14,
    SCENE: 15,
    CURVE_SET_METADATA: 16,
    CURVE_CACHE_LIST: 17,
    MATERIAL_SET: 18,
    ANIMATION_INFO: 19,
    MOVEMENT_STATES: 20,
    ANIMATION_DATA: 21,
    ANIMATION_OFFSETS: 22,
    BIND_POSE: 23,
    POST_BASE_NAMES: 24,
    BLEND_SHAPES: 25,
    FACE_MAPPING: 26,
    FACE_TWEAK_SETTINGS: 27,
    MODIFIER_NAMES: 28,
    SCULPTING_LIMITS: 29,
    FIELD_SET: 30,
    CLIP: 31,
    RIG: 32,
    GSTATE: 33,
    TEXTURE: 34,
    BLACK_RESOURCE: 35,
    GEOMETRY_RESOURCE: 36,
    STATIC_RESOURCE: 37,
    RECIPE: 38,
    LIGHT_RIG: 39
});
