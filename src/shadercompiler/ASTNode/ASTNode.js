import { CjsSchema, blue, meta } from "#schema";
// Source: trinity/shadercompiler/ASTNode.h
// Source: trinity/shadercompiler/ASTNode.cpp

import { Type } from "../Type.js";
import { ScannerToken } from "../ParserState/ScannerToken.js";

let nextSerial = 0;

/**
 * A syntax tree node: Carbon's `ASTNode`.
 *
 * Carbon's `ASTNodeType` lists what each node type keeps in its token,
 * symbol, type and children. Children may be null; positions are meaningful
 * (a name declaration's child 0 is its bracket list, child 1 its initializer).
 * The node copies the token and type it is given, as Carbon stores them by
 * value; the symbol and the scope are shared.
 */
export class ASTNode
{
    _nodeType = null;

    _token = null;

    /** @type {import("../SymbolTable/Symbol.js").Symbol|null} */
    _symbol = null;

    _type = new Type();

    _location = null;

    /** @type {Array<ASTNode|null>} */
    _children = [];

    _scope = null;

    /** Carbon's `m_extraData`, a slot the writers use. */
    extraData = null;

    /**
     * Creation order. Adapted: Carbon orders function symbols by their
     * definitions' heap addresses (`CompareSymbols`); this stands in for them.
     */
    serial = nextSerial++;

    /**
     * @param {number} type An `ASTNodeType` value.
     * @param {import("../ParserState/FileLocation.js").FileLocation} location Where the node stands.
     * @param {import("../SymbolTable/ScopeSymbolTable.js").ScopeSymbolTable|null} scope The scope it was created in.
     * @param {ScannerToken|null} token Its token, or null for none.
     */
    constructor(type, location, scope, token)
    {
        this._nodeType = type;

        this._token = token ? token.Copy() : new ScannerToken();

        this._location = location.Copy();

        this._scope = scope;

        // ASTNode.cpp:14
        this._type.FromTokenType(0);
    }

    /**
     * Carbon's `ASTNode::Copy`: a deep copy of the subtree, sharing symbols.
     *
     * @returns {ASTNode} The copy.
     */
    Copy()
    {
        const result = new ASTNode(this._nodeType, this._location, this._scope, this._token);
        result._symbol = this._symbol;
        result._type = this._type.Copy();
        for (const child of this._children)
        {
            result._children.push(child ? child.Copy() : null);
        }
        return result;
    }

    /**
     * @param {ASTNode|null} child Appended, null allowed.
     */
    AddChild(child)
    {
        this._children.push(child);
    }

    /**
     * Carbon's `InsertChild`: `m_children.insert( begin() + place, child )`.
     * Past the end that is undefined, so it throws here; at the end it appends.
     *
     * @param {number} place Index to insert at.
     * @param {ASTNode|null} child The child.
     */
    InsertChild(place, child)
    {
        if (!(place >= 0 && place <= this._children.length))
        {
            throw new RangeError(`ASTNode.InsertChild: place ${place} of ${this._children.length}`);
        }
        this._children.splice(place, 0, child);
    }

    /**
     * Carbon's `ReplaceChild( size_t, ASTNode* )`.
     *
     * @param {number} place Index to replace.
     * @param {ASTNode|null} child The new child.
     */
    ReplaceChild(place, child)
    {
        // Carbon writes `m_children[place]` unchecked; past the end that is
        // undefined, so it throws here.
        if (!(place >= 0 && place < this._children.length))
        {
            throw new RangeError(`ASTNode.ReplaceChild: place ${place} of ${this._children.length}`);
        }
        this._children[place] = child;
    }

    /**
     * Carbon's `ReplaceChild( ASTNode*, ASTNode* )`: replaces the first
     * occurrence of `old`, if any.
     *
     * @param {ASTNode|null} old The child to replace.
     * @param {ASTNode|null} child The new child.
     */
    ReplaceChild__Node(old, child)
    {
        const found = this._children.indexOf(old);
        if (found >= 0)
        {
            this._children[found] = child;
        }
    }

