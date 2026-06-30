import type { TFile } from 'obsidian';

export const METADATA_FIELDS = ['status', 'priority', 'level'] as const;

export type MetadataKind = (typeof METADATA_FIELDS)[number];

export interface MetadataOption {
	id: string;
	value: string;
	label: string;
	color: string;
	icon: string;
}

export interface StatusPilotSettings {
	enableDashboard: boolean;
	enableNotePanel: boolean;
	enableBadgeStyling: boolean;
	addStatus: boolean;
	statusOptions: MetadataOption[];
	priorityOptions: MetadataOption[];
	levelOptions: MetadataOption[];
	defaultStatus: string;
	defaultPriority: string;
	defaultLevel: string;
	includeFolders: string[];
	excludeFolders: string[];
}

export interface StatusPilotFileMetadata {
	status: string;
	priority: string;
	level: string;
	hasStatus: boolean;
	hasPriority: boolean;
	hasLevel: boolean;
}

export interface StatusPilotRecord extends StatusPilotFileMetadata {
	file: TFile;
	title: string;
	path: string;
	folder: string;
	modified: number;
}

export type MetadataUpdates = Partial<Record<MetadataKind, string>>;

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
	sort: DashboardSort;
}

export type DashboardPreset = Partial<DashboardFilters>;
