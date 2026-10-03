import { LitElement, html, css, nothing } from 'lit';
import { property, customElement } from 'lit/decorators.js';
import {
  NamedEntry, StructEntryDict, UnionEntryDict, EnumEntryDict, RefDict,
  InfoEntry, VarEntry, NamedVarEntry, DataEntry, StructVarEntry,
  StructEntry, UnionEntry, CodeEntry, EnumValEntry, EnumEntry, TypedefEntry
} from './info-entry';
import { toHex } from './utils';
import {
  TableType, KEY_ADDR, KEY_CAT, KEY_DESC, KEY_NAME, KEY_LEN,
  KEY_OFF, KEY_PARAMS, KEY_RET, KEY_SIZE, KEY_TYPE, KEY_VAL, KEY_VALS,
  KEY_VARS, CATEGORIES, getHeading
} from './constants';
import { TypeSpecKind } from './asset-type';
import './map-refs';
import { monoFont, colorMuted, colorAccent, grayBorder } from './theme';

/** Renders a table */
@customElement('map-table')
export class MapTable extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    table, th, td {
      border: ${grayBorder};
      border-collapse: collapse;
    }

    th {
      padding: 3px 10px;
    }

    td {
      overflow-wrap: normal;
      padding: 3px 5px;
      vertical-align: top;
    }
    
    tbody tr:nth-child(odd) {
      background-color: #101010;
    }

    tbody tr:nth-child(even) {
      background-color: #202020;
    }

    .addr,
    .length,
    .name,
    .offset,
    .size,
    .type,
    .val {
      padding-top: 4px;
    }

    .addr,
    .length,
    .offset,
    .size,
    .type,
    .val {
      font-family: ${monoFont};
      text-align: right;
    }
    
    .type {
      max-width: 350px;
    }

    .name-span {
      max-width: 350px;
      display: inline-block;
      word-wrap: break-word;
      color: ${colorAccent};
      font-family: ${monoFont};
    }

    .desc {
      max-width: 350px;
    }
    
    .params {
      max-width: 350px;
    }

    .returns {
      min-width: 150px;
      max-width: 250px;
    }

    .code-var {
      font-family: ${monoFont};
    }

    .code-var-desc {
      font-size: 80%;
      border: ${grayBorder};
      padding: 3px 5px;
      margin: 5px 0px 2px 0px;
    }

    .highlight {
      background-color: #f0800080;
    }

    .has-tooltip {
      cursor: help;
      text-decoration: underline dotted;
      text-decoration-thickness: from-font;
    }

    .expand {
      color: #a0a0e0;
      cursor: pointer;
      margin-left: 5px;
      user-select: none;
    }

    .ref-icon {
      color: ${colorMuted};
      cursor: pointer;
      margin-left: 5px;
      user-select: none;
    }
    .ref-icon svg {
      width: 14px;
      height: 14px;
      vertical-align: middle;
      padding-bottom: 1px;
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
  /** URL to the github repo on a specific commit */
  @property({ type: String }) githubUrl = '';
  /** The JSON data to render */
  @property({ type: Array }) entries: InfoEntry[] = [];
  /** All struct definitions in the game */
  @property({ type: Object }) structs: StructEntryDict = {};
  /** All union definitions in the game */
  @property({ type: Object }) unions: UnionEntryDict = {};
  /** All enum definitions in the game */
  @property({ type: Object }) enums: EnumEntryDict = {};
  /** Sizes of structs, unions, and typedefs */
  @property({ type: Object }) sizes: { [key: string]: number } = {};
  /** References to entries in this table */
  @property({ type: Object }) refs: RefDict = {};
  /** Address of parent entry if table is part of row */
  @property({ type: Number }) parentAddr = NaN;
  /** Columns that should not be displayed */
  @property({ type: Object }) hiddenColumns: Set<string> = new Set<string>();
  /** Regex that matches the text to highlight */
  @property({ type: Object }) highlightRegex: RegExp | null = null;

  /** Indexes of rows that are expanded */
  private expandedItems: Set<string> = new Set<string>();
  /** Name of the entry whose references dialog is open, if any */
  private selectedRefName: string | null = null;

  collapseAll() {
    const tables = Array.from(this.shadowRoot?.querySelectorAll('map-table')!);
    tables.forEach(table => table.collapseAll());
    this.expandedItems.clear();
    this.requestUpdate();
  }

  updateVisibleColumns() {
    // Recursively update sub-tables
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
        return [KEY_ADDR, KEY_LEN, KEY_CAT, KEY_TYPE, KEY_NAME, KEY_DESC];
      case TableType.CodeList:
        return [KEY_ADDR, KEY_LEN, KEY_NAME, KEY_PARAMS, KEY_RET, KEY_DESC];
      case TableType.StructList:
        case TableType.UnionList:
        return [KEY_SIZE, KEY_NAME, KEY_VARS, KEY_DESC];
      case TableType.EnumList:
        return [KEY_NAME, KEY_VALS, KEY_DESC];
      case TableType.TypedefList:
        return [KEY_TYPE, KEY_NAME, KEY_DESC];
      case TableType.StructDef:
        return [KEY_OFF, KEY_LEN, KEY_TYPE, KEY_NAME, KEY_DESC];
      case TableType.UnionDef:
        return [KEY_LEN, KEY_TYPE, KEY_NAME, KEY_DESC];
      case TableType.EnumDef:
        return [KEY_VAL, KEY_NAME, KEY_DESC];
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
    switch (this.tableType) {
      case TableType.RamList:
      case TableType.CodeList:
      case TableType.DataList:
      case TableType.StructList:
      case TableType.UnionList:
      case TableType.EnumList:
      case TableType.TypedefList:
        return true;
      default:
        return false;
    }
  }

  private expand(event: any) {
    const key: string = event.target.dataset.expandKey;
    if (this.expandedItems.has(key)) {
      this.expandedItems.delete(key);
    } else {
      this.expandedItems.add(key);
    }
    this.requestUpdate();
  }

  private showRefs(event: any) {
    this.selectedRefName = event.currentTarget.dataset.refName;
    this.requestUpdate();
  }

  private closeRefs() {
    this.selectedRefName = null;
    this.requestUpdate();
  }

  private renderType(type: string) {
    if (this.hiddenColumns.has(KEY_TYPE)) {
      return nothing;
    }
    return html`<td class="type">${type}</td>`
  }

  private renderCat(cat?: string) {
    if (this.hiddenColumns.has(KEY_CAT)) {
      return nothing;
    }
    const catName = cat ? CATEGORIES[cat] : undefined;
    return html`<td class="cat">${catName ?? nothing}</td>`
  }

  private renderVarLength(entry: VarEntry) {
    if (this.hiddenColumns.has(KEY_LEN)) {
      return nothing;
    }
    let lenStr;
    let toolTip;
    try {
      const len = entry.getLength(this.sizes);
      lenStr = len !== 0 ? toHex(len) : '?';
      toolTip = entry.getLengthToolTip(this.sizes);
    } catch (error) {
      const name = entry instanceof NamedVarEntry ? entry.name : 'variable';
      let msg = `Error getting length of ${name}`;
      if (error instanceof Error) {
        msg = `${msg}: ${error.message}`;
      }
      console.log(msg);
      lenStr = '?';
      toolTip = '';
    }
    return html`<td
      class="length ${toolTip ? 'has-tooltip' : 'no-tooltip'}"
      title="${toolTip}">${lenStr}</td>`;
  }

  private hasSubTable(entry: InfoEntry): boolean {
    if (entry instanceof VarEntry) {
      const ve = entry as VarEntry;
      const specName = ve.specName();
      if ((ve.enum && ve.enum! in this.enums) || specName in this.enums) {
        return true;
      } else if (ve.specKind === TypeSpecKind.Struct) {
        return specName in this.structs;
      } else if (ve.specKind === TypeSpecKind.Union) {
        return specName in this.unions;
      }
    } else if (entry instanceof StructEntry ||
      entry instanceof UnionEntry ||
      entry instanceof EnumEntry) {
      return true;
    }
    return false;
  }

  private childParentAddr(entry: VarEntry, addOffset: boolean): number {
    if (entry.isPtr) {
      return NaN;
    }
    if (this.tableType === TableType.RamList ||
        this.tableType === TableType.DataList) {
      return (entry as DataEntry).addr;
    }
    if (this.parentAddr) {
      return this.parentAddr + (addOffset ? (entry as StructVarEntry).offset : 0);
    }
    return NaN;
  }

  private renderSubTable(entry: InfoEntry) {
    if (entry instanceof VarEntry) {
      const ve = entry as VarEntry;
      if (ve.specKind === TypeSpecKind.Struct) {
        const se = this.structs[ve.specName()];
        const pa = this.childParentAddr(entry, true);
        return this.renderDef(TableType.StructDef, se.vars, pa);
      } else if (ve.specKind === TypeSpecKind.Union) {
        const ue = this.unions[ve.specName()];
        const pa = this.childParentAddr(entry, false);
        return this.renderDef(TableType.UnionDef, ue.vars, pa);
      } else {
        // Check for enums
        // TODO: Deprecate enum fields once they all have enum typedefs
        const ee = (ve.enum ? this.enums[ve.enum] : undefined) ??
          this.enums[ve.specName()];
        if (ee) {
          return this.renderDef(TableType.EnumDef, ee.vals);
        }
      }
    } else if (entry instanceof StructEntry) {
      return this.renderDef(TableType.StructDef, (entry as StructEntry).vars);
    } else if (entry instanceof UnionEntry) {
      return this.renderDef(TableType.UnionDef, (entry as UnionEntry).vars);
    } else if (entry instanceof EnumEntry) {
      return this.renderDef(TableType.EnumDef, (entry as EnumEntry).vals);
    }
    return nothing;
  }

  private renderToggleAndTable(entry: InfoEntry): [unknown, unknown] {
    if (!this.hasSubTable(entry)) {
      return [nothing, nothing];
    }
    const key = (entry as NamedEntry).name;
    const expanded = this.expandedItems.has(key);
    const toggle = html`<span class="expand" data-expand-key="${key}"
      @click="${this.expand}">[${expanded ? '−' : '+'}]</span>`;
    const subTable = expanded ? this.renderSubTable(entry as NamedEntry) : nothing;
    return [toggle, subTable];
  }

  private renderRefIcon(entry: NamedEntry) {
    if (!(entry.name in this.refs)) {
      return nothing;
    }
    return html`<span class="ref-icon" title="Show references"
      data-ref-name="${entry.name}" @click="${this.showRefs}"><svg
        viewBox="0 -960 960 960" fill="currentColor"
      ><path d="M318-120q-82 0-140-58t-58-140q0-40 15-76t43-64l134-133 56 56-134 134q-17 17-25.5 38.5T200-318q0 49 34.5 83.5T318-200q23 0 45-8.5t39-25.5l133-134 57 57-134 133q-28 28-64 43t-76 15Z
        m79-220-57-57 223-223 57 57-223 223Z
        m251-28-56-57 134-133q17-17 25-38t8-44q0-50-34-85t-84-35q-23 0-44.5 8.5T558-726L425-592l-57-56 134-134q28-28 64-43t76-15q82 0 139.5 58T839-641q0 39-14.5 75T782-502L648-368Z"/></svg></span>`;
  }

  private renderNameInner(name: string) {
    if (this.highlightRegex === null) {
      return name;
    }
    const parts = [];
    let idx = 0;
    for (const match of name.matchAll(this.highlightRegex)) {
      const matchIdx = match.index!;
      if (matchIdx > idx) {
        parts.push(name.slice(idx, matchIdx));
      }
      parts.push(html`<span class="highlight">${match[0]}</span>`);
      idx = matchIdx + match[0].length;
    }
    if (idx < name.length) {
      parts.push(name.slice(idx));
    }
    return parts;
  }

  private renderName(entry: NamedEntry, canHaveSubTable: boolean, loc?: string) {
    const inner = this.renderNameInner(entry.name);
    let span;
    if (loc) {
      const url = this.githubUrl + loc.replace(':', '#L');
      span = html`<a href="${url}" target="_blank" class="name-span">${inner}</a>`;
    } else {
      span = html`<span class="name-span">${inner}</span>`;
    }
    // Order: name, [+] toggle, references icon, then the expanded sub-table below
    const [toggle, subTable] = canHaveSubTable ? this.renderToggleAndTable(entry) : [nothing, nothing];
    return html`<td class="name">${span}${toggle}${this.renderRefIcon(entry)}${subTable}</td>`;
  }

  private renderDesc(desc?: string) {
    if (this.hiddenColumns.has(KEY_DESC)) {
      return nothing;
    }
    return html`<td class="desc">${desc}</td>`
  }

  private renderDataEntry(entry: DataEntry) {
    return html`<tr>
      <td class="addr">${toHex(entry.addr)}</td>
      ${this.renderVarLength(entry)}
      ${this.renderCat(entry.catStr())}
      ${this.renderType(entry.typeStr())}
      ${this.renderName(entry, true, entry.loc)}
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderCodeLength(entry: CodeEntry) {
    if (this.hiddenColumns.has(KEY_LEN)) {
      return nothing;
    }
    const toolTip = entry.getToolTip();
    return html`<td class="length ${toolTip ? 'has-tooltip' : 'no-tooltip'}"
      title="${toolTip}">${toHex(entry.size)}
    </td>`;
  }

  private renderCodeVar(ve: VarEntry, paramIdx: number, entryName: string) {
    let codeVar = html`<span class="inline-type">${ve.typeStr()}</span>`;
    if (paramIdx >= 0) {
      const namedVar = ve as NamedVarEntry;
      codeVar = html`${codeVar} <span class="name-span">${namedVar.name}</span>`
    }
    let toggle;
    let descBox;
    if (ve.desc) {
      const key = `${entryName}:${paramIdx}`;
      const expanded = this.expandedItems.has(key);
      toggle = html`<span class="expand" data-expand-key="${key}"
        @click="${this.expand}">[?]</span>`;
      if (expanded) {
        descBox = html`<div class="code-var-desc">${ve.desc}</div>`
      }
    }
    return html`<div><span class="code-var">${codeVar}</span>${toggle}${descBox}</div>`;
  }

  private renderCodeParams(entry: CodeEntry) {
    if (this.hiddenColumns.has(KEY_PARAMS)) {
      return nothing;
    }
    const params = entry.params;
    if (!params) {
      return html`<td class="params"><span class="code-var">void</span></td>`;
    }
    return html`<td class="params">${params.map(
      (p, pIdx) => this.renderCodeVar(p, pIdx, entry.name))}
    </td>`;
  }

  private renderCodeRet(entry: CodeEntry) {
    if (this.hiddenColumns.has(KEY_RET)) {
      return nothing;
    }
    const ret = entry.return;
    if (!ret) {
      return html`<td class="returns"><span class="code-var">void</span></td>`;
    }
    return html`<td class="returns">${this.renderCodeVar(ret, -1, entry.name)}</td>`;
  }

  private renderCodeEntry(entry: CodeEntry) {
    return html`<tr>
      <td class="addr">${toHex(entry.addr)}</td>
      ${this.renderCodeLength(entry)}
      ${this.renderName(entry, true, entry.loc)}
      ${this.renderCodeParams(entry)}
      ${this.renderCodeRet(entry)}
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderStructOrUnionSize(size: number) {
    if (this.hiddenColumns.has(KEY_SIZE)) {
      return nothing;
    }
    return html`<td class="size">${toHex(size)}</td>`;
  }

  private renderListEntry(entry: StructEntry | UnionEntry | EnumEntry) {
    const size = entry instanceof EnumEntry ?
      nothing : this.renderStructOrUnionSize(entry.size);
    const cellClass = entry instanceof EnumEntry ? 'vals' : 'vars';
    return html`<tr>
      ${size}
      ${this.renderName(entry, false, entry.loc)}
      <td class="${cellClass}">${this.renderToggleAndTable(entry)}</td>
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderTypedefEntry(entry: TypedefEntry) {
    return html`<tr>
      ${this.renderType(entry.decl)}
      ${this.renderName(entry, false, entry.loc)}
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderStructUnionVar(entry: NamedVarEntry) {
    // Struct/union vars can have categories, but they're left out to save space
    let offset;
    if (entry instanceof StructVarEntry) {
      const toolTip = entry.getOffsetToolTip(this.parentAddr);
      offset = html`<td class="offset ${toolTip ? 'has-tooltip' : 'no-tooltip'}"
        title="${toolTip}">
        ${toHex(entry.offset)}
      </td>`;
    }
    return html`<tr>
      ${offset}
      ${this.renderVarLength(entry)}
      ${this.renderType(entry.typeStr())}
      ${this.renderName(entry, true)}
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderEnumVal(entry: EnumValEntry) {
    return html`<tr>
      <td class="val">${toHex(entry.val)}</td>
      <td class="name">${entry.name}</td>
      ${this.renderDesc(entry.desc)}
    </tr>`;
  }

  private renderDef(
    tableType: TableType,
    entries: InfoEntry[],
    parentAddr: number = NaN
  ) {
    return html`<map-table
      .tableType="${tableType}"
      .githubUrl="${this.githubUrl}"
      .entries="${entries}"
      .structs="${this.structs}"
      .unions="${this.unions}"
      .enums="${this.enums}"
      .sizes="${this.sizes}"
      .hiddenColumns="${this.hiddenColumns}"
      .parentAddr="${parentAddr}">
    </map-table>`;
  }

  private renderRow(item: InfoEntry) {
    switch (this.tableType) {
      case TableType.RamList:
      case TableType.DataList:
        return this.renderDataEntry(item as DataEntry);
      case TableType.CodeList:
        return this.renderCodeEntry(item as CodeEntry);
      case TableType.StructList:
      case TableType.UnionList:
      case TableType.EnumList:
        return this.renderListEntry(item as StructEntry | UnionEntry | EnumEntry);
      case TableType.TypedefList:
        return this.renderTypedefEntry(item as TypedefEntry);
      case TableType.StructDef:
      case TableType.UnionDef:
        return this.renderStructUnionVar(item as NamedVarEntry);
      case TableType.EnumDef:
        return this.renderEnumVal(item as EnumValEntry);
      default:
        throw new Error('Invalid TableType');
    }
  }

  private renderRefsDialog() {
    const name = this.selectedRefName;
    const entryRefs = name !== null ? this.refs[name] : undefined;
    return html`<map-refs
      .open="${entryRefs !== undefined}"
      .entryName="${name ?? ''}"
      .refs="${entryRefs ?? {}}"
      @close="${this.closeRefs}">
    </map-refs>`;
  }

  override render() {
    return html`
      <table class="${this.isMainTable() ? 'main-table' : 'sub-table'}">
        <tr id="heading-row">
          ${this.getHeadings().map(heading => html`
            <th>${heading}</th>`)}
        </tr>
        ${this.entries.map((item: InfoEntry) => {
          return this.renderRow(item);
        })}
      </table>
      ${this.renderRefsDialog()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'map-table': MapTable;
  }
}
