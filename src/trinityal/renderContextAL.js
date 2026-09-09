// Source: trinity/trinity/Tr2RenderContext.h:108-125
//
// Carbon's `Tr2RenderContext` INHERITS `Tr2RenderContextAL`, so a Trinity class
// that writes `buffer.Create( size, usage, data, renderContext )` hands the AL
// its own type by an implicit upcast (`Tr2PrimaryRenderContext` "contains a
// casting operator to Tr2RenderContext (which does a plain C-style cast)").
// Ours COMPOSES: the Trinity context holds the AL behind `GetRenderContextAL()`.
// This is that upcast, written once, for every AL `Create` that Trinity calls
// with its own context.


/**
 * The abstraction-layer context behind whatever a caller passed.
 *
 * @param {object|null} context A Trinity `Tr2RenderContext`, or the AL itself.
 * @returns {object|null} The AL context, or null for nothing.
 */
export function RenderContextALOf(context)
{
  if (!context) return null;

  return typeof context.GetRenderContextAL === "function" ? context.GetRenderContextAL() : context;
}
