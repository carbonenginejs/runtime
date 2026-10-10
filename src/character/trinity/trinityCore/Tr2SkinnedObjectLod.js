// Source: trinity/trinity/Tr2SkinnedObjectLOD.h
// Source: trinity/trinity/Tr2SkinnedObjectLOD.cpp
import { blue, CcpTime, IsMatch } from "#blue";
import { meta } from "#schema";

const LOW_DETAIL_THRESHOLD = 150;
const MEDIUM_DETAIL_THRESHOLD = 500;
const HIGH_MEDIUM_MARGIN = 0;
const MEDIUM_LOW_MARGIN = 0;

/**
 * `g_unloadLODMaxFrametime` (Tr2SkinnedObjectLOD.cpp:12), seconds: frames
 * longer than this never unload a level of detail. A float in Carbon.
 * Not supported: Carbon registers it as the Trinity setting
 * `unloadLODMaxFrametime` (cpp:27); here it is a constant.
 */
const g_unloadLODMaxFrametime = Math.fround(0.1);

/**
 * `AVATAR_RESOURCE_UNLOADING_TIME_THRESHOLD` (Tr2SkinnedObjectLOD.cpp:21),
 * seconds of disuse before an unselected level of detail is unloaded.
 */
const AVATAR_RESOURCE_UNLOADING_TIME_THRESHOLD = 10.0;

/**
 * Native helper owned by Tr2SkinnedObject.
 *
 * This is a real Trinity class, but not a Blue-declared/persisted object. The
 * owner exposes its three proxy values and delegates selection to this helper.
 * Each proxy is a `BlueObjectProxy` (Tr2SkinnedObjectLOD.h:75-77,
 * `IBlueObjectProxyPtr`), or null.
 */
export class Tr2SkinnedObjectLod
{
  /** `m_highDetailProxy` (IBlueObjectProxyPtr). @type {import("#blue").IBlueObjectProxy|null} */
  highDetailProxy = null;

  /** `m_lowDetailProxy` (IBlueObjectProxyPtr). @type {import("#blue").IBlueObjectProxy|null} */
  lowDetailProxy = null;

  /** `m_mediumDetailProxy` (IBlueObjectProxyPtr). @type {import("#blue").IBlueObjectProxy|null} */
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
   * Creates the high-detail proxy if there is none, then holds the model in
   * it (Tr2SkinnedObjectLOD.cpp:151-166). A null model leaves an existing
   * proxy's object alone.
   *
   * Adapted: Carbon passes `model->GetRawRoot()`, a C++ pointer adjustment to
   * the IRoot base; a JavaScript object is its own root, so the model is held
   * as it is.
   *
   * @param {import("./Tr2SkinnedModel.js").Tr2SkinnedModel|null} model The model.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetHighDetailModel(model)
  {
    if (!this.highDetailProxy)
    {
      const clsid = blue.classes.FindClsid("BlueObjectProxy");
      if (clsid)
      {
        this.highDetailProxy = blue.classes.CreateInstance(clsid);
      }
    }

    if (this.highDetailProxy && model !== null)
    {
      this.highDetailProxy.SetObject(model);
    }
  }

  /**
   * Creates the medium-detail proxy if there is none, then holds the model in
   * it (Tr2SkinnedObjectLOD.cpp:168-183). A null model leaves an existing
   * proxy's object alone.
   *
   * Adapted: as SetHighDetailModel, the model is its own raw root.
   *
   * @param {import("./Tr2SkinnedModel.js").Tr2SkinnedModel|null} model The model.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetMediumDetailModel(model)
  {
    if (!this.mediumDetailProxy)
    {
      const clsid = blue.classes.FindClsid("BlueObjectProxy");
      if (clsid)
      {
        this.mediumDetailProxy = blue.classes.CreateInstance(clsid);
      }
    }

    if (this.mediumDetailProxy && model !== null)
    {
      this.mediumDetailProxy.SetObject(model);
    }
  }

  /**
   * Creates the low-detail proxy if there is none, then holds the model in it
   * (Tr2SkinnedObjectLOD.cpp:185-200). A null model leaves an existing proxy's
   * object alone.
   *
   * Adapted: as SetHighDetailModel, the model is its own raw root.
   *
   * @param {import("./Tr2SkinnedModel.js").Tr2SkinnedModel|null} model The model.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  SetLowDetailModel(model)
  {
    if (!this.lowDetailProxy)
    {
      const clsid = blue.classes.FindClsid("BlueObjectProxy");
      if (clsid)
      {
        this.lowDetailProxy = blue.classes.CreateInstance(clsid);
      }
    }

    if (this.lowDetailProxy && model !== null)
    {
      this.lowDetailProxy.SetObject(model);
    }
  }

  /**
   * Lets unselected proxies unload after AVATAR_RESOURCE_UNLOADING_TIME_THRESHOLD
   * of disuse, but only on frames no longer than g_unloadLODMaxFrametime, so a
   * stalling engine does not unload a model it is about to use again
   * (Tr2SkinnedObjectLOD.cpp:70-95). The selected proxy gets a zero timeout and
   * is never unloaded.
   *
   * @param {number} time Simulation time in Blue ticks.
   * @param {number} deltaTime Frame length in Blue ticks.
   * @returns {boolean} Always false, as the maintained native implementation
   *   returns, despite the older header comment describing a possible true result.
   */
  @meta.blue.method
  @meta.implemented
  UnloadLodIfNeeded(time, deltaTime)
  {
    if (!this._allowLodSelection || CcpTime.timeAsFloat(deltaTime) > g_unloadLODMaxFrametime)
    {
      return false;
    }

    const timeout = CcpTime.timeFromDouble(AVATAR_RESOURCE_UNLOADING_TIME_THRESHOLD);

    // Never unload the currently used proxy.
    if (this.highDetailProxy)
    {
      this.highDetailProxy.Update(time, this._currentLod === 0 ? 0 : timeout);
    }
    if (this.mediumDetailProxy)
    {
      this.mediumDetailProxy.Update(time, this._currentLod === 1 ? 0 : timeout);
    }
    if (this.lowDetailProxy)
    {
      this.lowDetailProxy.Update(time, this._currentLod === 2 ? 0 : timeout);
    }

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
   * proxy when it is absent (Tr2SkinnedObjectLOD.cpp:114-148).
   *
   * Adapted: Carbon passes `model->GetRawRoot()`; a JavaScript object is its
   * own root, so the model is passed as it is.
   *
   * @param {import("./Tr2SkinnedModel.js").Tr2SkinnedModel|null} model The changed model.
   * @returns {void}
   */
  @meta.blue.method
  @meta.adapted
  OnModelChanged(model)
  {
    if (!model)
    {
      return;
    }

    switch (this._currentLod)
    {
      case 0:
        if (this.highDetailProxy)
        {
          this.highDetailProxy.SetObjectFromBuilder(model);
          return;
        }
      // Intentional native fallthrough when a selected proxy is absent.
      case 1:
        if (this.mediumDetailProxy)
        {
          this.mediumDetailProxy.SetObjectFromBuilder(model);
          return;
        }
      // Intentional native fallthrough when a selected proxy is absent.
      case 2:
        if (this.lowDetailProxy)
        {
          this.lowDetailProxy.SetObjectFromBuilder(model);
          return;
        }
    }
  }
}
