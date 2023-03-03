
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
export const KEY_RET = 'returns';
export const KEY_SIZE = 'size';
export const KEY_TAGS = 'tags';
export const KEY_TYPE = 'type';
export const KEY_VAL = 'val';

const HEAD_ADDR = 'Address';
const HEAD_DESC = 'Description';
const HEAD_LABEL = 'Label';
const HEAD_LEN = 'Length';
const HEAD_NOTES = 'Notes';
const HEAD_OFF = 'Offset';
const HEAD_PARAMS = 'Arguments';
const HEAD_RET = 'Returns';
const HEAD_TAGS = 'Category';
const HEAD_TYPE = 'Type';
const HEAD_VAL = 'Value';

const HEADINGS: { [key: string]: string } = {
  [KEY_ADDR]: HEAD_ADDR,
  [KEY_DESC]: HEAD_DESC,
  [KEY_LABEL]: HEAD_LABEL,
  [KEY_LEN]: HEAD_LEN,
  [KEY_NOTES]: HEAD_NOTES,
  [KEY_OFF]: HEAD_OFF,
  [KEY_PARAMS]: HEAD_PARAMS,
  [KEY_RET]: HEAD_RET,
  [KEY_TAGS]: HEAD_TAGS,
  [KEY_TYPE]: HEAD_TYPE,
  [KEY_VAL]: HEAD_VAL
};

export const CATEGORIES: { [key: string]: string } = {
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

export const SEARCHABLE_KEYS = [KEY_DESC, KEY_ADDR, KEY_PARAMS, KEY_RET];

export function getHeading(key: string): string {
  return HEADINGS[key];
}

export function getHideableColumns(map: string): { head: string; key: string; }[] {
  if (map === 'ram' || map === 'data') {
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
  else if (map === 'code') {
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
  return [];
}
