export declare const GAMES: {
    label: string;
    value: string;
}[];
export declare const MAP_RAM = "ram";
export declare const MAP_CODE = "code";
export declare const MAP_DATA = "data";
export declare const MAP_STRUCTS = "structs";
export declare const MAP_ENUMS = "enums";
export declare const MAPS: {
    label: string;
    value: string;
}[];
export declare enum TableType {
    None = 0,
    RamList = 1,
    CodeList = 2,
    DataList = 3,
    StructList = 4,
    EnumList = 5,
    StructDef = 6,
    EnumDef = 7
}
export declare const REGIONS: string[];
export declare const KEY_ADDR = "addr";
export declare const KEY_COUNT = "count";
export declare const KEY_DESC = "desc";
export declare const KEY_ENUM = "enum";
export declare const KEY_LABEL = "label";
export declare const KEY_LEN = "length";
export declare const KEY_MODE = "mode";
export declare const KEY_NOTES = "notes";
export declare const KEY_OFF = "offset";
export declare const KEY_PARAMS = "params";
export declare const KEY_RET = "return";
export declare const KEY_SIZE = "size";
export declare const KEY_TAGS = "tags";
export declare const KEY_TYPE = "type";
export declare const KEY_VAL = "val";
export declare const KEY_VALS = "vals";
export declare const KEY_VARS = "vars";
export declare const CATEGORIES: {
    [key: string]: string;
};
export declare function getMainTableType(map: string): TableType;
export declare function getHeading(key: string): string;
export declare function getHideableColumns(tableType: TableType): {
    head: string;
    key: string;
}[];
//# sourceMappingURL=constants.d.ts.map