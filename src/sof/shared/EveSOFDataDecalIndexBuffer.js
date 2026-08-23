// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataDecalIndexBuffer (eve) - generated from schema shapeHash 0c215c06.... */
@type.define({ className: "EveSOFDataDecalIndexBuffer", family: "eve" })
export class EveSOFDataDecalIndexBuffer extends CjsModel
{

  /** indexBuffer (typedArray) [PERSISTONLY] */
  @io.persistOnly
  @type.typedArray("Uint32Array")
  indexBuffer = null;

  /** Carbon method AddIndex (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  AddIndex(index)
  {
    const source = this.indexBuffer ?? [];
    const next = new Uint32Array(source.length + 1);
    next.set(source);
    next[source.length] = Number(index) >>> 0;
    this.indexBuffer = next;
    // Carbon: void AddIndex(uint32_t) (EveSOFData.h:1276) - no return value.
  }

  /** Carbon method GetIndices (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetIndices()
  {
    return Array.from(this.indexBuffer ?? [], value => Number(value) >>> 0);
  }

}
