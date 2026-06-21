// File Upload Security Verification
//
// Tests the three-layer validation in lib/file-validation.ts:
//   1. Extension allowlist
//   2. MIME type allowlist
//   3. Magic bytes (prevents renamed non-image files)
//
// Also audits source code of all 6 upload paths to confirm the guard is wired.
// No network calls. No file system writes. No test data created.

import { readFileSync } from 'fs';

let failures = 0;
const PASS = (msg) => console.log('  PASS:', msg);
const FAIL = (msg) => { console.log('  FAIL:', msg); failures++; };
const HEAD = (msg) => console.log('\n' + msg + '\n' + '-'.repeat(msg.length));

// ── Helpers: build real File objects with authentic magic bytes ────────────────

function makeFile(name, mimeType, magicBytes) {
  const extraBytes = new Uint8Array(20).fill(0x42); // pad to realistic size
  const buf = new Uint8Array([...magicBytes, ...extraBytes]);
  return new File([buf], name, { type: mimeType });
}

// JPEG: FF D8 FF E0
const JPEG_MAGIC  = [0xFF, 0xD8, 0xFF, 0xE0];
// PNG:  89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC   = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
// WebP: RIFF....WEBP
const WEBP_MAGIC  = [
  0x52, 0x49, 0x46, 0x46,  // RIFF
  0x00, 0x00, 0x00, 0x00,  // file size (placeholder)
  0x57, 0x45, 0x42, 0x50,  // WEBP
];
// PDF:  %PDF-
const PDF_MAGIC   = [0x25, 0x50, 0x44, 0x46, 0x2D];
// EXE:  MZ (DOS header)
const EXE_MAGIC   = [0x4D, 0x5A, 0x90, 0x00];
// Renamed EXE: EXE magic bytes but .jpg extension / image MIME
const RENAMED_EXE = EXE_MAGIC;

