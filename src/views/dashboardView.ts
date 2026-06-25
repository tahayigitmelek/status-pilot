import { ItemView, Menu, setIcon, type WorkspaceLeaf } from 'obsidian';
import type VaultPilotPlugin from '../main';
import { createBadge, formatOptionLabel } from '../ui/components';
import {
	type DashboardFilters,
	type DashboardFocus,
	type DashboardPreset,
	type DashboardSort,
	type MetadataKind,
	type VaultPilotRecord,
} from '../types';

export const VAULTPILOT_DASHBOARD_VIEW_TYPE = 'vaultpilot-dashboard-view';

const DEFAULT_FILTERS: DashboardFilters = {
	search: '',
	status: '',
	priority: '',
	level: '',
	folder: '',
	focus: 'all',
	sort: 'priority-desc',
};

const FOCUS_OPTIONS: Array<{ value: DashboardFocus; label: string }> = [
	{ value: 'all', label: 'All notes' },
	{ value: 'not-completed', label: 'Not completed' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'ready', label: 'Ready to start' },
	{ value: 'in-progress', label: 'In progress' },
	{ value: 'critical', label: 'Critical' },
];

const SORT_OPTIONS: Array<{ value: DashboardSort; label: string }> = [
	{ value: 'priority-desc', label: 'Highest priority first' },
	{ value: 'priority-asc', label: 'Lowest priority first' },
	{ value: 'level-asc', label: 'Level ascending' },
	{ value: 'level-desc', label: 'Level descending' },
	{ value: 'alpha-asc', label: 'Alphabetical' },
	{ value: 'status-asc', label: 'Status order' },
];

