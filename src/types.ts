import type { TFile } from 'obsidian';

export const METADATA_FIELDS = ['status', 'priority', 'level'] as const;

export type MetadataKind = (typeof METADATA_FIELDS)[number];

export type NotePanelPlacement = 'top' | 'sticky-corner';

export interface MetadataOption {
	id: string;
	value: string;
	label: string;
	color: string;
	icon: string;
}

export interface VaultPilotSettings {
	enableDashboard: boolean;
	enableNotePanel: boolean;
	notePanelPlacement: NotePanelPlacement;
	enableBadgeStyling: boolean;
	statusOptions: MetadataOption[];
	priorityOptions: MetadataOption[];
	levelOptions: MetadataOption[];
	defaultStatus: string;
	defaultPriority: string;
	defaultLevel: string;
	includeFolders: string[];
	excludeFolders: string[];
	ignoreTemplatesFolder: boolean;
	templatesFolder: string;
}

export interface VaultPilotFileMetadata {
	status: string;
	priority: string;
	level: string;
	hasStatus: boolean;
	hasPriority: boolean;
	hasLevel: boolean;
}

export interface VaultPilotRecord extends VaultPilotFileMetadata {
	file: TFile;
	title: string;
	path: string;
	folder: string;
	modified: number;
}

export type MetadataUpdates = Partial<Record<MetadataKind, string>>;

export type DashboardFocus =
	| 'all'
	| 'completed'
	| 'not-completed'
	| 'ready'
	| 'in-progress'
	| 'critical';

export type DashboardSort =
	| 'priority-desc'
	| 'priority-asc'
	| 'level-asc'
	| 'level-desc'
	| 'alpha-asc'
	| 'status-asc';

export interface DashboardFilters {
	search: string;
	status: string;
	priority: string;
	level: string;
	folder: string;
	focus: DashboardFocus;
	sort: DashboardSort;
}

export type DashboardPreset = Partial<DashboardFilters>;
