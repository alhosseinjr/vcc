export interface DependencyGraph {
  nodes: string[];
  edges: { source: string; target: string }[];
}

/** 
 * Extremely fast regex-based import extraction. 
 * Supports ES6 imports and CommonJS requires.
 */
export function extractDependencies(files: { name: string; content: string }[]): DependencyGraph {
  const nodes = new Set<string>();
  const edges: { source: string; target: string }[] = [];
  const filePaths = files.map(f => f.name);

  // Helper to resolve relative paths
  const resolvePath = (basePath: string, importPath: string): string | null => {
    if (!importPath.startsWith(".")) return importPath; // external or absolute alias (naive)
    
    const baseParts = basePath.split("/");
    baseParts.pop(); // remove filename
    
    const importParts = importPath.split("/");
    for (const part of importParts) {
      if (part === ".") continue;
      if (part === "..") {
        if (baseParts.length === 0) return null;
        baseParts.pop();
      } else {
        baseParts.push(part);
      }
    }
    
    const resolved = baseParts.join("/");
    // Attempt to match an exact file, or one with a common extension if it was omitted
    const exact = filePaths.find(p => p === resolved || p.startsWith(resolved + ".") || p.startsWith(resolved + "/index."));
    return exact || resolved;
  };

  const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

  for (const file of files) {
    nodes.add(file.name);
    
    let match;
    // match imports
    while ((match = importRegex.exec(file.content)) !== null) {
      const target = resolvePath(file.name, match[1]);
      if (target && filePaths.includes(target)) { // Only link internal files
        nodes.add(target);
        edges.push({ source: file.name, target });
      }
    }
    // match requires
    while ((match = requireRegex.exec(file.content)) !== null) {
      const target = resolvePath(file.name, match[1]);
      if (target && filePaths.includes(target)) {
        nodes.add(target);
        edges.push({ source: file.name, target });
      }
    }
  }

  // Deduplicate edges
  const uniqueEdges = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    const key = `${edge.source}->${edge.target}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEdges.push(edge);
    }
  }

  return { nodes: Array.from(nodes), edges: uniqueEdges };
}

/** Detects cycles using simple DFS */
export function findCircularDependencies(nodes: string[], edges: { source: string; target: string }[]): [string, string][] {
  const adj = new Map<string, string[]>();
  for (const node of nodes) adj.set(node, []);
  for (const e of edges) adj.get(e.source)?.push(e.target);

  const cycles: [string, string][] = [];
  
  for (const startNode of nodes) {
    const visited = new Set<string>();
    const stack = new Set<string>();
    
    const dfs = (node: string) => {
      visited.add(node);
      stack.add(node);
      
      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (stack.has(neighbor)) {
          cycles.push([node, neighbor]);
        }
      }
      stack.delete(node);
    };
    
    dfs(startNode);
  }
  
  return cycles;
}