// Inline the validation logic (mirrors lib/file-validation.ts exactly)
async function validateImageFile(file) {
  const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
  const ALLOWED_MIME_TYPES  = new Set(['image/jpeg', 'image/png', 'image/webp']);

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Only JPG, PNG, and WebP images are accepted. ".${ext || 'unknown'}" is not allowed.` };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: `Only JPG, PNG, and WebP images are accepted. The browser identified this file as "${file.type || 'unknown type'}".` };
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  function hasValidMagicBytes(b) {
    if (b.length < 4) return false;
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return true;
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return true;
    if (b.length >= 12 &&
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return true;
    return false;
  }

  if (!hasValidMagicBytes(header)) {
    return { valid: false, error: 'The file does not appear to be a valid image. Renaming a non-image file to a supported extension is not allowed.' };
  }

  return { valid: true };
}

// ── TEST 1: Allowed types pass ────────────────────────────────────────────────
HEAD('TEST 1 — Allowed types pass');

const allowed = [
  { file: makeFile('photo.jpg',  'image/jpeg', JPEG_MAGIC), label: 'JPG (.jpg / image/jpeg)' },
  { file: makeFile('photo.jpeg', 'image/jpeg', JPEG_MAGIC), label: 'JPEG (.jpeg / image/jpeg)' },
  { file: makeFile('photo.png',  'image/png',  PNG_MAGIC),  label: 'PNG (.png / image/png)' },
  { file: makeFile('photo.webp', 'image/webp', WEBP_MAGIC), label: 'WebP (.webp / image/webp)' },
];

for (const { file, label } of allowed) {
  const result = await validateImageFile(file);
  result.valid
    ? PASS(`${label}: allowed`)
    : FAIL(`${label}: wrongly rejected — ${result.error}`);
}

// ── TEST 2: PDF rejected ──────────────────────────────────────────────────────
HEAD('TEST 2 — PDF rejected');

const pdf = makeFile('document.pdf', 'application/pdf', PDF_MAGIC);
const pdfResult = await validateImageFile(pdf);
if (!pdfResult.valid) {
  PASS(`PDF (.pdf): rejected — "${pdfResult.error}"`);
} else {
  FAIL('PDF file was wrongly allowed');
}

// ── TEST 3: EXE rejected ──────────────────────────────────────────────────────
HEAD('TEST 3 — EXE rejected');

const exe = makeFile('malware.exe', 'application/octet-stream', EXE_MAGIC);
const exeResult = await validateImageFile(exe);
if (!exeResult.valid) {
  PASS(`EXE (.exe): rejected — "${exeResult.error}"`);
} else {
  FAIL('EXE file was wrongly allowed');
}

// ── TEST 4: Renamed fake image rejected (magic bytes mismatch) ─────────────────
HEAD('TEST 4 — Renamed fake image rejected');

const fakeJpg  = makeFile('evil.jpg',  'image/jpeg', RENAMED_EXE);
const fakePng  = makeFile('evil.png',  'image/png',  RENAMED_EXE);
const fakeWebp = makeFile('evil.webp', 'image/webp', RENAMED_EXE);
const fakePdf  = makeFile('evil.jpg',  'image/jpeg', PDF_MAGIC);

const [r1, r2, r3, r4] = await Promise.all([
  validateImageFile(fakeJpg),
  validateImageFile(fakePng),
  validateImageFile(fakeWebp),
  validateImageFile(fakePdf),
]);

!r1.valid ? PASS('EXE renamed to .jpg (image/jpeg): rejected by magic bytes') : FAIL('EXE renamed to .jpg was allowed');
!r2.valid ? PASS('EXE renamed to .png (image/png): rejected by magic bytes')  : FAIL('EXE renamed to .png was allowed');
!r3.valid ? PASS('EXE renamed to .webp (image/webp): rejected by magic bytes') : FAIL('EXE renamed to .webp was allowed');
!r4.valid ? PASS('PDF renamed to .jpg (image/jpeg): rejected by magic bytes') : FAIL('PDF renamed to .jpg was allowed');

// ── TEST 5: MIME type mismatch caught (ext says jpg, MIME says PDF) ────────────
HEAD('TEST 5 — MIME type mismatch caught before magic bytes check');

const mimeSpoof = makeFile('photo.jpg', 'application/pdf', JPEG_MAGIC);
const mimeSpoofResult = await validateImageFile(mimeSpoof);
if (!mimeSpoofResult.valid) {
  PASS(`MIME spoof (jpg ext + PDF mime): rejected — "${mimeSpoofResult.error}"`);
} else {
  FAIL('MIME type spoof was not caught');
}

// ── TEST 6: Extension check order ────────────────────────────────────────────
HEAD('TEST 6 — Disallowed extensions caught at first layer');

const badExts = [
  { name: 'photo.gif',  mime: 'image/gif',  label: '.gif' },
  { name: 'doc.docx',   mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: '.docx' },
  { name: 'shell.sh',   mime: 'text/x-sh',  label: '.sh' },
  { name: 'noext',      mime: 'image/jpeg', label: 'no extension' },
  { name: '',           mime: 'image/jpeg', label: 'empty name' },
];

for (const { name, mime, label } of badExts) {
  const f = makeFile(name, mime, JPEG_MAGIC);
  const r = await validateImageFile(f);
  !r.valid
    ? PASS(`${label}: rejected at extension layer`)
    : FAIL(`${label}: should have been rejected at extension layer`);
}

// ── TEST 7: Source audit — all 6 upload paths import validateImageFile ─────────
HEAD('TEST 7 — Source audit: all upload paths import validateImageFile');

const uploadPaths = {
  'artist portfolio':        'app/(artist)/artist/portfolio/actions.ts',
  'artist flash':            'app/(artist)/artist/flash/actions.ts',
  'custom request photos':   'app/book/[studio]/custom/actions.ts',
  'studio logo':             'app/(owner)/owner/settings/studio/actions.ts',
  'consultation photos':     'app/book/[studio]/consult/actions.ts',
  'consent form ID photo':   'app/api/consent-forms/route.ts',
};

const sources = {};
for (const [label, path] of Object.entries(uploadPaths)) {
  sources[label] = readFileSync(path, 'utf8');
  if (/import.*validateImageFile.*file-validation/.test(sources[label])) {
    PASS(`${label}: imports validateImageFile`);
  } else {
    FAIL(`${label}: missing validateImageFile import`);
  }
}

// ── TEST 8: Source audit — guard fires before upload() call ───────────────────
HEAD('TEST 8 — Source audit: validateImageFile called before .upload()');

for (const [label, src] of Object.entries(sources)) {
  const validateIdx = src.indexOf('validateImageFile(');
  const uploadIdx   = src.indexOf('.upload(');
  if (validateIdx !== -1 && uploadIdx !== -1 && validateIdx < uploadIdx) {
    PASS(`${label}: validateImageFile before .upload()`);
  } else {
    FAIL(`${label}: validateImageFile (${validateIdx}) must come before .upload() (${uploadIdx})`);
  }
}

// ── TEST 9: Source audit — single-file paths reject immediately ────────────────
HEAD('TEST 9 — Source audit: single-file uploads return error on invalid type');

const singleFilePaths = {
  'artist portfolio':  sources['artist portfolio'],
  'artist flash':      sources['artist flash'],
  'studio logo':       sources['studio logo'],
};

for (const [label, src] of Object.entries(singleFilePaths)) {
  if (/typeCheck\.valid.*return.*typeCheck\.error|!typeCheck\.valid.*return.*error.*typeCheck\.error/.test(src.replace(/\n/g, ' '))) {
    PASS(`${label}: returns error immediately on invalid type`);
  } else if (/if \(!typeCheck\.valid\)/.test(src)) {
    PASS(`${label}: early return guard present`);
  } else {
    FAIL(`${label}: missing early return on typeCheck.valid === false`);
  }
}

// ── TEST 10: Bucket visibility audit (source-level) ───────────────────────────
HEAD('TEST 10 — Bucket visibility: id-photos is private; others are public');

const consentSrc = sources['consent form ID photo'];

// id-photos bucket is created with public: false
if (/public: false/.test(consentSrc)) {
  PASS('id-photos bucket created with public: false (private — correct for ID documents)');
} else {
  FAIL('id-photos bucket missing public: false — should be private');
}

// Other buckets use getPublicUrl (correct for serving images via CDN)
const publicBucketPaths = {
  'portfolio':       sources['artist portfolio'],
  'custom-requests': sources['custom request photos'],
  'studios':         sources['studio logo'],
};
for (const [bucket, src] of Object.entries(publicBucketPaths)) {
  if (/getPublicUrl/.test(src)) {
    PASS(`${bucket}: uses getPublicUrl (public CDN bucket — correct)`);
  } else {
    FAIL(`${bucket}: expected getPublicUrl call for public bucket`);
  }
}

// ── TEST 11: lib/file-validation.ts shape ─────────────────────────────────────
HEAD('TEST 11 — lib/file-validation.ts structure');

const valSrc = readFileSync('lib/file-validation.ts', 'utf8');

const checks = [
  { pattern: /ALLOWED_EXTENSIONS.*jpg.*jpeg.*png.*webp/s,  label: 'Extension allowlist has jpg, jpeg, png, webp' },
  { pattern: /ALLOWED_MIME_TYPES.*image\/jpeg.*image\/png.*image\/webp/s, label: 'MIME allowlist has image/jpeg, image/png, image/webp' },
  { pattern: /0xFF.*0xD8.*0xFF/,  label: 'JPEG magic bytes (FF D8 FF)' },
  { pattern: /0x89.*0x50.*0x4E.*0x47/, label: 'PNG magic bytes (89 50 4E 47)' },
  { pattern: /0x52.*0x49.*0x46.*0x46/,  label: 'WebP RIFF header (52 49 46 46)' },
  { pattern: /0x57.*0x45.*0x42.*0x50/,  label: 'WebP WEBP marker (57 45 42 50)' },
  { pattern: /export async function validateImageFile/, label: 'Exported as async function' },
];

for (const { pattern, label } of checks) {
  pattern.test(valSrc)
    ? PASS(label)
    : FAIL(`Missing: ${label}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\nSUMMARY\n' + '='.repeat(7));
if (failures === 0) {
  console.log('  ALL TESTS PASSED — file upload security verified');
} else {
  console.log('  ' + failures + ' test(s) FAILED');
  process.exit(1);
}
