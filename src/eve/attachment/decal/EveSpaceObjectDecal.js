// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveSpaceObjectDecal.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveSpaceObjectDecal.cpp
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveSpaceObjectDecal_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, schema, type } from "@carbonenginejs/runtime-utils/schema";
import { TriBatchType } from "../../../generated/trinityCore/enums.js";


@type.define({ className: "EveSpaceObjectDecal", family: "eve/attachment/decal" })
export class EveSpaceObjectDecal extends CjsModel
{
  constructor()
  {
    super();
    // The schema's legacy TriBatchType default is 0. Carbon's decal default is
    // the opaque batch (1), so establish it after model/schema initialization.
    this.batchType = 1;
  }

  @io.persist
  @type.string
  name = "";

  @io.read
  @type.int32
  @schema.enum("TriBatchType")
  batchType = 1;

  @io.notify
  @io.persist
  @type.vec3
  position = vec3.create();

  @io.persist
  @type.float32
  minScreenSize = 0;

  @io.notify
  @io.persist
  @type.quat
  rotation = quat.create();

  @io.notify
  @io.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.int32
  parentBoneIndex = -1;

  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  decalEffect = null;

  @io.readwrite
  @type.boolean
  display = true;

  // SOF-authored per-LOD triangle indices; persisted so the values
  // interchange reproduces Carbon's hidden decal geometry selection.
  @io.rebuild("packedGeometry")
  @io.persist
  @type.array("unknown")
  staticIndexBuffers = [];

  #decalMatrix = mat4.create();

  #inverseDecalMatrix = mat4.create();

  #priority = 0;

  get hasStaticIndexBuffers()
  {
    return this.HasStaticIndexBuffers();
  }

  @carbon.method
  @impl.adapted
  Initialize()
  {
    return this.#updateDecalMatrix();
  }

  @carbon.method
  @impl.adapted
  OnModified(_options = {})
  {
    this.#updateDecalMatrix();
    return true;
  }

  @carbon.method
  @impl.adapted
  CopyFrom(source)
  {
    if (!source) return false;
    this.name = String(source.name ?? "");
    this.display = !!source.display;
    vec3.copy(this.position, source.position || EveSpaceObjectDecal.#zero);
    quat.copy(this.rotation, source.rotation || EveSpaceObjectDecal.#identityRotation);
    vec3.copy(this.scaling, source.scaling || EveSpaceObjectDecal.#one);
    this.parentBoneIndex = Number(source.parentBoneIndex) | 0;
    this.minScreenSize = Number(source.minScreenSize) || 0;
    this.decalEffect = source.decalEffect ?? null;
    this.batchType = Number(source.batchType) | 0;
    return this.#updateDecalMatrix();
  }

  @carbon.method
  @impl.adapted
  GetPosition(out = vec3.create())
  {
    return vec3.copy(out, this.position);
  }

  @carbon.method
  @impl.adapted
  SetPosition(value)
  {
    vec3.copy(this.position, value || EveSpaceObjectDecal.#zero);
    return this.#updateDecalMatrix();
  }

  @carbon.method
  @impl.adapted
  GetRotation(out = quat.create())
  {
    return quat.copy(out, this.rotation);
  }

  @carbon.method
  @impl.adapted
  SetRotation(value)
  {
    quat.copy(this.rotation, value || EveSpaceObjectDecal.#identityRotation);
    return this.#updateDecalMatrix();
  }

  @carbon.method
  @impl.adapted
  GetScaling(out = vec3.create())
  {
    return vec3.copy(out, this.scaling);
  }

  @carbon.method
  @impl.adapted
  GetDecalMatrix(out = mat4.create())
  {
    return mat4.copy(out, this.#decalMatrix);
  }

  @carbon.method
  @impl.adapted
  GetInverseDecalMatrix(out = mat4.create())
  {
    return mat4.copy(out, this.#inverseDecalMatrix);
  }

  @carbon.method
  @impl.adapted
  SetScaling(value)
  {
    vec3.copy(this.scaling, value || EveSpaceObjectDecal.#one);
    return this.#updateDecalMatrix();
  }

  @carbon.method
  @impl.adapted
  GetBoneIndex()
  {
    return this.parentBoneIndex;
  }

  @carbon.method
  @impl.adapted
  SetBoneIndex(index)
  {
    this.parentBoneIndex = Number(index) | 0;
    return true;
  }

  @carbon.method
  @impl.adapted
  SetIndices(indices)
  {
    this.staticIndexBuffers = Array.from(indices || [], lod => Array.from(lod || [], value => Number(value) >>> 0));
    return true;
  }

  @carbon.method
  @impl.adapted
  GetStaticIndexBuffers()
  {
    return this.staticIndexBuffers.map(lod => lod.slice());
  }

  @carbon.method
  @impl.adapted
  HasStaticIndexBuffers()
  {
    return this.staticIndexBuffers.some(lod => lod.length > 0);
  }

  @carbon.method
  @impl.adapted
  GetDecalPrimitiveCounts()
  {
    return this.staticIndexBuffers.map(lod => Math.trunc(lod.length / 3));
  }

  @carbon.method
  @impl.adapted
  SetMinScreenSize(value)
  {
    this.minScreenSize = Number(value) || 0;
    return true;
  }

  @carbon.method
  @impl.adapted
  SetEffect(effect)
  {
    this.decalEffect = effect ?? null;
    return true;
  }

  @carbon.method
  @impl.adapted
  SetShaderOption(name, value)
  {
    if (!this.decalEffect?.SetOption) return false;
    this.decalEffect.SetOption(name, value);
    return true;
  }

  @carbon.method
  @impl.adapted
  SetBatchType(value)
  {
    this.batchType = Number(value) | 0;
    return true;
  }

  @carbon.method
  @impl.adapted
  SetPriority(value)
  {
    this.#priority = Number(value) >>> 0;
    return true;
  }

  #updateDecalMatrix()
  {
    mat4.fromRotationTranslationScale(this.#decalMatrix, this.rotation, this.position, this.scaling);
    return !!mat4.invert(this.#inverseDecalMatrix, this.#decalMatrix);
  }

  static #zero = vec3.create();

  static #one = vec3.fromValues(1, 1, 1);

  static #identityRotation = quat.create();

  static TriBatchType = TriBatchType;

}
