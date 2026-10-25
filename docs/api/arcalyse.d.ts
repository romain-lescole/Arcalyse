/**
 * Arcalyse scripting API — public contract (version 1.0: reading and analysis only).
 *
 * Same names as the Arcature scripting API (docs/api/arcature.d.ts in the Arcature repository): a script that only
 * reads a model runs in both tools. Arcalyse never modifies a model, so nothing here creates, renames, deletes or moves
 * anything; in exchange, `analysis` gives the results of every Arcalyse analysis (functions, chains, traceability,
 * checks, health score, requirements, deployment…).
 *
 * Scripts are plain JavaScript (ES2022, `await` and `return` allowed at top level). They see six globals:
 * `model`, `metamodel`, `analysis`, `out`, `ui` and `console`. Nothing else: no page, no file, no network.
 * Implementation: src/js/80-scripts-api.js (core, copied into a Web Worker) and 82-scripts-analyses.js (page side).
 * Runs in the Arcalyse page (📜 Scripts console, Alt+4).
 *
 * Editor autocompletion: add `/// <reference path="arcalyse.d.ts" />` at the top of a script.
 * Conformance tests: tests/scripts.js. Names are in English; displayed messages follow the language of the build.
 */

/** ARCADIA layer of an element ('' outside the architectures: shared data, libraries…). */
type Layer = 'OA' | 'SA' | 'LA' | 'PA' | 'EPBS' | '';

/**
 * Element filter.
 * - a type name: `'LogicalFunction'` (subtypes included, see `type` below);
 * - a predicate: `e => e.name.startsWith('F')`;
 * - an object whose criteria must all match.
 */
type Filter = string | ((e: Element) => boolean) | {
  /** Type name(s), subtypes included (Capella metamodel inheritance): 'Component' matches LogicalComponent, PhysicalComponent…
   *  Short name ('LogicalFunction') or qualified by package ('la:LogicalFunction') when the short name is ambiguous.
   *  An unknown type name throws (typo protection). */
  type?: string | string[];
  /** Type name(s), without subtypes. */
  exactType?: string | string[];
  /** ARCADIA layer(s). */
  layer?: Layer | Layer[];
  /** Exact name, or regular expression tested on the name. */
  name?: string | RegExp;
  /** true: technical elements only (values, traces, realizations, ports, exchanges… as Arcalyse's "technical types"); false: exclude them. */
  technical?: boolean;
  /** Additional predicate. */
  where?: (e: Element) => boolean;
};

/** Business relation names (the relationships of the 🔗 Links view, with Arcature's names). */
type Relation =
  | 'source' | 'target'                       // ends of an exchange or a physical link (seen from the exchange)
  | 'allocation'                              // component → function (out), function → component (in)
  | 'functionalExchange' | 'componentExchange' | 'physicalLink' | 'communicationMean'
  | 'exchangedItem'                           // exchange → exchange item
  | 'exchangeAllocation' | 'componentExchangeAllocation' | 'portAllocation'
  | 'deployment' | 'involvement' | 'exploitation' | 'include' | 'extend' | 'generalization'
  | 'realization'                             // lower-level element → realized element (out)
  | 'trace' | 'transition' | 'otherAllocation';

/** A business relationship seen from one element. */
interface Link {
  relation: Relation;
  /** 'out': this element is the source of the relation; 'in': it is the target. */
  direction: 'in' | 'out';
  /** The element at the other end. */
  element: Element;
  /** The element that carries the relation (exchange, physical link…), or null. */
  via: Element | null;
}

/**
 * A model element. The same element is always the same object: `a === b` is reliable within a run.
 * Everything is read-only.
 */
