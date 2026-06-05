import fs from 'fs';
import path from 'path';

const REPO = 'MiB1968/Brgy.Tanod-S.O.S';
const BASE_API = `https://api.github.com/repos/${REPO}/contents`;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/vnd.github.v3+json'
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function downloadFile(url, destPath) {
  console.log(`Downloading ${url} -> ${destPath}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);
  console.log(`Successfully saved: ${destPath}`);
}

async function syncDirectory(remotePath, localDir) {
  try {
    const items = await fetchJson(`${BASE_API}/${remotePath}`);
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.type === 'file') {
          const dest = path.join(localDir, item.name);
          await downloadFile(item.download_url, dest);
        } else if (item.type === 'dir') {
          await syncDirectory(item.path, path.join(localDir, item.name));
        }
      }
    }
  } catch (error) {
    console.warn(`Could not sync directory ${remotePath}:`, error.message);
  }
}

async function main() {
  console.log('--- Starting Sync from GitHub Repository ---');
  
  // 1. Sync README.md
  try {
    const readmeInfo = await fetchJson(`${BASE_API}/README.md`);
    if (readmeInfo && readmeInfo.download_url) {
      await downloadFile(readmeInfo.download_url, path.resolve(process.cwd(), 'README.md'));
    }
  } catch (error) {
    console.error('Failed to sync README.md:', error);
  }
  
  // 2. Sync docs/ directory recursively
  console.log('Scanning docs/ on github...');
  try {
    const docsItems = await fetchJson(`${BASE_API}/docs`);
    if (Array.isArray(docsItems)) {
      for (const item of docsItems) {
        if (item.type === 'dir') {
          console.log(`Found directory under /docs: ${item.name}`);
          await syncDirectory(item.path, path.resolve(process.cwd(), 'docs', item.name));
        } else if (item.type === 'file') {
          await downloadFile(item.download_url, path.resolve(process.cwd(), 'docs', item.name));
        }
      }
    }
  } catch (error) {
    console.error('Failed to sync docs list:', error);
  }

  console.log('--- Sync Completed Successfully ---');
}

main().catch(console.error);
