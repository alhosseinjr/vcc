export interface Annotation {
  id: string;
  targetId: string; // The file path or node ID
  text: string;
  author: string;
  timestamp: number;
}

export function loadAnnotations(scanId: string): Annotation[] {
  try {
    const raw = localStorage.getItem(`vcc:annotations:${scanId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function saveAnnotations(scanId: string, annotations: Annotation[]): void {
  try {
    localStorage.setItem(`vcc:annotations:${scanId}`, JSON.stringify(annotations));
  } catch { /* ignore */ }
}

export function exportAnnotationsMarkdown(scanId: string, annotations: Annotation[]): string {
  if (annotations.length === 0) return "No annotations for this scan.";
  
  let md = `## Code Review Annotations\n\n`;
  const byTarget = new Map<string, Annotation[]>();
  for (const a of annotations) {
    if (!byTarget.has(a.targetId)) byTarget.set(a.targetId, []);
    byTarget.get(a.targetId)!.push(a);
  }
  
  for (const [target, items] of byTarget.entries()) {
    md += `### ${target}\n`;
    for (const item of items) {
      md += `- **${item.author}** (${new Date(item.timestamp).toLocaleString()}):\n  > ${item.text.replace(/\n/g, "\n  > ")}\n`;
    }
    md += `\n`;
  }
  return md;
}

/** 
 * Compress essential share data into a base64 hash.
 * If we include issues, it might get large, so we strip them down to the absolute minimum.
 */
export function encodeShareHash(
  viewMode: string, 
  githubUrl: string | undefined,
  annotations: Annotation[],
  minimalIssues?: { file: string; title: string; severity: string }[]
): string {
  const payload = {
    v: viewMode,
    g: githubUrl,
    a: annotations,
    i: minimalIssues
  };
  
  // Use TextEncoder to estimate size
  const str = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(str).length;
  
  if (bytes > 32000) {
    console.warn(`Share payload is ${bytes} bytes. This might exceed URL length limits in some browsers.`);
  }
  
  return btoa(encodeURIComponent(str));
}

export function decodeShareHash(hash: string) {
  try {
    const str = decodeURIComponent(atob(hash.replace(/^#/, '')));
    return JSON.parse(str);
  } catch {
    return null;
  }
}
