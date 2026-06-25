# VaultPilot

VaultPilot is an Obsidian plugin for managing note workflow metadata directly from YAML frontmatter. It scans your Markdown notes for status, priority, and level fields, providing a dedicated dashboard for filtering, sorting, and quickly updating your workflow states.

## Features

- Dedicated dashboard: Filter, sort, and manage note workflow states from a central table view.
- Quick metadata editing: Update status, priority, and level directly from dashboard dropdowns without opening notes.
- Smart filters: Quickly isolate notes by status, priority, level, folder, text search, or quick filters like ready-to-start and critical.
- Flexible sorting: Organize your notes by priority, level, title, or custom status order.
- Rendered-note panel: View and modify workflow metadata through an optional interactive panel at the top of rendered notes.
- Command Palette integration: Run quick commands to set metadata, mark notes as completed or in progress, and open filtered dashboard views.
- Fully customizable: Configure custom metadata values, labels, icons, badge colors, display order, defaults, and folder rules from plugin settings.

## Usage

- Opening dashboard: Click the ribbon icon on the sidebar or run Open VaultPilot Dashboard from the Command Palette.
- Editing frontmatter: Change a note's status, priority, or level using the dropdown menus directly in the dashboard table.
- Using quick commands: Run commands like Set Status, Mark Current Note as In Progress, or Create Metadata for Current Note directly from the active editor.
- Isolating critical work: Use instant commands like Show Ready-to-Start Notes or Show Critical Notes to jump straight to filtered views.
- Configuring rules: Open Settings > Community plugins > VaultPilot to customize badge styles, default values, and folder inclusion/exclusion rules.

## Privacy

VaultPilot operates entirely locally and offline within your Obsidian vault. It does not make any external network requests or collect telemetry. All metadata and settings are stored locally in your Markdown files and standard Obsidian plugin data.