interface Element {
  /** Capella identifier (UUID). */
  readonly id: string;
  /** Short type: 'LogicalFunction'. */
  readonly type: string;
  /** Type as written in the file: 'org.polarsys.capella.core.data.la:LogicalFunction'. */
  readonly fullType: string;
  readonly layer: Layer;
  /** Name ('' when absent). */
  readonly name: string;
  /** Summary ('' when absent). */
  readonly summary: string;
  /** Description, HTML ('' when absent). */
  readonly description: string;
  /** Capella review comment ('' when absent). */
  readonly review: string;
  /** Displayed label: the name, or ‹Type› for an unnamed element. */
  readonly label: string;
  /** Owner (containing element), null for the system engineering. */
  readonly owner: Element | null;
  /** Diagrams of the .aird showing this element, or targeting it. Empty without the .aird. */
  readonly diagrams: Diagram[];
  /** Names from the system engineering (included) to this element, separated by '/' ('\/' for a slash inside a name).
   *  `model.findByPath(e.path)` finds `e` (or its first homonym with the same path). */
  readonly path: string;
  /** Part of the skeleton created by Capella with the project (system engineering, architectures, root packages, root functions…). */
  readonly isSkeleton: boolean;
  /** Why it is protected (displayed text), or null. */
  readonly skeletonReason: string | null;
  /** Technical element (value, trace, realization, port, exchange…), hidden by default in the views. */
  readonly isTechnical: boolean;

  /** Directly owned elements. */
  children(filter?: Filter): Element[];
  /** All owned elements, at any depth, in document order. */
  descendants(filter?: Filter): Element[];
  /** Owned element designated by a relative path of names, or null. */
  findByPath(path: string): Element | null;
  /** Raw XML attribute, or null. References are '#id' lists. */
  attribute(name: string): string | null;
  /** All XML attributes. A copy: changing it changes nothing. */
  attributes(): Record<string, string>;
  /** true if the element is of this type or inherits from it (metamodel). */
  isA(type: string): boolean;
  /** Elements referenced by this element, optionally through one attribute ('abstractType', 'allocatedFunctions'…). */
  references(attribute?: string): Element[];
  /** Elements that reference this element, optionally through one attribute. */
  referencedBy(attribute?: string): Element[];
  /** Business relationships (allocations, exchanges, realizations, involvements…), as in the 🔗 Links view. */
  links(relation?: Relation, direction?: 'in' | 'out'): Link[];
  toString(): string;
  toJSON(): { id: string; type: string; name: string };
}

/** A diagram of the .aird opened with the model (as listed by the 🔲 Diagrams view). */
interface Diagram {
  readonly id: string;
  readonly name: string;
  /** Sirius description: 'Logical Architecture Blank', 'System Data Flow Blank'… */
  readonly type: string;
  /** Short code of the description: 'LAB', 'SDFB'… */
  readonly code: string;
  readonly layer: Layer;
  /** 'diagram', 'sequence' or 'table'. */
  readonly kind: 'diagram' | 'sequence' | 'table';
  /** Represented element (function, component, capability…), or null. */
  readonly target: Element | null;
  toString(): string;
  toJSON(): { id: string; name: string; type: string };
}

/** The open model (as displayed). */
interface Model {
  /** API contract version ('1.0'). */
  readonly apiVersion: string;
  /** 'Arcalyse' (Arcature's API exposes 'Arcature'): lets a script adapt to the tool it runs in. */
  readonly tool: string;
  readonly fileName: string;
  /** Capella version ('' in Arcalyse: not read from the file). */
  readonly capellaVersion: string;
  /** The system engineering (top element of the model). */
  readonly root: Element;
  /** Elements selected when the script was started (the element shown in the detail panel). */
  readonly selection: Element[];
  /** Diagrams of the .aird opened with the model (empty without the .aird). */
  readonly diagrams: Diagram[];
  /** Whether the diagrams (.aird) are available. */
  readonly hasDiagrams: boolean;
  /** Element by id ('#id' accepted), or null. */
  getElementById(id: string): Element | null;
  /** All elements matching the filter, in document order. */
  elements(filter?: Filter): Element[];
  /** First element matching the filter, or null. */
  find(filter: Filter): Element | null;
  /** Number of elements matching the filter. */
  count(filter?: Filter): number;
  /** Element by path of names from the system engineering: 'IFE System/Logical Architecture/Logical Functions/Root Logical Function'. */
  findByPath(path: string): Element | null;
  /** Architecture element of a layer, or null. */
  layer(code: 'OA' | 'SA' | 'LA' | 'PA' | 'EPBS'): Element | null;
  /** Types present in the model with their number of elements, most frequent first. */
  types(): Array<{ type: string; count: number }>;
}

/** Capella metamodel (types and inheritance, from Capella's sources through Arcature). */
interface Metamodel {
  /** Capella version of the metamodel ('v7.0.1'). */
  readonly version: string;
  has(type: string): boolean;
  isA(type: string, supertype: string): boolean;
  /** The type and all its supertypes (short names). */
  supertypes(type: string): string[];
  /** All types, qualified: 'la:LogicalFunction'. */
  types(): string[];
}

