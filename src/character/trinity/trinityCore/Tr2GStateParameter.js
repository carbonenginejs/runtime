// Source: trinity/trinity/Tr2GStateParameter.h
import { meta } from "#schema";
import { IInitialize } from "#blue/IInitialize";

/** Named, node-scoped scalar value for a character GState animation. */
@meta.define({ className: "Tr2GStateParameter", family: "trinityCore" })
export class Tr2GStateParameter extends IInitialize
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_value (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  value = 0;

  /** m_nodeName (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  nodename = "";

  /** Carbon method GetName (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method GetNodeName (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  GetNodeName()
  {
    return this.nodename;
  }

  /** Carbon method GetValue (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  GetValue()
  {
    return this.value;
  }

  /** Carbon method SetName (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Carbon method SetNodeName (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  SetNodeName(name)
  {
    this.nodename = String(name ?? "");
  }

  /** Carbon method SetValue (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  SetValue(value)
  {
    this.value = Number(value);
  }

  /**
   * Reports successful portable initialization for the persisted parameter
   * record.
   */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    return true;
  }

}

meta.blue.interfaceTable({ interfaces: [ Tr2GStateParameter, IInitialize ], chainTo: null })(Tr2GStateParameter, { kind: "class" });
