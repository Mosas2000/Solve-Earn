# Icon Components

Custom inline SVG icon library for the Solve-Earn frontend. These components replace the `lucide-react` dependency with zero-dependency, tree-shakeable icons that render identically.

## Usage

```tsx
import { LockIcon, ShieldIcon, AlertCircleIcon } from '../components/icons/Icons';

// Default (24px, currentColor)
<LockIcon />

// Custom size and color
<ShieldIcon size={16} color="#5546ff" />

// With CSS class
<AlertCircleIcon className="icon-danger icon-sm" />
```

## Available Icons

| Icon | Component | Purpose |
|------|-----------|---------|
| 🔒 | `LockIcon` | Secured/locked states |
| 🛡️ | `ShieldIcon` | Security indicators |
| 🕐 | `ClockIcon` | Time/deadline states |
| ✅ | `CheckCircleIcon` | Success/approval |
| ⚠️ | `AlertCircleIcon` | Warnings/errors |
| 📋 | `CopyIcon` | Clipboard actions |
| 🔗 | `ExternalLinkIcon` | External navigation |
| 👥 | `UsersIcon` | Community/team |
| 🔍 | `SearchIcon` | Search inputs |
| 🔽 | `FilterIcon` | Filter controls |
| ⬇️ | `ChevronDownIcon` | Expand/dropdown |
| ⬆️ | `ChevronUpIcon` | Collapse/close |

## Props

All icons accept the `IconProps` interface:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `24` | Width and height in pixels |
| `className` | `string` | `''` | CSS class name |
| `color` | `string` | `'currentColor'` | Stroke color |

## CSS Utilities

Import `styles/Icons.css` for optional utility classes:

- **Sizing**: `icon-xs`, `icon-sm`, `icon-md`, `icon-lg`, `icon-xl`
- **Colors**: `icon-primary`, `icon-success`, `icon-danger`, `icon-warning`, `icon-muted`
- **Interactive**: `icon-interactive` (hover scale + color transition)
- **Layout**: `icon-inline` (vertical alignment with text)
- **Animation**: `icon-spin` (rotating loader)
