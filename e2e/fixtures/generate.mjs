#!/usr/bin/env node
/**
 * Generates minimal valid test fixture files for E2E upload tests.
 * Run once before running the photo/document upload specs:
 *   node e2e/fixtures/generate.mjs
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const dir = dirname(fileURLToPath(import.meta.url))
mkdirSync(dir, { recursive: true })

// Minimal valid 1×1 white JPEG (base64-encoded)
const jpegB64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDB' +
  'kSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAR' +
  'CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAA' +
  'AAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAA' +
  'AAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k='
writeFileSync(resolve(dir, 'test-photo.jpg'), Buffer.from(jpegB64, 'base64'))

// Minimal valid PDF (text-based, passes basic PDF validators)
const pdf = `%PDF-1.0
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
154
%%EOF`
writeFileSync(resolve(dir, 'test-doc.pdf'), pdf)

console.log('✓ Created e2e/fixtures/test-photo.jpg and e2e/fixtures/test-doc.pdf')
