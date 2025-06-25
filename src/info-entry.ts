export {
  DictEntry, NamedEntry, StructEntryDict, UnionEntryDict, EnumEntryDict, TypedefEntryDict,
  InfoEntry, VarEntry, NamedVarEntry, DataEntry, CodeEntry, StructVarEntry,
  StructEntry, UnionEntry, EnumValEntry, EnumEntry, TypedefEntry
};
import { toHex } from './utils';
import {
  KEY_ADDR, KEY_BITS, KEY_CAT, KEY_COUNT, KEY_DESC, KEY_ENUM, KEY_LOC, KEY_MODE,
  KEY_NAME, KEY_OFF, KEY_PARAMS, KEY_RET, KEY_SIZE, KEY_TYPE, KEY_VAL, KEY_VALS, KEY_VARS
} from './constants';
import {
  BUILT_IN_SIZES, TypeSpecKind, AssetType, SpecifierType, OuterType,
  ArrayType, FunctionType, TypeTokenizer, TypeParser, PointerType
} from './asset-type';

type DictEntry = {[key: string]: unknown};
type NamedEntry = NamedVarEntry | CodeEntry | StructEntry | UnionEntry | EnumEntry | TypedefEntry;
type StructEntryDict = { [key: string]: StructEntry };
type UnionEntryDict = { [key: string]: UnionEntry };
type EnumEntryDict = { [key: string]: EnumEntry };
type TypedefEntryDict = { [key: string]: TypedefEntry };

function swap_key_value(obj: any): any {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));
}

enum Category {
  Bool,
  Flags,
  Ascii,
  Text,
  Gfx,
  Tilemap,
  Palette,
  OamFrame,
  BgBlocks,
  BgMap,
  Pcm,
  Thumb,
  Arm
}

const CAT_TO_STR = {
  [Category.Flags]: 'flags',
  [Category.Ascii]: 'ascii',
  [Category.Text]: 'text',
  [Category.Gfx]: 'gfx',
  [Category.Tilemap]: 'tilemap',
  [Category.Palette]: 'palette',
  [Category.OamFrame]: 'oam_frame',
  [Category.BgBlocks]: 'bg_blocks',
  [Category.BgMap]: 'bg_map',
  [Category.Pcm]: 'pcm',
  [Category.Thumb]: 'thumb',
  [Category.Arm]: 'arm'
}

const STR_TO_CAT = swap_key_value(CAT_TO_STR);

// enum Compression {
//   Rle,
//   LZ
// }

enum CodeMode {
  Thumb,
  Arm
}

const MODE_TO_STR = {
  [CodeMode.Thumb]: 'thumb',
  [CodeMode.Arm]: 'arm',
}

const STR_TO_MODE = swap_key_value(MODE_TO_STR);

const TOKENIZER = new TypeTokenizer();
const PARSER = new TypeParser();

abstract class InfoEntry {
  desc?: string;

  constructor(entry: DictEntry) {
    this.desc = entry[KEY_DESC] as string;
  }

  sortValue(): number {
    throw new Error('Unsupported');
  }
}

class VarEntry extends InfoEntry {
  decl!: string;
  specNames!: string[];
  specKind!: TypeSpecKind;
  isPtr!: boolean;
  innerCount!: number;
  arrCount?: number;
  cat?: Category;
  //comp?: Compression;
  enum?: string;

  constructor(entry: DictEntry) {
    super(entry);
    this.decl = entry[KEY_TYPE] as string;
    this.parseType();
    const arrCount = entry[KEY_COUNT] as string;
    this.arrCount = arrCount !== undefined ? parseInt(arrCount) : undefined;
    const cat = entry[KEY_CAT] as string;
    this.cat = cat ? STR_TO_CAT[cat] : undefined;
    this.enum = entry[KEY_ENUM] as string;
  }

  /** Gets the number of items (1 unless array type) */
  getCount(): number {
    return this.arrCount ?? 1;
  }

  getSpecSize(sizes: { [key: string]: number }) : number {
    switch (this.specKind) {
      case TypeSpecKind.BuiltIn:
        if (this.specNames.includes("long")) {
          return 8;
        }
        const size1 = BUILT_IN_SIZES[this.specName()];
        if (size1 !== undefined) {
          return size1;
        }
        return 4; // int by default
      case TypeSpecKind.Typedef:
      case TypeSpecKind.Struct:
      case TypeSpecKind.Union:
        const size2 = sizes[this.specName()];
        if (size2 !== undefined) {
          return size2;
        }
        const ks = TypeSpecKind[this.specKind];
        throw new Error(`Invalid ${ks} name ${this.specName()}`);
      case TypeSpecKind.Enum:
        throw new Error('Cannot compute size of enum');
      default:
        throw new Error(TypeSpecKind[this.specKind]);
    }
  }

  /** Gets the physical size of an individual item */
  getSize(sizes: { [key: string]: number }): number {
    let size = this.isPtr ? 4 : this.getSpecSize(sizes);
    return size * this.innerCount;
  }

  /** Gets the total physical size of all items */
  getLength(sizes: { [key: string]: number }): number {
    return this.getCount() * this.getSize(sizes);
  }

  /** Returns the item size and count if count > 1 */
  getLengthToolTip(sizes: { [key: string]: number }): string {
    if (this.arrCount === undefined) {
      return '';
    }
    const size = this.getSize(sizes);
    const count = this.getCount();
    const countStr = count !== 0 ? toHex(count) : '?';
    return 'Size: ' + toHex(size) + '\nCount: ' + countStr;
  }

  specName(): string {
    return this.specNames[this.specNames.length - 1];
  }

