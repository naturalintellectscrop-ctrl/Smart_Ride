/**
 * Shared CSV Export Utility for Smart Ride Admin Dashboard
 * 
 * Generates CSV content from data arrays and creates downloadable responses.
 * Used across all admin dashboard tabs for consistent export behavior.
 */

/**
 * Convert a 2D array of data into CSV string
 */
export function generateCSV(headers: string[], rows: string[][]): string {
  const sanitize = (val: string) => {
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = headers.map(sanitize).join(',');
  const dataLines = rows.map(row => row.map(sanitize).join(','));
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Create a NextResponse that downloads a CSV file
 */
export function csvResponse(csvContent: string, filename: string): Response {
  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Client-side utility: Download data as CSV file in the browser
 */
export function downloadCSV(headers: string[], rows: string[][], filename: string): void {
  const csvContent = generateCSV(headers, rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Client-side utility: Download a blob as a file in the browser
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
