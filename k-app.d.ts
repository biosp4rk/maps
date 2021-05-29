import { LitElement } from 'lit-element';
/**
 * Renders the application.
 */
export declare class KApp extends LitElement {
    static styles: import("lit-element").CSSResult;
    enums: {
        [key: string]: unknown;
    };
    structs: {
        [key: string]: unknown;
    };
    data: Array<{
        [key: string]: unknown;
    }>;
    resultCount: number;
    totalResults: number;
    noResults: boolean;
    game: string;
    version: string;
    map: string;
    fetchingData: boolean;
    query: string;
    generator: Generator<{
        row: number[];
        key: string;
    }, void, unknown> | undefined;
    seenResults: Array<{
        row: number[];
        key: string;
    }>;
    constructor();
    private parseSearchParams;
    private getVersionedData;
    private getVersions;
    fetchData(): Promise<void>;
    private inputHandler;
    private searchButtonHandler;
    private findAllButtonHandler;
    private findAll;
    private clearPreviousSearch;
    private collapseAll;
    private performSearch;
    search(query: string, data: Array<{
        [key: string]: unknown;
    }>, rowStart: number[]): Generator<{
        row: number[];
        key: string;
    }>;
    private getGames;
    private getMaps;
    private getRenderedResultsCount;
    private gameChangeHandler;
    private versionChangeHandler;
    private mapChangeHandler;
    render(): import("lit-element").TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'k-app': KApp;
    }
}
//# sourceMappingURL=k-app.d.ts.map