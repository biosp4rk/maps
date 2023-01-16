export var SearchType;
(function (SearchType) {
    SearchType[SearchType["Term"] = 0] = "Term";
    SearchType[SearchType["Quote"] = 1] = "Quote";
    SearchType[SearchType["Regex"] = 2] = "Regex";
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
    //private static terms: Array<string>;
    //private static quotes: Array<string>;
    //private static regexes: Array<string>;
    static parse(filter) {
        // setup
        this.filter = filter;
        this.initialize();
        // parse
        this.parseFilterStart();
        // finalize results
        for (const item of this.items) {
            if (item.type === SearchType.Regex) {
                // create RegExp objects now (avoid making them on the fly later)
                item.regex = new RegExp(item.text, 'i');
            }
            else {
                // lowercase terms and quotes
                item.text = item.text.toLowerCase();
            }
        }
        const results = this.items;
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
        if (c === '"') {
            this.items.push(new FilterItem(SearchType.Quote, this.exclude));
            this.parseFilterQuote();
        }
        else if (c === '/') {
            this.items.push(new FilterItem(SearchType.Regex, this.exclude));
            this.parseFilterRegex();
        }
        else if (c === '-') {
            this.exclude = true;
            this.parseFilterText();
        }
        else if (c === ' ') {
            this.parseFilterSpace();
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
        if (c === '"') {
            this.items.push(new FilterItem(SearchType.Quote, this.exclude));
            this.parseFilterQuote();
        }
        else if (c === '/') {
            this.items.push(new FilterItem(SearchType.Regex, this.exclude));
            this.parseFilterRegex();
        }
        else if (c === '-') {
            this.exclude = true;
            this.parseFilterText();
        }
        else {
            this.items.push(new FilterItem(SearchType.Term, this.exclude, c));
            this.parseFilterTerm();
        }
    }
    static parseFilterText() {
        if (this.index >= this.filter.length) {
            return;
        }
        // item text is expected, so don't check for minus or space
        const c = this.filter[this.index++];
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