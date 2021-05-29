import { LitElement } from 'lit-element';
/**
 * Renders a table.
 */
export declare class KTable extends LitElement {
    static styles: import("lit-element").CSSResult;
    /**
     * The JSON data to render.
     */
    data: never[];
    structs: {};
    enums: {
        [key: string]: unknown;
    };
    version: string;
    isEnum: boolean;
    parentAddress: string;
    sortFn?: ((a: any, b: any) => number) | undefined;
    sortAscending: boolean;
    sortedHeading: string;
    maptype: string;
    firstUpdated(): void;
    private getVersionedData;
    private getClasses;
    highlight(result: {
        row: number[];
        key: string;
    } | void, shouldScroll?: boolean): void;
    clearHighlights(): void;
    collapseAll(): void;
    private getHeadings;
    private getData;
    private maybeSort;
    render(): import("lit-element").TemplateResult;
}
declare global {
    interface HTMLElementTagNameMap {
        'k-table': KTable;
    }
}
//# sourceMappingURL=k-table.d.ts.map