export { GameEntry, GameVar, GameRelVar, GameData, GameCode, GameStruct, GameEnumVal, GameEnum, GameStructList, GameEnumList };
export declare type DictEntry = {
    [key: string]: unknown;
};
export declare enum PrimType {
    U8 = 0,
    S8 = 1,
    Bool = 2,
    U16 = 3,
    S16 = 4,
    U32 = 5,
    S32 = 6,
    Struct = 7,
    Void = 8
}
declare enum DataTag {
    Flags = 0,
    Ascii = 1,
    Text = 2,
    Rle = 3,
    LZ = 4,
    Gfx = 5,
    Tilemap = 6,
    Palette = 7,
    OamFrame = 8,
    BGBlocks = 9,
    BGMap = 10,
    Thumb = 11,
    Arm = 12
}
declare abstract class GameEntry {
    sortValue(): number;
}
declare class GameVar extends GameEntry {
    desc: string;
    label: string;
    arrCount?: number;
    tags?: DataTag[];
    enum?: string;
    notes?: string;
    primitive: PrimType;
    structName?: string;
    declaration?: string;
    constructor(entry: DictEntry);
    /** Gets the number of items (1 unless array type) */
    getCount(): number;
    getSpecSize(structs: GameStructList): number;
    /** Gets the physical size of an individual item */
    getSize(structs: GameStructList): number;
    /** Gets the total physical size of all items */
    getLength(structs: GameStructList): number;
    /** Returns the item size and count if count > 1 */
    getLengthToolTip(structs: GameStructList): string;
    spec(): string;
    tagStrs(): string[] | undefined;
    typeStr(): string;
    private parseType;
}
/** Represents struct var entries */
declare class GameRelVar extends GameVar {
    offset: number;
    constructor(entry: DictEntry);
    sortValue(): number;
    /** Returns the address of this field in item 0 */
    getOffsetToolTip(parentAddr: number): string;
}
declare class GameData extends GameVar {
    addr: number;
    constructor(entry: DictEntry);
    sortValue(): number;
}
declare class GameCode extends GameEntry {
    desc: string;
    label: string;
    addr: number;
    size: number;
    mode: string;
    params?: GameVar[];
    return?: GameVar;
    notes?: string;
    constructor(entry: DictEntry);
    sortValue(): number;
    /** Returns where the function ends */
    getToolTip(): string;
    getParams(): string;
    getReturn(): string;
}
declare class GameEnumVal extends GameEntry {
    desc: string;
    label: string;
    val: number;
    notes?: string;
    constructor(entry: DictEntry);
    sortValue(): number;
}
declare class GameEnum extends GameEntry {
    vals: GameEnumVal[];
    constructor(entry: DictEntry);
}
declare class GameStruct extends GameEntry {
    size: number;
    vars: GameRelVar[];
    constructor(entry: DictEntry);
}
declare type GameStructList = {
    [key: string]: GameStruct;
};
declare type GameEnumList = {
    [key: string]: GameEnum;
};
//# sourceMappingURL=entry-types.d.ts.map