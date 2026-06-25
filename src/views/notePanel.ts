import { MarkdownView, Menu, TFile } from 'obsidian';
import type VaultPilotPlugin from '../main';
import { createBadge, formatOptionLabel } from '../ui/components';
import type { MetadataKind, MetadataOption } from '../types';

const INLINE_PANEL_CLASS = 'vaultpilot-inline-note-panel';
const HIDDEN_PROPERTIES_CLASS = 'vaultpilot-hidden-properties-container';
const VAULTPILOT_PROPERTY_KEYS = new Set(['status', 'priority', 'level']);

export function registerNotePanel(plugin: VaultPilotPlugin): void {
	let refreshTimer: number | null = null;
	const scheduleRefresh = () => {
		if (refreshTimer !== null) {
			window.clearTimeout(refreshTimer);
		}

		refreshTimer = window.setTimeout(() => {
			refreshTimer = null;
			refreshInlineNotePanels(plugin);
		}, 50);
	};

	const unsubscribeMetadata = plugin.metadataService.onChange(scheduleRefresh);
	plugin.register(unsubscribeMetadata);

	plugin.registerEvent(
		plugin.app.workspace.on('active-leaf-change', scheduleRefresh),
	);
	plugin.registerEvent(plugin.app.workspace.on('file-open', scheduleRefresh));
	plugin.registerEvent(plugin.app.workspace.on('layout-change', scheduleRefresh));

	plugin.register(() => {
		if (refreshTimer !== null) {
			window.clearTimeout(refreshTimer);
		}
		removeInlineNotePanels();
	});

	scheduleRefresh();
}

function refreshInlineNotePanels(plugin: VaultPilotPlugin): void {
	if (!plugin.settings.enableNotePanel) {
		removeInlineNotePanels();
		return;
	}

	const seenPanels = new Set<HTMLElement>();
	const leaves = plugin.app.workspace.getLeavesOfType('markdown');

	for (const leaf of leaves) {
		const view = leaf.view;
		if (!(view instanceof MarkdownView)) {
			continue;
		}

		const file = view.file;
		if (!(file instanceof TFile) || file.extension !== 'md') {
			removeInlinePanel(view.contentEl);
			continue;
		}

		const panelEl = ensureInlinePanel(view);
		seenPanels.add(panelEl);
		applyPanelPlacement(plugin, panelEl);
		renderNotePanel(plugin, panelEl, file);
		syncPropertiesVisibility(view.contentEl);
	}

	const panelEls = Array.from(
		activeDocument.querySelectorAll<HTMLElement>(`.${INLINE_PANEL_CLASS}`),
	);
	for (const panelEl of panelEls) {
		if (!seenPanels.has(panelEl)) {
			panelEl.remove();
		}
	}
}

function ensureInlinePanel(view: MarkdownView): HTMLElement {
	const hostEl = getPanelHost(view.contentEl);
	const existingPanel = hostEl.querySelector<HTMLElement>(
		`:scope > .${INLINE_PANEL_CLASS}`,
	);

	if (existingPanel) {
		return existingPanel;
	}

	const panelEl = hostEl.createDiv({
		cls: `vaultpilot-note-panel ${INLINE_PANEL_CLASS}`,
	});
	hostEl.prepend(panelEl);

	return panelEl;
}

function applyPanelPlacement(
	plugin: VaultPilotPlugin,
	panelEl: HTMLElement,
): void {
	const sticky = plugin.settings.notePanelPlacement === 'sticky-corner';
	panelEl.classList.toggle('vaultpilot-note-panel-sticky-corner', sticky);
	panelEl.classList.toggle('vaultpilot-note-panel-top', !sticky);
}

function getPanelHost(contentEl: HTMLElement): HTMLElement {
	return (
		contentEl.querySelector<HTMLElement>('.markdown-source-view .cm-sizer') ??
		contentEl.querySelector<HTMLElement>('.markdown-preview-section') ??
		contentEl.querySelector<HTMLElement>('.markdown-preview-view') ??
		contentEl.querySelector<HTMLElement>('.view-content') ??
		contentEl
	);
}

function removeInlinePanel(contentEl: HTMLElement): void {
	contentEl.querySelector<HTMLElement>(`.${INLINE_PANEL_CLASS}`)?.remove();
}

function removeInlineNotePanels(): void {
	const panelEls = Array.from(
		activeDocument.querySelectorAll<HTMLElement>(`.${INLINE_PANEL_CLASS}`),
	);
	for (const panelEl of panelEls) {
		panelEl.remove();
	}

	const containerEls = Array.from(
		activeDocument.querySelectorAll<HTMLElement>(`.${HIDDEN_PROPERTIES_CLASS}`),
	);
	for (const containerEl of containerEls) {
		containerEl.classList.remove(HIDDEN_PROPERTIES_CLASS);
	}
}

