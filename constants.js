export const GAMES = [
    {
        label: 'Metroid Fusion',
        value: 'mf',
    },
    {
        label: 'Metroid Zero Mission',
        value: 'zm',
    }
];
export const MAP_RAM = 'ram';
export const MAP_CODE = 'code';
export const MAP_DATA = 'data';
export const MAP_STRUCTS = 'structs';
export const MAP_ENUMS = 'enums';
export const MAPS = [
    {
        label: 'RAM',
        value: MAP_RAM
    },
    {
        label: 'ROM Code',
        value: MAP_CODE
    },
    {
        label: 'ROM Data',
        value: MAP_DATA
    },
    {
        label: 'Structs',
        value: MAP_STRUCTS
    },
    {
        label: 'Enums',
        value: MAP_ENUMS
    }
];
export var TableType;
(function (TableType) {
    TableType[TableType["None"] = 0] = "None";
    TableType[TableType["RamList"] = 1] = "RamList";
    TableType[TableType["CodeList"] = 2] = "CodeList";
    TableType[TableType["DataList"] = 3] = "DataList";
    TableType[TableType["StructList"] = 4] = "StructList";
    TableType[TableType["EnumList"] = 5] = "EnumList";
    TableType[TableType["StructDef"] = 6] = "StructDef";
    TableType[TableType["EnumDef"] = 7] = "EnumDef";
})(TableType || (TableType = {}));
export const REGIONS = ['U', 'E', 'J', 'C'];
export const KEY_ADDR = 'addr';
export const KEY_COUNT = 'count';
export const KEY_DESC = 'desc';
export const KEY_ENUM = 'enum';
export const KEY_LABEL = 'label';
export const KEY_LEN = 'length';
export const KEY_MODE = 'mode';
export const KEY_NOTES = 'notes';
export const KEY_OFF = 'offset';
export const KEY_PARAMS = 'params';
export const KEY_RET = 'return';
export const KEY_SIZE = 'size';
export const KEY_TAGS = 'tags';
export const KEY_TYPE = 'type';
export const KEY_VAL = 'val';
export const KEY_VALS = 'vals';
export const KEY_VARS = 'vars';
const HEAD_ADDR = 'Address';
const HEAD_DESC = 'Description';
const HEAD_LABEL = 'Label';
const HEAD_LEN = 'Length';
const HEAD_NOTES = 'Notes';
const HEAD_OFF = 'Offset';
const HEAD_PARAMS = 'Arguments';
const HEAD_RET = 'Returns';
const HEAD_SIZE = 'Size';
const HEAD_TAGS = 'Category';
const HEAD_TYPE = 'Type';
const HEAD_VAL = 'Value';
const HEAD_VALS = 'Values';
const HEAD_VARS = 'Variables';
const HEADINGS = {
    [KEY_ADDR]: HEAD_ADDR,
    [KEY_DESC]: HEAD_DESC,
    [KEY_LABEL]: HEAD_LABEL,
    [KEY_LEN]: HEAD_LEN,
    [KEY_NOTES]: HEAD_NOTES,
    [KEY_OFF]: HEAD_OFF,
    [KEY_PARAMS]: HEAD_PARAMS,
    [KEY_RET]: HEAD_RET,
    [KEY_SIZE]: HEAD_SIZE,
    [KEY_TAGS]: HEAD_TAGS,
    [KEY_TYPE]: HEAD_TYPE,
    [KEY_VAL]: HEAD_VAL,
    [KEY_VALS]: HEAD_VALS,
    [KEY_VARS]: HEAD_VARS
};
export const CATEGORIES = {
    'flags': 'Flags',
    'ascii': 'ASCII',
    'text': 'Text',
    'rle': 'RLE',
    'lz': 'LZ',
    'gfx': 'Graphics',
    'tilemap': 'Tilemap',
    'palette': 'Palette',
    'oam_frame': 'OAM frame',
    'bg_blocks': 'BG block map',
    'bg_map': 'BG tilemap',
    'thumb': 'THUMB',
    'arm': 'ARM',
};
export function getMainTableType(map) {
    switch (map) {
        case MAP_RAM: return TableType.RamList;
        case MAP_DATA: return TableType.DataList;
        case MAP_CODE: return TableType.CodeList;
        case MAP_STRUCTS: return TableType.StructList;
        case MAP_ENUMS: return TableType.EnumList;
        default: return TableType.None;
    }
}
export function getHeading(key) {
    return HEADINGS[key];
}
export function getHideableColumns(tableType) {
    if (tableType === TableType.RamList || tableType === TableType.DataList) {
        return [
            {
                head: HEAD_LEN,
                key: KEY_LEN
            },
            {
                head: HEAD_TAGS,
                key: KEY_TAGS
            },
            {
                head: HEAD_TYPE,
                key: KEY_TYPE
            },
            {
                head: HEAD_LABEL,
                key: KEY_LABEL
            },
            {
                head: HEAD_NOTES,
                key: KEY_NOTES
            }
        ];
    }
    else if (tableType === TableType.CodeList) {
        return [
            {
                head: HEAD_LEN,
                key: KEY_LEN
            },
            {
                head: HEAD_LABEL,
                key: KEY_LABEL
            },
            {
                head: HEAD_PARAMS,
                key: KEY_PARAMS
            },
            {
                head: HEAD_RET,
                key: KEY_RET
            },
            {
                head: HEAD_NOTES,
                key: KEY_NOTES
            }
        ];
    }
    else if (tableType === TableType.StructList) {
        return [
            {
                head: HEAD_LABEL,
                key: KEY_LABEL
            },
            {
                head: HEAD_SIZE,
                key: KEY_SIZE
            },
            {
                head: HEAD_NOTES,
                key: KEY_NOTES
            }
        ];
    }
    else if (tableType === TableType.EnumList) {
        return [
            {
                head: HEAD_LABEL,
                key: KEY_LABEL
            },
            {
                head: HEAD_NOTES,
                key: KEY_NOTES
            }
        ];
    }
    return [];
}
//# sourceMappingURL=constants.js.map