/**
 * Result of an Arcalyse analysis: the data computed by the corresponding view, made plain (no XML node, Set → array,
 * Map → object). Every object that designates a model element also carries `element` (the Element, or null when the
 * element is unknown). Field names are those of the engines (see docs/api/LISEZMOI.md for the main ones).
 */
type Analysed = any;

/** A row of a 🩺 check: one cell per column, text or element. */
type CheckCell = string | { element: Element | null; name: string };

/** A 🩺 check of a view, as displayed (check profile applied). */
interface Check {
  /** View key: 'functions', 'fex', 'csys', 'cblk', 'ports', 'chains', 'scen', 'ana:reqs', 'ana:pvmt', 'ana:data', 'ana:cts', 'ana:cats', 'ana:libs', 'ana:rec', 'ana:deploy', 'ana:status'… */
  view: string;
  title: string;
  tip: string;
  severity: 'info' | 'warn' | 'err';
  columns: string[];
  rows: CheckCell[][];
}

/**
 * Arcalyse analyses, computed on request by the page (cached like the views: ↻ Recalculer clears them). All asynchronous.
 */
interface Analysis {
  /** ƒ Functions: one entry per function (OA activities included): id, name, type, layer, num, depth, leaf, kind, desc, summary,
   *  status, parentId, children (ids), ins / outs (ports), fesIn / fesOut (exchanges: id, name, other), alloc (allocating components:
   *  id, name, actor), realizes / realizedBy (ids), chains, caps, states (names), element. */
  functions(): Promise<Analysed[]>;
  /** ⚡ Chains (functional chains, operational processes, physical paths): id, name, type, layer, description, element,
   *  steps (functions in order: nodeId, name, type, element), exchanges (name, from, to: node ids, element), graph. */
  chains(): Promise<Analysed[]>;
  /** 🧬 Cross-layer traceability: links (realization links: src, tgt with element), elements (traceable elements by category),
   *  up / down (element id → ids of realized / realizing elements). */
  traceability(options?: { transfo?: boolean; leafOnly?: boolean }): Promise<{ links: Analysed[]; elements: Analysed[]; up: Record<string, string[]>; down: Record<string, string[]> }>;
  /** 🎯 Capabilities & missions: fns, chains, actors, scen, includes, realizedBy, realizes, missions, exploits… */
  capabilities(): Promise<Analysed[]>;
  /** 🔁 Modes & states: sms (state machines with states and transitions), avail (state id → functions available). */
  states(): Promise<Analysed>;
  /** 💚 Model health: score (0–100), points, bloquants, info, pop, nChecks, nOk, couches (per layer: score, points, bloquants, pop), parVue, checks. */
  health(): Promise<Analysed>;
  /** 📋 Requirements: list (ident, name, text, attrs, links…), byEl (element id → requirements), attrDefs. */
  requirements(): Promise<Analysed>;
  /** 🏷 Properties (PVMT): defs, vals, byEl. */
  properties(): Promise<Analysed>;
  /** 🗃 Data & interfaces: eis (exchange items), itfs (interfaces), types, fes, ces. */
  data(): Promise<Analysed>;
  /** ⛓ Constraints: list, byEl. */
  constraints(): Promise<Analysed>;
  /** 🔖 Capella review status: lits (ProgressStatus literals), list (elements with status / review), byEl. */
  status(): Promise<Analysed>;
  /** 🏷 Exchange categories: cats, byEx, exs. */
  categories(): Promise<Analysed>;
  /** 📦 REC / RPL: recs, rpls (with diff), byEl, comp. */
  rec(): Promise<Analysed>;
  /** 📚 Libraries: refs (external references), libs. */
  libraries(): Promise<Analysed>;
  /** 🎬 Scenarios: one entry per scenario (roles, nMsg, nFrag…). */
  scenarios(): Promise<Analysed[]>;
  /** 🧩 Ports: functionPorts, componentPorts, physicalPorts, functionalExchanges, componentExchanges, physicalLinks. */
  ports(): Promise<Analysed>;
  /** ƒ⇆ Functional exchanges: one entry per exchange (src / tgt: function and port, items, ces, chains). */
  functionalExchanges(): Promise<Analysed[]>;
  /** 🔀 Component exchanges: one entry per exchange (linkId, kind, src / tgt: component and port, fes, pls). */
  componentExchanges(): Promise<Analysed[]>;
  /** 🔌 Physical links: one entry per link (linkId, src / tgt: node and port, ces). */
  physicalLinks(): Promise<Analysed[]>;
  /** 🖧 Deployment & EPBS: nodes, behaviors, onNode, hosts, cis (configuration items), ciByEl, ceBad. */
  deployment(): Promise<Analysed>;
  /** 🧩 SysML v2 (model read by the Arcature reader): nom, projet, fichiers, racine, elements (plain objects of the reader), diagnostics, liaisons, vues (computed views: cle, genre, sigle, nom, element); null for a Capella model. */
  sysml(): Promise<Analysed | null>;
  /** 🩺 Checks of every view (or of one view), with the check profile applied. */
  checks(view?: string): Promise<Check[]>;
  /** Name quality (rules of ƒ Functions): lang, verb, issues (code, label). */
  nameQuality(name: string): Promise<{ lang: string; verb: boolean; issues: Array<{ code: string; label: string }> }>;
  /** Ids of the diagrams showing an element (same as element.diagrams). */
  diagramsOf(element: Element): Promise<string[]>;
  /** Names of the available analyses. */
  names(): string[];
}

