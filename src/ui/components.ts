import type { MetadataKind, MetadataOption } from '../types';

export function createBadge(
	containerEl: HTMLElement,
	kind: MetadataKind,
	value: string,
	option: MetadataOption | undefined,
): HTMLElement {
	const badgeEl = containerEl.createSpan({
		cls: `vaultpilot-badge vaultpilot-${kind}`,
	});
	badgeEl.setAttr('data-vaultpilot-value', value);
	badgeEl.style.setProperty(
		'--vaultpilot-badge-color',
		option?.color ?? 'var(--text-muted)',
	);
	badgeEl.setText(formatOptionLabel(option, value));
	return badgeEl;
}

export function createMetadataSelect(
	containerEl: HTMLElement,
	kind: MetadataKind,
	value: string,
	options: MetadataOption[],
	onChange: (value: string) => void,
): HTMLSelectElement {
	const selectEl = containerEl.createEl('select', {
		cls: `vaultpilot-select vaultpilot-${kind}-select`,
	});
	selectEl.setAttr('aria-label', `Set ${kind}`);
	const values = new Set<string>();

	for (const option of options) {
		values.add(option.value);
		const optionEl = selectEl.createEl('option', {
			text: formatOptionLabel(option, option.value),
			value: option.value,
		});

		if (option.value === value) {
			optionEl.selected = true;
		}
	}

	if (!values.has(value)) {
		const customOptionEl = selectEl.createEl('option', {
			text: value,
			value,
		});
		customOptionEl.selected = true;
	}

	selectEl.addEventListener('change', () => {
		onChange(selectEl.value);
	});

	return selectEl;
}

export function formatOptionLabel(
	option: MetadataOption | undefined,
	fallbackValue: string,
): string {
	if (!option) {
		return fallbackValue;
	}

	const label = option.label.length > 0 ? option.label : option.value;
	return option.icon.length > 0 ? `${option.icon} ${label}` : label;
}