  catStr(): string | undefined {
    return this.cat ? CAT_TO_STR[this.cat] : undefined;
  }

  typeStr(): string {
    let ts = this.decl;
    if (this.arrCount) {
      const last = ts[ts.length - 1];
      if (last !== '*' && last !== ']' && last !== ')') {
        ts += ' ';
      }
      ts += '[0x' + toHex(this.arrCount) + ']';
    }
    return ts;
  }

  private parseType() {
    const tokens = TOKENIZER.tokenize(this.decl);
    let type = PARSER.parse(tokens);
    this.isPtr = false;
    this.innerCount = 1;

    while (type instanceof OuterType) {
      if (type instanceof PointerType) {
        this.isPtr = true;
      } else if (type instanceof ArrayType) {
        if (!this.isPtr) {
          this.innerCount *= type.size;
        }
      } else if (type instanceof FunctionType) {
        if (!this.isPtr) {
          throw new Error('Function must be pointer');
        }
      }
      type = type.innerType;
    }

    if (!(type instanceof SpecifierType)) {
      throw new Error('Base type must be specifier type');
    }
    this.specNames = type.names;
    this.specKind = type.kind;
  }
}

class NamedVarEntry extends VarEntry {
  name!: string;

  constructor(entry: DictEntry) {
    super(entry);
    this.name = entry[KEY_NAME] as string;
  }
}

/** Represents ram and data entries */
class DataEntry extends NamedVarEntry {
  addr!: number;
  loc!: string;

  constructor(entry: DictEntry) {
    super(entry);
    this.addr = parseInt(entry[KEY_ADDR] as string)
    this.loc = entry[KEY_LOC] as string;
  }

  override sortValue(): number {
    return this.addr;
  }
}

class CodeEntry extends InfoEntry {
  name!: string;
  addr!: number;
  size!: number;
  mode!: string;
  params?: NamedVarEntry[];
  return?: VarEntry;
  loc!: string;

  constructor(entry: DictEntry) {
    super(entry);
    this.name = entry[KEY_NAME] as string;
    this.addr = parseInt(entry[KEY_ADDR] as string);
    this.size = parseInt(entry[KEY_SIZE] as string);
    this.mode = STR_TO_MODE[entry[KEY_MODE] as string];
    const params = entry[KEY_PARAMS] as DictEntry[];
    this.params = params?.map(p => new NamedVarEntry(p));
    const ret = entry[KEY_RET] as DictEntry;
    this.return = ret ? new VarEntry(ret) : undefined;
    this.loc = entry[KEY_LOC] as string;
  }

  override sortValue(): number {
    return this.addr;
  }

  /** Returns where the function ends */
  getToolTip(): string {
    const funcEnd = this.addr + this.size - 1;
    return 'Ends at ' + toHex(funcEnd);
  }

  getParams(): string {
    return '';
  }

  getReturn(): string {
    return '';
  }
}

class StructVarEntry extends NamedVarEntry {
  offset!: number;
  bits?: number;

  constructor(entry: DictEntry) {
    super(entry);
    this.offset = parseInt(entry[KEY_OFF] as string)
    const bits = entry[KEY_BITS] as string;
    this.bits = bits ? parseInt(bits) : undefined;
  }

  override sortValue(): number {
    return this.offset;
  }

  /** Returns the address of this field in item 0 */
  getOffsetToolTip(parentAddr: number): string {
    if (isNaN(parentAddr)) {
      return '';
    }
    return 'Address: ' + toHex(parentAddr + this.offset);
  }
}

class StructEntry extends InfoEntry {
  name!: string;
  size!: number;
  vars!: StructVarEntry[];
  loc!: string;

  constructor(entry: DictEntry) {
    super(entry);
    this.name = entry[KEY_NAME] as string;
    this.size = parseInt(entry[KEY_SIZE] as string);
    this.vars = (entry[KEY_VARS] as DictEntry[]).map(v => new StructVarEntry(v));
    this.loc = entry[KEY_LOC] as string;
  }
}

class UnionEntry extends InfoEntry {
  name!: string;
  size!: number;
  vars!: NamedVarEntry[];
  loc!: string;

  constructor(entry: DictEntry) {
    super(entry);
    this.name = entry[KEY_NAME] as string;
    this.size = parseInt(entry[KEY_SIZE] as string);
    this.vars = (entry[KEY_VARS] as DictEntry[]).map(v => new NamedVarEntry(v));
    this.loc = entry[KEY_LOC] as string;
  }
}

class EnumValEntry extends InfoEntry {
  name!: string;
  val!: number;

  constructor(entry: DictEntry) {
    super(entry);
    this.name = entry[KEY_NAME] as string;
    this.val = parseInt(entry[KEY_VAL] as string);
  }

  override sortValue(): number {
    return this.val;
  }
}

class EnumEntry extends InfoEntry {
  name!: string;
  vals!: EnumValEntry[];
  loc!: string;

  constructor(entry: DictEntry) {
    super(entry);
    this.name = entry[KEY_NAME] as string;
    this.vals = (entry[KEY_VALS] as DictEntry[]).map(v => new EnumValEntry(v));
    this.loc = entry[KEY_LOC] as string;
  }
}

class TypedefEntry extends InfoEntry {
  name!: string;
  decl!: string;
  type!: AssetType;
  loc!: string;

  constructor(entry: DictEntry) {
    super(entry);
    this.name = entry[KEY_NAME] as string;
    this.decl = entry[KEY_TYPE] as string;
    const tokens = TOKENIZER.tokenize(this.decl);
    this.type = PARSER.parse(tokens);
    this.loc = entry[KEY_LOC] as string;
  }
}
