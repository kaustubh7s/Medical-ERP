import { INITIAL_MEDICINES } from '../src/lib/initialData';

function extractCleanSaltKey(genericName: string): string {
  if (!genericName) return '';
  return genericName
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\b(tablets?|capsules?|syrup|suspension|injection|cream|ointment|gel|inhaler|ip|bp|usp|sr|er|pr|cr)\b/gi, '')
    .replace(/[0-9]+(\.[0-9]+)?\s*(mg|mcg|ml|iu|g|%|units|w\/v)\b/gi, '')
    .replace(/[^a-z0-9\+]/gi, ' ')
    .split('+')
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => s.length > 2)
    .sort()
    .join(' + ');
}

function areSaltsMatching(generic1: string, generic2: string): boolean {
  if (!generic1 || !generic2) return false;
  const key1 = extractCleanSaltKey(generic1);
  const key2 = extractCleanSaltKey(generic2);
  if (key1 && key2 && key1 === key2) return true;

  const parts1 = key1.split(' + ');
  const parts2 = key2.split(' + ');
  if (parts1.length > 0 && parts2.length > 0) {
    if (parts1.every((p) => parts2.includes(p)) || parts2.every((p) => parts1.includes(p))) {
      return true;
    }
  }
  return false;
}

let passed = 0;
let failed = 0;

function assert(description: string, condition: boolean) {
  if (condition) {
    console.log(`✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${description}`);
    failed++;
  }
}

console.log('========================================================================');
console.log('  CAREPLUS PHARMACY — 1-CLICK GENERIC SALT SUBSTITUTE SWAP TESTS        ');
console.log('========================================================================\n');

// 1. Salt key extraction
assert(
  'Extract clean key for Amoxicillin + Clavulanic Acid with parentheses & strengths',
  extractCleanSaltKey('Amoxicillin (500mg) + Clavulanic Acid (125mg)') === 'amoxicillin + clavulanic acid'
);

assert(
  'Extract clean key for Paracetamol with dosage',
  extractCleanSaltKey('Paracetamol 650mg') === 'paracetamol'
);

assert(
  'Extract clean key for Tranexamic Acid Tablets IP 500mg',
  extractCleanSaltKey('Tranexamic Acid Tablets IP 500mg') === 'tranexamic acid'
);

// 2. Salt matching
assert(
  'Match Augmentin 625 Duo salt with Moxikind-CV 625 salt',
  areSaltsMatching('Amoxicillin (500mg) + Clavulanic Acid (125mg)', 'Amoxicillin (500mg) + Clavulanic Acid (125mg)')
);

assert(
  'Match Dolo 650 with Crocin 650',
  areSaltsMatching('Paracetamol 650mg', 'Paracetamol 650mg')
);

assert(
  'Match Pause-500 with Trapic 500',
  areSaltsMatching('Tranexamic Acid Tablets IP 500mg', 'Tranexamic Acid Tablets IP 500mg')
);

assert(
  'Do NOT match Paracetamol with Telmisartan',
  !areSaltsMatching('Paracetamol 650mg', 'Telmisartan 40mg')
);

// 3. Catalog substitute detection
const crocin = INITIAL_MEDICINES.find((m) => m.name.includes('Crocin 650'));
assert('Crocin 650 exists in initial catalog and is Out of Stock', Boolean(crocin && crocin.totalStock === 0));

if (crocin) {
  const crocinAlts = INITIAL_MEDICINES.filter(
    (m) => m.id !== crocin.id && m.totalStock > 0 && areSaltsMatching(m.genericName, crocin.genericName)
  );
  assert(
    `Crocin 650 has at least 2 in-stock substitutes (Dolo 650 & Calpol 650) - found ${crocinAlts.length}`,
    crocinAlts.length >= 2 && crocinAlts.some((m) => m.name.includes('Dolo')) && crocinAlts.some((m) => m.name.includes('Calpol'))
  );
}

const clavam = INITIAL_MEDICINES.find((m) => m.name === 'Clavam 625');
assert('Clavam 625 exists in initial catalog and is Out of Stock', Boolean(clavam && clavam.totalStock === 0));

if (clavam) {
  const clavamAlts = INITIAL_MEDICINES.filter(
    (m) => m.id !== clavam.id && m.totalStock > 0 && areSaltsMatching(m.genericName, clavam.genericName)
  );
  assert(
    `Clavam 625 has in-stock substitutes (Augmentin & Moxikind) - found ${clavamAlts.length}`,
    clavamAlts.length >= 2 && clavamAlts.some((m) => m.name.includes('Augmentin')) && clavamAlts.some((m) => m.name.includes('Moxikind'))
  );
}

const trapic = INITIAL_MEDICINES.find((m) => m.name === 'Trapic 500');
assert('Trapic 500 exists in initial catalog and is Out of Stock', Boolean(trapic && trapic.totalStock === 0));

if (trapic) {
  const trapicAlts = INITIAL_MEDICINES.filter(
    (m) => m.id !== trapic.id && m.totalStock > 0 && areSaltsMatching(m.genericName, trapic.genericName)
  );
  assert(
    `Trapic 500 has in-stock substitute Pause-500 - found ${trapicAlts.length}`,
    trapicAlts.length >= 1 && trapicAlts.some((m) => m.name.includes('Pause-500'))
  );
}

console.log(`\n========================================================================`);
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================================================\n`);

if (failed > 0) process.exit(1);
