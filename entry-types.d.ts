export { GameVar, GameRelVar, GameAbsVar, GameCode, GameStruct, GameEnumVal, GameStructList, GameEnumList };
declare class GameVar {
    desc: string;
    label: string;
    type: string;
    tags?: string[];
    enum?: string;
    notes?: string;
    /** Gets the number of items (1 unless array type) */
    getCount(): number;
    /** Gets the physical size of an individual item */
    getSize(structs: GameStructList): number;
    /** Gets the total physical size of all items */
    getLength(structs: GameStructList): number;
    /** Returns the item size and count if count > 1 */
    getLengthToolTip(structs: GameStructList): string;
    spec(): string;
    private isPtr;
}
declare class GameRelVar extends GameVar {
    offset: string;
    /** Returns the address of this field in item 0 */
    getOffsetToolTip(parentAddr: number): string;
}
declare class GameAbsVar extends GameVar {
    addr: string;
    getAddr(): number;
}
declare class GameCode {
    desc: string;
    label: string;
    addr: string;
    size: string;
    mode: string;
    params: GameVar[];
    return: GameVar;
    notes?: string;
    getAddr(): number;
    getSize(): number;
    /** Returns where the function ends */
    getToolTip(): string;
    getParams(): string;
    getReturn(): string;
}
declare class GameEnumVal {
    desc: string;
    label: string;
    val: string;
    notes?: string;
}
declare class GameStruct {
    size: string;
    vars: GameRelVar[];
    getSize(): number;
}
declare type GameStructList = {
    [key: string]: GameStruct;
};
declare type GameEnumList = {
    [key: string]: GameEnumVal[];
};
//# sourceMappingURL=entry-types.d.ts.map