export { GameVar, GameRelVar, GameAbsVar, GameCode, GameStruct, GameEnumVal };
import { toHex, getPrimSize } from "./utils";
class GameVar {
    /** Gets the number of items (1 unless array type) */
    getCount() {
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
    getSize(structs) {
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
    getLength(structs) {
        return this.getCount() * this.getSize(structs);
    }
    /** Returns the item size and count if count > 1 */
    getLengthToolTip(structs) {
        const count = this.getCount();
        if (count == 1) {
            return '';
        }
        const size = this.getSize(structs);
        return 'Size: ' + toHex(size) + '\nCount: ' + toHex(count);
    }
    spec() {
        return this.type.split(' ')[0];
    }
    isPtr() {
        // get second part of type string
        const parts = this.type.split(' ');
        if (parts.length != 2) {
            return false;
        }
        let decl = parts[1];
        // find inner most part of declaration
        let i = decl.lastIndexOf('(');
        if (i == -1) {
            i = 0;
        }
        // check for pointer
        return decl[i] == '*';
    }
}
class GameRelVar extends GameVar {
    /** Returns the address of this field in item 0 */
    getOffsetToolTip(parentAddr) {
        const off = parseInt(this.offset, 16);
        return 'Address: ' + toHex(parentAddr + off);
    }
}
class GameAbsVar extends GameVar {
    getAddr() {
        return parseInt(this.addr, 16);
    }
}
class GameCode {
    getAddr() {
        return parseInt(this.addr, 16);
    }
    getSize() {
        return parseInt(this.size, 16);
    }
    /** Returns where the function ends */
    getToolTip() {
        const funcEnd = this.getAddr() + this.getSize() - 1;
        return 'Ends at ' + toHex(funcEnd);
    }
    getParams() {
        return '';
    }
    getReturn() {
        return '';
    }
}
class GameEnumVal {
}
class GameStruct {
    getSize() {
        return parseInt(this.size, 16);
    }
}
//# sourceMappingURL=entry-types.js.map