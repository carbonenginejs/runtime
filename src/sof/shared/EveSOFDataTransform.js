// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.cpp:456-463
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:815-825
import { meta, types } from "#schema";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/**
 * Stores a bone-relative scale, rotation, and translation and composes them into a transformation matrix.
 * Native IRoot-only data with a self-only Blue table. Its empty destructor and
 * constructor-owned vectors require no update or resource lifecycle.
 * GetTransform remains a JavaScript convenience; native stores these fields only.
 */
@meta.define({ className: "EveSOFDataTransform", family: "eve" })
export class EveSOFDataTransform
{
  /**
   * Locator translation in the owning hull or bone's coordinate space; native m_position (Vector3).
   * @type {Float32Array}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.vec3
  position = vec3.create();

  /**
   * Locator orientation quaternion (x, y, z, w); native m_rotation (Quaternion).
   * @type {Float32Array}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.quat
  rotation = quat.create();

  /**
   * Independent locator scale along each local axis; native m_scaling (Vector3).
   * @type {Float32Array}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /**
   * Owning bone index, or -1 for an unbound locator; native m_boneIndex (int32_t).
   * @type {number}
   */
  @meta.edit.readwrite
  @meta.edit.persist
  @meta.jessica.widget("boneindex")
  @types.int32
  boneIndex = -1;

  /**
   * Composes rotation, position, and scale directly into the required output matrix.
   * Custom: retained JavaScript convenience for the native data-only record.
   * gl-matrix's (rotation, translation, scale) order represents Carbon's
   * TransformationMatrix(scale, rotation, translation) on the shared byte layout.
   * The bone transform is not applied here.
   * @param {Float32Array} out Destination matrix.
   * @returns {Float32Array} The destination matrix.
   */
  @meta.impl.custom
  GetTransform(out)
  {
    return mat4.fromRotationTranslationScale(out, this.rotation, this.position, this.scaling);
  }

}

meta.carbon.interfaceTable({
  interfaces: [ EveSOFDataTransform ],
  chainTo: null
})(EveSOFDataTransform);