    /**
     * Carbon's `RemoveChild( size_t )`.
     *
     * @param {number} place Index to remove.
     */
    RemoveChild(place)
    {
        this._children.splice(place, 1);
    }

    /**
     * Carbon's `RemoveChild( ASTNode* )`: removes the first occurrence, if any.
     *
     * @param {ASTNode|null} child The child to remove.
     */
    RemoveChild__Node(child)
    {
        const found = this._children.indexOf(child);
        if (found >= 0)
        {
            this._children.splice(found, 1);
        }
    }

    /** @returns {number} An `ASTNodeType` value. */
    GetNodeType()
    {
        return this._nodeType;
    }

    /** @param {number} type An `ASTNodeType` value. */
    SetNodeType(type)
    {
        this._nodeType = type;
    }

    /** @returns {number} Number of child slots, null children included. */
    GetChildrenCount()
    {
        return this._children.length;
    }

    /**
     * Carbon's `GetChild`, which does not check the index. Past the end that
     * reads outside `m_children`, which is undefined, so it throws here.
     *
     * @param {number} index Child index.
     * @returns {ASTNode|null} The child.
     */
    GetChild(index)
    {
        if (!(index >= 0 && index < this._children.length))
        {
            throw new RangeError(`ASTNode.GetChild: child ${index} of ${this._children.length}`);
        }
        return this._children[index];
    }

    /**
     * @param {number} index Child index.
     * @returns {ASTNode|null} The child, or null past the end.
     */
    GetChildOrNull(index)
    {
        return index < this._children.length ? this._children[index] : null;
    }

    /** @returns {Array<ASTNode|null>} The live child array. */
    GetChildren()
    {
        return this._children;
    }

    /**
     * Carbon's `MoveChildren`: appends every child to `to` and clears this node.
     *
     * @param {ASTNode} to The receiving node.
     */
    MoveChildren(to)
    {
        for (const child of this._children)
        {
            to._children.push(child);
        }
        this._children.length = 0;
    }

    /**
     * Carbon's `SetToken( const ScannerToken* )` and `SetToken( const ScannerToken& )`:
     * copies the token, or clears it for null.
     *
     * @param {ScannerToken|null} token The token.
     */
    SetToken(token)
    {
        if (token)
        {
            this._token = token.Copy();
        }
        else
        {
            this._token.type = 0;
        }
    }

    /**
     * @returns {ScannerToken|null} The token, or null when its type is 0. The token is the node's own; do not change it.
     */
    GetToken()
    {
        return this._token.type ? this._token : null;
    }

    /** Carbon's `ClearToken`: sets the token's type to 0, so `GetToken` returns null. */
    ClearToken()
    {
        this._token.type = 0;
    }

    /** @returns {import("../ParserState/FileLocation.js").FileLocation} The node's location. */
    GetLocation()
    {
        return this._location;
    }

    /** @param {import("../ParserState/FileLocation.js").FileLocation} location Copied. */
    SetLocation(location)
    {
        this._location = location.Copy();
    }

    /** @param {import("../SymbolTable/Symbol.js").Symbol|null} symbol Shared, not copied. */
    SetSymbol(symbol)
    {
        this._symbol = symbol;
    }

    /** @returns {import("../SymbolTable/Symbol.js").Symbol|null} The node's symbol. */
    GetSymbol()
    {
        return this._symbol;
    }

    /** @returns {import("../SymbolTable/ScopeSymbolTable.js").ScopeSymbolTable|null} The scope the node was created in. */
    GetScope()
    {
        return this._scope;
    }

    /** @param {Type} type Copied, as Carbon assigns by value. */
    SetType(type)
    {
        this._type = type.Copy();
    }

    /** @returns {Type} The node's type. It is the node's own; copy it before changing it. */
    GetType()
    {
        return this._type;
    }

