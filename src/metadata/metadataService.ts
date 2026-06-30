import { App, TFile } from 'obsidian';
import {
	METADATA_FIELDS,
	type MetadataKind,
	type MetadataOption,
	type MetadataUpdates,
	type StatusPilotFileMetadata,
	type StatusPilotRecord,
	type StatusPilotSettings,
} from '../types';

type ChangeListener = () => void;

export class MetadataService {
	private readonly app: App;
	private settings: StatusPilotSettings;
	private records: StatusPilotRecord[] = [];
	private readonly listeners = new Set<ChangeListener>();
	private refreshTimer: number | null = null;

	constructor(app: App, settings: StatusPilotSettings) {
		this.app = app;
		this.settings = settings;
	}

	setSettings(settings: StatusPilotSettings): void {
		this.settings = settings;
	}

	getRecords(): StatusPilotRecord[] {
		return [...this.records];
	}

	getRecord(file: TFile): StatusPilotRecord | undefined {
		return this.records.find((record) => record.path === file.path);
	}

	getFileMetadata(file: TFile): StatusPilotFileMetadata {
		const record = this.getRecord(file);
		if (record) {
			return {
				status: record.status,
				priority: record.priority,
				level: record.level,
				hasStatus: record.hasStatus,
				hasPriority: record.hasPriority,
				hasLevel: record.hasLevel,
			};
		}

		return this.readFileMetadata(file);
	}

	getFreshFileMetadata(file: TFile): StatusPilotFileMetadata {
		return this.readFileMetadata(file);
	}

	private readFileMetadata(file: TFile): StatusPilotFileMetadata {
		const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
		const hasStatus = hasOwn(frontmatter, 'status');
		const hasPriority = hasOwn(frontmatter, 'priority');
		const hasLevel = hasOwn(frontmatter, 'level');

		return {
			status: hasStatus
				? stringifyFrontmatterValue(frontmatter?.status, this.settings.defaultStatus)
				: this.settings.defaultStatus,
			priority: hasPriority
				? stringifyFrontmatterValue(
						frontmatter?.priority,
						this.settings.defaultPriority,
					)
				: this.settings.defaultPriority,
			level: hasLevel
				? stringifyFrontmatterValue(frontmatter?.level, this.settings.defaultLevel)
				: this.settings.defaultLevel,
			hasStatus,
			hasPriority,
			hasLevel,
		};
	}

	getOptions(kind: MetadataKind): MetadataOption[] {
		if (kind === 'status') {
			return this.settings.statusOptions;
		}

		if (kind === 'priority') {
			return this.settings.priorityOptions;
		}

		return this.settings.levelOptions;
	}

	getOption(kind: MetadataKind, value: string): MetadataOption | undefined {
		return this.getOptions(kind).find((option) => option.value === value);
	}

	getDefaultValue(kind: MetadataKind): string {
		if (kind === 'status') {
			return this.settings.defaultStatus;
		}

		if (kind === 'priority') {
			return this.settings.defaultPriority;
		}

		return this.settings.defaultLevel;
	}

	getOptionOrder(kind: MetadataKind, value: string): number {
		const index = this.getOptions(kind).findIndex(
			(option) => option.value === value,
		);

		return index === -1 ? Number.POSITIVE_INFINITY : index;
	}

	getFolderOptions(): string[] {
		const folders = new Set<string>();
		for (const record of this.records) {
			folders.add(record.folder);
		}

		return [...folders].sort((a, b) => a.localeCompare(b));
	}

