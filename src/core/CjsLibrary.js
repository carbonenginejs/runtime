/**
 * EMPTIED ON PURPOSE, 2026-09-17, by operator instruction.
 *
 * What was here: 859 lines of service composition and resource-request policy,
 * with no donor citation anywhere in the file. Nothing in `src` imported it -
 * the only references were comments, five test files, and a generated demo
 * bundle - so removing it cost no caller.
 *
 * The two shapes that decided it:
 *
 * - `resourceBehaviors`, a registry of named strategy objects carrying
 *   `CanResolveResourceRequest`/`ResolveResourceRequest`, ordered by priority
 *   with a default, consulted to decide what a resource request resolved to.
 *   Carbon has no such concept; a search of the whole tree for the term returns
 *   nothing. Carbon decides by path, extension and requested type, plus
 *   constructors registered for `dynamic:/` names.
 * - Two APIs for the same three services: named accessors
 *   (`GetResourceManager`, `SetAudioManager`, ...) beside a generic keyed
 *   registry (`SetService`, `GetService`, `HasService`, `RemoveService`).
 *
 * The class and its default export stay so the package surface is unchanged
 * while the real one is written.
 *
 * What replaces it is decided, not open:
 * `/docs/internal/decisions/composition-root-is-the-wrapper.md`. One instance
 * per page. The root is the outward API a wrapping user holds - a ship from a
 * name, a type, a graphic id, a type id plus skin id, a res path, or DNA - and
 * what it owns is instantiation. Services live behind a holder named for
 * Carbon's own prefix (`BeResMan` is `Be` + `ResMan`, and `Be` is Blue), so
 * `blue.resMan` and `blue.paths`, in `global/blue`. Consumers reach a service
 * THROUGH the holder and never capture it, which is what keeps the
 * implementation swappable. An unconfigured service throws when asked.
 */

/** CarbonEngineJS composition root. Awaiting rebuild; see the head comment. */
export class CjsLibrary
{

}

export default CjsLibrary;
