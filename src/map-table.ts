
import { css, customElement, html, LitElement, property } from 'lit-element';
import {
  GameVar, GameAbsVar, GameRelVar, GameStructList, GameEnumList, GameCode, GameEnumVal, GameStruct
} from './entry-types';
import { toHex } from './utils';
import {
  KEY_ADDR, KEY_LEN, KEY_TYPE, KEY_TAGS, KEY_LABEL,
  KEY_ARGS, KEY_RET, KEY_OFF, KEY_VAL, KEY_NOTES, getHeading, 
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
    }

    .type, .inline-type {
      font-family: "Courier New", monospace;
      font-size: 90%;
    }

    .label-span {
      max-width: 400px;
      display: inline-block;
      word-wrap: break-word;
    }
    .params, .returns {
      max-width: 250px;
    }
    .notes {
      max-width: 300px;
    }

    .has-tooltip {
      cursor: help;
    }

    .expand {
      color: #A0A0E0;
      cursor: pointer;
    }

    #table {
      margin: auto;
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
  /** Selected game version (U, E, or J) */
  @property({ type: String, reflect: true }) version = '';
  /** Address of parent entry if table is part of row */
  @property({ type: Number }) parentAddr = NaN;
  
  /** Columns that should not be displayed */
  private hiddenColumns: Set<string> = new Set<string>();
  /** Indexes of rows that are expanded */
  private expandedRows: Set<number> = new Set<number>();
  

  toggleColumn(colName: string, visible: boolean) {
    if (visible) {
      this.hiddenColumns.delete(colName);
    } else {
      this.hiddenColumns.add(colName);
    }
    this.requestUpdate();
  }

  collapseAll() {
    // let rows = Array.from(this.shadowRoot?.querySelectorAll('map-row')!);
    // rows.forEach(row => row.collapseAll());
  }

  private getClasses(): string[] {
    switch (this.tableType) {
      case TableType.RamList:
      case TableType.DataList:
        return [KEY_ADDR, KEY_LEN, KEY_TAGS, KEY_TYPE, KEY_LABEL, KEY_NOTES];
      case TableType.CodeList:
        return [KEY_ADDR, KEY_LEN, KEY_LABEL, KEY_ARGS, KEY_RET, KEY_NOTES];
      case TableType.StructDef:
        return [KEY_OFF, KEY_LEN, KEY_TYPE, KEY_LABEL, KEY_NOTES];
      case TableType.EnumDef:
        return [KEY_VAL, KEY_LABEL, KEY_NOTES];
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
    return html`<td class="tags">${tags ? tags.join(', ') : ''}</td>`
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

  private renderSubTable(entry: GameAbsVar, index: number) {
    const isEnum = Boolean(entry.enum) && entry.enum! in this.enums;
    const isStruct = entry.spec() in this.structs;
    if (!(isEnum || isStruct)) {
      return '';
    }
    const expanded = this.expandedRows.has(index);
    const toggle = html`<span class="expand" data-idx="${index}"
      @click="${this.expand}">[${expanded ? '-' : '+'}]</span>`;
    if (!expanded) {
      return toggle;
    }
    let table;
    if (Boolean(entry.enum) && entry.enum! in this.enums) {
      const vals: GameEnumVal[] = this.enums[entry.enum!];
      table = this.renderEnumEntry(vals);
    } else if (entry.spec() in this.structs) {
      const gs = this.structs[entry.spec()];
      table = this.renderStructEntry(gs, entry.getAddr());
    }
    return html`${toggle}${table}`;
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
      <td class="label">
        <span class="label-span">${entry.label}</span>
        ${this.renderSubTable(entry, index)}
      </td>
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
      <span>${arg.label}</span></div>`)}
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
      <span>${ret.label}</span>
    </td>`;
  }

  private renderCodeEntry(entry: GameCode) {
    return html`<tr>
      <td class="addr">${entry.addr}</td>
      ${this.renderCodeLength(entry)}
      <td class="label">
        <span class="label-span">${entry.label}</span>
      </td>
      ${this.renderCodeArgs(entry.params)}
      ${this.renderCodeRet(entry.return)}
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderStructVar(entry: GameRelVar) {
    // TODO: allow enum or struct table in label
    return html`<tr>
      <td class="offset">${entry.offset}</td>
      ${this.renderVarLength(entry)}
      ${this.renderType(entry.type)}
      <td class="label">
        <span class="label-span">${entry.label}</span>
      </td>
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderStructEntry(entry: GameStruct, parentAddr: number) {
    return html`<map-table
      .tableType="${TableType.StructDef}"
      .data="${entry.vars}"
      .structs="${this.structs}"
      .enums="${this.enums}"
      .parentAddr="${parentAddr}">
    </map-table>`
  }

  private renderEnumVal(entry: GameEnumVal) {
    return html`<tr>
      <td class="val">${entry.val}</td>
      <td class="label">${entry.label}</td>
      ${this.renderNotes(entry.notes)}
    </tr>`;
  }

  private renderEnumEntry(entry: GameEnumVal[]) {
    return html`<map-table
      .tableType="${TableType.EnumDef}"
      .data="${entry}"
      .structs="${this.structs}"
      .enums="${this.enums}">
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
        return this.renderStructVar(grv);
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
      <table id="table">
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
