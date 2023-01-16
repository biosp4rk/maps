import { css, customElement, html, LitElement, property } from 'lit-element';
import {
  GameVar, GameAbsVar, GameRelVar, GameStructList,
  GameEnumList, GameCode, GameEnumVal, GameStruct
} from './entry-types';
import { toHex } from './utils';
import {
  KEY_ADDR, KEY_LEN, KEY_TAGS, KEY_TYPE, KEY_LABEL, KEY_DESC, KEY_ARGS,
  KEY_RET, KEY_OFF, KEY_VAL, KEY_NOTES, CATEGORIES, getHeading
} from './headings';

export enum TableType {
  None,
  RamList,
  CodeList,
  DataList,
  StructDef,
  EnumDef
}

/** Renders a table */
@customElement('map-table')
export class MapTable extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    table, th, td {
      border: 1px solid #808080;
      border-collapse: collapse;
    }

    th, td {
      padding: 3px 5px;
    }

    td {
      vertical-align: top;
    }

    th {
      padding: 3px 10px;
    }

    td {
      overflow-wrap: break-word;
    }
    
    tbody tr:nth-child(odd) {
      background-color: #101010;
    }

    tbody tr:nth-child(even) {
      background-color: #202020;
    }

    .addr, .offset, .length {
      font-family: "Courier New", monospace;
      text-align: right;
    }

    .type {
      text-align: right;
      max-width: 300px;
      padding-top: 5px;
    }

    .type, .inline-type {
      font-family: "Courier New", monospace;
      font-size: 90%;
    }

    .inline-type {
      margin-right: 3px;
    }

    .label {
      max-width: 300px;
      word-wrap: break-word;
    }

    .desc-span {
      max-width: 350px;
      display: inline-block;
      word-wrap: break-word;
    }
    .params, .returns {
      max-width: 250px;
    }
    .notes {
      max-width: 350px;
    }

    .has-tooltip {
      cursor: help;
    }

    .expand {
      color: #A0A0E0;
      cursor: pointer;
      margin-left: 5px;
    }

    .main-table {
      table-layout: fixed;
      margin: auto;
      max-width: 95%;
    }

    .sub-table {
      margin: 5px 0px 2px 0px;
    }

    :host(#first) #heading-row {
      background: #101010;
    }
  `;

  /** The type of data to display in the table */
  @property({ type: Number }) tableType: TableType = TableType.None;
  /** The JSON data to render */
  @property({ type: Array }) data: Array<{ [key: string]: unknown }> = [];
  /** All struct definitions in the game */
  @property({ type: Object }) structs: GameStructList = {};
  /** All enum definitions in the game */
  @property({ type: Object }) enums: GameEnumList = {};
  /** Selected game region (U, E, or J) */
  //@property({ type: String, reflect: true }) region = '';
  /** Address of parent entry if table is part of row */
  @property({ type: Number }) parentAddr = NaN;
  /** Columns that should not be displayed */
  @property({ type: Set }) hiddenColumns: Set<string> = new Set<string>();

  /** Indexes of rows that are expanded */
  private expandedRows: Set<number> = new Set<number>();  

  collapseAll() {
    const tables = Array.from(this.shadowRoot?.querySelectorAll('map-table')!);
    tables.forEach(table => table.collapseAll());
    this.expandedRows.clear();
    this.requestUpdate();
  }

  updateVisibleColumns() {
    // recursively update sub-tables
    const tables = this.shadowRoot?.querySelectorAll('map-table')!
    for (const table of tables) {
      table.updateVisibleColumns();
    }
    this.requestUpdate();
  }

  private getClasses(): string[] {
    switch (this.tableType) {
      case TableType.RamList:
      case TableType.DataList:
        return [KEY_ADDR, KEY_LEN, KEY_TAGS, KEY_TYPE, KEY_LABEL, KEY_DESC, KEY_NOTES];
      case TableType.CodeList:
        return [KEY_ADDR, KEY_LEN, KEY_LABEL, KEY_DESC, KEY_ARGS, KEY_RET, KEY_NOTES];
      case TableType.StructDef:
        return [KEY_OFF, KEY_LEN, KEY_TYPE, KEY_LABEL, KEY_DESC, KEY_NOTES];
      case TableType.EnumDef:
        return [KEY_VAL, KEY_LABEL, KEY_DESC, KEY_NOTES];
      default:
        throw new Error('Invalid TableType ' + this.tableType);
    }
  }

  //** Get table headings based on map type */
  private getHeadings(): string[] {
    return this.getClasses()
      .filter(k => !this.hiddenColumns.has(k))
      .map(k => getHeading(k));
  }

  private isMainTable(): boolean {
    return this.tableType === TableType.RamList ||
      this.tableType === TableType.CodeList ||
      this.tableType === TableType.DataList;
  }

  private expand(event: any) {
    const idx = parseInt(event.target.dataset.idx);
    if (this.expandedRows.has(idx)) {
      this.expandedRows.delete(idx);
    } else {
      this.expandedRows.add(idx);
    }
    this.requestUpdate();
  }

  private renderType(type: string) {
    if (this.hiddenColumns.has(KEY_TYPE)) {
      return '';
    }
    return html`<td class="type">${type}</td>`
  }

  private renderTags(tags?: string[]) {
    if (this.hiddenColumns.has(KEY_TAGS)) {
      return '';
    }
    const cats = tags?.map(t => CATEGORIES[t]);
    return html`<td class="tags">${cats ? cats.join(', ') : ''}</td>`
  }

  private renderVarLength(entry: GameVar) {
    if (this.hiddenColumns.has(KEY_LEN)) {
      return '';
    }
    const len = toHex(entry.getLength(this.structs));
    const toolTip = entry.getLengthToolTip(this.structs);
    return html`<td
      class="length ${toolTip ? 'has-tooltip' : 'no-tooltip'}"
      title="${toolTip}">${len}</td>`;
  }

  private hasSubTable(entry: GameVar) {
    const isEnum = Boolean(entry.enum) && entry.enum! in this.enums;
    const isStruct = entry.spec() in this.structs;
    return isEnum || isStruct;
  }

  private renderSubTable(entry: GameVar) {
    if (Boolean(entry.enum) && entry.enum! in this.enums) {
      const vals: GameEnumVal[] = this.enums[entry.enum!];
      return this.renderEnumEntry(vals);
    } else if (entry.spec() in this.structs) {
      const gs = this.structs[entry.spec()];
      const pa = this.parentAddr ?
        this.parentAddr : (entry as GameAbsVar).getAddr();
      return this.renderStructEntry(gs, pa);
    }
    return '';
  }

  private renderLabel(label: string) {
    if (this.hiddenColumns.has(KEY_LABEL)) {
      return '';
    }
    return html`<td class="label">${label}</td>`
  }

  private renderDesc(entry: GameVar, index: number) {
    let toggle: any = '';
    let table: any = '';
    if (this.hasSubTable(entry)) {
      const expanded = this.expandedRows.has(index);
      toggle = html`<span class="expand" data-idx="${index}"
        @click="${this.expand}">[${expanded ? '−' : '+'}]</span>`;
      if (expanded) {
        table = this.renderSubTable(entry);
      }
    }
    return html`<td class="desc">
      <span class="desc-span">${entry.desc}${toggle}</span>
      ${table}
    </td>`;
  }

  private renderNotes(notes?: string) {
    if (this.hiddenColumns.has(KEY_NOTES)) {
      return '';
    }
    return html`<td class="notes">${notes}</td>`
  }

  private renderAbsVarEntry(entry: GameAbsVar, index: number) {
    return html`<tr>
      <td class="addr">${entry.addr}</td>
      ${this.renderVarLength(entry)}
      ${this.renderTags(entry.tags)}
      ${this.renderType(entry.type)}
      ${this.renderLabel(entry.label)}
      ${this.renderDesc(entry, index)}
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderCodeLength(entry: GameCode) {
    if (this.hiddenColumns.has(KEY_LEN)) {
      return '';
    }
    const len = toHex(entry.getSize());
    const toolTip = entry.getToolTip();
    return html`<td
      class="length ${toolTip ? 'has-tooltip' : 'no-tooltip'}"
      title="${toolTip}">${len}</td>`;
  }

  private renderCodeArgs(args: GameVar[]) {
    if (this.hiddenColumns.has(KEY_ARGS)) {
      return '';
    }
    if (args === null) {
      return html`<td>void</td>`;
    }
    return html`<td class="params">${args.map(arg => html`<div>
      <span class="inline-type">${arg.type}</span>
      <span>${arg.desc}</span></div>`)}
    </td>`;
  }

  private renderCodeRet(ret: GameVar) {
    if (this.hiddenColumns.has(KEY_RET)) {
      return '';
    }
    if (ret === null) {
      return html`<td>void</td>`;
    }
    return html`<td class="returns">
      <span class="inline-type">${ret.type}</span>
      <span>${ret.desc}</span>
    </td>`;
  }

  private renderCodeEntry(entry: GameCode) {
    return html`<tr>
      <td class="addr">${entry.addr}</td>
      ${this.renderCodeLength(entry)}
      ${this.renderLabel(entry.label)}
      <td class="desc">
        <span class="desc-span">${entry.desc}</span>
      </td>
      ${this.renderCodeArgs(entry.params)}
      ${this.renderCodeRet(entry.return)}
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderStructVar(entry: GameRelVar, index: number) {
    return html`<tr>
      <td class="offset">${entry.offset}</td>
      ${this.renderVarLength(entry)}
      ${this.renderType(entry.type)}
      ${this.renderLabel(entry.label)}
      ${this.renderDesc(entry, index)}
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderStructEntry(entry: GameStruct, parentAddr: number) {
    return html`<map-table
      .tableType="${TableType.StructDef}"
      .data="${entry.vars}"
      .structs="${this.structs}"
      .enums="${this.enums}"
      .parentAddr="${parentAddr}"
      .hiddenColumns="${this.hiddenColumns}">
    </map-table>`
  }

  private renderEnumVal(entry: GameEnumVal) {
    return html`<tr>
      <td class="val">${entry.val}</td>
      ${this.renderLabel(entry.label)}
      <td class="desc">${entry.desc}</td>
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderEnumEntry(entry: GameEnumVal[]) {
    return html`<map-table
      .tableType="${TableType.EnumDef}"
      .data="${entry}"
      .structs="${this.structs}"
      .enums="${this.enums}"
      .hiddenColumns="${this.hiddenColumns}">
    </map-table>`
  }

  private renderRow(item: unknown, index: number) {
    switch (this.tableType) {
      case TableType.RamList:
      case TableType.DataList:
        const tgav = Object.create(GameAbsVar.prototype);
        const gav = Object.assign(tgav, item);
        return this.renderAbsVarEntry(gav, index);
      case TableType.CodeList:
        const tgc = Object.create(GameCode.prototype);
        const gc = Object.assign(tgc, item);
        return this.renderCodeEntry(gc);
      case TableType.StructDef:
        const tgrv = Object.create(GameRelVar.prototype);
        const grv = Object.assign(tgrv, item);
        return this.renderStructVar(grv, index);
      case TableType.EnumDef:
        const tge = Object.create(GameEnumVal.prototype);
        const ge = Object.assign(tge, item);
        return this.renderEnumVal(ge);
      default:
        throw new Error("Invalid TableType");
    }
  }

  override render() {
    return html`
      <table class="${this.isMainTable() ? 'main-table' : 'sub-table'}">
        <tr id="heading-row">
          ${this.getHeadings().map(heading => html`
            <th>${heading}</th>`)}
        </tr>
        ${this.data.map((item: unknown, index: number) => {
          return this.renderRow(item, index);
        })}
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-table': MapTable;
  }
}
