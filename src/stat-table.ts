/** One column of the sortable table. */
export interface StatColumn {
  /** Unique on its page, where it is the column's anchor. */
  key: string;
  label: string;
  /** What the figures count, shown under the label; it opens the rule. */
  unit: string;
  /** One line on how it's counted. */
  rule: string;
  /** Which way is better: the label's first press puts that end on top. */
  better: 'higher' | 'lower';
  /** By manager ID. A manager without a cell shows a dash and sorts last either way. */
  cells: Map<string, StatCell>;
}
export interface StatCell {
  figure: string;
  /** The number the figure sorts by. */
  sort: number;
  /** A figure's own unit, where the column is one of names: "44 starts". */
  unit?: string;
  /** Whom the figure is about, above it. */
  text?: string;
  /** The chances behind the figure, below it. */
  sample?: string;
}
