// Source: trinity/trinity/ITr2Renderable.h (enum Tr2PickType, :76-86)

/**
 * Which kinds of geometry a pick pass collects, as a bitmask. A caller ORs the
 * members together; `Tr2PickTypes` is Carbon's name for the combined uint32.
 *
 * The default a pick starts from is `PICK_TYPE_PICKING | PICK_TYPE_OPAQUE`
 * (EveSpaceScene.h:554), which is picking-only geometry plus the solid pass.
 *
 * Vocabulary rather than a class member: Carbon declares it beside the
 * renderable interface, and it is consumed by every pickable. Its sibling
 * `TriBatchType` lives in `#consts/graphics`; this one
 * stays in the Trinity layer while it is the only consumer, and belongs beside
 * that sibling once an engine-layer picking pass needs it too.
 */
export const Tr2PickType = Object.freeze({
  /** Geometry authored specifically for picking. */
  PICK_TYPE_PICKING: 1 << 0,

  /** The solid pass, plus decals and the pickable overlay effects. */
  PICK_TYPE_OPAQUE: 1 << 1,

  /** Transparent and additive areas. */
  PICK_TYPE_TRANSPARENT: 1 << 2,

  /** Attachment geometry - sprite sets, spotlights and the like. */
  PICK_TYPE_ATTACHMENTS: 1 << 3,

  /** Locator markers. */
  PICK_TYPE_LOCATORS: 1 << 4
});

/** The mask a pick uses when the caller names none (EveSpaceScene.h:554). */
export const TR2_PICK_TYPE_DEFAULT = Tr2PickType.PICK_TYPE_PICKING | Tr2PickType.PICK_TYPE_OPAQUE;
