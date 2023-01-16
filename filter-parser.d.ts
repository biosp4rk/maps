export declare enum SearchType {
    Term = 0,
    Quote = 1,
    Regex = 2
}
export declare class FilterItem {
    text: string;
    type: SearchType;
    exclude: boolean;
    regex: RegExp | null;
    constructor(type: SearchType, exclude: boolean, text?: string);
}
export declare class FilterParser {
    private static filter;
    private static index;
    private static items;
    private static exclude;
    static parse(filter: string): Array<FilterItem>;
    private static initialize;
    private static reset;
    private static addToLast;
    private static parseFilterStart;
    private static parseFilterItem;
    private static parseFilterText;
    private static parseFilterQuote;
    private static parseFilterRegex;
    private static parseFilterSpace;
    private static parseFilterTerm;
}
//# sourceMappingURL=filter-parser.d.ts.map