import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/SmartLightSets/IEveSmartLightGroup.h
import { CjsSchema, meta, blue } from "#schema";


/**
 * Contract for a group of smart lights driven by a distribution of placements
 * (IEveSmartLightGroup.h:8-22). Every method has an empty default body in
 * Carbon, not a pure virtual, so a group implements only what it needs.
 */
export class IEveSmartLightGroup
{

  /** Carbon's empty default (h:11). @param {Float32Array} _color */
  SetColor(_color) {}

  /** Carbon's empty default (h:12). */
  AddQuadsToQuadRenderer(_placements, _size, _frustum, _quadRenderer) {}

  /** Carbon's empty default (h:13). @param {Array} _renderables */
  GetRenderables(_renderables) {}

  /**
   * Carbon's empty default (h:14). The distribution overload of
   * UpdateSyncronous, named as the groups split it (rule 11).
   */
  UpdateSyncronous__Distribution(_updateContext, _params, _distribution) {}

  /** Carbon's empty default (h:15); the distribution overload (rule 11). */
  UpdateAsyncronous__Distribution(_updateContext, _params, _distribution) {}

  /** Carbon's empty default (h:16). */
  SetControllerVariable(_name, _value) {}

  /** Carbon's empty default (h:17). */
  SetInheritProperties(_colorSet) {}

  /** Carbon's empty default (h:18). */
  UpdateVisibility(_updateContext, _parentTransform, _parentLod) {}

  /** Carbon's empty default (h:19). */
  RegisterWithQuadRenderer(_quadRenderer) {}

  /** Carbon's empty default (h:20). */
  RenderDebugInfo(_renderer, _placements, _size) {}
}

for (const method of [
  "SetColor", "AddQuadsToQuadRenderer", "GetRenderables", "UpdateSyncronous__Distribution", "UpdateAsyncronous__Distribution",
  "SetControllerVariable", "SetInheritProperties", "UpdateVisibility", "RegisterWithQuadRenderer", "RenderDebugInfo"
])
{
  CjsSchema.decorateMethod(IEveSmartLightGroup, method, blue.method, meta.noop);
}
CjsSchema.blue.inherit(IRoot)(IEveSmartLightGroup);
CjsSchema.exposure.interface("IEveSmartLightGroup")(IEveSmartLightGroup);
