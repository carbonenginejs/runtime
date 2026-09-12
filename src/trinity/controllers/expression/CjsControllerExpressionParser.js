// Source: parser/include/ccpparser.h (CcpParser::Parse)
import { CjsControllerExpressionCompileError } from "./CjsControllerExpressionCompileError.js";
import { BLOCKED_IDENTIFIERS, CONSTANTS, GetFunction, Tokenize } from "./expressionRuntime.js";
/**
 * Recursive-descent parser turning expression source into the AST evaluated by
 * CjsControllerExpressionProgram, collecting referenced variable and function
 * names and rejecting identifiers that could reach the JavaScript prototype
 * chain.
 */
export class CjsControllerExpressionParser
{
  source;
  options;
  tokens;
  index = 0;

  variableNames = new Set();

  functionNames = new Set();

  /**
   * Tokenizes the source up front; a malformed character or unterminated string
   * throws a CjsControllerExpressionCompileError here rather than during Parse.
   */
  constructor(source, options)
  {
    this.source = source;
    this.options = options || {};
    this.tokens = Tokenize(source);
  }

  /**
   * Parses the whole source as a single expression and requires that all input
   * is consumed.
   */
  Parse()
  {
    const expression = this.ParseConditional();
    this.Expect("eof");
    return expression;
  }

  /**
   * Parses the ternary `cond ? a : b` level, which is right-associative and the
   * lowest-precedence form.
   */
  ParseConditional()
  {
    const condition = this.ParseLogicalOr();
    if (this.Match("operator", "?"))
    {
      const consequent = this.ParseConditional();
      this.Expect("operator", ":");
      const alternate = this.ParseConditional();
      return {
        type: "conditional",
        condition,
        consequent,
        alternate
      };
    }
    return condition;
  }

  /** Parses left-associative `||` chains. */
  ParseLogicalOr()
  {
    let node = this.ParseLogicalAnd();
    while (this.Match("operator", "||"))
    {
      node = {
        type: "binary",
        operator: "||",
        left: node,
        right: this.ParseLogicalAnd()
      };
    }
    return node;
  }

  /** Parses left-associative `&&` chains, which bind tighter than `||`. */
  ParseLogicalAnd()
  {
    let node = this.ParseEquality();
    while (this.Match("operator", "&&"))
    {
      node = {
        type: "binary",
        operator: "&&",
        left: node,
        right: this.ParseEquality()
      };
    }
    return node;
  }

  /** Parses left-associative `==` and `!=` chains. */
  ParseEquality()
  {
    let node = this.ParseComparison();
    while (true)
    {
      if (this.Match("operator", "=="))
      {
        node = {
          type: "binary",
          operator: "==",
          left: node,
          right: this.ParseComparison()
        };
      }
      else if (this.Match("operator", "!="))
      {
        node = {
          type: "binary",
          operator: "!=",
          left: node,
          right: this.ParseComparison()
        };
      }
      else
      {
        return node;
      }
    }
  }

  /**
   * Parses left-associative `<`, `<=`, `>` and `>=` chains, which bind tighter
   * than equality.
   */
  ParseComparison()
  {
    let node = this.ParseTerm();
    while (true)
    {
      if (this.Match("operator", "<"))
      {
        node = {
          type: "binary",
          operator: "<",
          left: node,
          right: this.ParseTerm()
        };
      }
      else if (this.Match("operator", "<="))
      {
        node = {
          type: "binary",
          operator: "<=",
          left: node,
          right: this.ParseTerm()
        };
      }
      else if (this.Match("operator", ">"))
      {
        node = {
          type: "binary",
          operator: ">",
          left: node,
          right: this.ParseTerm()
        };
      }
      else if (this.Match("operator", ">="))
      {
        node = {
          type: "binary",
          operator: ">=",
          left: node,
          right: this.ParseTerm()
        };
      }
      else
      {
        return node;
      }
    }
  }

  /** Parses left-associative `+` and `-` chains. */
  ParseTerm()
  {
    let node = this.ParseFactor();
    while (true)
    {
      if (this.Match("operator", "+"))
      {
        node = {
          type: "binary",
          operator: "+",
          left: node,
          right: this.ParseFactor()
        };
      }
      else if (this.Match("operator", "-"))
      {
        node = {
          type: "binary",
          operator: "-",
          left: node,
          right: this.ParseFactor()
        };
      }
      else
      {
        return node;
      }
    }
  }

