import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

type Violation = {
  file: string;
  line: number;
  text: string;
};

const sourceRoots = ["src", "scripts"];
const summaryOnly = process.argv.includes("--summary");
const reportOnly = process.argv.includes("--report") || summaryOnly;
const violations: Violation[] = [];

function isSourceFile(filePath: string) {
  if (filePath.endsWith(".ts")) {
    return true;
  }

  if (filePath.endsWith(".tsx")) {
    return true;
  }

  return false;
}

function getScriptKind(filePath: string) {
  if (filePath.endsWith(".tsx")) {
    return ts.ScriptKind.TSX;
  }

  return ts.ScriptKind.TS;
}

function getLine(sourceFile: ts.SourceFile, node: ts.Node) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return position.line + 1;
}

function normalizeSnippet(value: string) {
  return value.replace(/\s+/g, " ").slice(0, 180);
}

function scanFile(filePath: string) {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, getScriptKind(filePath));

  function visit(node: ts.Node) {
    if (ts.isConditionalExpression(node)) {
      violations.push({
        file: filePath,
        line: getLine(sourceFile, node),
        text: normalizeSnippet(node.getText(sourceFile))
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function scanDirectory(directoryPath: string) {
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(entryPath);
      continue;
    }

    if (!isSourceFile(entryPath)) {
      continue;
    }

    scanFile(entryPath);
  }
}

function printSummary() {
  const countsByFile = new Map<string, number>();

  for (const violation of violations) {
    const current = countsByFile.get(violation.file) ?? 0;
    countsByFile.set(violation.file, current + 1);
  }

  const entries = [...countsByFile.entries()].sort((left, right) => right[1] - left[1]);

  for (const [filePath, count] of entries.slice(0, 30)) {
    console.log(`${count}\t${filePath}`);
  }
}

function printReport() {
  for (const violation of violations) {
    console.log(`${violation.file}:${violation.line}: ${violation.text}`);
  }
}

for (const sourceRoot of sourceRoots) {
  scanDirectory(sourceRoot);
}

if (violations.length === 0) {
  console.log("No ternary expressions found.");
  process.exit(0);
}

console.log(`${violations.length} ternary expression(s) found.`);

if (summaryOnly) {
  printSummary();
  process.exit(0);
}

if (reportOnly) {
  printReport();
  process.exit(0);
}

printSummary();
process.exit(1);
