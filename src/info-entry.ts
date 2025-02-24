export {
  InfoEntry, VarEntry, StructVarEntry, DataEntry, CodeEntry,
  StructEntry, EnumValEntry, EnumEntry, StructEntryDict, EnumEntryDict
};
import { toHex } from './utils';
import {
  KEY_ADDR, KEY_CAT, KEY_COUNT, KEY_DESC, KEY_ENUM, KEY_MODE, KEY_NAME,
  KEY_OFF, KEY_PARAMS, KEY_RET, KEY_SIZE, KEY_TYPE, KEY_VAL
} from './constants';
import {
  SpecifierType, TaggedType, OuterType, ArrayType,
  FunctionType, TypeTokenizer, TypeParser, PointerType
} from './asset-type';

export type DictEntry = {[key: string]: unknown};

function swap_key_value(obj: any): any {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));
}

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

enum Category {
  Flags,
  Ascii,
  Text,
  Gfx,
  Tilemap,
  Palette,
  OamFrame,
  BGBlocks,
  BGMap,
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
  [Category.BGBlocks]: 'bg_blocks',
  [Category.BGMap]: 'bg_map',
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

abstract class InfoEntry {
  name!: string;
  desc?: string;

  constructor(entry: DictEntry) {
    this.name = entry[KEY_NAME] as string;
    this.desc = entry[KEY_DESC] as string;
  }

  sortValue(): number {
    throw new Error('Unsupported');
  }
}

class VarEntry extends InfoEntry {
  arrCount?: number;
  decl!: string;
  cat?: Category;
  enum?: string;
  // Type related
  baseType!: DataType;
  structName?: string;
  isPtr!: boolean;
  innerCount!: number;

  static tokenizer = new TypeTokenizer();
  static parser = new TypeParser();

  constructor(entry: DictEntry) {
    super(entry);
    this.decl = entry[KEY_TYPE] as string;
    const arrCount = entry[KEY_COUNT] as string;
    this.arrCount = arrCount ? parseInt(arrCount) : undefined;
    const cat = entry[KEY_CAT] as string;
    this.cat = cat ? STR_TO_CAT[cat] : undefined;
    this.enum = entry[KEY_ENUM] as string;
    this.parseType();
  }

  /** Gets the number of items (1 unless array type) */
  getCount(): number {
    return this.arrCount ?? 1;
  }

  getSpecSize(structs: StructEntryDict) : number {
    switch (+this.baseType) {
      case DataType.U8:
      case DataType.S8:
        return 1;
      case DataType.U16:
      case DataType.S16:
        return 2
      case DataType.U32:
      case DataType.S32:
        return 4;
      case DataType.Struct:
        const se = structs[this.structName!];
        if (se === undefined) {
          throw new Error(`Invalid struct name ${this.structName}`);
        }
        return se.size;
      default:
        throw new Error('Invalid data type');
    }
  }

  /** Gets the physical size of an individual item */
  getSize(structs: StructEntryDict): number {
    let size = this.isPtr ? 4 : this.getSpecSize(structs);
    return size * this.innerCount;
  }

  /** Gets the total physical size of all items */
  getLength(structs: StructEntryDict): number {
    return this.getCount() * this.getSize(structs);
  }

  /** Returns the item size and count if count > 1 */
  getLengthToolTip(structs: StructEntryDict): string {
    const count = this.getCount();
    if (count == 1) {
      return '';
    }
    const size = this.getSize(structs);
    return 'Size: ' + toHex(size) + '\nCount: ' + toHex(count);
  }
  
  specName(): string {
    if (this.baseType === DataType.Struct) {
      return this.structName!;
    }
    return DataType[this.baseType].toLowerCase();
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
    const tokens = VarEntry.tokenizer.tokenize(this.decl);
    let type = VarEntry.parser.parse(tokens);
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
    this.baseType = type.dataType;
    if (type instanceof TaggedType) {
      this.structName = type.name;
    }
  }
}

class StructVarEntry extends VarEntry {
  offset!: number;

  constructor(entry: DictEntry) {
    super(entry);
    this.offset = parseInt(entry[KEY_OFF] as string)
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

/** Represents ram and data entries */
class DataEntry extends VarEntry {
  addr!: number;

  constructor(entry: DictEntry) {
    super(entry);
    this.addr = parseInt(entry[KEY_ADDR] as string)
  }

  override sortValue(): number {
    return this.addr;
  }
}

class CodeEntry extends InfoEntry {
  addr!: number;
  size!: number;
  mode!: string;
  params?: VarEntry[];
  return?: VarEntry;

  constructor(entry: DictEntry) {
    super(entry);
    this.addr = parseInt(entry[KEY_ADDR] as string);
    this.size = parseInt(entry[KEY_SIZE] as string);
    this.mode = STR_TO_MODE[entry[KEY_MODE] as string];
    const params = entry[KEY_PARAMS] as DictEntry[];
    this.params = params?.map(p => new VarEntry(p));
    const ret = entry[KEY_RET] as DictEntry;
    this.return = ret ? new VarEntry(ret) : undefined;
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

class EnumValEntry extends InfoEntry {
  val!: number;

  constructor(entry: DictEntry) {
    super(entry);
    this.val = parseInt(entry[KEY_VAL] as string);
  }

  override sortValue(): number {
    return this.val;
  }
}

class EnumEntry extends InfoEntry {
  vals!: EnumValEntry[];

  constructor(entry: DictEntry) {
    super(entry);
    this.vals = (entry['vals'] as DictEntry[]).map(v => new EnumValEntry(v));
  }
}

class StructEntry extends InfoEntry {
  size!: number;
  vars!: StructVarEntry[];

  constructor(entry: DictEntry) {
    super(entry);
    this.size = parseInt(entry[KEY_SIZE] as string);
    this.vars = (entry['vars'] as DictEntry[]).map(v => new StructVarEntry(v));
  }
}

type StructEntryDict = { [key: string]: StructEntry };
type EnumEntryDict = { [key: string]: EnumEntry };
