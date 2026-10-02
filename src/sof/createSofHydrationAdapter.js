import { CjsSchema } from "#schema";

const ROOT_KINDS = Object.freeze([
  "EveShip2",
  "EveMobile",
  "EveStation2",
  "EveSwarm"
]);

const INITIALIZE_KINDS = [
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
];

/**
 * Creates the compatibility hydration adapter for the deprecated
 * `carbon.document` path.
 *
 * SOF-authored node fields retain existing instance SetValues overrides. Other
 * instances use the shared schema editing service and its member notifications.
 * The adapter retains the per-kind Initialize lifecycle used by this path.
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
      if (typeof instance.SetValues === "function")
      {
        instance.SetValues(values, context?.options);
      }
      else
      {
        CjsSchema.setValues(instance, values, context?.options);
      }
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
