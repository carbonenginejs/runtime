import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/IEveSmartLightGroup.h

/**
 * Contract for a group of smart lights driven by a distribution of placements
 * (IEveSmartLightGroup.h:8-22). Every method has an empty default body in
 * Carbon, not a pure virtual, so a group implements only what it needs.
 */
@be.interface("IEveSmartLightGroup")
@be.inherit(IRoot)
export class IEveSmartLightGroup extends IRoot
{

  /**
   * Carbon's empty default (h:11). @param {Float32Array} _color
   *
   * @adapted
   */
  SetColor(_color) {}

  /**
   * Carbon's empty default (h:12).
   *
   * @adapted
   */
  AddQuadsToQuadRenderer(_placements, _size, _frustum, _quadRenderer) {}

  /**
   * Carbon's empty default (h:13). @param {Array} _renderables
   *
   * @adapted
   */
  GetRenderables(_renderables) {}

  /**
   * Carbon's empty default (h:14). The distribution overload of
   * UpdateSyncronous, named as the groups split it (rule 11).
   *
   * @adapted
   */
  UpdateSyncronous__Distribution(_updateContext, _params, _distribution) {}

  /**
   * Carbon's empty default (h:15); the distribution overload (rule 11).
   *
   * @adapted
   */
  UpdateAsyncronous__Distribution(_updateContext, _params, _distribution) {}

  /**
   * Carbon's empty default (h:16).
   *
   * @adapted
   */
  SetControllerVariable(_name, _value) {}

  /**
   * Carbon's empty default (h:17).
   *
   * @adapted
   */
  SetInheritProperties(_colorSet) {}

  /**
   * Carbon's empty default (h:18).
   *
   * @adapted
   */
  UpdateVisibility(_updateContext, _parentTransform, _parentLod) {}

  /**
   * Carbon's empty default (h:19).
   *
   * @adapted
   */
  RegisterWithQuadRenderer(_quadRenderer) {}

  /**
   * Carbon's empty default (h:20).
   *
   * @adapted
   */
  RenderDebugInfo(_renderer, _placements, _size) {}
}
