import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type VaultPilotPlugin from './main';
import type {
	MetadataKind,
	MetadataOption,
	NotePanelPlacement,
	VaultPilotSettings,
} from './types';

const OPTION_KEYS: Record<
	MetadataKind,
	'statusOptions' | 'priorityOptions' | 'levelOptions'
> = {
	status: 'statusOptions',
	priority: 'priorityOptions',
	level: 'levelOptions',
};

const DEFAULT_KEYS: Record<
	MetadataKind,
	'defaultStatus' | 'defaultPriority' | 'defaultLevel'
> = {
	status: 'defaultStatus',
	priority: 'defaultPriority',
	level: 'defaultLevel',
};

const FALLBACK_OPTION: MetadataOption = {
	id: 'fallback',
	value: 'not-set',
	label: 'Not set',
	color: '#8a8f98',
	icon: '○',
};

const NOTE_PANEL_PLACEMENTS: Record<NotePanelPlacement, string> = {
	top: 'Top of note',
	'sticky-corner': 'Sticky top right',
};

export const DEFAULT_STATUS_OPTIONS: MetadataOption[] = [
	{
		id: 'status-not-set',
		value: 'not-set',
		label: 'No status selected',
		color: '#8a8f98',
		icon: '○',
	},
	{
		id: 'status-ready',
		value: 'ready-to-start',
		label: 'Ready to start',
		color: '#3f8cff',
		icon: '▶',
	},
	{
		id: 'status-in-progress',
		value: 'in-progress',
		label: 'In progress',
		color: '#d99b28',
		icon: '◆',
	},
	{
		id: 'status-completed',
		value: 'completed',
		label: 'Completed',
		color: '#2f9e63',
		icon: '✓',
	},
];

export const DEFAULT_PRIORITY_OPTIONS: MetadataOption[] = [
	{
		id: 'priority-not-set',
		value: 'not-set',
		label: 'No priority selected',
		color: '#8a8f98',
		icon: '○',
	},
	{
		id: 'priority-p0',
		value: 'P0',
		label: 'Low',
		color: '#5f9f74',
		icon: 'P0',
	},
	{
		id: 'priority-p1',
		value: 'P1',
		label: 'Medium',
		color: '#438adf',
		icon: 'P1',
	},
	{
		id: 'priority-p2',
		value: 'P2',
		label: 'High',
		color: '#d88928',
		icon: 'P2',
	},
	{
		id: 'priority-p3',
		value: 'P3',
		label: 'Critical',
		color: '#d14b54',
		icon: 'P3',
	},
];

export const DEFAULT_LEVEL_OPTIONS: MetadataOption[] = [
	{
		id: 'level-not-set',
		value: 'not-set',
		label: 'No level selected',
		color: '#8a8f98',
		icon: '○',
	},
	{
		id: 'level-l1',
		value: 'L1',
		label: 'Beginner',
		color: '#36a269',
		icon: '●',
	},
	{
		id: 'level-l2',
		value: 'L2',
		label: 'Intermediate',
		color: '#3579d7',
		icon: '●',
	},
	{
		id: 'level-l3',
		value: 'L3',
		label: 'Advanced',
		color: '#d88928',
		icon: '●',
	},
	{
		id: 'level-l4',
		value: 'L4',
		label: 'Expert',
		color: '#cf4b4b',
		icon: '●',
	},
	{
		id: 'level-l5',
		value: 'L5',
		label: 'Master',
		color: '#8c5bd6',
		icon: '●',
	},
];

export const DEFAULT_SETTINGS: VaultPilotSettings = {
	enableDashboard: true,
	enableNotePanel: true,
	notePanelPlacement: 'sticky-corner',
	enableBadgeStyling: true,
	statusOptions: cloneOptions(DEFAULT_STATUS_OPTIONS),
	priorityOptions: cloneOptions(DEFAULT_PRIORITY_OPTIONS),
	levelOptions: cloneOptions(DEFAULT_LEVEL_OPTIONS),
	defaultStatus: 'not-set',
	defaultPriority: 'not-set',
	defaultLevel: 'not-set',
	includeFolders: [],
	excludeFolders: [],
	ignoreTemplatesFolder: true,
	templatesFolder: 'Templates',
};