	onChange(listener: ChangeListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	scheduleRefresh(delay = 100): void {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
		}

		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			void this.refresh();
		}, delay);
	}

	async refresh(): Promise<void> {
		this.records = this.app.vault
			.getMarkdownFiles()
			.filter((file) => this.shouldIncludeFile(file))
			.map((file) => this.createRecord(file))
			.filter((record): record is StatusPilotRecord => record !== null)
			.sort((a, b) => a.path.localeCompare(b.path));

		this.notify();
	}

	applyLocalUpdate(file: TFile, updates: MetadataUpdates): void {
		if (!this.shouldIncludeFile(file)) {
			return;
		}

		const existing = this.getFileMetadata(file);
		const nextMetadata: StatusPilotFileMetadata = {
			...existing,
			status: updates.status ?? existing.status,
			priority: updates.priority ?? existing.priority,
			level: updates.level ?? existing.level,
			hasStatus: existing.hasStatus || updates.status !== undefined,
			hasPriority: existing.hasPriority || updates.priority !== undefined,
			hasLevel: existing.hasLevel || updates.level !== undefined,
		};

		if (
			!nextMetadata.hasStatus &&
			!nextMetadata.hasPriority &&
			!nextMetadata.hasLevel
		) {
			return;
		}

		const nextRecord = this.createRecordFromMetadata(file, nextMetadata);
		const index = this.records.findIndex((record) => record.path === file.path);

		if (index === -1) {
			this.records = [...this.records, nextRecord].sort((a, b) =>
				a.path.localeCompare(b.path),
			);
		} else {
			this.records = [
				...this.records.slice(0, index),
				nextRecord,
				...this.records.slice(index + 1),
			];
		}

		this.notify();
	}

	dispose(): void {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}

		this.listeners.clear();
	}

	private createRecord(file: TFile): StatusPilotRecord | null {
		const metadata = this.getFreshFileMetadata(file);
		if (!hasAnyMetadata(metadata)) {
			return null;
		}

		return this.createRecordFromMetadata(file, metadata);
	}

	private createRecordFromMetadata(
		file: TFile,
		metadata: StatusPilotFileMetadata,
	): StatusPilotRecord {
		return {
			file,
			title: file.basename,
			path: file.path,
			folder: getFolder(file.path),
			modified: file.stat.mtime,
			...metadata,
		};
	}

	private shouldIncludeFile(file: TFile): boolean {
		if (file.extension !== 'md') {
			return false;
		}

		if (
			this.settings.includeFolders.length > 0 &&
			!this.settings.includeFolders.some((folder) =>
				pathMatchesFolder(file.path, folder),
			)
		) {
			return false;
		}

		return !this.settings.excludeFolders.some((folder) =>
			pathMatchesFolder(file.path, folder),
		);
	}

	private notify(): void {
		for (const listener of this.listeners) {
			listener();
		}
	}
}

export function hasAnyMetadata(metadata: StatusPilotFileMetadata): boolean {
	return metadata.hasStatus || metadata.hasPriority || metadata.hasLevel;
}

function stringifyFrontmatterValue(value: unknown, fallback: string): string {
	if (value === null || value === undefined) {
		return fallback;
	}

	if (typeof value === 'string') {
		return value;
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	return fallback;
}

function hasOwn(
	frontmatter: Record<string, unknown> | undefined,
	key: MetadataKind,
): boolean {
	if (!frontmatter) {
		return false;
	}

	return Object.prototype.hasOwnProperty.call(frontmatter, key);
}

function getFolder(path: string): string {
	const lastSlash = path.lastIndexOf('/');
	return lastSlash === -1 ? '' : path.slice(0, lastSlash);
}

function pathMatchesFolder(path: string, folder: string): boolean {
	const cleanedFolder = folder.trim().replace(/^\/+|\/+$/g, '');

	if (cleanedFolder.length === 0 || cleanedFolder === '.') {
		return true;
	}

	return path === cleanedFolder || path.startsWith(`${cleanedFolder}/`);
}

export function createDefaultMetadataUpdates(
	settings: StatusPilotSettings,
	current: StatusPilotFileMetadata,
): MetadataUpdates {
	const updates: MetadataUpdates = {};

	if (!current.hasStatus) {
		updates.status = settings.defaultStatus;
	}

	if (!current.hasPriority) {
		updates.priority = settings.defaultPriority;
	}

	if (!current.hasLevel) {
		updates.level = settings.defaultLevel;
	}

	return updates;
}

export function metadataUpdatesAreEmpty(updates: MetadataUpdates): boolean {
	return !METADATA_FIELDS.some((field) => updates[field] !== undefined);
}
