import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2GStateParameter.h
import { meta, type, blue } from "#schema";
import { IInitialize } from "#blue/IInitialize";

/** Named, node-scoped scalar value for a character GState animation. */
@be.define("Tr2GStateParameter")
@be.mapInterface(IInitialize)
export class Tr2GStateParameter extends IInitialize
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_value (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  value = 0;

  /** m_nodeName (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  nodename = "";

  /** Carbon method GetName (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  GetName()
  {
    return this.name;
  }

  /** Carbon method GetNodeName (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  GetNodeName()
  {
    return this.nodename;
  }

  /** Carbon method GetValue (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  GetValue()
  {
    return this.value;
  }

  /** Carbon method SetName (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Carbon method SetNodeName (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  SetNodeName(name)
  {
    this.nodename = String(name ?? "");
  }

  /** Carbon method SetValue (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  SetValue(value)
  {
    this.value = Number(value);
  }

  /**
   * Reports successful portable initialization for the persisted parameter
   * record.
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    return true;
  }

}

