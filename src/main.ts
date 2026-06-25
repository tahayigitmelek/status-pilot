import { Notice, Plugin, TFile } from 'obsidian';
import { registerCommands } from './commands';
import { updateFrontmatterMetadata } from './metadata/frontmatterUpdater';
import {
	MetadataService,
	createDefaultMetadataUpdates,
	metadataUpdatesAreEmpty,
} from './metadata/metadataService';
import {
	DEFAULT_SETTINGS,
	VaultPilotSettingTab,
	normalizeSettings,
} from './settings';
import {
	DashboardView,
	VAULTPILOT_DASHBOARD_VIEW_TYPE,
} from './views/dashboardView';
import { registerNotePanel } from './views/notePanel';
import type {
	DashboardPreset,
	MetadataUpdates,
	VaultPilotSettings,
} from './types';

export default class VaultPilotPlugin extends Plugin {
	settings!: VaultPilotSettings;
	metadataService!: MetadataService;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.metadataService = new MetadataService(this.app, this.settings);
		this.registerView(
			VAULTPILOT_DASHBOARD_VIEW_TYPE,
			(leaf) => new DashboardView(leaf, this),
		);

		this.addRibbonIcon('list-checks', 'Open dashboard', () => {
			void this.openDashboard();
		});

		registerCommands(this);
		registerNotePanel(this);
		this.registerMetadataEvents();
		this.addSettingTab(new VaultPilotSettingTab(this.app, this));
		this.updateBadgeStylingClass();

		await this.metadataService.refresh();
	}

	onunload(): void {
		this.metadataService?.dispose();
		activeDocument.body.classList.remove('vaultpilot-active');
		activeDocument.body.classList.remove('vaultpilot-badges-enabled');
	}

	async loadSettings(): Promise<void> {
		this.settings = normalizeSettings(
			((await this.loadData()) as Partial<VaultPilotSettings> | null) ??
				DEFAULT_SETTINGS,
		);
	}

	async saveSettings(): Promise<void> {
		this.settings = normalizeSettings(this.settings);
		await this.saveData(this.settings);
		this.metadataService?.setSettings(this.settings);
		this.updateBadgeStylingClass();
		this.metadataService?.scheduleRefresh(0);
	}

	async openDashboard(preset: DashboardPreset = {}): Promise<void> {
		if (!this.settings.enableDashboard) {
			new Notice('Dashboard is disabled in settings.');
			return;
		}

		let leaf =
			this.app.workspace.getLeavesOfType(VAULTPILOT_DASHBOARD_VIEW_TYPE)[0] ??
			null;

		if (!leaf) {
			leaf = this.app.workspace.getRightLeaf(false);
		}

		if (!leaf) {
			new Notice('Could not open the dashboard.');
			return;
		}

		await leaf.setViewState({
			type: VAULTPILOT_DASHBOARD_VIEW_TYPE,
			active: true,
		});

		const view = leaf.view;
		if (view instanceof DashboardView) {
			view.applyPreset(preset);
		}

		await this.app.workspace.revealLeaf(leaf);
	}

	getActiveMarkdownFile(): TFile | null {
		const file = this.app.workspace.getActiveFile();

		if (file instanceof TFile && file.extension === 'md') {
			return file;
		}

		return null;
	}

	async updateActiveFileMetadata(updates: MetadataUpdates): Promise<void> {
		const file = this.getActiveMarkdownFile();

		if (!file) {
			new Notice('Open a Markdown note first.');
			return;
		}

		await this.updateFileMetadata(file, updates);
	}

	async updateFileMetadata(
		file: TFile,
		updates: MetadataUpdates,
	): Promise<void> {
		if (metadataUpdatesAreEmpty(updates)) {
			return;
		}

		try {
			await updateFrontmatterMetadata(this.app, file, updates);
			this.metadataService.applyLocalUpdate(file, updates);
			this.metadataService.scheduleRefresh();
		} catch (error) {
			console.error('VaultPilot failed to update metadata', error);
			new Notice('Could not update note metadata.');
		}
	}

	async createMetadataForFile(file: TFile): Promise<void> {
		const updates = createDefaultMetadataUpdates(
			this.settings,
			this.metadataService.getFileMetadata(file),
		);

		if (metadataUpdatesAreEmpty(updates)) {
			new Notice('Metadata already exists.');
			return;
		}

		await this.updateFileMetadata(file, updates);
		new Notice('Metadata created.');
	}

	getReadyStatusValue(): string {
		return this.findStatusValue('ready-to-start');
	}

	getInProgressStatusValue(): string {
		return this.findStatusValue('in-progress');
	}

	getCompletedStatusValue(): string {
		return this.findStatusValue('completed');
	}

	getCriticalPriorityValue(): string {
		const configured = this.settings.priorityOptions.find(
			(option) => option.value === 'P3',
		);

		return (
			configured?.value ??
			this.settings.priorityOptions[this.settings.priorityOptions.length - 1]
				?.value ??
			this.settings.defaultPriority
		);
	}

	private registerMetadataEvents(): void {
		const scheduleRefresh = () => {
			this.metadataService.scheduleRefresh();
		};

		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				if (file.extension === 'md') {
					scheduleRefresh();
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					scheduleRefresh();
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					scheduleRefresh();
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile) {
					scheduleRefresh();
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on('rename', (file) => {
				if (file instanceof TFile) {
					scheduleRefresh();
				}
			}),
		);
	}

	private findStatusValue(defaultValue: string): string {
		const configured = this.settings.statusOptions.find(
			(option) => option.value === defaultValue,
		);

		return configured?.value ?? this.settings.defaultStatus;
	}

	private updateBadgeStylingClass(): void {
		activeDocument.body.classList.add('vaultpilot-active');
		activeDocument.body.classList.toggle(
			'vaultpilot-badges-enabled',
			this.settings.enableBadgeStyling,
		);
	}
}
