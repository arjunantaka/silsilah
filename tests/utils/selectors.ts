// Centralized data-testid selectors for Playwright tests
// Prefer using these constants to avoid typos and ease refactors.

export const SEL = {
  // App / High-level panels
  appRoot: '[data-testid="app-root"]',
  diagnosticsPanel: '[data-testid="diagnostics-panel"]',

  // Person List / Table
  btnAddPerson: '[data-testid="btn-add-person"]',
  personRow: (id: string|number) => `[data-testid="row-person-${'${id}'}"]`,
  personActionsCell: (id: string|number) => `[data-testid="cell-actions-${'${id}'}"]`,
  btnAddChild: (id: string|number) => `[data-testid="btn-add-child-${'${id}'}"]`,
  btnEditPerson: (id: string|number) => `[data-testid="btn-edit-person-${'${id}'}"]`,
  btnSetSpouse: (id: string|number) => `[data-testid="btn-set-spouse-${'${id}'}"]`,
  btnRemoveSpouse: (id: string|number) => `[data-testid="btn-remove-spouse-${'${id}'}"]`,
  btnDeletePerson: (id: string|number) => `[data-testid="btn-delete-person-${'${id}'}"]`,
  filterGenerasi: '[data-testid="filter-generasi"]',
  searchNama: '[data-testid="search-nama"]',

  // Person Form Unified Trah
  personForm: '[data-testid="person-form"]',
  personFormFields: '[data-testid="person-form-fields"]',
  personFormError: '[data-testid="person-form-error"]',
  pfNama: '[data-testid="pf-nama"]',
  pfTempat: '[data-testid="pf-tempat"]',
  pfTanggal: '[data-testid="pf-tanggal"]',
  pfGender: '[data-testid="pf-gender"]',
  pfAlamat: '[data-testid="pf-alamat"]',
  pfPekerjaan: '[data-testid="pf-pekerjaan"]',
  parentSelector: '[data-testid="parent-selector"]',
  parentOption: (id: string|number) => `[data-testid="parent-option-${'${id}'}"]`,
  chkAddSpouse: '[data-testid="chk-add-spouse"]',
  spouseForm: '[data-testid="spouse-form"]',
  spouseNama: '[data-testid="spouse-nama"]',
  spouseTempat: '[data-testid="spouse-tempat"]',
  spouseTanggal: '[data-testid="spouse-tanggal"]',
  spouseGender: '[data-testid="spouse-gender"]',
  btnCancelPerson: '[data-testid="btn-cancel-person"]',
  btnSavePerson: '[data-testid="btn-save-person"]',
  formActions: '[data-testid="form-actions"]',

  // Tree
  treeRoot: '[data-testid="tree-root"]',
  treeContainer: '[data-testid="tree-container"]',
  treeEmpty: '[data-testid="tree-empty"]',
  treeNode: (id: string|number) => `[data-testid="tree-node-${'${id}'}"]`,
  treeNodeContent: (id: string|number) => `[data-testid="tree-node-content-${'${id}'}"]`,
  toggleNode: (id: string|number) => `[data-testid="toggle-node-${'${id}'}"]`,

  // Export Table
  exportTableRoot: '[data-testid="export-table-root"]',
  exportControls: '[data-testid="export-controls"]',
  exportRootSelector: '[data-testid="export-root-selector"]',
  selectExportRoot: '[data-testid="select-export-root"]',
  exportRootOption: (id: string|number) => `[data-testid="export-root-option-${'${id}'}"]`,
  exportButtons: '[data-testid="export-buttons"]',
  btnExportCsv: '[data-testid="btn-export-csv"]',
  btnPrintTable: '[data-testid="btn-print-table"]',
  exportTableContainer: '[data-testid="export-table-container"]',
  exportTable: '[data-testid="export-table"]',
  exportRow: (kode: string) => `[data-testid="export-row-${'${kode}'}"]`,
  exportEmpty: '[data-testid="export-empty"]'
} as const;

export type SelectorKey = keyof typeof SEL;
