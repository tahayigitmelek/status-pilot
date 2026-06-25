# VaultPilot

VaultPilot is an Obsidian plugin for managing note workflow metadata from YAML frontmatter. It scans Markdown notes for `status`, `priority`, and `level`, then gives you a dashboard for filtering, sorting, and quick editing those fields.

## Example frontmatter

```yaml
---
status: ready-to-start
priority: P2
level: L3
---
```

Notes appear in the VaultPilot Dashboard when they contain at least one supported metadata field. Missing fields can be created from the dashboard or with the **Create Metadata for Current Note** command.

## Features

- Dedicated **VaultPilot Dashboard** view.
- Table view with title, status, priority, level, and quick actions.
- Filters for status, priority, level, folder, text search, completed, not completed, ready-to-start, in-progress, and critical notes.
- Sorting by priority, level, title, and status order.
- Quick frontmatter editing from dashboard dropdowns.
- Commands for setting metadata and opening filtered dashboard views.
- Ribbon icon for opening the dashboard.
- Optional rendered-note metadata panel.
- Configurable values, labels, icons, colors, order, defaults, and folder rules.
- Theme-friendly CSS badges.

## Default values

### Status

| Value | Label |
| --- | --- |
| `not-set` | No status selected |
| `ready-to-start` | Ready to start |
| `in-progress` | In progress |
| `completed` | Completed |

### Priority

| Value | Label |
| --- | --- |
| `not-set` | No priority selected |
| `P0` | Low |
| `P1` | Medium |
| `P2` | High |
| `P3` | Critical |

### Level

| Value | Label |
| --- | --- |
| `not-set` | No level selected |
| `L1` | Beginner |
| `L2` | Intermediate |
| `L3` | Advanced |
| `L4` | Expert |
| `L5` | Master |

## Commands

- **Open VaultPilot Dashboard**
- **Set Status**
- **Set Priority**
- **Set Level**
- **Mark Current Note as In Progress**
- **Mark Current Note as Completed**
- **Create Metadata for Current Note**
- **Show Ready-to-Start Notes**
- **Show In-Progress Notes**
- **Show Critical Notes**

## Settings

Open **Settings → Community plugins → VaultPilot** to configure:

- Dashboard availability
- Note header panel visibility
- Badge styling
- Status, priority, and level values
- Value labels, icons, colors, and order
- Default status, priority, and level
- Include and exclude folders
- Templates folder handling