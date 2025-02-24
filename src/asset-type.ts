export {
  SpecifierType, TaggedType, OuterType, PointerType,
  ArrayType, FunctionType, TypeTokenizer, TypeParser
};
import { toHex } from './utils';

// -------- AST --------

export enum DataType {
  Void,
  U8,
  S8,
  U16,
  S16,
  U32,
  S32,
  Struct
}

abstract class AssetType {
  abstract baseType(): DataType;
  abstract specName(): string;
  
  abstract declStr(decl: string): string;
}

abstract class SpecifierType extends AssetType {
  dataType!: DataType;

  constructor(dataType: DataType) {
    super();
    this.dataType = dataType;
  }

  override baseType(): DataType {
    return this.dataType;
  }
}

class PrimitiveType extends SpecifierType {
  constructor(dataType: DataType) {
    super(dataType);
    if (dataType === DataType.Struct) {
      throw new Error('Primitive types cannot be struct');
    }
  }

  override specName(): string {
    return DataType[this.dataType].toLowerCase();
  }

  override declStr(decl: string = ''): string {
    if (decl !== '') {
      return `${this.specName()} ${decl}`;
    }
    return this.specName();
  }
}

class TaggedType extends SpecifierType {
  name!: string;

  constructor(dataType: DataType, name: string) {
    super(dataType);
    if (dataType !== DataType.Struct) {
      throw new Error('Tagged types must be struct');
    }
    this.name = name
  }

  override specName(): string {
    return this.name;
  }

  override declStr(decl: string = ''): string {
    const tagStr = `${DataType[this.dataType].toLowerCase()} ${this.name}`;
    if (decl !== '') {
      return `${tagStr} ${decl}`;
    }
    return tagStr;
  }
}

abstract class OuterType extends AssetType {
  innerType!: AssetType;

  constructor(innerType: AssetType) {
    super();
    this.innerType = innerType;
  }

  override baseType(): DataType {
    return this.innerType.baseType();
  }

  override specName(): string {
    return this.innerType.specName();
  }
}

class PointerType extends OuterType {
  constructor(innerType: AssetType) {
    super(innerType);
  }

  override declStr(decl: string = ''): string {
    let ptrStr = '*' + decl;
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
  paramList!: AssetType[];

  constructor(innerType: AssetType, paramList: AssetType[]) {
    super(innerType);
    this.paramList = paramList;
  }

  override declStr(decl: string = ''): string {
    let paramStr = '';
    if (this.paramList !== null && this.paramList.length > 0) {
      paramStr = this.paramList.map(p => p.declStr('')).join(', ');
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
  TypeSpec        // Ex: u8
  //TypeQual,       // Ex: const
  //StoreSpec       // Ex: static
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
    ['void']: TokenName.TypeSpec,
    ['u8']: TokenName.TypeSpec,
    ['u16']: TokenName.TypeSpec,
    ['u32']: TokenName.TypeSpec,
    ['s8']: TokenName.TypeSpec,
    ['s16']: TokenName.TypeSpec,
    ['s32']: TokenName.TypeSpec,
    ['struct']: TokenName.TypeSpec
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

      const sepName = this.SINGLE_CHAR_TOKENS[c];
      if (sepName !== undefined) {
        this.addToken(sepName, c);
      } else if (/[0-9]/.test(c)) {
        this.addToken(TokenName.Integer, this.alphaNum());
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

class TypeParser {
  tokens!: Token[];
  idx!: number;
  currToken!: Token;
  prevToken!: Token;

  DATA_TYPE_STRINGS: { [key: string]: DataType } = {
    ['void']: DataType.Void,
    ['u8']: DataType.U8,
    ['u16']: DataType.U16,
    ['u32']: DataType.U32,
    ['s8']: DataType.S8,
    ['s16']: DataType.S16,
    ['s32']: DataType.S32,
    ['struct']: DataType.Struct
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
    function updateParentTypes(newType: OuterType) {
      if (outer === undefined) {
        root = newType;
      } else {
        outer.innerType = newType;
      }
      outer = newType;
    }

    const inParam = start > 0;

    // Must start with type specifier
    const spec = this.parseTypeSpec();
    
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
    let root = spec;
    let outer: OuterType | undefined = undefined;
    while (true) {
      if (this.accept(TokenName.LBracket)) {
        const size = this.parseHex();
        this.expect(TokenName.RBracket);
        const arrType = new ArrayType(spec, size);
        updateParentTypes(arrType);
      } else if (this.accept(TokenName.LParen)) {
        const paramList: AssetType[] = [];
        if (!this.accept(TokenName.RParen)) {
          while (true) {
            const paramType = this.parseDecl(this.idx);
            if (this.currToken.name === TokenName.EOS) {
              throw new Error('Unexpected EOS while parsing function parameters');
            }

            paramList.push(paramType);
            if (this.accept(TokenName.RParen)) {
              break;
            }

            this.expect(TokenName.Comma);
          }
        }

        const funcType = new FunctionType(spec, paramList);
        updateParentTypes(funcType);
      } else if (this.currToken.name === TokenName.RParen) {
        while (left > start) {
          const name = this.tokens[left--].name;
          if (name == TokenName.Star) {
            const ptrType = new PointerType(spec);
            updateParentTypes(ptrType);
          } else if (name == TokenName.LParen) {
            this.nextToken();
            break;
          }
        }

        if (inParam && left === start) {
          break;
        }
      } else if (this.currToken.name === TokenName.EOS ||
          this.currToken.name === TokenName.Comma) {
        while (left > start) {
          const name = this.tokens[left--].name;
          if (name == TokenName.Star) {
            const ptrType = new PointerType(spec);
            updateParentTypes(ptrType);
          } else if (name == TokenName.LParen) {
            throw new Error(`Unexpected token ${this.currToken.nameStr()}`);
          }
        }

        break;
      } else {
        throw new Error(`Unexpected token ${this.currToken.nameStr()}`);
      }
    }

    return root;
  }

  private parseTypeSpec(): AssetType {
    this.expect(TokenName.TypeSpec);

    const dataType = this.DATA_TYPE_STRINGS[this.prevToken.text];

    if (dataType == DataType.Struct) {
      this.expect(TokenName.Ident);
      return new TaggedType(dataType, this.prevToken.text);
    } else {
      return new PrimitiveType(dataType);
    }
  }

  private findDeclMiddle() {
    while (true)
    {
      if (this.accept(TokenName.Star))
        continue;

      if (this.currToken.name == TokenName.LParen)
      {
        const nextName = this.tokens[this.idx + 1].name;
        if (nextName != TokenName.RParen && nextName != TokenName.TypeSpec)
        {
          this.nextToken();
          continue;
        }
      }

      break;
    }
  }

  private parseHex(): number {
    this.expect(TokenName.Integer);
    return parseInt(this.prevToken.text.slice(2), 16);
  }
}
