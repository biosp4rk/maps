export const KEY_ADDR = 'addr';
export const KEY_LEN = 'length';
export const KEY_TAGS = 'tags';
export const KEY_TYPE = 'type';
export const KEY_LABEL = 'label';
export const KEY_DESC = 'desc';
export const KEY_ARGS = 'params';
export const KEY_RET = 'returns';
export const KEY_OFF = 'offset';
export const KEY_VAL = 'value';
export const KEY_NOTES = 'notes';
const HEAD_ADDR = 'Address';
const HEAD_LEN = 'Length';
const HEAD_TAGS = 'Category';
const HEAD_TYPE = 'Type';
const HEAD_LABEL = 'Label';
const HEAD_DESC = 'Description';
const HEAD_ARGS = 'Arguments';
const HEAD_RET = 'Returns';
const HEAD_OFF = 'Offset';
const HEAD_VAL = 'Value';
const HEAD_NOTES = 'Notes';
const HEADINGS = {
    [KEY_ADDR]: HEAD_ADDR,
    [KEY_LEN]: HEAD_LEN,
    [KEY_TAGS]: HEAD_TAGS,
    [KEY_TYPE]: HEAD_TYPE,
    [KEY_LABEL]: HEAD_LABEL,
    [KEY_DESC]: HEAD_DESC,
    [KEY_NOTES]: HEAD_NOTES,
    [KEY_ARGS]: HEAD_ARGS,
    [KEY_RET]: HEAD_RET,
    [KEY_OFF]: HEAD_OFF,
    [KEY_VAL]: HEAD_VAL
};
export const SEARCHABLE_KEYS = [KEY_DESC, KEY_ADDR, KEY_ARGS, KEY_RET];
export function getHeading(key) {
    return HEADINGS[key];
}
export function getHideableColumns(map) {
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
                head: HEAD_ARGS,
                key: KEY_ARGS
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
//# sourceMappingURL=headings%20copy.js.map