import { MarkdownView, Menu, TFile } from 'obsidian';
import type StatusPilotPlugin from '../main';
import { hasAnyMetadata } from '../metadata/metadataService';
import { createBadge, formatOptionLabel } from '../ui/components';
import type { MetadataKind, MetadataOption } from '../types';

const INLINE_PANEL_CLASS = 'statuspilot-inline-note-panel';
const HIDDEN_PROPERTIES_CLASS = 'statuspilot-hidden-properties-container';
const STATUSPILOT_PROPERTY_KEYS = new Set(['status', 'priority', 'level']);

export function registerNotePanel(plugin: StatusPilotPlugin): void {
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

function refreshInlineNotePanels(plugin: StatusPilotPlugin): void {
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

		const metadata = plugin.metadataService.getFileMetadata(file);
		if (!hasAnyMetadata(metadata)) {
			if (plugin.settings.addStatus) {
				plugin.ensureMetadataForFile(file);
			}
			removeInlinePanel(view.contentEl);
			syncPropertiesVisibility(view.contentEl);
			continue;
		}

		if (plugin.settings.addStatus && hasMissingMetadata(metadata)) {
			plugin.ensureMetadataForFile(file);
		}

		const panelEl = ensureInlinePanel(view);
		seenPanels.add(panelEl);
		applyPanelPlacement(panelEl);
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
		cls: `statuspilot-note-panel ${INLINE_PANEL_CLASS}`,
	});
	hostEl.prepend(panelEl);

	return panelEl;
}

function applyPanelPlacement(panelEl: HTMLElement): void {
	panelEl.classList.remove('statuspilot-note-panel-sticky-corner');
	panelEl.classList.add('statuspilot-note-panel-top');
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
		const nonStatusPilotProperties = properties.filter((propertyEl) => {
			const key = propertyEl.getAttribute('data-property-key');
			return key !== null && !STATUSPILOT_PROPERTY_KEYS.has(key);
		});

		containerEl.classList.toggle(
			HIDDEN_PROPERTIES_CLASS,
			properties.length > 0 && nonStatusPilotProperties.length === 0,
		);
	}
}

function renderNotePanel(
	plugin: StatusPilotPlugin,
	containerEl: HTMLElement,
	file: TFile,
): void {
	containerEl.empty();

	const controlsEl = containerEl.createDiv({
		cls: 'statuspilot-note-panel-controls',
	});
	const metadata = plugin.metadataService.getFileMetadata(file);
	if (metadata.hasPriority) {
		renderPriorityControl(plugin, controlsEl, file);
	}
	if (metadata.hasStatus) {
		renderPanelControl(plugin, controlsEl, file, 'status', 'Status');
	}
	if (metadata.hasLevel) {
		renderPanelControl(plugin, controlsEl, file, 'level', 'Level');
	}
}

function renderPriorityControl(
	plugin: StatusPilotPlugin,
	containerEl: HTMLElement,
	file: TFile,
): void {
	const metadata = plugin.metadataService.getFileMetadata(file);
	const value = metadata.priority;
	const option = plugin.metadataService.getOption('priority', value);
	const priorityEl = containerEl.createDiv({
		cls: 'statuspilot-priority-panel',
	});
	priorityEl.style.setProperty(
		'--statuspilot-priority-color',
		option?.color ?? 'var(--interactive-accent)',
	);

	const summaryEl = priorityEl.createDiv({ cls: 'statuspilot-priority-summary' });
	summaryEl.createDiv({ cls: 'statuspilot-priority-kicker', text: 'Priority' });
	createMetadataMenuButton(plugin, summaryEl, file, 'priority', value);

	const meterEl = priorityEl.createDiv({ cls: 'statuspilot-priority-meter' });
	renderPriorityMeter(
		meterEl,
		plugin.metadataService.getOptions('priority'),
		value,
	);
}

function hasMissingMetadata(metadata: {
	hasStatus: boolean;
	hasPriority: boolean;
	hasLevel: boolean;
}): boolean {
	return !metadata.hasStatus || !metadata.hasPriority || !metadata.hasLevel;
}

function renderPanelControl(
	plugin: StatusPilotPlugin,
	containerEl: HTMLElement,
	file: TFile,
	kind: MetadataKind,
	label: string,
): void {
	const metadata = plugin.metadataService.getFileMetadata(file);
	const value = metadata[kind];
	const controlEl = containerEl.createDiv({ cls: 'statuspilot-note-panel-control' });
	controlEl.createEl('label', { text: label });

	const rowEl = controlEl.createDiv({ cls: 'statuspilot-note-panel-row' });
	createMetadataMenuButton(plugin, rowEl, file, kind, value);
}

function createMetadataMenuButton(
	plugin: StatusPilotPlugin,
	containerEl: HTMLElement,
	file: TFile,
	kind: MetadataKind,
	value: string,
): HTMLButtonElement {
	const option = plugin.metadataService.getOption(kind, value);
	const buttonEl = containerEl.createEl('button', {
		cls: 'statuspilot-badge-button',
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
	plugin: StatusPilotPlugin,
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
		'--statuspilot-priority-segment-count',
		String(segmentCount),
	);

	for (let index = 0; index < segmentCount; index += 1) {
		const segmentEl = containerEl.createSpan({
			cls: 'statuspilot-priority-segment',
		});
		segmentEl.classList.toggle('is-active', index < activeCount);
	}
}
