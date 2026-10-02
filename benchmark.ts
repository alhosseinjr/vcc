import { regexAnalyze } from './lib/analyzers/regex-analyzer';
import { astAnalyze } from './lib/analyzers/ast-analyzer';
import { dependencyAnalyze } from './lib/analyzers/dependency-analyzer';
import { performance } from 'perf_hooks';

// Generate a large payload
const code = `
function test() {
  const apiKey = "sk-live-12345678901234567890";
  console.log(apiKey);
  eval("console.log('test')");
  document.write("Hello");
}
`.repeat(1000); // ~7000 lines of code

console.log(`Payload size: ${(code.length / 1024).toFixed(2)} KB (${code.split('\n').length} lines)`);

const t0 = performance.now();
regexAnalyze('test.js', code);
const t1 = performance.now();
console.log(`Regex Analyzer: ${(t1 - t0).toFixed(2)} ms`);

const t2 = performance.now();
astAnalyze('test.js', code);
const t3 = performance.now();
console.log(`AST Analyzer: ${(t3 - t2).toFixed(2)} ms`);

const pkg = JSON.stringify({
  dependencies: {
    "request": "^2.88.2",
    "moment": "^2.29.1"
  }
});
const t4 = performance.now();
dependencyAnalyze('package.json', pkg);
const t5 = performance.now();
console.log(`Dependency Analyzer: ${(t5 - t4).toFixed(2)} ms`);
