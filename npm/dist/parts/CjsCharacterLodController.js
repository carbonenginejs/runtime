/**
 * Outer projected-size driver for the verified whole-model Trinity LOD owner.
 * It supplies the scene-derived value that the open base class cannot compute.
 */
class CjsCharacterLodController {
  /**
   * Selects an explicit whole-model LOD while preserving the verified native
   * proxy availability and residency fallback order.
   *
   * LOD 0 is the normal choice for a fully controllable hero character.
   * LODs 1 and 2 are deliberate reduced-capability choices for cases such as
   * crowd rendering; callers must not assume identical rigs or morph sets.
   */
  SelectLod(skinnedObject, requestedLod, {
    frustum = null
  } = {}) {
    const lod = Number(requestedLod);
    if (!Number.isInteger(lod) || lod < 0 || lod > 2) {
      throw new TypeError(`Character LOD must be 0, 1, or 2, received ${requestedLod}`);
    }

    // These values select the exact native threshold bands. The native
    // helper remains responsible for unavailable/temporary proxy fallback.
    const diameter = [501, 500, 150][lod];
    return this.#Select(skinnedObject, diameter, frustum, lod);
  }

  /** Selects the fully featured LOD 0 model, subject to proxy fallback. */
  SelectPrimary(skinnedObject, options = {}) {
    return this.SelectLod(skinnedObject, 0, options);
  }

  /** Selects one whole model for an explicit projected pixel diameter. */
  SelectProjectedSize(skinnedObject, estimatedPixelDiameter, {
    frustum = null
  } = {}) {
    const diameter = Number(estimatedPixelDiameter);
    if (!Number.isFinite(diameter) || diameter < 0 || diameter >= 1000000) {
      throw new TypeError(`Character projected pixel diameter must be finite and between 0 and 1000000, received ${estimatedPixelDiameter}`);
    }
    return this.#Select(skinnedObject, diameter, frustum, null);
  }
  #Select(skinnedObject, diameter, frustum, requestedLod) {
    if (!skinnedObject || typeof skinnedObject.SetLOD !== "function" || typeof skinnedObject.GetCurrentLod !== "function") {
      throw new TypeError("Character LOD control requires a skinned-object LOD owner");
    }
    if (frustum !== null && typeof frustum.IsSphereVisible !== "function") {
      throw new TypeError("Character LOD frustum must expose a visibility method");
    }
    const driver = {
      IsSphereVisible(...args) {
        return frustum ? frustum.IsSphereVisible(...args) : true;
      },
      GetPixelSizeAccross() {
        return diameter;
      }
    };

    // estimatedPixelDiameter is read-only at the public Trinity boundary;
    // this write is the deliberate outer-runtime seam supplying scene data.
    skinnedObject.estimatedPixelDiameter = diameter;
    skinnedObject.SetLOD(driver);
    return Object.freeze({
      currentLod: skinnedObject.GetCurrentLod(),
      estimatedPixelDiameter: skinnedObject.estimatedPixelDiameter,
      requestedLod,
      visualModel: skinnedObject.visualModel ?? null
    });
  }
}

export { CjsCharacterLodController };
//# sourceMappingURL=CjsCharacterLodController.js.map
