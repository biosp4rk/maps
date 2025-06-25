export {
  AssetType, SpecifierType, OuterType, PointerType,
  ArrayType, FunctionType, TypeTokenizer, TypeParser
};
import { toHex } from './utils';

const BUILT_IN_TYPES: Set<string> = new Set([
  'void', 'char', 'short', 'int', 'long',
  'float', 'double', 'signed', 'unsigned'
]);

export const BUILT_IN_SIZES: { [key: string]: number } = {
  ['char']: 1,
  ['short']: 2,
  ['int']: 4,
  ['float']: 4,
  ['double']: 8
};

// -------- AST --------

export enum TypeSpecKind {
  BuiltIn,
  Typedef,
  Enum,
  Struct,
  Union
}

export namespace TypeSpecKind {
  export function isTag(kind: TypeSpecKind): boolean {
    switch (kind) {
      case TypeSpecKind.Enum:
      case TypeSpecKind.Struct:
      case TypeSpecKind.Union:
        return true;
      default:
        return false;
    }
  }
}

export enum TypeQual {
  Const,
  Volatile
}

export namespace TypeQual {
  export function fromString(str: string): TypeQual {
    switch (str) {
      case 'const':
        return TypeQual.Const;
      case 'volatile':
        return TypeQual.Volatile;
      default:
        throw new Error(`Invalid type qualifier ${str}`);
    }
  }
}

abstract class AssetType {
  abstract specKind(): TypeSpecKind;
  abstract specNames(): string[];
  abstract specName(): string;
  
  abstract declStr(decl: string): string;
}

class SpecifierType extends AssetType {
  names!: string[];
  kind!: TypeSpecKind;
  quals!: TypeQual[];

  constructor(names: string[], kind: TypeSpecKind, quals: TypeQual[]) {
    super();
    this.names = names;
    this.kind = kind;
    this.quals = quals;
  }

  override specKind(): TypeSpecKind {
    return this.kind;
  }

  override specNames(): string[] {
    return this.names;
  }

  override specName(): string {
    return this.names[this.names.length - 1];
  }

  override declStr(decl: string): string {
    const parts = this.quals.map(q => TypeQual[q].toLowerCase());
    if (TypeSpecKind.isTag(this.kind)) {
      parts.push(TypeSpecKind[this.kind].toLowerCase());
    }
    parts.push(this.specNames().join(' '));
    if (decl) {
      parts.push(decl);
    }
    return parts.join(' ');
  }
}

abstract class OuterType extends AssetType {
  innerType!: AssetType;

  constructor(innerType: AssetType) {
    super();
    this.innerType = innerType;
  }

  override specKind(): TypeSpecKind {
    return this.innerType.specKind();
  }

  override specNames(): string[] {
    return this.innerType.specNames();
  }

  override specName(): string {
    return this.innerType.specName();
  }
}

class PointerType extends OuterType {
  quals!: TypeQual[];

  constructor(innerType: AssetType, quals: TypeQual[]) {
    super(innerType);
    this.quals = quals;
  }

  override declStr(decl: string = ''): string {
    const parts = ['*']
    for (const q of this.quals) {
      parts.push(TypeQual[q].toLowerCase());
    }
    if (decl) {
      parts.push(decl);
    }
    let ptrStr = parts.join(' ');
    if (this.innerType instanceof ArrayType || this.innerType instanceof FunctionType) {
      ptrStr = `(${ptrStr})`;
    }
    return this.innerType.declStr(ptrStr);
  }
}

class ArrayType extends OuterType {
  size!: number;

  constructor(innerType: AssetType, size: number) {
    super(innerType);
    this.size = size;
  }

  override declStr(decl: string = ''): string {
    const arrStr = `[0x${toHex(this.size)}]`;
    return this.innerType.declStr(decl + arrStr);
  }
}

class FunctionType extends OuterType {
  params!: AssetType[];

  constructor(innerType: AssetType, paramList: AssetType[]) {
    super(innerType);
    this.params = paramList;
  }

  override declStr(decl: string = ''): string {
    let paramStr = '';
    if (this.params !== null && this.params.length > 0) {
      paramStr = this.params.map(p => p.declStr('')).join(', ');
    }
    return this.innerType.declStr(decl + `(${paramStr})`);
  }
}

// -------- Tokenizer --------