export function normalizeSettings(
	data: Partial<VaultPilotSettings> | null | undefined,
): VaultPilotSettings {
	const statusOptions = normalizeOptions(
		data?.statusOptions,
		DEFAULT_STATUS_OPTIONS,
	);
	const priorityOptions = normalizeOptions(
		data?.priorityOptions,
		DEFAULT_PRIORITY_OPTIONS,
	);
	const levelOptions = normalizeOptions(data?.levelOptions, DEFAULT_LEVEL_OPTIONS);

	return {
		enableDashboard: data?.enableDashboard ?? DEFAULT_SETTINGS.enableDashboard,
		enableNotePanel: data?.enableNotePanel ?? DEFAULT_SETTINGS.enableNotePanel,
		notePanelPlacement: normalizeNotePanelPlacement(data?.notePanelPlacement),
		enableBadgeStyling:
			data?.enableBadgeStyling ?? DEFAULT_SETTINGS.enableBadgeStyling,
		statusOptions,
		priorityOptions,
		levelOptions,
		defaultStatus: ensureOptionValue(
			data?.defaultStatus,
			statusOptions,
			DEFAULT_SETTINGS.defaultStatus,
		),
		defaultPriority: ensureOptionValue(
			data?.defaultPriority,
			priorityOptions,
			DEFAULT_SETTINGS.defaultPriority,
		),
		defaultLevel: ensureOptionValue(
			data?.defaultLevel,
			levelOptions,
			DEFAULT_SETTINGS.defaultLevel,
		),
		includeFolders: normalizeFolderList(data?.includeFolders),
		excludeFolders: normalizeFolderList(data?.excludeFolders),
		ignoreTemplatesFolder:
			data?.ignoreTemplatesFolder ?? DEFAULT_SETTINGS.ignoreTemplatesFolder,
		templatesFolder:
			typeof data?.templatesFolder === 'string' &&
			data.templatesFolder.trim().length > 0
				? data.templatesFolder.trim()
				: DEFAULT_SETTINGS.templatesFolder,
	};
}

export function getDefaultOptions(kind: MetadataKind): MetadataOption[] {
	if (kind === 'status') {
		return cloneOptions(DEFAULT_STATUS_OPTIONS);
	}

	if (kind === 'priority') {
		return cloneOptions(DEFAULT_PRIORITY_OPTIONS);
	}

	return cloneOptions(DEFAULT_LEVEL_OPTIONS);
}

function cloneOptions(options: MetadataOption[]): MetadataOption[] {
	return options.map((option) => ({ ...option }));
}

function normalizeOptions(
	options: MetadataOption[] | undefined,
	fallback: MetadataOption[],
): MetadataOption[] {
	const source = Array.isArray(options) && options.length > 0 ? options : fallback;
	const normalized = source
		.map((option, index) => normalizeOption(option, index, fallback))
		.filter((option) => option.value.length > 0);

	if (normalized.length === 0) {
		return cloneOptions(fallback);
	}

	return normalized;
}

function normalizeOption(
	option: MetadataOption,
	index: number,
	fallback: MetadataOption[],
): MetadataOption {
	const fallbackOption = fallback[index] ?? fallback[0] ?? FALLBACK_OPTION;

	return {
		id:
			typeof option.id === 'string' && option.id.trim().length > 0
				? option.id
				: `option-${Date.now()}-${index}`,
		value:
			typeof option.value === 'string' ? option.value.trim() : fallbackOption.value,
		label:
			typeof option.label === 'string' && option.label.trim().length > 0
				? option.label.trim()
				: fallbackOption.label,
		color:
			typeof option.color === 'string' && option.color.trim().length > 0
				? option.color.trim()
				: fallbackOption.color,
		icon:
			typeof option.icon === 'string' && option.icon.trim().length > 0
				? option.icon.trim()
				: fallbackOption.icon,
	};
}

function ensureOptionValue(
	value: string | undefined,
	options: MetadataOption[],
	fallback: string,
): string {
	if (value && options.some((option) => option.value === value)) {
		return value;
	}

	const fallbackOption = options.find((option) => option.value === fallback);
	return fallbackOption?.value ?? options[0]?.value ?? 'not-set';
}

function normalizeFolderList(value: string[] | undefined): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.map(cleanFolder).filter((folder) => folder.length > 0);
}

function normalizeNotePanelPlacement(value: unknown): NotePanelPlacement {
	return value === 'top' || value === 'sticky-corner'
		? value
		: DEFAULT_SETTINGS.notePanelPlacement;
}

function cleanFolder(folder: string): string {
	return folder.trim().replace(/^\/+|\/+$/g, '');
}

export class VaultPilotSettingTab extends PluginSettingTab {
	private readonly plugin: VaultPilotPlugin;

	constructor(app: App, plugin: VaultPilotPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.renderSettings();
	}

	private renderSettings(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('vaultpilot-settings');

		this.renderFeatureSettings(containerEl);
		this.renderDefaultSettings(containerEl);
		this.renderFolderSettings(containerEl);
		this.renderOptionEditor(containerEl, 'status', 'Status values');
		this.renderOptionEditor(containerEl, 'priority', 'Priority values');
		this.renderOptionEditor(containerEl, 'level', 'Level values');
	}

