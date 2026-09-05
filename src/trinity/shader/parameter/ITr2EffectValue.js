// Source: trinity/trinity/ITr2EffectValue.h:14-19
//
// The flag word every effect parameter shares.
//
// WHY IT HAS ITS OWN MODULE. Carbon declares `ResourceFlags` on
// `ITr2EffectValue`, the interface every parameter implements, and passes it to
// `CopyToResourceSet`. Here it was a module-private constant inside
// `Tr2Effect.js`, which was fine while `Tr2Effect` was the only writer — it
// stamps the flag into a mapped resource's `registerCount` — and stopped being
// fine on 2026-09-05 when four parameter classes became readers of it.
//
// A COPY IN EACH READER WOULD HAVE WORKED AND THAT IS THE PROBLEM: nothing
// would have caught the day one of them disagreed.

/**
 * Flags a resource is bound with, stored by a mapped resource in
 * `registerCount` — which for a resource is a flag word, not a count. The
 * field name is Carbon's and it means something different for a constant,
 * where it is a byte size.
 */
export const ResourceFlags = Object.freeze({
  RESOURCE_FLAG_NONE: 0,

  /** The texture is bound through the sRGB transfer function. */
  RESOURCE_FLAG_SRGB: 1
});