export class DashboardView extends ItemView {
	private readonly plugin: VaultPilotPlugin;
	private filters: DashboardFilters = { ...DEFAULT_FILTERS };
	private hasSubmittedSearch = false;
	private submittedSearch = '';
	private unsubscribe: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: VaultPilotPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VAULTPILOT_DASHBOARD_VIEW_TYPE;
	}

	getDisplayText(): string {
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		return 'VaultPilot dashboard';
	}

	getIcon(): string {
		return 'list-checks';
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
		contentEl.addClass('vaultpilot-dashboard');

		const headerEl = contentEl.createDiv({ cls: 'vaultpilot-dashboard-header' });
		headerEl.createEl('h2', { text: 'Dashboard' });

		const records = this.getFilteredRecords();
		const totalRecords = this.plugin.metadataService.getRecords().length;
		const summaryText = this.hasSubmittedSearch
			? `${records.length} of ${totalRecords} notes`
			: `${totalRecords} searchable notes`;
		headerEl.createDiv({
			cls: 'vaultpilot-dashboard-summary',
			text: summaryText,
		});

		this.renderToolbar(contentEl);
		this.renderTable(contentEl, records);
	}

	private renderToolbar(containerEl: HTMLElement): void {
		const toolbarEl = containerEl.createDiv({ cls: 'vaultpilot-toolbar' });

		const searchEl = toolbarEl.createDiv({ cls: 'vaultpilot-control wide' });
		searchEl.createEl('label', { text: 'Search' });
		const inputEl = searchEl.createEl('input', {
			cls: 'vaultpilot-search',
		});
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

		const searchButton = toolbarEl.createEl('button', {
			cls: 'vaultpilot-search-button',
		});
		searchButton.type = 'button';
		searchButton.setAttr('aria-label', 'Search notes');
		searchButton.setAttr('title', 'Search notes');
		setIcon(searchButton, 'search');
		searchButton.createSpan({ text: 'Search' });
		searchButton.addEventListener('click', () => {
			this.submitSearch();
		});

		this.renderValueFilter(toolbarEl, 'status', 'Status');
		this.renderValueFilter(toolbarEl, 'priority', 'Priority');
		this.renderValueFilter(toolbarEl, 'level', 'Level');
		this.renderFolderFilter(toolbarEl);
		this.renderFocusFilter(toolbarEl);
		this.renderSortFilter(toolbarEl);

		const clearButton = toolbarEl.createEl('button', {
			cls: 'vaultpilot-icon-button',
		});
		clearButton.setAttr('aria-label', 'Clear filters');
		clearButton.setAttr('title', 'Clear filters');
		setIcon(clearButton, 'x');
		clearButton.addEventListener('click', () => {
			this.filters = { ...DEFAULT_FILTERS };
			this.hasSubmittedSearch = false;
			this.submittedSearch = '';
			this.render();
		});
	}

	private renderValueFilter(
		containerEl: HTMLElement,
		kind: MetadataKind,
		label: string,
	): void {
		const controlEl = containerEl.createDiv({ cls: 'vaultpilot-control' });
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
		const controlEl = containerEl.createDiv({ cls: 'vaultpilot-control' });
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

	private renderFocusFilter(containerEl: HTMLElement): void {
		const controlEl = containerEl.createDiv({ cls: 'vaultpilot-control' });
		controlEl.createEl('label', { text: 'Focus' });
		const selectEl = controlEl.createEl('select');

		for (const option of FOCUS_OPTIONS) {
			selectEl.createEl('option', {
				text: option.label,
				value: option.value,
			});
		}

		selectEl.value = this.filters.focus;
		selectEl.addEventListener('change', () => {
			this.filters.focus = selectEl.value as DashboardFocus;
			this.hasSubmittedSearch = false;
		});
	}

	private renderSortFilter(containerEl: HTMLElement): void {
		const controlEl = containerEl.createDiv({ cls: 'vaultpilot-control' });
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
		records: VaultPilotRecord[],
	): void {
		const tableWrapEl = containerEl.createDiv({
			cls: 'vaultpilot-table-wrap vaultpilot-card',
		});

		if (records.length === 0) {
			tableWrapEl.createDiv({
				cls: 'vaultpilot-empty',
				text: this.getEmptyStateText(),
			});
			return;
		}

		const tableEl = tableWrapEl.createEl('table', {
			cls: 'vaultpilot-table',
		});
		const theadEl = tableEl.createEl('thead');
		const headerRowEl = theadEl.createEl('tr');

		for (const heading of [
			'Note title',
			'Status',
			'Priority',
			'Level',
			'Quick actions',
		]) {
			headerRowEl.createEl('th', { text: heading });
		}

		const tbodyEl = tableEl.createEl('tbody');
		for (const record of records) {
			this.renderRow(tbodyEl, record);
		}
	}

	private renderRow(containerEl: HTMLElement, record: VaultPilotRecord): void {
		const rowEl = containerEl.createEl('tr');
		const titleCell = rowEl.createEl('td');
		const titleButton = titleCell.createEl('button', {
			cls: 'vaultpilot-link-button',
			text: record.title,
		});
		titleButton.addEventListener('click', () => {
			void this.openFile(record);
		});

		this.renderEditableCell(rowEl, record, 'status');
		this.renderEditableCell(rowEl, record, 'priority');
		this.renderEditableCell(rowEl, record, 'level');

		const actionsCell = rowEl.createEl('td', {
			cls: 'vaultpilot-actions-cell',
		});
		const openButton = actionsCell.createEl('button', {
			cls: 'vaultpilot-icon-button vaultpilot-action-button',
		});
		openButton.setAttr('aria-label', `Open ${record.title}`);
		openButton.setAttr('title', 'Open note');
		setIcon(openButton, 'file-text');
		openButton.addEventListener('click', () => {
			void this.openFile(record);
		});

		const fillButton = actionsCell.createEl('button', {
			cls: 'vaultpilot-icon-button vaultpilot-action-button',
		});
		fillButton.setAttr('aria-label', `Create missing metadata for ${record.title}`);
		fillButton.setAttr('title', 'Create missing metadata');
		setIcon(fillButton, 'list-plus');
		fillButton.addEventListener('click', () => {
			void this.plugin.createMetadataForFile(record.file);
		});
	}

	private renderEditableCell(
		rowEl: HTMLElement,
		record: VaultPilotRecord,
		kind: MetadataKind,
	): void {
		const value = record[kind];
		const cellEl = rowEl.createEl('td');
		const editEl = cellEl.createDiv({
			cls: 'vaultpilot-cell-edit',
		});
		this.createMetadataMenuButton(editEl, record, kind, value);
	}

	private createMetadataMenuButton(
		containerEl: HTMLElement,
		record: VaultPilotRecord,
		kind: MetadataKind,
		value: string,
	): HTMLButtonElement {
		const option = this.plugin.metadataService.getOption(kind, value);
		const buttonEl = containerEl.createEl('button', {
			cls: 'vaultpilot-badge-button',
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
		record: VaultPilotRecord,
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

	private getFilteredRecords(): VaultPilotRecord[] {
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

	private matchesFilters(record: VaultPilotRecord): boolean {
		if (this.filters.status && record.status !== this.filters.status) {
			return false;
		}

		if (this.filters.priority && record.priority !== this.filters.priority) {
			return false;
		}

		if (this.filters.level && record.level !== this.filters.level) {
			return false;
		}

		if (this.filters.folder && record.folder !== this.filters.folder) {
			return false;
		}

		if (!this.matchesFocus(record)) {
			return false;
		}

		return this.matchesSearch(record);
	}

	private matchesFocus(record: VaultPilotRecord): boolean {
		if (this.filters.focus === 'all') {
			return true;
		}

		if (this.filters.focus === 'completed') {
			return record.status === this.plugin.getCompletedStatusValue();
		}

		if (this.filters.focus === 'not-completed') {
			return record.status !== this.plugin.getCompletedStatusValue();
		}

		if (this.filters.focus === 'ready') {
			return record.status === this.plugin.getReadyStatusValue();
		}

		if (this.filters.focus === 'in-progress') {
			return record.status === this.plugin.getInProgressStatusValue();
		}

		return record.priority === this.plugin.getCriticalPriorityValue();
	}

	private matchesSearch(record: VaultPilotRecord): boolean {
		const query = this.submittedSearch.toLowerCase();

		if (query.length === 0) {
			return true;
		}

		const haystack = [
			record.title,
			record.path,
			record.status,
			record.priority,
			record.level,
			this.plugin.metadataService.getOption('status', record.status)?.label ?? '',
			this.plugin.metadataService.getOption('priority', record.priority)?.label ??
				'',
			this.plugin.metadataService.getOption('level', record.level)?.label ?? '',
		]
			.join(' ')
			.toLowerCase();

		return haystack.includes(query);
	}

	private compareRecords(a: VaultPilotRecord, b: VaultPilotRecord): number {
		if (this.filters.sort === 'priority-desc') {
			return (
				this.rankOption('priority', a.priority, 'desc') -
					this.rankOption('priority', b.priority, 'desc') ||
				a.title.localeCompare(b.title)
			);
		}

		if (this.filters.sort === 'priority-asc') {
			return (
				this.rankOption('priority', a.priority, 'asc') -
					this.rankOption('priority', b.priority, 'asc') ||
				a.title.localeCompare(b.title)
			);
		}

		if (this.filters.sort === 'level-asc') {
			return (
				this.rankOption('level', a.level, 'asc') -
					this.rankOption('level', b.level, 'asc') ||
				a.title.localeCompare(b.title)
			);
		}

		if (this.filters.sort === 'level-desc') {
			return (
				this.rankOption('level', a.level, 'desc') -
					this.rankOption('level', b.level, 'desc') ||
				a.title.localeCompare(b.title)
			);
		}

		if (this.filters.sort === 'alpha-asc') {
			return a.title.localeCompare(b.title);
		}

		if (this.filters.sort === 'status-asc') {
			return (
				this.rankOption('status', a.status, 'asc') -
					this.rankOption('status', b.status, 'asc') ||
				a.title.localeCompare(b.title)
			);
		}

		return a.title.localeCompare(b.title);
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

	private async openFile(record: VaultPilotRecord): Promise<void> {
		await this.plugin.app.workspace.getLeaf(true).openFile(record.file);
	}
}
