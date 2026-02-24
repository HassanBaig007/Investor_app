export const getRelativeTime = (dateInput) => {
    if (!dateInput) return 'just now';

    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return 'just now';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) return 'just now';

    const units = [
        { label: 'min', value: Math.floor(diffSeconds / 60), max: 60 },
        { label: 'hour', value: Math.floor(diffSeconds / 3600), max: 24 },
        { label: 'day', value: Math.floor(diffSeconds / 86400), max: 7 },
        { label: 'week', value: Math.floor(diffSeconds / (86400 * 7)), max: 5 },
        { label: 'month', value: Math.floor(diffSeconds / (86400 * 30)), max: 12 },
    ];

    for (const unit of units) {
        if (unit.value < unit.max) {
            if (unit.label === 'min') return `${unit.value} min ago`;
            return `${unit.value} ${unit.label}${unit.value === 1 ? '' : 's'} ago`;
        }
    }

    const diffYears = Math.floor(diffSeconds / (86400 * 365));
    return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
};

export const getDaysRemaining = (dateInput) => {
    if (!dateInput) return 0;

    const deadline = new Date(dateInput);
    if (Number.isNaN(deadline.getTime())) return 0;

    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    return Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 0);
};