enum TokenName {
  EOS,
  // Identifiers and literals
  Ident,          // [A-Za-z_][A-Za-z0-9_]*
  Integer,        // [0-9][A-Za-z0-9_]*
  // Separators
  LParen,         // (
  RParen,         // )
  LBracket,       // [
  RBracket,       // ]
  Star,           // *
  Comma,          // ,
  // Specifiers and qualifiers
  SpecTag,        // Ex: struct
  TypeQual,       // Ex: const
  StoreSpec       // Ex: static
}

class Token {
  name!: TokenName;
  text!: string;

  constructor(name: TokenName, text: string) {
    this.name = name;
    this.text = text;
  }

  nameStr(): string {
    return TokenName[this.name];
  }
}

class TypeTokenizer {
  tokens!: Token[];
  idx!: number;
  tokenIdx!: number;
  text!: string;

  SINGLE_CHAR_TOKENS: { [key: string]: TokenName } = {
    ['(']: TokenName.LParen,
    [')']: TokenName.RParen,
    ['[']: TokenName.LBracket,
    [']']: TokenName.RBracket,
    ['*']: TokenName.Star,
    [',']: TokenName.Comma
  };

  KEYWORDS: { [key: string]: TokenName } = {
    // Specifier tags
    ['enum']: TokenName.SpecTag,
    ['struct']: TokenName.SpecTag,
    ['union']: TokenName.SpecTag,
    // Type qualifiers
    ['const']: TokenName.TypeQual,
    ['volatile']: TokenName.TypeQual,
    // Storage qualifiers
    ['extern']: TokenName.StoreSpec,
    ['static']: TokenName.StoreSpec,
    ['auto']: TokenName.StoreSpec,
    ['register']: TokenName.StoreSpec
  };

  tokenize(text: string): Token[] {
    this.tokens = [];
    this.idx = 0;
    this.text = text;

    while (this.idx < text.length) {
      this.tokenIdx = this.idx;
      const c = this.text[this.idx++];

      // Skip whitespace
      if (c === ' ') {
        continue;
      }
      // Check separator
      const sepName = this.SINGLE_CHAR_TOKENS[c];
      if (sepName !== undefined) {
        this.addToken(sepName, c);
      // Check integer
      } else if (/[0-9]/.test(c)) {
        this.addToken(TokenName.Integer, this.alphaNum());
      // Check identifier
      } else if (/[A-Za-z_]/.test(c)) {
        const ident = this.alphaNum();
        let name = this.KEYWORDS[ident];
        if (name === undefined) {
          name = TokenName.Ident
        }
        this.addToken(name, ident);
      } else {
        throw new Error(`Unrecognized character '${c}'`);
      }
    }

    this.addToken(TokenName.EOS, '');
    return this.tokens;
  }

  private alphaNum(): string {
    while (this.idx < this.text.length) {
      const c = this.text[this.idx];
      if (/[0-9A-Za-z_]/.test(c)) {
        this.idx++;
      }
      else {
        break;
      }
    }
    return this.text.slice(this.tokenIdx, this.idx);
  }

  private addToken(name: TokenName, text: string) {
    const token = new Token(name, text);
    this.tokens.push(token);
  }
}

// -------- Parser --------

class ParseInfo {
  spec!: AssetType;
  root!: AssetType;
  outer?: OuterType;
  start!: number;
  left!: number;

  constructor(spec: AssetType, start: number, left: number) {
    this.spec = spec;
    this.root = spec;
    this.outer = undefined;
    this.start = start;
    this.left = left;
  }

  updateParentTypes(newType: OuterType) {
    if (!this.outer) {
      this.root = newType;
    } else {
      this.outer.innerType = newType;
    }
    this.outer = newType;
  }
}

class TypeParser {
  tokens!: Token[];
  idx!: number;
  currToken!: Token;
  prevToken!: Token;

  TAG_TYPES: { [key: string]: TypeSpecKind } = {
    ['enum']: TypeSpecKind.Enum,
    ['struct']: TypeSpecKind.Struct,
    ['union']: TypeSpecKind.Union
  };

  parse(tokens: Token[]): AssetType {
    this.tokens = tokens;
    this.idx = -1;
    // TODO: Fix?
    //this.currToken = null;
    this.nextToken();

    const root = this.parseDecl(0);
    if (this.currToken.name !== TokenName.EOS) {
      throw new Error('Expected EOS');
    }
    return root;
  }

  private nextToken() {
    this.prevToken = this.currToken;
    this.currToken = this.tokens[++this.idx];
  }

  private accept(name: TokenName): boolean {
    if (this.currToken.name === name) {
      this.nextToken();
      return true;
    }
    return false;
  }

