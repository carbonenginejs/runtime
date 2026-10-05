// Source: trinity/trinity/Lights/ITr2LightOwner.h:10-16
//
// Carbon also registers this as the "LightOwner" component type (ITr2LightOwner.h:18,
// REGISTER_COMPONENT_TYPE); the component registry is a separate mechanism and is not
// declared here.
import { CjsSchema, meta } from "#schema";


/** Contract for an object that owns lights and hands them to a light manager. */
export class ITr2LightOwner
{
  /**
   * Adds this owner's lights to the manager.
   * @param {object} _lightManager The Tr2LightManager collecting lights.
   * @returns {void}
   */
  GetLights(_lightManager)
  {
    throw new Error("ITr2LightOwner.GetLights must be implemented by a light owner.");
  }

  /**
   * Leaves adding a light to owners that override this native default.
   * @param {object} _light The Tr2Light.
   * @returns {void}
   */
  AddLight(_light)
  {
  }

  /**
   * Leaves clearing lights to owners that override this native default.
   * @returns {void}
   */
  ClearLights()
  {
  }
}

CjsSchema.decorateMethod(ITr2LightOwner, "GetLights", meta.abstract);
CjsSchema.decorateMethod(ITr2LightOwner, "AddLight", meta.noop);
CjsSchema.decorateMethod(ITr2LightOwner, "ClearLights", meta.noop);
CjsSchema.define(ITr2LightOwner, { className: "ITr2LightOwner" });