    /**
     * Carbon's `FindNode`: the first node of a type in this subtree, depth first.
     * Carbon's Windows build tolerates null children here (`this == nullptr`);
     * so does this.
     *
     * @param {number} type An `ASTNodeType` value.
     * @returns {ASTNode|null} The node.
     */
    FindNode(type)
    {
        if (this._nodeType === type)
        {
            return this;
        }
        for (const child of this._children)
        {
            const node = child ? child.FindNode(type) : null;
            if (node)
            {
                return node;
            }
        }
        return null;
    }

    /**
     * Carbon's `FindNodes`: every node of a type, not descending into matches.
     *
     * @param {number} type An `ASTNodeType` value.
     * @param {ASTNode[]} nodes Receives the matches.
     */
    FindNodes(type, nodes)
    {
        if (this._nodeType === type)
        {
            nodes.push(this);
            return;
        }
        for (const child of this._children)
        {
            if (child)
            {
                child.FindNodes(type, nodes);
            }
        }
    }

    /**
     * Carbon's `Map`: replaces each node with `callback(node)`, then maps its
     * children.
     *
     * @param {(node: ASTNode) => ASTNode} callback The mapping.
     * @returns {ASTNode} The mapped node.
     */
    Map(callback)
    {
        const newNode = callback(this);
        for (let i = 0; i < newNode._children.length; ++i)
        {
            if (newNode._children[i])
            {
                newNode._children[i] = newNode._children[i].Map(callback);
            }
        }
        return newNode;
    }

    // Source: trinity/shadercompiler/ASTNode.h
    //
    // Carbon declares this enum beside `ASTNode`; it has its own module so the
    // symbol table can name node types without importing the node class.