  private expect(name: TokenName) {
    if (!this.accept(name)) {
      const expected = TokenName[name];
      const actual = this.currToken.nameStr();
      throw new Error(`Expected ${expected} but got ${actual}`);
    }
  }

  private parseDecl(start: number): AssetType {
    const inParam = start > 0;

    // First tokens must be type spec
    const spec = this.parseTypeSpec();
    
    // Check if already at end
    const tempName = this.currToken.name;
    if (tempName === TokenName.EOS) {
      return spec;
    }

    // Update left end index
    start = this.idx - 1;

    // Find middle of declaration
    this.findDeclMiddle();
    let left = this.idx - 1;

    // Parse from middle outwards
    const info = new ParseInfo(spec, start, left);
    while (true) {
      if (this.accept(TokenName.LBracket)) {
        // Array
        this.expect(TokenName.Integer);
        const size = parseInt(this.prevToken.text.slice(2), 16);
        this.expect(TokenName.RBracket);
        const arrType = new ArrayType(spec, size);
        info.updateParentTypes(arrType);
      } else if (this.accept(TokenName.LParen)) {
        // Function
        const params: AssetType[] = [];
        if (!this.accept(TokenName.RParen)) {
          while (true) {
            const paramType = this.parseDecl(this.idx);
            if (this.currToken.name === TokenName.EOS) {
              throw new Error('Unexpected EOS while parsing function parameters');
            }

            params.push(paramType);
            if (this.accept(TokenName.RParen)) {
              break;
            }

            this.expect(TokenName.Comma);
          }
        }

        const funcType = new FunctionType(spec, params);
        info.updateParentTypes(funcType);
      } else if (this.currToken.name === TokenName.RParen) {
        // End of parentheses
        this.parseLeft(info, false);
        if (inParam && info.left === start) {
          break;
        }
      } else if (this.currToken.name === TokenName.EOS ||
          this.currToken.name === TokenName.Comma) {
        // End of declaration (or param)
        this.parseLeft(info, true);
        break;
      } else {
        throw new Error(`Unexpected token ${this.currToken.nameStr()}`);
      }
    }

    return info.root;
  }

  private parseTypeSpec(): AssetType {
    const names: string[] = [];
    const quals: TypeQual[] = [];
    let kind: TypeSpecKind;
    while (this.accept(TokenName.TypeQual)) {
      const text = this.prevToken.text.toLowerCase();
      quals.push(TypeQual.fromString(text));
    }
    if (this.accept(TokenName.SpecTag)) {
      kind = this.TAG_TYPES[this.prevToken.text];
      this.expect(TokenName.Ident);
      names.push(this.prevToken.text);
    } else {
      this.expect(TokenName.Ident);
      names.push(this.prevToken.text);
      if (BUILT_IN_TYPES.has(names[0])) {
        kind = TypeSpecKind.BuiltIn;
        while (this.accept(TokenName.Ident)) {
          const name = this.prevToken.text;
          if (!BUILT_IN_TYPES.has(name)) {
            throw new Error(`Expected built-in type but got ${name}`);
          }
          names.push(name);
        }
      } else {
        // typedefs should only have one name
        kind = TypeSpecKind.Typedef;
      }
    }
    return new SpecifierType(names, kind, quals);
  }

  private findDeclMiddle() {
    while (true) {
      if (this.accept(TokenName.TypeQual) || this.accept(TokenName.Star)) {
        continue;
      }

      if (this.currToken.name == TokenName.LParen) {
        const nextName = this.tokens[this.idx + 1].name;
        if (nextName !== TokenName.RParen && nextName !== TokenName.Ident) {
          this.nextToken();
          continue;
        }
      }

      break;
    }
  }

  private parseLeft(info: ParseInfo, decl_end: boolean) {
    let quals: TypeQual[] = [];
    while (info.left > info.start) {
      const token = this.tokens[info.left--];
      if (token.name === TokenName.Star) {
        quals.reverse();
        const ptrType = new PointerType(info.spec, quals);
        info.updateParentTypes(ptrType);
        quals = [];
      } else if (token.name === TokenName.TypeQual) {
        const text = token.text.toLowerCase();
        quals.push(TypeQual.fromString(text));
      } else if (token.name === TokenName.LParen) {
        if (decl_end) {
          const tn = this.currToken.nameStr();
          throw new Error(`Unexpected token ${tn}`);
        } else {
          this.nextToken();
          break;
        }
      }
    }
  }
}
