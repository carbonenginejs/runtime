// Source: trinity/trinity/Tr2MaterialParameterStore.h
// Source: trinity/trinity/Tr2MaterialParameterStore.cpp
// Source: trinity/trinity/Tr2MaterialParameterStore_Blue.cpp
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2MaterialParameterStore (trinityCore) - generated from schema shapeHash 119f32c2.... */
@type.define({ className: "Tr2MaterialParameterStore", family: "trinityCore" })
export class Tr2MaterialParameterStore extends CjsModel
{

  /** m_parentStore (Tr2MaterialParameterStorePtr) [READ] */
  @io.read
  @type.objectRef("Tr2MaterialParameterStore")
  parent = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_parentPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.path
  parentPath = "";

  /** m_parameters (PITriEffectParameterDict) [READ, PERSIST] */
  @io.persist
  @type.map("ITriEffectParameter")
  parameters = new Map();

  /**
   * Looks a parameter up in this store and then walks the parent chain; null
   * when no store in the chain defines it.
   */
  @carbon.method
  @impl.implemented
  FindParameter(name)
  {
    let currentStore = this;
    while (currentStore)
    {
      const parameter = currentStore.parameters.get(name);
      if (parameter !== undefined)
      {
        return parameter;
      }
      currentStore = currentStore.parent;
    }
    return null;
  }

}
