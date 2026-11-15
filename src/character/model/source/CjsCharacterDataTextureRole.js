import { meta, type } from "#schema";

/**
 * One paper doll texture role: what a map whose name ends in a suffix is (`CjsCharacterTextureRoles.lookup`). The
 * generic holds these in a list keyed by `name` (`CjsCharacterGeneric.textureRoles`); the shipped defaults are
 * `factory/defaults/textureRoles.json`, which says what each value means and cites each entry's sources.
 *
 * Ours (no Carbon counterpart): Carbon ships no paper doll, and the client's is Python.
 */
@meta.define("CjsCharacterDataTextureRole")
export class CjsCharacterDataTextureRole
{

    /** The suffix (`d`, `n`), or `<family>_<suffix>` for a role of that family alone (`comp_z`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The name prefixes it is sourced for (`comp`, `colorize`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    families = [];

    /** The effect texture parameter the composed map feeds (`DiffuseMap`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    property = "";

    /** What each of the file's channels holds, by channel (`rgb`, `a`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.map("string")
    channels = new Map();

    /** The `CjsPaperDollCompositor` method that draws it; empty for an input of another role's operation. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    operation = "";

    /** The role whose operation takes it as an input (`l`); empty for none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    inputOf = "";

    /** `replace` (drawn over what is under it) or `add` (added to it). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    plan = "";

    /** Whether it is drawn through the same option's diffuse coverage when the option has a diffuse. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.boolean
    covered = false;

    /** Where each fact is read. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    source = "";

    /** The facts no source states; empty for none. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    derived = "";

}
