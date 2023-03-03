export {
  GameEntry, GameVar, GameRelVar, GameData, GameCode,
  GameStruct, GameEnumVal, GameEnum, GameStructList, GameEnumList
};
import { toHex } from "./utils";
import {
  KEY_ADDR, KEY_COUNT, KEY_DESC, KEY_ENUM, KEY_LABEL, KEY_MODE, KEY_NOTES,
  KEY_OFF, KEY_PARAMS, KEY_RET, KEY_SIZE, KEY_TAGS, KEY_TYPE, KEY_VAL
} from "./headings";

export type DictEntry = {[key: string]: unknown};

function swap_key_value(obj: any): any {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));
}

export enum PrimType {
  U8,
  S8,
  Bool,
  U16,
  S16,
  U32,
  S32,
  Struct,
  Void
}

const PRIM_TO_STR = {
  [PrimType.U8]: 'u8',
  [PrimType.S8]: 's8',
  [PrimType.Bool]: 'bool',
  [PrimType.U16]: 'u16',
  [PrimType.S16]: 's16',
  [PrimType.U32]: 'u32',
  [PrimType.S32]: 's32',
  [PrimType.Struct]: 'struct',
  [PrimType.Void]: 'void'
}

const STR_TO_PRIM = swap_key_value(PRIM_TO_STR);

enum DataTag {
  Flags,
  Ascii,
  Text,
  Rle,
  LZ,
  Gfx,
  Tilemap,
  Palette,
  OamFrame,
  BGBlocks,
  BGMap,
  Thumb,
  Arm
}

const TAG_TO_STR = {
  [DataTag.Flags]: "flags",
  [DataTag.Ascii]: "ascii",
  [DataTag.Text]: "text",
  [DataTag.Rle]: "rle",
  [DataTag.LZ]: "lz",
  [DataTag.Gfx]: "gfx",
  [DataTag.Tilemap]: "tilemap",
  [DataTag.Palette]: "palette",
  [DataTag.OamFrame]: "oam_frame",
  [DataTag.BGBlocks]: "bg_blocks",
  [DataTag.BGMap]: "bg_map",
  [DataTag.Thumb]: "thumb",
  [DataTag.Arm]: "arm"
}

const STR_TO_TAG = swap_key_value(TAG_TO_STR);

enum CodeMode {
  Thumb,
  Arm
}

const MODE_TO_STR = {
  [CodeMode.Thumb]: "thumb",
  [CodeMode.Arm]: "arm",
}

const STR_TO_MODE = swap_key_value(MODE_TO_STR);

abstract class GameEntry {
  sortValue(): number {
    throw new Error('Unsupported');
  }
}

class GameVar extends GameEntry {
  desc!: string;
  label!: string;
  arrCount?: number;
  tags?: DataTag[];
  enum?: string;
  notes?: string;
  // used for type
  primitive!: PrimType;
  structName?: string;
  declaration?: string;

  constructor(entry: DictEntry) {
    super();
    this.desc = entry[KEY_DESC] as string;
    this.label = entry[KEY_LABEL] as string;
    this.parseType(entry[KEY_TYPE] as string);
    const arrCount = entry[KEY_COUNT] as string;
    this.arrCount = arrCount ? parseInt(arrCount) : undefined;
    this.tags = (entry[KEY_TAGS] as string[])?.map((t: string) => STR_TO_TAG[t]);
    this.enum = entry[KEY_ENUM] as string;
    this.notes = entry[KEY_NOTES] as string;
  }

  /** Gets the number of items (1 unless array type) */
  getCount(): number {
    return this.arrCount ?? 1;
  }

  getSpecSize(structs: GameStructList) : number {
    switch (+this.primitive) {
      case PrimType.U8:
      case PrimType.S8:
      case PrimType.Bool:
      case PrimType.Void:
        return 1;
      case PrimType.U16:
      case PrimType.S16:
        return 2
      case PrimType.U32:
      case PrimType.S32:
        return 4;
      case PrimType.Struct:
        const se = structs[this.structName!];
        if (se === undefined) {
          throw new Error(`Invalid struct name ${this.structName}`);
        }
        return se.size;
    }
    return NaN;
  }

