const ROOT_KINDS = Object.freeze(["EveShip2", "EveMobile", "EveStation2", "EveSwarm"]);
const INITIALIZE_KINDS = Object.freeze([...ROOT_KINDS, "EveSpaceObjectDecal", "EveImpactOverlay", "EveSpriteSet", "EveSpotlightSet", "EvePlaneSet", "EveSpriteLineSet", "EveHazeSet", "EveBannerSet", "Tr2RuntimeInstanceData", "EveBoosterSet2", "EveChildMesh", "EveChildContainer"]);

/**
 * Creates the hydration adapter for the explicit carbon.document path.
 *
 * All SOF-authored state travels as declared node fields, so the adapter's one
 * remaining job is the per-kind Initialize lifecycle that `CjsModel.from`
 * performs on the values path.
 *
 * It used to carry a second job. The audio emitter was emitted as a plain
 * descriptor in a node's `raw` bag and lifted out here into a WeakMap, because
 * there was no audio model that could be named without dragging WebAudio in.
 * `runtime-audio/trinity` is that model now, the emitter is an ordinary
 * declared node in `TriObserverLocal.observer`, and the side channel is gone
 * with it. `raw` consequently has no writer left in this package.
 */
function createSofHydrationAdapter() {
  return {
    applyValues(instance, values, context) {
      if (instance && typeof instance.SetValues === "function") {
        instance.SetValues(values, context?.options);
      } else {
        Object.assign(instance, values);
      }
      return instance;
    },
    finalize(instance, context) {
      if (INITIALIZE_KINDS.includes(context?.kind)) {
        if (typeof instance.Initialize === "function") instance.Initialize();else if (typeof instance.Rebuild === "function") instance.Rebuild();
      }
    }
  };
}

export { createSofHydrationAdapter };
//# sourceMappingURL=createSofHydrationAdapter.js.map