/** Table rows: objects (one column per key) or arrays. Cells may hold elements (shown as links) or lists. */
type Rows = Array<Record<string, unknown> | unknown[]>;

/** Script output. Elements printed or put in tables become links to the element (click: detail panel). */
interface Out {
  print(...values: unknown[]): void;
  warn(...values: unknown[]): void;
  error(...values: unknown[]): void;
  /** Displays a table. `columns`: keys to show (object rows) or headers (array rows). */
  table(rows: Rows, columns?: string[] | null, options?: { title?: string }): void;
  /** CSV text of a table (RFC 4180; elements written as their label). Default separator ';' (Excel, French locale). */
  csv(rows: Rows, columns?: string[] | null, options?: { separator?: string }): string;
  /** Offers a text file for download. A .csv file gets a UTF-8 byte order mark so that Excel reads accents correctly. */
  file(name: string, content: string, mimeType?: string): void;
  clear(): void;
  progress(done: number, total?: number): void;
}

/** A parsed CSV file. */
interface Csv {
  /** Header row (empty when `header: false`). */
  columns: string[];
  /** One object per row, keyed by column name (arrays of cells when `header: false`). Missing cells are ''. */
  rows: Array<Record<string, string>>;
}

/**
 * Input asked from the user while the script runs (always `await`). The question appears in the script console.
 * Without anyone to answer, the defaults are: the proposed value, false, no choice, no file.
 */
interface Ui {
  /** Asks for a text; null if the user cancels. */
  ask(question: string, defaultValue?: string): Promise<string | null>;
  /** Asks yes / no. */
  confirm(question: string): Promise<boolean>;
  /** Asks to choose among texts or elements (elements are shown with their type); null if cancelled. */
  choose<T>(question: string, items: T[]): Promise<T | null>;
  /** Several choices; [] if cancelled. */
  choose<T>(question: string, items: T[], options: { multiple: true }): Promise<T[]>;
  /** Asks for a text file (UTF-8, or Windows-1252 as written by Excel); null if cancelled. */
  readFile(options?: { accept?: string }): Promise<{ name: string; text: string } | null>;
  /** Asks for a CSV file and parses it (see parseCsv); null if cancelled. */
  readCsv(options?: { accept?: string; separator?: string; header?: boolean }): Promise<(Csv & { name: string }) | null>;
  /** Parses CSV text (RFC 4180: quotes, doubled quotes, line breaks inside quotes). The separator (';', ',' or tab)
   *  is detected on the first line unless given; the first line holds the column names unless `header: false`. */
  parseCsv(text: string, options?: { separator?: string; header?: boolean }): Csv;
}

declare const model: Model;
declare const metamodel: Metamodel;
declare const analysis: Analysis;
declare const out: Out;
declare const ui: Ui;
/** log / info → out.print, warn → out.warn, error → out.error, table → out.table, clear → out.clear. */
declare const console: Pick<Out, 'warn' | 'error' | 'table' | 'clear'> & { log: Out['print']; info: Out['print'] };
