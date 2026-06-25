import type { App, TFile } from 'obsidian';
import { METADATA_FIELDS, type MetadataKind, type MetadataUpdates } from '../types';

export async function updateFrontmatterMetadata(
	app: App,
	file: TFile,
	updates: MetadataUpdates,
): Promise<void> {
	const normalizedUpdates = normalizeUpdates(updates);

	if (normalizedUpdates.length === 0) {
		return;
	}

	await app.vault.process(file, (content) =>
		applyFrontmatterUpdates(content, normalizedUpdates),
	);
}

function applyFrontmatterUpdates(
	content: string,
	updates: Array<[MetadataKind, string]>,
): string {
	const bom = content.startsWith('\uFEFF') ? '\uFEFF' : '';
	const body = bom.length > 0 ? content.slice(1) : content;
	const newline = body.includes('\r\n') ? '\r\n' : '\n';
	const lines = body.split(/\r?\n/);

	if (!hasOpeningDelimiter(lines)) {
		const frontmatter = buildFrontmatter(updates, newline);
		const separator = body.length > 0 ? `${newline}${newline}` : newline;
		return `${bom}${frontmatter}${separator}${body}`;
	}

	const closingIndex = findClosingDelimiter(lines);
	if (closingIndex === -1) {
		const frontmatter = buildFrontmatter(updates, newline);
		return `${bom}${frontmatter}${newline}${newline}${body}`;
	}

	const frontmatterLines = lines.slice(1, closingIndex);
	const bodyLines = lines.slice(closingIndex + 1);
	const closingDelimiter = lines[closingIndex] ?? '---';
	const updatedFrontmatter = updateFrontmatterLines(frontmatterLines, updates);

	return [
		`${bom}---`,
		...updatedFrontmatter,
		closingDelimiter,
		...bodyLines,
	].join(newline);
}

function normalizeUpdates(
	updates: MetadataUpdates,
): Array<[MetadataKind, string]> {
	const normalized: Array<[MetadataKind, string]> = [];

	for (const field of METADATA_FIELDS) {
		const value = updates[field];
		if (value !== undefined) {
			normalized.push([field, value]);
		}
	}

	return normalized;
}

function hasOpeningDelimiter(lines: string[]): boolean {
	return lines[0]?.trim() === '---';
}

function findClosingDelimiter(lines: string[]): number {
	for (let index = 1; index < lines.length; index += 1) {
		const line = lines[index]?.trim();

		if (line === '---' || line === '...') {
			return index;
		}
	}

	return -1;
}

function buildFrontmatter(
	updates: Array<[MetadataKind, string]>,
	newline: string,
): string {
	return ['---', ...updates.map((update) => formatYamlEntry(update)), '---'].join(
		newline,
	);
}

function updateFrontmatterLines(
	lines: string[],
	updates: Array<[MetadataKind, string]>,
): string[] {
	const updatesByField = new Map<MetadataKind, string>(updates);
	const updatedFields = new Set<MetadataKind>();
	const nextLines: string[] = [];

	for (const line of lines) {
		const key = parseTopLevelKey(line);

		if (key && updatesByField.has(key)) {
			const value = updatesByField.get(key);
			if (value !== undefined) {
				nextLines.push(formatYamlEntry([key, value], line));
				updatedFields.add(key);
				continue;
			}
		}

		nextLines.push(line);
	}

	for (const update of updates) {
		if (!updatedFields.has(update[0])) {
			nextLines.push(formatYamlEntry(update));
		}
	}

	return nextLines;
}

function parseTopLevelKey(line: string): MetadataKind | null {
	const match = /^([A-Za-z0-9_-]+)\s*:(.*)$/.exec(line);

	if (!match) {
		return null;
	}

	const key = match[1];
	return isMetadataKind(key) ? key : null;
}

function isMetadataKind(value: string | undefined): value is MetadataKind {
	return value === 'status' || value === 'priority' || value === 'level';
}

function formatYamlEntry(
	update: [MetadataKind, string],
	existingLine?: string,
): string {
	const [key, value] = update;
	const comment = existingLine ? getTrailingComment(existingLine) : '';
	const suffix = comment.length > 0 ? ` ${comment}` : '';
	return `${key}: ${formatYamlScalar(value)}${suffix}`;
}

function getTrailingComment(line: string): string {
	const colonIndex = line.indexOf(':');
	const valuePart = colonIndex === -1 ? line : line.slice(colonIndex + 1);
	let quote: '"' | "'" | null = null;

	for (let index = 0; index < valuePart.length; index += 1) {
		const character = valuePart[index];
		const previous = valuePart[index - 1];

		if (character === '"' || character === "'") {
			if (quote === character && previous !== '\\') {
				quote = null;
			} else if (quote === null) {
				quote = character;
			}
		}

		if (
			character === '#' &&
			quote === null &&
			(index === 0 || /\s/.test(previous ?? ''))
		) {
			return valuePart.slice(index).trimEnd();
		}
	}

	return '';
}

function formatYamlScalar(value: string): string {
	const trimmed = value.trim();

	if (/^[A-Za-z0-9_-]+$/.test(trimmed)) {
		return trimmed;
	}

	return `"${trimmed
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\r?\n/g, '\\n')}"`;
}
