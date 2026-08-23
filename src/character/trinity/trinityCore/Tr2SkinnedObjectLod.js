// Source: trinity/trinity/Tr2SkinnedObjectLOD.h
// Source: trinity/trinity/Tr2SkinnedObjectLOD.cpp
import { carbon, impl } from "#schema";

const LOW_DETAIL_THRESHOLD = 150;
const MEDIUM_DETAIL_THRESHOLD = 500;
const HIGH_MEDIUM_MARGIN = 0;
const MEDIUM_LOW_MARGIN = 0;
const UNLOAD_MAX_FRAME_TIME = 0.1;
const RESOURCE_UNLOAD_TIME = 10;

/**
 * Native helper owned by Tr2SkinnedObject.
 *
 * This is a real Trinity class, but not a Blue-declared/persisted object. The
 * owner exposes its three proxy values and delegates selection to this helper.
 */
export class Tr2SkinnedObjectLod
{
  highDetailProxy = null;
  lowDetailProxy = null;
  mediumDetailProxy = null;

  #allowLodSelection = false;
  #currentLod = -1;

  /**
   * Repopulates availability when one of the three owned proxy references
   * changes.
   */
  @carbon.method
  @impl.implemented
  OnModified(value)
  {
    if (value === this.highDetailProxy
      || value === this.mediumDetailProxy
      || value === this.lowDetailProxy)
    {
      this.PopulateLods();
    }
    return true;
  }

