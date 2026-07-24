// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveTrailsSet.h
// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\Attachments\EveTrailsSet.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";


@type.define({ className: "EveTrailsSet", family: "eve/attachment/boosters" })
export class EveTrailsSet extends CjsModel
{

  /** m_geometryResource (TriGeometryResPtr) [READ] */
  @io.read
  @type.objectRef("TriGeometryRes")
  geometryResource = null;

  /** m_fadeSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  fadeSpeed = 1;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @io.rebuild("packedGeometry")
  @io.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  /** m_geometryResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.rebuild("geometry")
  @io.notify
  @io.persist
  @type.string
  geometryResPath = "";

  /** m_display (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  display = true;

  #trailData = [];

  #revision = 0;

  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.#revision++;
    return true;
  }

  @carbon.method
  @impl.adapted
  OnModified()
  {
    this.#revision++;
    return true;
  }

  @carbon.method
  @impl.implemented
  Update()
  {
  }

  @carbon.method
  @impl.adapted
  Clear()
  {
    this.#trailData.length = 0;
    this.#revision++;
  }

  @carbon.method
  @impl.implemented
  Add(localMatrix, size)
  {
    if (!localMatrix || localMatrix.length !== 16)
    {
      throw new TypeError("EveTrailsSet transforms must contain 16 values");
    }
    this.#trailData.push({
      transform: mat4.clone(localMatrix),
      size: Number(size) || 0
    });
    this.#revision++;
  }

  @carbon.method
  @impl.implemented
  GetFadeSpeed()
  {
    return this.fadeSpeed;
  }

  @carbon.method
  @impl.implemented
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  @carbon.method
  @impl.adapted
  SetMeshResPath(path)
  {
    this.geometryResPath = String(path ?? "");
    this.#revision++;
  }

  @carbon.method
  @impl.adapted
  SetGeometryResource(resource)
  {
    if (this.geometryResource !== resource)
    {
      this.geometryResource = resource ?? null;
      this.#revision++;
    }
  }

  @carbon.method
  @impl.adapted
  GetTrailData()
  {
    return this.#trailData.map(trail => ({
      transform: mat4.clone(trail.transform),
      size: trail.size
    }));
  }

  @carbon.method
  @impl.implemented
  GetRevision()
  {
    return this.#revision;
  }

}
