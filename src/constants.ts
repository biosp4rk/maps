
export const GAMES = [
  {
    name: 'Metroid Fusion',
    value: 'mf',
  },
  {
    name: 'Metroid Zero Mission',
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
    name: 'RAM',
    value: MAP_RAM
  },
  {
    name: 'ROM Code',
    value: MAP_CODE
  },
  {
    name: 'ROM Data',
    value: MAP_DATA
  },
  {
    name: 'Structs',
    value: MAP_STRUCTS
  },
  {
    name: 'Enums',
    value: MAP_ENUMS
  }
];

export enum TableType {
  None,
  RamList,
  CodeList,
  DataList,
  StructList,
  EnumList,
  StructDef,
  EnumDef
}

export const REGIONS = ['U', 'E', 'J', 'C'];

export const KEY_ADDR = 'addr';
export const KEY_CAT = 'cat';
// export const KEY_COMP = 'comp';
export const KEY_COUNT = 'count';
export const KEY_DESC = 'desc';
export const KEY_ENUM = 'enum';
export const KEY_LEN = 'length';
export const KEY_MODE = 'mode';
export const KEY_NAME = 'name';
export const KEY_OFF = 'offset';
export const KEY_PARAMS = 'params';
export const KEY_RET = 'return';
export const KEY_SIZE = 'size';
export const KEY_TYPE = 'type';
export const KEY_VAL = 'val';
export const KEY_VALS = 'vals';
export const KEY_VARS = 'vars';

const HEAD_ADDR = 'Address';
const HEAD_CAT = 'Category';
const HEAD_DESC = 'Description';
const HEAD_NAME = 'Name';
const HEAD_LEN = 'Length';
const HEAD_OFF = 'Offset';
const HEAD_PARAMS = 'Arguments';
const HEAD_RET = 'Returns';
const HEAD_SIZE = 'Size';
const HEAD_TYPE = 'Type';
const HEAD_VAL = 'Value';
const HEAD_VALS = 'Values';
const HEAD_VARS = 'Variables';

const HEADINGS: { [key: string]: string } = {
  [KEY_ADDR]: HEAD_ADDR,
  [KEY_CAT]: HEAD_CAT,
  [KEY_DESC]: HEAD_DESC,
  [KEY_LEN]: HEAD_LEN,
  [KEY_NAME]: HEAD_NAME,
  [KEY_OFF]: HEAD_OFF,
  [KEY_PARAMS]: HEAD_PARAMS,
  [KEY_RET]: HEAD_RET,
  [KEY_SIZE]: HEAD_SIZE,
  [KEY_TYPE]: HEAD_TYPE,
  [KEY_VAL]: HEAD_VAL,
  [KEY_VALS]: HEAD_VALS,
  [KEY_VARS]: HEAD_VARS
};

export const CATEGORIES: { [key: string]: string } = {
  'flags': 'Flags',
  'ascii': 'ASCII',
  'sjis': 'Shift JIS',
  'text': 'Text',
  'gfx': 'Graphics',
  'tilemap': 'Tilemap',
  'palette': 'Palette',
  'oam_frame': 'OAM frame',
  'bg_blocks': 'BG block map',
  'bg_map': 'BG tilemap',
  'pcm': 'PCM',
  'thumb': 'THUMB',
  'arm': 'ARM'
};

// export const COMPRESSION: { [key: string]: string } = {
//   'rle': 'RLE',
//   'lz': 'LZ'
// };

export function getMainTableType(map: string): TableType {
  switch(map) {
    case MAP_RAM: return TableType.RamList;
    case MAP_DATA: return TableType.DataList;
    case MAP_CODE: return TableType.CodeList;
    case MAP_STRUCTS: return TableType.StructList;
    case MAP_ENUMS: return TableType.EnumList;
    default: return TableType.None;
  }
}

export function getHeading(key: string): string {
  return HEADINGS[key];
}

export function getHideableColumns(tableType: TableType): { head: string; key: string; }[] {
  if (tableType === TableType.RamList || tableType === TableType.DataList) {
    return [
      {
        head: HEAD_LEN,
        key: KEY_LEN
      },
      {
        head: HEAD_CAT,
        key: KEY_CAT
      },
      {
        head: HEAD_TYPE,
        key: KEY_TYPE
      },
      {
        head: HEAD_DESC,
        key: KEY_DESC
      }
    ];
  } else if (tableType === TableType.CodeList) {
    return [
      {
        head: HEAD_LEN,
        key: KEY_LEN
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
        head: HEAD_DESC,
        key: KEY_DESC
      }
    ];
  } else if (tableType === TableType.StructList) {
    return [
      {
        head: HEAD_SIZE,
        key: KEY_SIZE
      },
      {
        head: HEAD_DESC,
        key: KEY_DESC
      }
    ];
  } else if (tableType === TableType.EnumList) {
    return [
      {
        head: HEAD_DESC,
        key: KEY_DESC
      }
    ];
  }
  return [];
}
