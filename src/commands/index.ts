import { Modal, Notice, TFile } from 'obsidian';
import type VaultPilotPlugin from '../main';
import { createBadge } from '../ui/components';
import type { MetadataKind, MetadataOption, MetadataUpdates } from '../types';

export function registerCommands(plugin: VaultPilotPlugin): void {
	plugin.addCommand({
		id: 'open-vaultpilot-dashboard',
		name: 'Open dashboard',
		callback: () => {
			void plugin.openDashboard();
		},
	});

	registerPickerCommand(plugin, 'status', 'set-status', 'Set status');
	registerPickerCommand(plugin, 'priority', 'set-priority', 'Set priority');
	registerPickerCommand(plugin, 'level', 'set-level', 'Set level');

	plugin.addCommand({
		id: 'mark-current-note-in-progress',
		name: 'Mark current note as in progress',
		callback: () => {
			void plugin.updateActiveFileMetadata({
				status: plugin.getInProgressStatusValue(),
			});
		},
	});

	plugin.addCommand({
		id: 'mark-current-note-completed',
		name: 'Mark current note as completed',
		callback: () => {
			void plugin.updateActiveFileMetadata({
				status: plugin.getCompletedStatusValue(),
			});
		},
	});

	plugin.addCommand({
		id: 'create-metadata-current-note',
		name: 'Create metadata for current note',
		callback: () => {
			const file = plugin.getActiveMarkdownFile();
			if (!file) {
				new Notice('Open a Markdown note first.');
				return;
			}

			void plugin.createMetadataForFile(file);
		},
	});

	plugin.addCommand({
		id: 'show-ready-to-start-notes',
		name: 'Show ready-to-start notes',
		callback: () => {
			void plugin.openDashboard({ focus: 'ready' });
		},
	});

	plugin.addCommand({
		id: 'show-in-progress-notes',
		name: 'Show in-progress notes',
		callback: () => {
			void plugin.openDashboard({ focus: 'in-progress' });
		},
	});

	plugin.addCommand({
		id: 'show-critical-notes',
		name: 'Show critical notes',
		callback: () => {
			void plugin.openDashboard({ focus: 'critical' });
		},
	});
}

function registerPickerCommand(
	plugin: VaultPilotPlugin,
	kind: MetadataKind,
	id: string,
	name: string,
): void {
	plugin.addCommand({
		id,
		name,
		callback: () => {
			const file = plugin.getActiveMarkdownFile();
			if (!file) {
				new Notice('Open a Markdown note first.');
				return;
			}

			new MetadataPickerModal(plugin, file, kind).open();
		},
	});
}

class MetadataPickerModal extends Modal {
	private readonly plugin: VaultPilotPlugin;
	private readonly file: TFile;
	private readonly kind: MetadataKind;

	constructor(plugin: VaultPilotPlugin, file: TFile, kind: MetadataKind) {
		super(plugin.app);
		this.plugin = plugin;
		this.file = file;
		this.kind = kind;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vaultpilot-picker-modal');
		contentEl.createEl('h2', { text: this.getTitle() });

		const optionListEl = contentEl.createDiv({ cls: 'vaultpilot-picker-list' });
		for (const option of this.plugin.metadataService.getOptions(this.kind)) {
			this.renderOptionButton(optionListEl, option);
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderOptionButton(
		containerEl: HTMLElement,
		option: MetadataOption,
	): void {
		const buttonEl = containerEl.createEl('button', {
			cls: 'vaultpilot-picker-option',
		});
		createBadge(buttonEl, this.kind, option.value, option);
		buttonEl.createSpan({ text: option.label });
		buttonEl.addEventListener('click', () => {
			this.close();
			void this.plugin.updateFileMetadata(
				this.file,
				createUpdate(this.kind, option.value),
			);
		});
	}

	private getTitle(): string {
		if (this.kind === 'status') {
			return 'Set status';
		}

		if (this.kind === 'priority') {
			return 'Set priority';
		}

		return 'Set level';
	}
}

function createUpdate(kind: MetadataKind, value: string): MetadataUpdates {
	return { [kind]: value };
}
