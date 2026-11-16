import { meta, type } from "#schema";

/**
 * One list form of the character library's reader (`CjsCharacterGeneric.sourceListForms`): how one key of a record
 * class's files is laid onto the record's fields (`normalizeCharacterYamlValues`). The base names the class and the
 * key; each subclass is one form, holding only its own fields, and each item of the list says which by its `_type`.
 *
 * As SOF has one record class per value shape (EveSOFDataParameterFloat, EveSOFDataParameterVector4), each form here is
 * its own class.
 *
 * Modelled on: EveSOFDataParameter (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:16-34)
 */
@meta.define("CjsCharacterDataListForm")
export class CjsCharacterDataListForm
{

    /** The record class whose files the form reads (`CjsCharacterColorVariation`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    className = "";

    /** The file key it reads (`colors`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    key = "";

}
