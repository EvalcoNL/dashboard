/**
 * CSV Export Utility
 * Converts arrays of objects to CSV format with proper escaping.
 */

export function toCSV(data: Record<string, any>[], columns?: { key: string; label: string }[]): string {
    if (data.length === 0) return "";

    // Auto-detect columns if not provided
    const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key }));

    // Header row
    const header = cols.map(c => escapeCSV(c.label)).join(",");

    // Data rows
    const rows = data.map(row =>
        cols.map(c => {
            const val = row[c.key];
            if (val === null || val === undefined) return "";
            if (val instanceof Date) return escapeCSV(val.toISOString());
            return escapeCSV(String(val));
        }).join(",")
    );

    return [header, ...rows].join("\n");
}

function escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Trigger a CSV file download in the browser.
 */
export function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
