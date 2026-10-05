import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build' && file !== '.aistudio' && file !== 'uploads') {
        results = results.concat(walk(full));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        results.push(full);
      }
    }
  });
  return results;
}

const files = walk('server').concat(walk('src'));
console.log(`Auditing ${files.length} code files for potential bugs...`);

interface BugReport {
  category: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  file: string;
  line?: number;
  description: string;
  snippet?: string;
}

const findings: BugReport[] = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');

  // Check 1: Unhandled JSON.parse outside try/catch
  lines.forEach((line, idx) => {
    if (line.includes('JSON.parse(') && !line.includes('try') && !line.includes('catch')) {
      const start = Math.max(0, idx - 6);
      const end = Math.min(lines.length, idx + 6);
      const surrounding = lines.slice(start, end).join('\n');
      if (!surrounding.includes('try') && !surrounding.includes('catch')) {
        findings.push({
          category: 'UNSAFE_JSON_PARSE',
          severity: 'MEDIUM',
          file: f,
          line: idx + 1,
          description: 'JSON.parse called without enclosing try/catch block (risk of unhandled SyntaxError crash if malformed data is encountered)',
          snippet: line.trim()
        });
      }
    }
  });

  // Check 2: Potential hanging express route handlers (missing next or response in error catch)
  if (f.startsWith('server/routes/')) {
    lines.forEach((line, idx) => {
      if (line.includes('catch (error)') || line.includes('catch (err)')) {
        const block = lines.slice(idx, Math.min(lines.length, idx + 8)).join('\n');
        if (!block.includes('res.status') && !block.includes('res.json') && !block.includes('res.send') && !block.includes('next(')) {
          findings.push({
            category: 'EXPRESS_UNHANDLED_ERROR_RESPONSE',
            severity: 'HIGH',
            file: f,
            line: idx + 1,
            description: 'Catch block in express route might not send response to client, risking hanging request timeouts',
            snippet: block.split('\n')[0].trim()
          });
        }
      }
    });
  }

  // Check 3: Check for localStorage access without window/try-catch (SSR or incognito storage quota exceptions)
  if (f.startsWith('src/')) {
    lines.forEach((line, idx) => {
      if ((line.includes('localStorage.setItem(') || line.includes('localStorage.getItem(')) && !line.includes('try')) {
        const start = Math.max(0, idx - 4);
        const end = Math.min(lines.length, idx + 4);
        const surrounding = lines.slice(start, end).join('\n');
        if (!surrounding.includes('try') && !surrounding.includes('catch')) {
          // Low severity note
          if (line.includes('localStorage.setItem(')) {
            findings.push({
              category: 'UNGUARDED_LOCALSTORAGE_SET',
              severity: 'LOW',
              file: f,
              line: idx + 1,
              description: 'localStorage.setItem without try/catch (may throw QuotaExceededError in restricted/incognito modes)',
              snippet: line.trim()
            });
          }
        }
      }
    });
  }

  // Check 4: Check for missing parseInt radix or NaN checks on query params
  if (f.startsWith('server/')) {
    lines.forEach((line, idx) => {
      if (line.includes('parseInt(') && !line.includes(', 10)')) {
        findings.push({
          category: 'PARSEINT_MISSING_RADIX',
          severity: 'LOW',
          file: f,
          line: idx + 1,
          description: 'parseInt call without explicit radix 10',
          snippet: line.trim()
        });
      }
    });
  }
});

console.log(`\n=== AUDIT SUMMARY: ${findings.length} findings ===\n`);

const grouped: Record<string, BugReport[]> = {};
findings.forEach(f => {
  grouped[f.category] = grouped[f.category] || [];
  grouped[f.category].push(f);
});

Object.entries(grouped).forEach(([cat, list]) => {
  console.log(`[${cat}] (${list.length} occurrences)`);
  list.slice(0, 5).forEach(item => {
    console.log(`  - ${item.file}:${item.line} -> ${item.description}`);
    if (item.snippet) console.log(`    Code: ${item.snippet.slice(0, 80)}`);
  });
  if (list.length > 5) console.log(`  ... and ${list.length - 5} more`);
  console.log('');
});
