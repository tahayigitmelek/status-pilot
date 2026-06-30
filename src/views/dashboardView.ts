import { ItemView, Menu, setIcon, type WorkspaceLeaf } from 'obsidian';
import type StatusPilotPlugin from '../main';
import { createBadge, formatOptionLabel } from '../ui/components';
import {
	type DashboardFilters,
	type DashboardPreset,
	type DashboardSort,
	type MetadataKind,
	type StatusPilotRecord,
} from '../types';

export const STATUSPILOT_DASHBOARD_VIEW_TYPE = 'statuspilot-dashboard-view';

const DEFAULT_FILTERS: DashboardFilters = {
	search: '',
	status: '',
	priority: '',
	level: '',
	folder: '',
	sort: 'priority-desc',
};

const SORT_OPTIONS: Array<{ value: DashboardSort; label: string }> = [
	{ value: 'priority-desc', label: 'Highest priority first' },
	{ value: 'priority-asc', label: 'Lowest priority first' },
	{ value: 'level-asc', label: 'Level ascending' },
	{ value: 'level-desc', label: 'Level descending' },
	{ value: 'alpha-asc', label: 'Alphabetical' },
	{ value: 'status-asc', label: 'Status order' },
];

export class DashboardView extends ItemView {
	private readonly plugin: StatusPilotPlugin;
	private filters: DashboardFilters = { ...DEFAULT_FILTERS };
	private hasSubmittedSearch = false;
	private submittedSearch = '';
	private unsubscribe: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: StatusPilotPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return STATUSPILOT_DASHBOARD_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Status pilot dashboard';
	}

	getIcon(): string {
		return 'layout-dashboard';
	}

	async onOpen(): Promise<void> {
		this.unsubscribe = this.plugin.metadataService.onChange(() => {
			this.render();
		});
		this.render();
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
	}

	applyPreset(preset: DashboardPreset): void {
		this.filters = {
			...this.filters,
			...preset,
		};
		this.hasSubmittedSearch = true;
		this.submittedSearch = this.filters.search.trim();
		this.render();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('statuspilot-dashboard');

		const headerEl = contentEl.createDiv({ cls: 'statuspilot-dashboard-header' });
		headerEl.createEl('h2', { text: 'Dashboard' });

		const records = this.getFilteredRecords();
		const totalRecords = this.plugin.metadataService.getRecords().length;
		const summaryText = this.hasSubmittedSearch
			? `${records.length} of ${totalRecords} notes`
			: `${totalRecords} searchable notes`;
		headerEl.createDiv({
			cls: 'statuspilot-dashboard-summary',
			text: summaryText,
		});

		this.renderToolbar(contentEl);
		this.renderTable(contentEl, records);
	}

	private renderToolbar(containerEl: HTMLElement): void {
		const toolbarEl = containerEl.createDiv({ cls: 'statuspilot-toolbar' });

		const searchGroupEl = toolbarEl.createDiv({
			cls: 'statuspilot-toolbar-search',
		});
		const searchEl = searchGroupEl.createDiv({ cls: 'statuspilot-control wide' });
		searchEl.createEl('label', { text: 'Search' });
		const searchInputRowEl = searchEl.createDiv({
			cls: 'statuspilot-search-row',
		});
		const inputEl = searchEl.createEl('input', {
			cls: 'statuspilot-search',
		});
		searchInputRowEl.append(inputEl);
		inputEl.type = 'search';
		inputEl.value = this.filters.search;
		inputEl.placeholder = 'Title, metadata';
		inputEl.addEventListener('input', () => {
			this.filters.search = inputEl.value;
			this.hasSubmittedSearch = false;
		});
		inputEl.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				this.submitSearch();
			}
		});

		const searchButton = searchInputRowEl.createEl('button', {
			cls: 'statuspilot-search-button',
		});
		searchButton.type = 'button';
		searchButton.setAttr('aria-label', 'Search notes');
		searchButton.setAttr('title', 'Search notes');
		setIcon(searchButton, 'search');
		searchButton.createSpan({ text: 'Search' });
		searchButton.addEventListener('click', () => {
			this.submitSearch();
		});

		const metadataGroupEl = toolbarEl.createDiv({
			cls: 'statuspilot-toolbar-group statuspilot-toolbar-metadata',
		});
		this.renderValueFilter(metadataGroupEl, 'status', 'Status');
		this.renderValueFilter(metadataGroupEl, 'priority', 'Priority');
		this.renderValueFilter(metadataGroupEl, 'level', 'Level');

		const organizeGroupEl = toolbarEl.createDiv({
			cls: 'statuspilot-toolbar-group statuspilot-toolbar-organize',
		});
		this.renderFolderFilter(organizeGroupEl);
		this.renderSortFilter(organizeGroupEl);
	}

	private renderValueFilter(
		containerEl: HTMLElement,
		kind: MetadataKind,
		label: string,
	): void {
		const controlEl = containerEl.createDiv({ cls: 'statuspilot-control' });
		controlEl.createEl('label', { text: label });
		const selectEl = controlEl.createEl('select');
		selectEl.createEl('option', { text: 'All', value: '' });

		for (const option of this.plugin.metadataService.getOptions(kind)) {
			selectEl.createEl('option', {
				text: `${option.icon} ${option.label}`,
				value: option.value,
			});
		}

		selectEl.value = this.filters[kind];
		selectEl.addEventListener('change', () => {
			this.filters[kind] = selectEl.value;
			this.hasSubmittedSearch = false;
		});
	}

	private renderFolderFilter(containerEl: HTMLElement): void {
		const controlEl = containerEl.createDiv({ cls: 'statuspilot-control' });
		controlEl.createEl('label', { text: 'Folder' });
		const selectEl = controlEl.createEl('select');
		selectEl.createEl('option', { text: 'All', value: '' });

		for (const folder of this.plugin.metadataService.getFolderOptions()) {
			selectEl.createEl('option', {
				text: folder.length > 0 ? folder : 'Vault root',
				value: folder,
			});
		}

		selectEl.value = this.filters.folder;
		selectEl.addEventListener('change', () => {
			this.filters.folder = selectEl.value;
			this.hasSubmittedSearch = false;
		});
	}

	private renderSortFilter(containerEl: HTMLElement): void {
		const controlEl = containerEl.createDiv({ cls: 'statuspilot-control' });
		controlEl.createEl('label', { text: 'Sort' });
		const selectEl = controlEl.createEl('select');

		for (const option of SORT_OPTIONS) {
			selectEl.createEl('option', {
				text: option.label,
				value: option.value,
			});
		}

		selectEl.value = this.filters.sort;
		selectEl.addEventListener('change', () => {
			this.filters.sort = selectEl.value as DashboardSort;
			this.hasSubmittedSearch = false;
		});
	}

	private renderTable(
		containerEl: HTMLElement,
		records: StatusPilotRecord[],
	): void {
		const tableWrapEl = containerEl.createDiv({
			cls: 'statuspilot-table-wrap statuspilot-card',
		});

		if (records.length === 0) {
			tableWrapEl.createDiv({
				cls: 'statuspilot-empty',
				text: this.getEmptyStateText(),
			});
			return;
		}

		const tableEl = tableWrapEl.createEl('table', {
			cls: 'statuspilot-table',
		});
		const theadEl = tableEl.createEl('thead');
		const headerRowEl = theadEl.createEl('tr');

		for (const heading of [
			'Note title',
			'Status',
			'Priority',
			'Level',
		]) {
			headerRowEl.createEl('th', { text: heading });
		}

		const tbodyEl = tableEl.createEl('tbody');
		for (const record of records) {
			this.renderRow(tbodyEl, record);
		}
	}

	private renderRow(containerEl: HTMLElement, record: StatusPilotRecord): void {
		const rowEl = containerEl.createEl('tr');
		const titleCell = rowEl.createEl('td');
		const titleLink = titleCell.createEl('a', {
			cls: 'statuspilot-note-link',
			href: '#',
			text: record.title,
		});
		titleLink.addEventListener('click', (event) => {
			event.preventDefault();
			void this.openFile(record);
		});

		this.renderEditableCell(rowEl, record, 'status');
		this.renderEditableCell(rowEl, record, 'priority');
		this.renderEditableCell(rowEl, record, 'level');
	}

	private renderEditableCell(
		rowEl: HTMLElement,
		record: StatusPilotRecord,
		kind: MetadataKind,
	): void {
		const value = record[kind];
		const cellEl = rowEl.createEl('td');
		const editEl = cellEl.createDiv({
			cls: 'statuspilot-cell-edit',
		});

		if (!this.recordHasMetadata(record, kind)) {
			const addButton = editEl.createEl('button', {
				cls: 'statuspilot-icon-button statuspilot-action-button',
			});
			addButton.setAttr(
				'aria-label',
				`Create missing metadata for ${record.title}`,
			);
			addButton.setAttr('title', 'Create missing metadata');
			setIcon(addButton, 'list-plus');
			addButton.addEventListener('click', () => {
				void this.plugin.createMetadataForFile(record.file);
			});
			return;
		}

		this.createMetadataMenuButton(editEl, record, kind, value);
	}

	private createMetadataMenuButton(
		containerEl: HTMLElement,
		record: StatusPilotRecord,
		kind: MetadataKind,
		value: string,
	): HTMLButtonElement {
		const option = this.plugin.metadataService.getOption(kind, value);
		const buttonEl = containerEl.createEl('button', {
			cls: 'statuspilot-badge-button',
		});
		buttonEl.type = 'button';
		buttonEl.setAttr('aria-label', `Change ${kind} for ${record.title}`);
		buttonEl.setAttr('title', `Change ${kind}`);
		createBadge(buttonEl, kind, value, option);
		buttonEl.addEventListener('click', (event) => {
			this.openMetadataMenu(record, kind, value, event);
		});

		return buttonEl;
	}

	private submitSearch(): void {
		this.hasSubmittedSearch = true;
		this.submittedSearch = this.filters.search.trim();
		this.render();
	}

	private openMetadataMenu(
		record: StatusPilotRecord,
		kind: MetadataKind,
		currentValue: string,
		event: MouseEvent,
	): void {
		const menu = new Menu();

		for (const option of this.plugin.metadataService.getOptions(kind)) {
			menu.addItem((item) => {
				item
					.setTitle(formatOptionLabel(option, option.value))
					.setChecked(option.value === currentValue)
					.onClick(() => {
						void this.plugin.updateFileMetadata(record.file, {
							[kind]: option.value,
						});
					});
			});
		}

		menu.showAtMouseEvent(event);
	}

	private getFilteredRecords(): StatusPilotRecord[] {
		if (!this.shouldShowResults()) {
			return [];
		}

		return this.plugin.metadataService
			.getRecords()
			.filter((record) => this.matchesFilters(record))
			.sort((a, b) => this.compareRecords(a, b));
	}

	private shouldShowResults(): boolean {
		return this.hasSubmittedSearch;
	}

	private getEmptyStateText(): string {
		if (!this.hasSubmittedSearch) {
			return 'Enter a search or choose filters, then select Search.';
		}

		return 'No notes match the current search.';
	}

	private matchesFilters(record: StatusPilotRecord): boolean {
		if (
			this.filters.status &&
			(!record.hasStatus || record.status !== this.filters.status)
		) {
			return false;
		}

		if (
			this.filters.priority &&
			(!record.hasPriority || record.priority !== this.filters.priority)
		) {
			return false;
		}

		if (
			this.filters.level &&
			(!record.hasLevel || record.level !== this.filters.level)
		) {
			return false;
		}

		if (this.filters.folder && record.folder !== this.filters.folder) {
			return false;
		}

		return this.matchesSearch(record);
	}

	private matchesSearch(record: StatusPilotRecord): boolean {
		const query = this.submittedSearch.toLowerCase();

		if (query.length === 0) {
			return true;
		}

		const haystack = [
			record.title,
			record.path,
			record.hasStatus ? record.status : '',
			record.hasPriority ? record.priority : '',
			record.hasLevel ? record.level : '',
			record.hasStatus
				? (this.plugin.metadataService.getOption('status', record.status)?.label ??
					'')
				: '',
			record.hasPriority
				? (this.plugin.metadataService.getOption('priority', record.priority)
						?.label ?? '')
				: '',
			record.hasLevel
				? (this.plugin.metadataService.getOption('level', record.level)?.label ??
					'')
				: '',
		]
			.join(' ')
			.toLowerCase();

		return haystack.includes(query);
	}

	private compareRecords(a: StatusPilotRecord, b: StatusPilotRecord): number {
		if (this.filters.sort === 'priority-desc') {
			return (
				this.rankRecordOption(a, 'priority', 'desc') -
					this.rankRecordOption(b, 'priority', 'desc') ||
				a.title.localeCompare(b.title)
			);
		}

		if (this.filters.sort === 'priority-asc') {
			return (
				this.rankRecordOption(a, 'priority', 'asc') -
					this.rankRecordOption(b, 'priority', 'asc') ||
				a.title.localeCompare(b.title)
			);
		}

		if (this.filters.sort === 'level-asc') {
			return (
				this.rankRecordOption(a, 'level', 'asc') -
					this.rankRecordOption(b, 'level', 'asc') ||
				a.title.localeCompare(b.title)
			);
		}

		if (this.filters.sort === 'level-desc') {
			return (
				this.rankRecordOption(a, 'level', 'desc') -
					this.rankRecordOption(b, 'level', 'desc') ||
				a.title.localeCompare(b.title)
			);
		}

		if (this.filters.sort === 'alpha-asc') {
			return a.title.localeCompare(b.title);
		}

		if (this.filters.sort === 'status-asc') {
			return (
				this.rankRecordOption(a, 'status', 'asc') -
					this.rankRecordOption(b, 'status', 'asc') ||
				a.title.localeCompare(b.title)
			);
		}

		return a.title.localeCompare(b.title);
	}

	private rankRecordOption(
		record: StatusPilotRecord,
		kind: MetadataKind,
		direction: 'asc' | 'desc',
	): number {
		if (!this.recordHasMetadata(record, kind)) {
			return Number.POSITIVE_INFINITY;
		}

		return this.rankOption(kind, record[kind], direction);
	}

	private rankOption(
		kind: MetadataKind,
		value: string,
		direction: 'asc' | 'desc',
	): number {
		const order = this.plugin.metadataService.getOptionOrder(kind, value);

		if (!Number.isFinite(order)) {
			return Number.POSITIVE_INFINITY;
		}

		return direction === 'asc' ? order : -order;
	}

	private recordHasMetadata(
		record: StatusPilotRecord,
		kind: MetadataKind,
	): boolean {
		if (kind === 'status') {
			return record.hasStatus;
		}

		if (kind === 'priority') {
			return record.hasPriority;
		}

		return record.hasLevel;
	}

	private async openFile(record: StatusPilotRecord): Promise<void> {
		await this.plugin.app.workspace.getLeaf(true).openFile(record.file);
	}
}
