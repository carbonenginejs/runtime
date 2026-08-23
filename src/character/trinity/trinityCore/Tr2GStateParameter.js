// Source: trinity/trinity/Tr2GStateParameter.h
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";

/** Named, node-scoped scalar value for a character GState animation. */
@type.define({ className: "Tr2GStateParameter", family: "trinityCore" })
export class Tr2GStateParameter extends CjsModel
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_value (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  value = 0;

  /** m_nodeName (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  nodename = "";

  /** Carbon method GetName (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method GetNodeName (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetNodeName()
  {
    return this.nodename;
  }

  /** Carbon method GetValue (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  GetValue()
  {
    return this.value;
  }

  /** Carbon method SetName (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Carbon method SetNodeName (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetNodeName(name)
  {
    this.nodename = String(name ?? "");
  }

  /** Carbon method SetValue (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  SetValue(value)
  {
    this.value = Number(value);
  }

  /**
   * Reports successful portable initialization for the persisted parameter
   * record.
   */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    return true;
  }

}