  /** Gets the physical size of an individual item */
  getSize(structs: GameStructList): number {
    let size = this.getSpecSize(structs);
    if (!this.declaration) {
      return size;
    }
    // get inner-most part of declaration
    let decl = this.declaration;
    let i = decl.lastIndexOf('(');
    if (i !== -1) {
      i++;
      const j = decl.indexOf(')');
      decl = decl.slice(i, j);
    }
    // check for pointer
    if (decl.startsWith('*')) {
      size = 4;
      decl = decl.replace(/^\*+/, '');
    }
    // check for array
    const matches = decl.match(/\w+/g);
    if (matches) {
      for (const match of matches) {
        size *= parseInt(match, 16);
      }
    }
    return size;
  }

  /** Gets the total physical size of all items */
  getLength(structs: GameStructList): number {
    return this.getCount() * this.getSize(structs);
  }

  /** Returns the item size and count if count > 1 */
  getLengthToolTip(structs: GameStructList): string {
    const count = this.getCount();
    if (count == 1) {
      return '';
    }
    const size = this.getSize(structs);
    return 'Size: ' + toHex(size) + '\nCount: ' + toHex(count);
  }
  
  spec(): string {
    if (this.primitive === PrimType.Struct) {
      return this.structName!;
    }
    return PRIM_TO_STR[this.primitive];
  }

  tagStrs(): string[] | undefined {
    return this.tags?.map(t => TAG_TO_STR[t]);
  }

  typeStr(): string {
    let decl = this.declaration ?? '';
    if (this.arrCount) {
      let i = decl.lastIndexOf('*') + 1;
      const arrStr = '[0x' + toHex(this.arrCount) + ']'
      decl = decl.slice(0, i) + arrStr + decl.slice(i);
    }
    const spec = this.spec();
    if (decl) {
      return spec + ' ' + decl;
    }
    return spec;
  }

  private parseType(type: string) {
    const parts = type.split(' ');
    // primitive
    const prim = parts[0];
    let primType: PrimType = STR_TO_PRIM[prim];
    if (primType !== undefined) {
      this.primitive = primType;
      this.structName = undefined;
    } else {
      this.primitive = PrimType.Struct;
      this.structName = prim;
    }
    // declaration
    if (parts.length == 2) {
      this.declaration = parts[1];
    } else {
      this.declaration = undefined;
    }
  }
}

/** Represents struct var entries */
class GameRelVar extends GameVar {
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
    return 'Address: ' + toHex(parentAddr + this.offset);
  }
}

//** Represents ram and data entries */
class GameData extends GameVar {
  addr!: number;

  constructor(entry: DictEntry) {
    super(entry);
    this.addr = parseInt(entry[KEY_ADDR] as string)
  }

  override sortValue(): number {
    return this.addr;
  }
}

class GameCode extends GameEntry {
  desc!: string;
  label!: string;
  addr!: number;
  size!: number;
  mode!: string;
  params?: GameVar[];
  return?: GameVar;
  notes?: string;

  constructor(entry: DictEntry) {
    super();
    this.desc = entry[KEY_DESC] as string;
    this.label = entry[KEY_LABEL] as string;
    this.addr = parseInt(entry[KEY_ADDR] as string);
    this.size = parseInt(entry[KEY_SIZE] as string);
    this.mode = STR_TO_MODE[entry[KEY_MODE] as string];
    const params = entry[KEY_PARAMS] as DictEntry[];
    this.params = params?.map(p => new GameVar(p));
    const ret = entry[KEY_RET] as DictEntry;
    this.return = ret ? new GameVar(ret) : undefined;
    this.notes = entry[KEY_NOTES] as string;
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

class GameEnumVal extends GameEntry {
  desc!: string;
  label!: string;
  val!: number;
  notes?: string;

  constructor(entry: DictEntry) {
    super();
    this.desc = entry[KEY_DESC] as string;
    this.label = entry[KEY_LABEL] as string;
    this.val = parseInt(entry[KEY_VAL] as string);
    this.notes = entry[KEY_NOTES] as string;
  }

  override sortValue(): number {
    return this.val;
  }
}

class GameEnum extends GameEntry {
  vals!: GameEnumVal[];

  constructor(entry: DictEntry) {
    super();
    this.vals = (entry['vals'] as DictEntry[]).map(v => new GameEnumVal(v));
  }
}

class GameStruct extends GameEntry {
  size!: number;
  vars!: GameRelVar[];

  constructor(entry: DictEntry) {
    super();
    this.size = parseInt(entry[KEY_SIZE] as string);
    this.vars = (entry['vars'] as DictEntry[]).map(v => new GameRelVar(v));
  }
}

type GameStructList = { [key: string]: GameStruct };
type GameEnumList = { [key: string]: GameEnum };
