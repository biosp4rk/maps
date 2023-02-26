// Grammar:
// Space -> /\s+/
// Hex -> /[0-9A-F]+/
// Filter -> FilterItem (Space FilterItem)*
// FilterItem -> Term | Quote | Regex | Addr
// Term -> /\S+/
// Quote -> '"' /[^"]*/ '"'
// Regex -> '/' /[^/]*/ '/'
// Addr -> AddrEQ | AddrGT | AddrLT | AddrGE | AddrLE
// AddrEQ -> '=' Hex
// AddrGT -> '>' Hex
// AddrLT -> '<' Hex
// AddrGE -> '>=' Hex
// AddrLE -> '<=' Hex
export var SearchType;
(function (SearchType) {
    SearchType[SearchType["Term"] = 0] = "Term";
    SearchType[SearchType["Quote"] = 1] = "Quote";
    SearchType[SearchType["Regex"] = 2] = "Regex";
    SearchType[SearchType["AddrEQ"] = 3] = "AddrEQ";
    SearchType[SearchType["AddrGT"] = 4] = "AddrGT";
    SearchType[SearchType["AddrLT"] = 5] = "AddrLT";
    SearchType[SearchType["AddrGE"] = 6] = "AddrGE";
    SearchType[SearchType["AddrLE"] = 7] = "AddrLE";
})(SearchType || (SearchType = {}));
export class FilterItem {
    constructor(type, exclude, text = '') {
        this.text = text;
        this.type = type;
        this.exclude = exclude;
        this.regex = null;
    }
}
export class FilterParser {
    static parse(filter) {
        // setup
        this.filter = filter;
        this.initialize();
        // parse
        this.parseFilterStart();
        // finalize results
        let results = [];
        for (const item of this.items) {
            switch (item.type) {
                case SearchType.Regex:
                    // create RegExp objects now (avoid making them on the fly later)
                    item.regex = new RegExp(item.text, 'i');
                    break;
                case SearchType.AddrEQ:
                case SearchType.AddrGT:
                case SearchType.AddrLT:
                case SearchType.AddrGE:
                case SearchType.AddrLE:
                    // exclude addr filter if not valid hex
                    if (!/(0x)?[0-9A-Fa-f]+/.test(item.text)) {
                        continue;
                    }
                    break;
                default:
                    // lowercase terms and quotes
                    item.text = item.text.toLowerCase();
                    break;
            }
            results.push(item);
        }
        this.reset();
        return results;
    }
    static initialize() {
        this.index = 0;
        this.items = [];
        this.exclude = false;
    }
    static reset() {
        this.filter = '';
        this.index = -1;
        this.items = [];
        this.exclude = false;
    }
    static addToLast(text) {
        const last = this.items.length - 1;
        this.items[last].text += text;
    }
    static parseFilterStart() {
        if (this.index >= this.filter.length) {
            return;
        }
        const c = this.filter[this.index++];
        if (this.tryParseFilterAddr(c)) {
            return;
        }
        if (c === '-') {
            this.exclude = true;
            this.parseFilterText();
        }
        else if (c === ' ') {
            this.parseFilterSpace();
        }
        else {
            this.parseFilterNonAddr(c);
        }
    }
    static tryParseFilterAddr(c) {
        if (this.index >= this.filter.length) {
            return false;
        }
        let searchType;
        if (c === "=") {
            // double equals is also allowed,
            // so skip second equals if present
            if (this.filter[this.index] === "=") {
                this.index++;
            }
            searchType = SearchType.AddrEQ;
        }
        else if (c === ">") {
            if (this.filter[this.index] === "=") {
                this.index++;
                searchType = SearchType.AddrGE;
            }
            else {
                searchType = SearchType.AddrGT;
            }
        }
        else if (c === "<") {
            if (this.filter[this.index] === "=") {
                this.index++;
                searchType = SearchType.AddrLE;
            }
            else {
                searchType = SearchType.AddrLT;
            }
        }
        else {
            return false;
        }
        // add new filter item
        const item = new FilterItem(searchType, this.exclude);
        this.items.push(item);
        this.parseFilterTerm();
        return true;
    }
    static parseFilterNonAddr(c) {
        if (this.index >= this.filter.length) {
            return;
        }
        // item text is expected, so don't check for minus or space
        if (c === '"') {
            this.items.push(new FilterItem(SearchType.Quote, this.exclude));
            this.parseFilterQuote();
        }
        else if (c === '/') {
            this.items.push(new FilterItem(SearchType.Regex, this.exclude));
            this.parseFilterRegex();
        }
        else {
            this.items.push(new FilterItem(SearchType.Term, this.exclude, c));
            this.parseFilterTerm();
        }
    }
    static parseFilterItem() {
        if (this.index >= this.filter.length) {
            return;
        }
        // new item is expected, so check for minus but not space
        const c = this.filter[this.index++];
        if (this.tryParseFilterAddr(c)) {
            return;
        }
        if (c === '-') {
            this.exclude = true;
            this.parseFilterText();
        }
        else {
            this.parseFilterNonAddr(c);
        }
    }
    static parseFilterText() {
        if (this.index >= this.filter.length) {
            return;
        }
        // item text is expected, so don't check for minus or space
        const c = this.filter[this.index++];
        if (this.tryParseFilterAddr(c)) {
            return;
        }
        this.parseFilterNonAddr(c);
    }
    static parseFilterQuote() {
        this.exclude = false;
        while (this.index < this.filter.length) {
            const c = this.filter[this.index++];
            if (c === '"') {
                break;
            }
            this.addToLast(c);
        }
        this.parseFilterSpace();
    }
    static parseFilterRegex() {
        this.exclude = false;
        let escaped = false;
        while (this.index < this.filter.length) {
            const c = this.filter[this.index++];
            if (c === '/' && !escaped) {
                break;
            }
            if (escaped) {
                escaped = false;
            }
            else if (c === '\\') {
                escaped = true;
            }
            this.addToLast(c);
        }
        this.parseFilterSpace();
    }
    static parseFilterSpace() {
        while (this.index < this.filter.length && this.filter[this.index] === ' ') {
            this.index++;
        }
        this.parseFilterItem();
    }
    static parseFilterTerm() {
        this.exclude = false;
        while (this.index < this.filter.length) {
            const c = this.filter[this.index++];
            if (c === ' ') {
                break;
            }
            this.addToLast(c);
        }
        this.parseFilterSpace();
    }
}
//# sourceMappingURL=filter-parser.js.map