	private renderFeatureSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName('Features').setHeading();

		new Setting(containerEl)
			.setName('Enable dashboard')
			.setDesc('Allow commands and the ribbon icon to open the dashboard view.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableDashboard)
					.onChange(async (value) => {
						this.plugin.settings.enableDashboard = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Show note header panel')
			.setDesc('Show quick metadata controls at the top of rendered Markdown notes.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableNotePanel)
					.onChange(async (value) => {
						this.plugin.settings.enableNotePanel = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Note header panel position')
			.setDesc(
				'Keep note controls at the top of the note or pin them to the top right while scrolling.',
			)
			.addDropdown((dropdown) => {
				for (const [value, label] of Object.entries(NOTE_PANEL_PLACEMENTS)) {
					dropdown.addOption(value, label);
				}

				dropdown
					.setValue(this.plugin.settings.notePanelPlacement)
					.onChange(async (value) => {
						this.plugin.settings.notePanelPlacement =
							normalizeNotePanelPlacement(value);
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Enable badge styling')
			.setDesc('Use configured colors and icons for metadata badges.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableBadgeStyling)
					.onChange(async (value) => {
						this.plugin.settings.enableBadgeStyling = value;
						await this.plugin.saveSettings();
					}),
			);
	}

	private renderDefaultSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName('Defaults').setHeading();

		this.renderDefaultDropdown(containerEl, 'status', 'Default status');
		this.renderDefaultDropdown(containerEl, 'priority', 'Default priority');
		this.renderDefaultDropdown(containerEl, 'level', 'Default level');
	}

	private renderDefaultDropdown(
		containerEl: HTMLElement,
		kind: MetadataKind,
		name: string,
	): void {
		const defaultKey = DEFAULT_KEYS[kind];

		new Setting(containerEl)
			.setName(name)
			.addDropdown((dropdown) => {
				for (const option of this.getOptions(kind)) {
					dropdown.addOption(option.value, this.formatOptionLabel(option));
				}

				dropdown
					.setValue(this.plugin.settings[defaultKey])
					.onChange(async (value) => {
						this.plugin.settings[defaultKey] = value;
						await this.plugin.saveSettings();
						this.renderSettings();
					});
			});
	}

	private renderFolderSettings(containerEl: HTMLElement): void {
		new Setting(containerEl).setName('Folders').setHeading();

		new Setting(containerEl)
			.setName('Include folders')
			.setDesc('Limit the dashboard to these folders. Leave empty to include the vault.')
			.addTextArea((text) =>
				text
					.setPlaceholder('Projects\nareas/writing')
					.setValue(this.plugin.settings.includeFolders.join('\n'))
					.onChange(async (value) => {
						this.plugin.settings.includeFolders = splitFolders(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Exclude folders')
			.setDesc('Hide notes from these folders.')
			.addTextArea((text) =>
				text
					.setPlaceholder('Archive\ntemplates')
					.setValue(this.plugin.settings.excludeFolders.join('\n'))
					.onChange(async (value) => {
						this.plugin.settings.excludeFolders = splitFolders(value);
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Ignore templates folder')
			.setDesc('Hide notes from the configured templates folder.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.ignoreTemplatesFolder)
					.onChange(async (value) => {
						this.plugin.settings.ignoreTemplatesFolder = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Templates folder')
			.addText((text) =>
				text
					.setPlaceholder('Templates')
					.setValue(this.plugin.settings.templatesFolder)
					.onChange(async (value) => {
						this.plugin.settings.templatesFolder = cleanFolder(value);
						await this.plugin.saveSettings();
					}),
			);
	}

	private renderOptionEditor(
		containerEl: HTMLElement,
		kind: MetadataKind,
		heading: string,
	): void {
		new Setting(containerEl)
			.setName(heading)
			.setHeading()
			.addButton((button) =>
				button
					.setButtonText('Add value')
					.setCta()
					.onClick(async () => {
						this.getOptions(kind).push(this.createOption(kind));
						await this.plugin.saveSettings();
						this.renderSettings();
					}),
			)
			.addButton((button) =>
				button.setButtonText('Reset').onClick(async () => {
					this.plugin.settings[OPTION_KEYS[kind]] = getDefaultOptions(kind);
					this.plugin.settings[DEFAULT_KEYS[kind]] =
						DEFAULT_SETTINGS[DEFAULT_KEYS[kind]];
					await this.plugin.saveSettings();
					new Notice(`${heading} reset.`);
					this.renderSettings();
				}),
			);

		const listEl = containerEl.createDiv({
			cls: 'vaultpilot-settings-list',
		});
		const options = this.getOptions(kind);

		options.forEach((option, index) => {
			this.renderOptionRow(listEl, kind, option, index);
		});
	}

	private renderOptionRow(
		containerEl: HTMLElement,
		kind: MetadataKind,
		option: MetadataOption,
		index: number,
	): void {
		const options = this.getOptions(kind);
		const rowEl = containerEl.createDiv({ cls: 'vaultpilot-settings-option' });
		const title = option.label.length > 0 ? option.label : option.value;

		new Setting(rowEl)
			.setName(title)
			.setDesc(option.value)
			.addText((text) =>
				text
					.setPlaceholder('Value')
					.setValue(option.value)
					.onChange(async (value) => {
						const oldValue = option.value;
						option.value = value.trim();
						this.updateDefaultAfterValueChange(kind, oldValue, option.value);
						await this.plugin.saveSettings();
					}),
			)
			.addText((text) =>
				text
					.setPlaceholder('Label')
					.setValue(option.label)
					.onChange(async (value) => {
						option.label = value.trim();
						await this.plugin.saveSettings();
					}),
			)
			.addText((text) =>
				text
					.setPlaceholder('Icon')
					.setValue(option.icon)
					.onChange(async (value) => {
						option.icon = value.trim();
						await this.plugin.saveSettings();
					}),
			)
			.addColorPicker((color) =>
				color.setValue(option.color).onChange(async (value) => {
					option.color = value;
					await this.plugin.saveSettings();
				}),
			)
			.addButton((button) =>
				button
					.setIcon('arrow-up')
					.setTooltip('Move up')
					.setDisabled(index === 0)
					.onClick(async () => {
						this.swapOptions(options, index, index - 1);
						await this.plugin.saveSettings();
						this.renderSettings();
					}),
			)
			.addButton((button) =>
				button
					.setIcon('arrow-down')
					.setTooltip('Move down')
					.setDisabled(index === options.length - 1)
					.onClick(async () => {
						this.swapOptions(options, index, index + 1);
						await this.plugin.saveSettings();
						this.renderSettings();
					}),
			)
			.addButton((button) =>
				button
					.setIcon('trash-2')
					.setTooltip('Remove')
					.setDisabled(options.length <= 1)
					.onClick(async () => {
						options.splice(index, 1);
						this.ensureDefaultAfterRemoval(kind);
						await this.plugin.saveSettings();
						this.renderSettings();
					}),
			);
	}

	private getOptions(kind: MetadataKind): MetadataOption[] {
		return this.plugin.settings[OPTION_KEYS[kind]];
	}

	private createOption(kind: MetadataKind): MetadataOption {
		const value = this.createUniqueValue(kind);
		return {
			id: `${kind}-${Date.now()}`,
			value,
			label: value,
			color: '#8a8f98',
			icon: kind === 'priority' ? value.toUpperCase() : '•',
		};
	}

	private createUniqueValue(kind: MetadataKind): string {
		const values = new Set(this.getOptions(kind).map((option) => option.value));
		let index = this.getOptions(kind).length + 1;
		let value = `new-${kind}`;

		while (values.has(value)) {
			value = `new-${kind}-${index}`;
			index += 1;
		}

		return value;
	}

	private updateDefaultAfterValueChange(
		kind: MetadataKind,
		oldValue: string,
		newValue: string,
	): void {
		const defaultKey = DEFAULT_KEYS[kind];
		if (this.plugin.settings[defaultKey] === oldValue && newValue.length > 0) {
			this.plugin.settings[defaultKey] = newValue;
		}
	}

	private ensureDefaultAfterRemoval(kind: MetadataKind): void {
		const defaultKey = DEFAULT_KEYS[kind];
		const options = this.getOptions(kind);

		if (
			!options.some((option) => option.value === this.plugin.settings[defaultKey])
		) {
			this.plugin.settings[defaultKey] =
				options[0]?.value ?? DEFAULT_SETTINGS[defaultKey];
		}
	}

	private swapOptions(
		options: MetadataOption[],
		fromIndex: number,
		toIndex: number,
	): void {
		const from = options[fromIndex];
		const to = options[toIndex];

		if (!from || !to) {
			return;
		}

		options[fromIndex] = to;
		options[toIndex] = from;
	}

	private formatOptionLabel(option: MetadataOption): string {
		return `${option.icon} ${option.label}`;
	}
}

function splitFolders(value: string): string[] {
	return value
		.split(/\r?\n/)
		.map(cleanFolder)
		.filter((folder) => folder.length > 0);
}
