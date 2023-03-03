export { GameEntry, GameVar, GameRelVar, GameDataVar, GameCode, GameStruct, GameEnumVal, GameEnum };
import { toHex } from "./utils";
import { KEY_ADDR, KEY_COUNT, KEY_DESC, KEY_ENUM, KEY_LABEL, KEY_MODE, KEY_NOTES, KEY_OFF, KEY_PARAMS, KEY_RET, KEY_SIZE, KEY_TAGS, KEY_TYPE, KEY_VAL } from "./headings";
function swap_key_value(obj) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));
}
export var PrimType;
(function (PrimType) {
    PrimType[PrimType["U8"] = 0] = "U8";
    PrimType[PrimType["S8"] = 1] = "S8";
    PrimType[PrimType["Bool"] = 2] = "Bool";
    PrimType[PrimType["U16"] = 3] = "U16";
    PrimType[PrimType["S16"] = 4] = "S16";
    PrimType[PrimType["U32"] = 5] = "U32";
    PrimType[PrimType["S32"] = 6] = "S32";
    PrimType[PrimType["Struct"] = 7] = "Struct";
    PrimType[PrimType["Void"] = 8] = "Void";
})(PrimType || (PrimType = {}));
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
};
const STR_TO_PRIM = swap_key_value(PRIM_TO_STR);
var DataTag;
(function (DataTag) {
    DataTag[DataTag["Flags"] = 0] = "Flags";
    DataTag[DataTag["Ascii"] = 1] = "Ascii";
    DataTag[DataTag["Text"] = 2] = "Text";
    DataTag[DataTag["Rle"] = 3] = "Rle";
    DataTag[DataTag["LZ"] = 4] = "LZ";
    DataTag[DataTag["Gfx"] = 5] = "Gfx";
    DataTag[DataTag["Tilemap"] = 6] = "Tilemap";
    DataTag[DataTag["Palette"] = 7] = "Palette";
    DataTag[DataTag["OamFrame"] = 8] = "OamFrame";
    DataTag[DataTag["BGBlocks"] = 9] = "BGBlocks";
    DataTag[DataTag["BGMap"] = 10] = "BGMap";
    DataTag[DataTag["Thumb"] = 11] = "Thumb";
    DataTag[DataTag["Arm"] = 12] = "Arm";
})(DataTag || (DataTag = {}));
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
};
const STR_TO_TAG = swap_key_value(TAG_TO_STR);
var CodeMode;
(function (CodeMode) {
    CodeMode[CodeMode["Thumb"] = 0] = "Thumb";
    CodeMode[CodeMode["Arm"] = 1] = "Arm";
})(CodeMode || (CodeMode = {}));
const MODE_TO_STR = {
    [CodeMode.Thumb]: "thumb",
    [CodeMode.Arm]: "arm",
};
const STR_TO_MODE = swap_key_value(MODE_TO_STR);
class GameEntry {
}
class GameVar extends GameEntry {
    constructor(entry) {
        var _a;
        super();
        this.desc = entry[KEY_DESC];
        this.label = entry[KEY_LABEL];
        this.parseType(entry[KEY_TYPE]);
        const arrCount = entry[KEY_COUNT];
        this.arrCount = arrCount ? parseInt(arrCount) : undefined;
        this.tags = (_a = entry[KEY_TAGS]) === null || _a === void 0 ? void 0 : _a.map((t) => STR_TO_TAG[t]);
        this.enum = entry[KEY_ENUM];
        this.notes = entry[KEY_NOTES];
    }
    /** Gets the number of items (1 unless array type) */
    getCount() {
        var _a;
        return (_a = this.arrCount) !== null && _a !== void 0 ? _a : 1;
    }
    getSpecSize(structs) {
        switch (+this.primitive) {
            case PrimType.U8:
            case PrimType.S8:
            case PrimType.Bool:
            case PrimType.Void:
                return 1;
            case PrimType.U16:
            case PrimType.S16:
                return 2;
            case PrimType.U32:
            case PrimType.S32:
                return 4;
            case PrimType.Struct:
                const se = structs[this.structName];
                if (se === undefined) {
                    throw new Error(`Invalid struct name ${this.structName}`);
                }
                return se.size;
        }
        return NaN;
    }
    /** Gets the physical size of an individual item */
    getSize(structs) {
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
        if (this.primitive === PrimType.Struct) {
            return this.structName;
        }
        return PRIM_TO_STR[this.primitive];
    }
    tagStrs() {
        var _a;
        return (_a = this.tags) === null || _a === void 0 ? void 0 : _a.map(t => TAG_TO_STR[t]);
    }
    typeStr() {
        var _a;
        let decl = (_a = this.declaration) !== null && _a !== void 0 ? _a : '';
        if (this.arrCount) {
            let i = decl.lastIndexOf('*') + 1;
            const arrStr = '[0x' + toHex(this.arrCount) + ']';
            decl = decl.slice(0, i) + arrStr + decl.slice(i);
        }
        const spec = this.spec();
        if (decl) {
            return spec + ' ' + decl;
        }
        return spec;
    }
    parseType(type) {
        const parts = type.split(' ');
        // primitive
        const prim = parts[0];
        let primType = STR_TO_PRIM[prim];
        if (primType !== undefined) {
            this.primitive = primType;
            this.structName = undefined;
        }
        else {
            this.primitive = PrimType.Struct;
            this.structName = prim;
        }
        // declaration
        if (parts.length == 2) {
            this.declaration = parts[1];
        }
        else {
            this.declaration = undefined;
        }
    }
}
class GameRelVar extends GameVar {
    constructor(entry) {
        super(entry);
        this.offset = parseInt(entry[KEY_OFF]);
    }
    /** Returns the address of this field in item 0 */
    getOffsetToolTip(parentAddr) {
        return 'Address: ' + toHex(parentAddr + this.offset);
    }
}
class GameDataVar extends GameVar {
    constructor(entry) {
        super(entry);
        this.addr = parseInt(entry[KEY_ADDR]);
    }
}
class GameCode extends GameEntry {
    constructor(entry) {
        super();
        this.desc = entry[KEY_DESC];
        this.label = entry[KEY_LABEL];
        this.addr = parseInt(entry[KEY_ADDR]);
        this.size = parseInt(entry[KEY_SIZE]);
        this.mode = STR_TO_MODE[entry[KEY_MODE]];
        const params = entry[KEY_PARAMS];
        this.params = params === null || params === void 0 ? void 0 : params.map(p => new GameVar(p));
        const ret = entry[KEY_RET];
        this.return = ret ? new GameVar(ret) : undefined;
        this.notes = entry[KEY_NOTES];
    }
    /** Returns where the function ends */
    getToolTip() {
        const funcEnd = this.addr + this.size - 1;
        return 'Ends at ' + toHex(funcEnd);
    }
    getParams() {
        return '';
    }
    getReturn() {
        return '';
    }
}
class GameEnumVal extends GameEntry {
    constructor(entry) {
        super();
        this.desc = entry[KEY_DESC];
        this.label = entry[KEY_LABEL];
        this.val = parseInt(entry[KEY_VAL]);
        this.notes = entry[KEY_NOTES];
    }
}
class GameEnum extends GameEntry {
    constructor(entry) {
        super();
        this.vals = entry['vals'].map(v => new GameEnumVal(v));
    }
}
class GameStruct extends GameEntry {
    constructor(entry) {
        super();
        this.size = parseInt(entry[KEY_SIZE]);
        this.vars = entry['vars'].map(v => new GameRelVar(v));
    }
}
//# sourceMappingURL=entry-types.js.map