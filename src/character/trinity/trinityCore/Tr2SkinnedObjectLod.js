import { IsMatch } from "#blue";
// Source: trinity/trinity/Tr2SkinnedObjectLOD.h
// Source: trinity/trinity/Tr2SkinnedObjectLOD.cpp
import { meta } from "#schema";

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

  _allowLodSelection = false;
  _currentLod = -1;

  /**
   * Repopulates availability when one of the three owned proxy references
   * changes.
   */
  @meta.blue.method
  @meta.implemented
  OnModified(value)
  {
    if (IsMatch(value, "highDetailModel")
      || IsMatch(value, "mediumDetailModel")
      || IsMatch(value, "lowDetailModel"))
    {
      this.PopulateLods();
    }
    return true;
  }

  /** Enables whole-model selection whenever at least one detail proxy is present. */
  @meta.blue.method
  @meta.implemented
  PopulateLods()
  {
    this._allowLodSelection = !!(
      this.highDetailProxy
      || this.mediumDetailProxy
      || this.lowDetailProxy
    );
  }

  /**
   * Selects the best available or resident whole-model proxy for a projected
   * pixel diameter.
   */
  @meta.blue.method
  @meta.implemented
  SetLOD(_frustum, estimatedPixelDiameter)
  {
    if (!this._allowLodSelection)
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
        stickyLod = this._currentLod;
      }
    }

    let choices = [ 0, 1, 2 ];
    if (stickyLod === 2
      || (this._currentLod >= 2
        && estimatedPixelDiameter <= LOW_DETAIL_THRESHOLD + MEDIUM_LOW_MARGIN)
      || (this._currentLod < 2
        && estimatedPixelDiameter <= LOW_DETAIL_THRESHOLD - MEDIUM_LOW_MARGIN))
    {
      choices = [ 2, 1, 0 ];
    }
    else if (stickyLod === 1
      || (this._currentLod >= 1
        && estimatedPixelDiameter <= MEDIUM_DETAIL_THRESHOLD + HIGH_MEDIUM_MARGIN)
      || (this._currentLod < 1
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

    if (model && this._currentLod !== selectedLod && selectedLod !== -1)
    {
      this._currentLod = selectedLod;
      proxies[this._currentLod].OnSelected();
    }

    return model;
  }

  /**
   * Replaces the object held by the existing high-detail proxy when both values
   * are available.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Uses an already supplied Blue proxy; proxy construction belongs to the outer runtime adapter.")
  SetHighDetailModel(model)
  {
    SetProxyObject(this.highDetailProxy, model);
  }

  /**
   * Replaces the object held by the existing medium-detail proxy when both
   * values are available.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Uses an already supplied Blue proxy; proxy construction belongs to the outer runtime adapter.")
  SetMediumDetailModel(model)
  {
    SetProxyObject(this.mediumDetailProxy, model);
  }

  /**
   * Replaces the object held by the existing low-detail proxy when both values
   * are available.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Uses an already supplied Blue proxy; proxy construction belongs to the outer runtime adapter.")
  SetLowDetailModel(model)
  {
    SetProxyObject(this.lowDetailProxy, model);
  }

  /**
   * Updates unselected proxy lifetimes on acceptable frame times while keeping
   * the selected model resident.
   */
  @meta.blue.method
  @meta.implemented
  UnloadLodIfNeeded(time, deltaTime)
  {
    if (!this._allowLodSelection || Number(deltaTime) > UNLOAD_MAX_FRAME_TIME)
    {
      return false;
    }

    this.highDetailProxy?.Update(time, this._currentLod === 0 ? 0 : RESOURCE_UNLOAD_TIME);
    this.mediumDetailProxy?.Update(time, this._currentLod === 1 ? 0 : RESOURCE_UNLOAD_TIME);
    this.lowDetailProxy?.Update(time, this._currentLod === 2 ? 0 : RESOURCE_UNLOAD_TIME);

    // The maintained native implementation always returns false, despite the
    // older header comment describing a possible true result.
    return false;
  }

  /**
   * Overrides the selected whole-model detail index used by proxy lifecycle and
   * capability queries.
   */
  @meta.blue.method
  @meta.implemented
  SetCurrentLod(lod)
  {
    this._currentLod = lod;
  }

  /** Returns the selected whole-model detail index, or -1 before selection. */
  @meta.blue.method
  @meta.implemented
  GetCurrentLod()
  {
    return this._currentLod;
  }

  /** Reports whether at least one detail proxy permits whole-model selection. */
  @meta.blue.method
  @meta.implemented
  HaveLodSetup()
  {
    return this._allowLodSelection;
  }

  /** Allows shadow casting without selection or only for the high-detail model. */
  @meta.blue.method
  @meta.implemented
  IsCastingShadow()
  {
    return !this._allowLodSelection || this._currentLod === 0;
  }

  /**
   * Allows cloth simulation when selection is disabled or the current detail
   * index is within the requested maximum.
   */
  @meta.blue.method
  @meta.implemented
  IsSimulatingCloth(maxClothLod)
  {
    return !this._allowLodSelection || this._currentLod <= maxClothLod;
  }

  /**
   * Installs a changed model into the selected proxy, falling through to a lower
   * proxy when it is absent.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("CarbonEngineJS proxies receive the model object when no native raw-root handle exists.")
  OnModelChanged(model)
  {
    if (!model)
    {
      return;
    }

    const rawModel = typeof model.GetRawRoot === "function" ? model.GetRawRoot() : model;
    switch (this._currentLod)
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