function syncPropertiesVisibility(contentEl: HTMLElement): void {
	const containerEls = Array.from(
		contentEl.querySelectorAll<HTMLElement>('.metadata-container'),
	);
	for (const containerEl of containerEls) {
		const properties = Array.from(
			containerEl.querySelectorAll<HTMLElement>('.metadata-property'),
		);
		const nonVaultPilotProperties = properties.filter((propertyEl) => {
			const key = propertyEl.getAttribute('data-property-key');
			return key !== null && !VAULTPILOT_PROPERTY_KEYS.has(key);
		});

		containerEl.classList.toggle(
			HIDDEN_PROPERTIES_CLASS,
			properties.length > 0 && nonVaultPilotProperties.length === 0,
		);
	}
}

function renderNotePanel(
	plugin: VaultPilotPlugin,
	containerEl: HTMLElement,
	file: TFile,
): void {
	containerEl.empty();

	const controlsEl = containerEl.createDiv({
		cls: 'vaultpilot-note-panel-controls',
	});
	renderPriorityControl(plugin, controlsEl, file);
	renderPanelControl(plugin, controlsEl, file, 'status', 'Status');
	renderPanelControl(plugin, controlsEl, file, 'level', 'Level');
}

function renderPriorityControl(
	plugin: VaultPilotPlugin,
	containerEl: HTMLElement,
	file: TFile,
): void {
	const metadata = plugin.metadataService.getFileMetadata(file);
	const value = metadata.priority;
	const option = plugin.metadataService.getOption('priority', value);
	const priorityEl = containerEl.createDiv({
		cls: 'vaultpilot-priority-panel',
	});
	priorityEl.style.setProperty(
		'--vaultpilot-priority-color',
		option?.color ?? 'var(--interactive-accent)',
	);

	const summaryEl = priorityEl.createDiv({ cls: 'vaultpilot-priority-summary' });
	summaryEl.createDiv({ cls: 'vaultpilot-priority-kicker', text: 'Priority' });
	createMetadataMenuButton(plugin, summaryEl, file, 'priority', value);

	const meterEl = priorityEl.createDiv({ cls: 'vaultpilot-priority-meter' });
	renderPriorityMeter(
		meterEl,
		plugin.metadataService.getOptions('priority'),
		value,
	);
}

function renderPanelControl(
	plugin: VaultPilotPlugin,
	containerEl: HTMLElement,
	file: TFile,
	kind: MetadataKind,
	label: string,
): void {
	const metadata = plugin.metadataService.getFileMetadata(file);
	const value = metadata[kind];
	const controlEl = containerEl.createDiv({ cls: 'vaultpilot-note-panel-control' });
	controlEl.createEl('label', { text: label });

	const rowEl = controlEl.createDiv({ cls: 'vaultpilot-note-panel-row' });
	createMetadataMenuButton(plugin, rowEl, file, kind, value);
}

function createMetadataMenuButton(
	plugin: VaultPilotPlugin,
	containerEl: HTMLElement,
	file: TFile,
	kind: MetadataKind,
	value: string,
): HTMLButtonElement {
	const option = plugin.metadataService.getOption(kind, value);
	const buttonEl = containerEl.createEl('button', {
		cls: 'vaultpilot-badge-button',
	});
	buttonEl.type = 'button';
	buttonEl.setAttr('aria-label', `Change ${kind}`);
	buttonEl.setAttr('title', `Change ${kind}`);
	createBadge(buttonEl, kind, value, option);
	buttonEl.addEventListener('click', (event) => {
		openMetadataMenu(plugin, file, kind, value, event);
	});

	return buttonEl;
}

function openMetadataMenu(
	plugin: VaultPilotPlugin,
	file: TFile,
	kind: MetadataKind,
	currentValue: string,
	event: MouseEvent,
): void {
	const menu = new Menu();

	for (const option of plugin.metadataService.getOptions(kind)) {
		menu.addItem((item) => {
			item
				.setTitle(formatOptionLabel(option, option.value))
				.setChecked(option.value === currentValue)
				.onClick(() => {
					void plugin.updateFileMetadata(file, { [kind]: option.value });
				});
		});
	}

	menu.showAtMouseEvent(event);
}

function renderPriorityMeter(
	containerEl: HTMLElement,
	options: MetadataOption[],
	value: string,
): void {
	const visibleOptions = options.filter((option) => option.value !== 'not-set');
	const activeIndex = visibleOptions.findIndex((option) => option.value === value);
	const activeCount = activeIndex === -1 ? 0 : activeIndex + 1;
	const segmentCount = Math.max(visibleOptions.length, 1);
	containerEl.style.setProperty(
		'--vaultpilot-priority-segment-count',
		String(segmentCount),
	);

	for (let index = 0; index < segmentCount; index += 1) {
		const segmentEl = containerEl.createSpan({
			cls: 'vaultpilot-priority-segment',
		});
		segmentEl.classList.toggle('is-active', index < activeCount);
	}
}
