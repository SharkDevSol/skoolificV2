# Component Reference

## Form & actions

| Component | Path | Key props |
|-----------|------|-----------|
| Button | `COMPONENTS/Button/Button.jsx` | `variant`, `size`, `loading`, `disabled`, `icon` |
| Input | `COMPONENTS/Input/Input.jsx` | `label`, `value`, `onChange`, `error`, `icon` |
| Select | `COMPONENTS/Select/Select.jsx` | `options`, `searchable`, `multiple` |
| Checkbox | `COMPONENTS/Checkbox/Checkbox.jsx` | `checked`, `indeterminate` |
| Radio | `COMPONENTS/Radio/Radio.jsx` | `name`, `options`, `layout` |
| Textarea | `COMPONENTS/Textarea/Textarea.jsx` | `rows`, `autoResize`, `maxLength` |
| DatePicker | `COMPONENTS/DatePicker/DatePicker.jsx` | `calendarType`, `minDate`, `maxDate` |
| FileUpload | `COMPONENTS/FileUpload/FileUpload.jsx` | `accept`, `multiple`, `maxSize` |

## Layout & navigation

| Component | Path | Key props |
|-----------|------|-----------|
| Sidebar | `COMPONENTS/Sidebar/Sidebar.jsx` | `collapsed`, `menuItems`, `activeItem` |
| Header | `COMPONENTS/Header/Header.jsx` | `breadcrumbs`, `user`, `notifications` |
| PageLayout | `COMPONENTS/Layout/PageLayout.jsx` | `title`, `actions`, `loading` |
| ThemeToggle | `COMPONENTS/ThemeToggle/ThemeToggle.jsx` | `size`, `showLabel` |
| LanguageSelector | `COMPONENTS/LanguageSelector/LanguageSelector.jsx` | `variant`, `showFlags` |

## Data display

| Component | Path | Key props |
|-----------|------|-----------|
| Card | `COMPONENTS/Card/Card.jsx` | `title`, `footer`, `hoverable` |
| Table | `COMPONENTS/Table/Table.jsx` | `columns`, `data`, `sortable`, `paginated` |
| StatCard | `COMPONENTS/StatCard/StatCard.jsx` | `value`, `trend`, `icon` |
| Badge | `COMPONENTS/Badge/Badge.jsx` | `variant`, `count`, `dot` |
| LazyImage | `COMPONENTS/LazyImage/LazyImage.jsx` | `src`, `alt`, `webpSrc`, `eager` |

## Feedback

| Component | Path | Key props |
|-----------|------|-----------|
| Modal | `COMPONENTS/Modal/Modal.jsx` | `isOpen`, `onClose`, `size` |
| Toast | `COMPONENTS/Toast/Toast.jsx` | `type`, `message`, `duration` |
| LoadingSpinner | `COMPONENTS/LoadingSpinner/LoadingSpinner.jsx` | `size`, `fullScreen` |
| Skeleton | `COMPONENTS/Skeleton/Skeleton.jsx` | `variant`, `count` |

## Example — Button

```jsx
import Button from '../COMPONENTS/Button/Button';
import { Plus } from 'lucide-react';

<Button variant="primary" size="medium" icon={<Plus size={16} />} iconPosition="left">
  Add student
</Button>
```

## Example — Table with pagination

```jsx
import Table from '../COMPONENTS/Table/Table';

<Table
  columns={[
    { header: 'Name', accessor: 'name', sortable: true },
    { header: 'Class', accessor: 'className' },
  ]}
  data={students}
  paginated
  pageSize={10}
  emptyMessage="No students found"
/>
```

See individual `README.md` files under each component folder for full prop tables and accessibility notes.