  /** Enables whole-model selection whenever at least one detail proxy is present. */
  @carbon.method
  @impl.implemented
  PopulateLods()
  {
    this.#allowLodSelection = !!(
      this.highDetailProxy
      || this.mediumDetailProxy
      || this.lowDetailProxy
    );
  }

  /**
   * Selects the best available or resident whole-model proxy for a projected
   * pixel diameter.
   */
  @carbon.method
  @impl.implemented
  SetLOD(_frustum, estimatedPixelDiameter)
  {
    if (!this.#allowLodSelection)
    {
      return null;
    }

    const proxies = [
      this.highDetailProxy,
      this.mediumDetailProxy,
      this.lowDetailProxy
    ];
    let stickyLod = -1;

    for (const proxy of proxies)
    {
      if (proxy?.IsTemporary())
      {
        stickyLod = this.#currentLod;
      }
    }

    let choices = [ 0, 1, 2 ];
    if (stickyLod === 2
      || (this.#currentLod >= 2
        && estimatedPixelDiameter <= LOW_DETAIL_THRESHOLD + MEDIUM_LOW_MARGIN)
      || (this.#currentLod < 2
        && estimatedPixelDiameter <= LOW_DETAIL_THRESHOLD - MEDIUM_LOW_MARGIN))
    {
      choices = [ 2, 1, 0 ];
    }
    else if (stickyLod === 1
      || (this.#currentLod >= 1
        && estimatedPixelDiameter <= MEDIUM_DETAIL_THRESHOLD + HIGH_MEDIUM_MARGIN)
      || (this.#currentLod < 1
        && estimatedPixelDiameter <= MEDIUM_DETAIL_THRESHOLD - HIGH_MEDIUM_MARGIN))
    {
      choices = [ 1, 2, 0 ];
    }

    let selectedLod = -1;
    let model = null;
    let modelIsTemporary = true;

    for (const lod of choices)
    {
      const proxy = proxies[lod];
      if (proxy && (!model || (modelIsTemporary && proxy.IsResident())))
      {
        model = proxy.GetObject();
        selectedLod = lod;
        modelIsTemporary = proxy.IsTemporary();
      }
    }

    if (model && this.#currentLod !== selectedLod && selectedLod !== -1)
    {
      this.#currentLod = selectedLod;
      proxies[this.#currentLod].OnSelected();
    }

    return model;
  }

  /**
   * Replaces the object held by the existing high-detail proxy when both values
   * are available.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Uses an already supplied Blue proxy; proxy construction belongs to the outer runtime adapter.")
  SetHighDetailModel(model)
  {
    SetProxyObject(this.highDetailProxy, model);
  }

  /**
   * Replaces the object held by the existing medium-detail proxy when both
   * values are available.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Uses an already supplied Blue proxy; proxy construction belongs to the outer runtime adapter.")
  SetMediumDetailModel(model)
  {
    SetProxyObject(this.mediumDetailProxy, model);
  }

  /**
   * Replaces the object held by the existing low-detail proxy when both values
   * are available.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Uses an already supplied Blue proxy; proxy construction belongs to the outer runtime adapter.")
  SetLowDetailModel(model)
  {
    SetProxyObject(this.lowDetailProxy, model);
  }

  /**
   * Updates unselected proxy lifetimes on acceptable frame times while keeping
   * the selected model resident.
   */
  @carbon.method
  @impl.implemented
  UnloadLodIfNeeded(time, deltaTime)
  {
    if (!this.#allowLodSelection || Number(deltaTime) > UNLOAD_MAX_FRAME_TIME)
    {
      return false;
    }

    this.highDetailProxy?.Update(time, this.#currentLod === 0 ? 0 : RESOURCE_UNLOAD_TIME);
    this.mediumDetailProxy?.Update(time, this.#currentLod === 1 ? 0 : RESOURCE_UNLOAD_TIME);
    this.lowDetailProxy?.Update(time, this.#currentLod === 2 ? 0 : RESOURCE_UNLOAD_TIME);

    // The maintained native implementation always returns false, despite the
    // older header comment describing a possible true result.
    return false;
  }

  /**
   * Overrides the selected whole-model detail index used by proxy lifecycle and
   * capability queries.
   */
  @carbon.method
  @impl.implemented
  SetCurrentLod(lod)
  {
    this.#currentLod = lod;
  }

  /** Returns the selected whole-model detail index, or -1 before selection. */
  @carbon.method
  @impl.implemented
  GetCurrentLod()
  {
    return this.#currentLod;
  }

  /** Reports whether at least one detail proxy permits whole-model selection. */
  @carbon.method
  @impl.implemented
  HaveLodSetup()
  {
    return this.#allowLodSelection;
  }

  /** Allows shadow casting without selection or only for the high-detail model. */
  @carbon.method
  @impl.implemented
  IsCastingShadow()
  {
    return !this.#allowLodSelection || this.#currentLod === 0;
  }

  /**
   * Allows cloth simulation when selection is disabled or the current detail
   * index is within the requested maximum.
   */
  @carbon.method
  @impl.implemented
  IsSimulatingCloth(maxClothLod)
  {
    return !this.#allowLodSelection || this.#currentLod <= maxClothLod;
  }

  /**
   * Installs a changed model into the selected proxy, falling through to a lower
   * proxy when it is absent.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("CarbonEngineJS proxies receive the model object when no native raw-root handle exists.")
  OnModelChanged(model)
  {
    if (!model)
    {
      return;
    }

    const rawModel = typeof model.GetRawRoot === "function" ? model.GetRawRoot() : model;
    switch (this.#currentLod)
    {
      case 0:
        if (this.highDetailProxy)
        {
          this.highDetailProxy.SetObjectFromBuilder(rawModel);
          return;
        }
      // Intentional native fallthrough when a selected proxy is absent.
      case 1:
        if (this.mediumDetailProxy)
        {
          this.mediumDetailProxy.SetObjectFromBuilder(rawModel);
          return;
        }
      // Intentional native fallthrough when a selected proxy is absent.
      case 2:
        if (this.lowDetailProxy)
        {
          this.lowDetailProxy.SetObjectFromBuilder(rawModel);
          return;
        }
    }
  }
}

function SetProxyObject(proxy, model)
{
  if (!proxy || model === null || model === undefined)
  {
    return;
  }
  proxy.SetObject(typeof model.GetRawRoot === "function" ? model.GetRawRoot() : model);
}