  /**
   * Parses left-associative `*`, `/` and `%` chains, which bind tighter than
   * addition.
   */
  ParseFactor()
  {
    let node = this.ParseExponent();
    while (true)
    {
      if (this.Match("operator", "*"))
      {
        node = {
          type: "binary",
          operator: "*",
          left: node,
          right: this.ParseExponent()
        };
      }
      else if (this.Match("operator", "/"))
      {
        node = {
          type: "binary",
          operator: "/",
          left: node,
          right: this.ParseExponent()
        };
      }
      else if (this.Match("operator", "%"))
      {
        node = {
          type: "binary",
          operator: "%",
          left: node,
          right: this.ParseExponent()
        };
      }
      else
      {
        return node;
      }
    }
  }

  /**
   * Parses `^` power chains; unlike most languages this level is
   * left-associative here.
   */
  ParseExponent()
  {
    let node = this.ParseUnary();
    while (this.Match("operator", "^"))
    {
      node = {
        type: "binary",
        operator: "^",
        left: node,
        right: this.ParseUnary()
      };
    }
    return node;
  }

  /**
   * Parses right-nested prefix `!`, `-` and `+` operators, falling through to a
   * primary when none is present.
   */
  ParseUnary()
  {
    if (this.Match("operator", "!"))
    {
      return {
        type: "unary",
        operator: "!",
        argument: this.ParseUnary()
      };
    }
    if (this.Match("operator", "-"))
    {
      return {
        type: "unary",
        operator: "-",
        argument: this.ParseUnary()
      };
    }
    if (this.Match("operator", "+"))
    {
      return {
        type: "unary",
        operator: "+",
        argument: this.ParseUnary()
      };
    }
    return this.ParsePrimary();
  }

  /**
   * Parses a number, string, parenthesized expression, function call, built-in
   * constant, or a variable identifier, recording bare identifiers in
   * `variableNames`.
   */
  ParsePrimary()
  {
    const token = this.Peek();
    if (this.Match("number"))
    {
      return {
        type: "literal",
        value: token.value
      };
    }
    if (this.Match("string"))
    {
      return {
        type: "literal",
        value: token.value
      };
    }
    if (this.Match("identifier"))
    {
      const name = String(token.value);
      this.AssertSafeIdentifier(name);
      if (this.Match("operator", "("))
      {
        return this.ParseCall(name);
      }
      if (name in CONSTANTS)
      {
        return {
          type: "literal",
          value: CONSTANTS[name]
        };
      }
      this.variableNames.add(name);
      return {
        type: "identifier",
        name
      };
    }
    if (this.Match("operator", "("))
    {
      const node = this.ParseConditional();
      this.Expect("operator", ")");
      return node;
    }
    throw this.Error(`Unexpected token '${String(token.value)}'`);
  }

  /**
   * Parses a call argument list after the opening parenthesis and fails
   * compilation when the name resolves to no built-in or caller-supplied
   * function, so unknown functions cannot reach evaluation.
   */
  ParseCall(name)
  {
    this.AssertSafeIdentifier(name);
    if (!GetFunction(name, this.options))
    {
      throw this.Error(`Unknown function '${name}'`);
    }
    const args = [];
    if (!this.Match("operator", ")"))
    {
      do
      {
        args.push(this.ParseConditional());
      } while (this.Match("operator", ","));
      this.Expect("operator", ")");
    }
    this.functionNames.add(name);
    return {
      type: "call",
      name,
      args
    };
  }

  /**
   * Rejects identifiers such as `__proto__`, `constructor` and `globalThis` that
   * could be used to escape the sandboxed evaluator.
   */
  AssertSafeIdentifier(name)
  {
    if (BLOCKED_IDENTIFIERS.has(name))
    {
      throw this.Error(`Unsafe identifier '${name}'`);
    }
  }

  /**
   * Returns the token at the cursor without consuming it; the stream always ends
   * with an `eof` token.
   */
  Peek()
  {
    return this.tokens[this.index];
  }

  /**
   * Consumes the next token and returns true when it has the given type and, if
   * supplied, the given value; otherwise leaves the cursor untouched.
   */
  Match(type, value)
  {
    const token = this.Peek();
    if (!token || token.type !== type)
    {
      return false;
    }
    if (value !== undefined && token.value !== value)
    {
      return false;
    }
    this.index++;
    return true;
  }

  /**
   * Consumes and returns the next token, throwing a compile error naming the
   * expected form when it does not match.
   */
  Expect(type, value)
  {
    const token = this.Peek();
    if (this.Match(type, value))
    {
      return token;
    }
    throw this.Error(`Expected ${value || type}, got '${token ? String(token.value) : "end of input"}'`);
  }

  /**
   * Builds a compile error carrying the source text and the character position
   * of the current token.
   */
  Error(message)
  {
    const token = this.Peek();
    return new CjsControllerExpressionCompileError({
      expression: this.source,
      reason: message,
      position: token ? token.position : this.source.length
    });
  }
}