    /**
     * Carbon's `ASTNodeType`, in declaration order. The comment on each member is
     * Carbon's description of the node's token, symbol, type and children.
     */
    static ASTNodeType = Object.freeze({
        // used variable: symbol=variable symbol
        NT_VAR_IDENTIFIER: 0,
        // literal constant: token=constant token
        NT_CONSTANT: 1,
        // inline constructor (like {1, 2, 3,}): child[i] = either expression or NT_INLINE_CONSTRUCTOR
        NT_INLINE_CONSTRUCTOR: 2,
        // infix expression: token = operator token
        NT_EXPRESSION: 3,
        // prefix expressions ++, --, -, !, ~: token=operator token
        NT_PREFIX_EXPRESSION: 4,
        // postfix expressions: token=operator token
        NT_POSTFIX_EXPRESSION: 5,
        // C-style cast expression: type=type to cast to
        NT_CAST_EXPRESSION: 6,
        // conditional expression (?:)
        NT_CONDITIONAL_EXPRESSION: 7,
        // function call: symbol=function symbol, token=constructor token, children=arguments
        NT_FUNCTION_CALL: 8,
        // function header declaration: symbol=function name, type=return type, child[i] = NT_FUNCTION_PARAMETER
        NT_FUNCTION_HEADER: 9,
        // function parameter declaration: symbol=parameter name, token=parameter qualifier (in, out, inout), type=parameter type
        // child[0]=array size, child[1]=default value, child[2]=NT_PRIMITIVE_TYPE (optional)
        NT_FUNCTION_PARAMETER: 10,
        // variable name declaration: token=input modifier, symbol=parameter name, child[0]=type, child[1]=array size, child[2]=intial value
        NT_NAME_DECLARATION: 11,
        // var declaration, child[0]=type, child[i]=NT_NAME_DECLARATION
        NT_VAR_DECLARATION_LIST: 12,
        // struct declaration: child[i]=NT_STRUCT_MEMBER
        NT_STRUCT: 13,
        // struct member declaration: child[0]=NT_TYPE_DECLARATION, child[i]=names
        NT_STRUCT_MEMBER: 14,
        // [expr] bracket declaration list: child[i]=constant expression
        NT_BRACKET_LIST: 15,

        // program
        NT_PROGRAM: 16,
        // block scope ({...})
        NT_BLOCK: 17,
        // expression statement: child[0]=NULL or NT_EXPRESSION
        NT_EXPRESSION_STATEMENT: 18,
        // if statement: child[0]=condition, child[1]=branch, child[2]=else branch
        NT_IF: 19,
        // while statement: child[0]=condition, child[1]=loop body
        NT_WHILE: 20,
        // do statement: child[0]=condition, child[1]=loop body
        NT_DO: 21,
        // for statement: child[0]=initializer or NULL, child[1]=condition or NULL, child[2]=increment or NULL, child[3]=body
        NT_FOR: 22,
        // switch statement: children - NT_CASE, last child - condition
        NT_SWITCH: 23,
        // case label with following statements: child[0]=case expression or NULL if default label, child[1] - NT_BLOCK
        NT_CASE: 24,
        // jump statement (break, return, etc.): child[0]=return value
        NT_JUMP: 25,
        // function definition: child[0]=function header, child[1]=function body, chil[2]=NT_FUNCTION_ATTRIBUTE_LIST (optional)
        NT_FUNCTION_DEFINITION: 26,

        // list of sampler states: child[i]=NT_STATE_ASSIGNMENT
        NT_SAMPLER_STATE_LIST: 27,
        // state assignment: token=state name, child[0]=state value(NT_STATE_VALUE, NT_CONSTANT or NT_STATE_PARAMETER)
        NT_STATE_ASSIGNMENT: 28,
        // state assignment constant value: token=state value
        NT_STATE_VALUE: 29,
        // technique declaration: token=technique name, child[i]=NT_PASS_DECLARATION or NT_LIBRARY
        NT_TECHNIQUE: 30,
        // pass declaration: token=pass name, child[i]=NT_STATE_ASSIGNMENT or NT_SHADER_ASSIGNMENT
        NT_PASS: 31,
        // shader assignment: token=shader state, child[0]=NT_SHADER_PROFILE, child[1]=NT_FUNCTION_CALL
        NT_SHADER_ASSIGNMENT: 32,
        // shader profile in shader assignment: token=profile name
        NT_SHADER_PROFILE: 33,
        // tbuffer/cbuffer: token=buffer type, symbol=buffer name/register, child[i]=NT_VAR_DECLARATION_LIST
        NT_CBUFFER: 34,

        // Shader/function attribute list (like "[domain(X)]"): child[i]=NT_FUNCTION_ATTRIBUTE
        NT_FUNCTION_ATTRIBUTE_LIST: 35,
        // Single shader/function attribute: token=attribute name, child[i]=NT_FUNCTION_ATTRIBUTE_VALUE
        NT_FUNCTION_ATTRIBUTE: 36,
        // Shader/function attribute value: token=attribute value
        NT_FUNCTION_ATTRIBUTE_VALUE: 37,

        // Geometry shader parameter primitive type ("line", "triangle", etc.): token=primitive type
        NT_PRIMITIVE_TYPE: 38,

        // Raytracing declaration: token=library name, child[i]=NT_FUNCTION_CALL
        NT_LIBRARY: 39
    });
}

CjsSchema.blue.define(ASTNode, {
    className: "ASTNode",
    methods: {
        Copy: [blue.method],
        AddChild: [blue.method],
        InsertChild: [blue.method],
        ReplaceChild: [blue.method],
        ReplaceChild__Node: [meta.renamed("ReplaceChild")],
        RemoveChild: [blue.method],
        RemoveChild__Node: [meta.renamed("RemoveChild")],
        GetNodeType: [blue.method],
        SetNodeType: [blue.method],
        GetChildrenCount: [blue.method],
        GetChild: [blue.method],
        GetChildOrNull: [blue.method],
        GetChildren: [blue.method],
        MoveChildren: [blue.method],
        SetToken: [blue.method],
        GetToken: [blue.method],
        ClearToken: [blue.method],
        GetLocation: [blue.method],
        SetLocation: [blue.method],
        SetSymbol: [blue.method],
        GetSymbol: [blue.method],
        GetScope: [blue.method],
        SetType: [blue.method],
        GetType: [blue.method],
        FindNode: [blue.method],
        FindNodes: [blue.method],
        Map: [blue.method]
    }
});
