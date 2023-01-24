export {
  GameVar, GameRelVar, GameAbsVar, GameCode, GameStruct, GameEnumVal, 
  GameStructList, GameEnumList
};
import { toHex, getPrimSize } from "./utils";


class GameVar {
  desc!: string;
  label!: string;
  type!: string;
  tags?: string[];
  enum?: string;
  notes?: string;

  /** Gets the number of items (1 unless array type) */
  getCount(): number {
    let count = 1;
    const parts = this.type.split(' ');
    if (parts.length == 2) {
      let decl = parts[1];
      // get inner most part of declaration
      const i = decl.lastIndexOf('(');
      if (i != -1) {
        const j = decl.indexOf(')');
        decl = decl.slice(i + 1, j);
      }
      // check for pointer
      if (decl.startsWith('*')) {
        decl = decl.replace(/^\*+/, '');
      }
      // check for array
      const dims = decl.match(/(0x)?[0-9A-F]+/g);
      if (dims) {
        for (const dim of dims) {
          const radix = dim.startsWith('0x') ? 16 : 10;
          count *= parseInt(dim, radix);
        }
      }
    }
    return count;
  }

  /** Gets the physical size of an individual item */
  getSize(structs: GameStructList): number {
    if (this.isPtr()) {
      return 4;
    }
    const spec = this.spec();
    const primSize = getPrimSize(spec);
    if (!isNaN(primSize)) {
      return primSize;
    }
    if (spec in structs) {
      return structs[spec].getSize();
    }
    throw new Error('Invalid type specifier ' + spec);
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
    return this.type.split(' ')[0];
  }

  private isPtr(): boolean {
    // get second part of type string
    const parts = this.type.split(' ');
    if (parts.length != 2) {
      return false;
    }
    let decl = parts[1];
    // find inner most part of declaration
    let i = decl.lastIndexOf('(');
    // if i == -1, it needs to be 0 anyway
    i++;
    // check for pointer
    return decl[i] == '*';
  }
}

class GameRelVar extends GameVar {
  offset!: string;

  /** Returns the address of this field in item 0 */
  getOffsetToolTip(parentAddr: number): string {
    const off = parseInt(this.offset, 16);
    return 'Address: ' + toHex(parentAddr + off);
  }
}

class GameAbsVar extends GameVar {
  addr!: string;

  getAddr(): number {
    return parseInt(this.addr, 16);
  }
}

class GameCode {
  desc!: string;
  label!: string;
  addr!: string;
  size!: string;
  mode!: string;
  params!: GameVar[];
  return!: GameVar;
  notes?: string;

  getAddr(): number {
    return parseInt(this.addr, 16);
  }

  getSize(): number {
    return parseInt(this.size, 16);
  }

  /** Returns where the function ends */
  getToolTip(): string {
    const funcEnd = this.getAddr() + this.getSize() - 1;
    return 'Ends at ' + toHex(funcEnd);
  }

  getParams(): string {
    return '';
  }

  getReturn(): string {
    return '';
  }
}

class GameEnumVal {
  desc!: string;
  label!: string;
  val!: string;
  notes?: string;
}

class GameStruct {
  size!: string;
  vars!: GameRelVar[];

  getSize(): number {
    return parseInt(this.size, 16);
  }
}

type GameStructList = { [key: string]: GameStruct };
type GameEnumList = { [key: string]: GameEnumVal[] };
