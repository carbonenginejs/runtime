const ROOT_KINDS = Object.freeze([
  "EveShip2",
  "EveMobile",
  "EveStation2",
  "EveSwarm"
]);

const INITIALIZE_KINDS = Object.freeze([
  ...ROOT_KINDS,
  "EveSpaceObjectDecal",
  "EveImpactOverlay",
  "EveSpriteSet",
  "EveSpotlightSet",
  "EvePlaneSet",
  "EveSpriteLineSet",
  "EveHazeSet",
  "EveBannerSet",
  "Tr2RuntimeInstanceData",
  "EveBoosterSet2",
  "EveChildMesh",
  "EveChildContainer"
]);

/**
 * Creates the compatibility hydration adapter for the deprecated
 * `carbon.document` path.
 *
 * All SOF-authored state travels as declared node fields, so the adapter's one
 * remaining job is the per-kind Initialize lifecycle that `CjsModel.from`
 * performs on the values path.
 *
 * It used to carry a second job. The audio emitter was emitted as a plain
 * descriptor in a node's `raw` bag and lifted out here into a WeakMap, because
 * there was no audio model that could be named without dragging WebAudio in.
 * `src/audio/trinity` owns that model now, the emitter is an ordinary
 * declared node in `TriObserverLocal.observer`, and the side channel is gone
 * with it, so this adapter no longer reads audio setup from `raw`.
 * Externally supplied compatibility descriptors and fragments may still carry
 * `raw`; the internal builder preserves them.
 */
export function createSofHydrationAdapter()
{
  return {
    applyValues(instance, values, context)
    {
      instance.SetValues(values, context?.options);
      return instance;
    },
    finalize(instance, context)
    {
      if (INITIALIZE_KINDS.includes(context?.kind))
      {
        instance.Initialize();
      }
    }
  };
}
