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

// The photo fixture is a real JPEG committed at e2e/fixtures/test-photo.jpg and is NOT generated
// here. It used to be built from a hand-pasted 1×1 base64 blob, which was silently truncated: the
// header parsed as a JPEG (so `file` called it valid) but no decoder could read it, and the
// add-property wizard's client-side compression step then failed with an Event that carries no
// message — surfacing to the user as "Couldn't upload photo.jpg." with the reason missing. A
// generated file that no decoder accepts is worse than a committed one that every decoder accepts.
// Regenerate it from a real image if it needs to change:
//   sips -Z 64 -s format jpeg public/property-hero.jpg --out e2e/fixtures/test-photo.jpg

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
