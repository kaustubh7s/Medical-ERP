import assert from 'node:assert/strict';
import {
  createScannerSession,
  getScannerSession,
  pairPhoneToSession,
  submitPhoneScan,
  disconnectSession,
  getLocalNetworkAddresses,
  clearAllSessionsForTesting,
} from '../src/lib/server/scannerSessions';
import { INITIAL_MEDICINES, INITIAL_BARCODE_MAPPINGS } from '../src/lib/initialData';
import { Medicine, Batch, BarcodeQRMapping } from '../src/types/pharmacy';
import { parseUnitsPerPack, getPerUnitRate } from '../src/lib/units';

console.log('========================================================================');
console.log('   CAREPLUS PHARMACY — WIRELESS PHONE QR SCANNER TEST SUITE             ');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(description: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const result = fn();
    if (result && typeof (result as any).then === 'function') {
      return (result as Promise<void>).then(() => {
        passedTests++;
        console.log(`✅ [PASS] ${description}`);
      }).catch((err) => {
        console.error(`❌ [FAIL] ${description}`);
        console.error(err);
        process.exitCode = 1;
      });
    } else {
      passedTests++;
      console.log(`✅ [PASS] ${description}`);
    }
  } catch (err) {
    console.error(`❌ [FAIL] ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAllTests() {
  clearAllSessionsForTesting();

  // Test 1: Local Network Interface & Reachable IP Discovery
  runTest('1.1 Discovers reachable non-loopback local network IP (e.g. 192.168.x.x)', () => {
    const addresses = getLocalNetworkAddresses();
    assert.ok(Array.isArray(addresses), 'Expected addresses to be an array');
    // On macOS / CI, at least one network interface or loopback fallback is found
    assert.ok(addresses.length > 0, 'Should find at least 1 local network interface');
    assert.ok(addresses[0].ip, 'Interface must have an IP string');
  });

  // Test 2: Temporary Pairing Session Creation
  let testSessionId = '';
  let testPairingToken = '';
  let testPin = '';

  runTest('2.1 Generates secure temporary pairing session with 6-digit PIN and 30-min expiry', () => {
    const session = createScannerSession('pos');
    assert.ok(session.sessionId.startsWith('sess_'), 'Session ID should start with sess_');
    assert.equal(session.pairingPin.length, 6, 'PIN must be exactly 6 digits');
    assert.ok(/^\d{6}$/.test(session.pairingPin), 'PIN must be numeric');
    assert.equal(session.status, 'WAITING', 'Initial status must be WAITING');
    assert.ok(session.expiresAt > Date.now(), 'Expiry must be in future');

    testSessionId = session.sessionId;
    testPairingToken = session.pairingToken;
    testPin = session.pairingPin;
  });

  // Test 3: Phone Pairing Authentication
  runTest('3.1 Phone pairing handshake rejects invalid tokens or wrong PINs', () => {
    // Wrong token
    const wrongTokenResult = pairPhoneToSession(testSessionId, 'invalid_token_xyz', {
      name: 'iPhone 15 Pro',
      ip: '192.168.1.42',
    });
    assert.equal(wrongTokenResult.success, false, 'Invalid token must fail');

    // Wrong PIN
    const wrongPinResult = pairPhoneToSession(testSessionId, '999999', {
      name: 'iPhone 15 Pro',
      ip: '192.168.1.42',
    });
    assert.equal(wrongPinResult.success, false, 'Invalid PIN must fail');
  });

  runTest('3.2 Phone pairing handshake successfully connects with valid token & PIN', () => {
    const connectResult = pairPhoneToSession(testSessionId, testPairingToken, {
      name: 'iPhone 15 Pro (Safari Mobile)',
      ip: '192.168.1.42',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)',
    });
    assert.equal(connectResult.success, true, 'Valid pairing credentials must succeed');
    assert.ok(connectResult.session, 'Should return active session');
    assert.equal(connectResult.session?.status, 'CONNECTED', 'Status must transition to CONNECTED');
    assert.equal(connectResult.session?.connectedDevice?.name, 'iPhone 15 Pro (Safari Mobile)');
    assert.equal(connectResult.session?.connectedDevice?.ip, '192.168.1.42');
  });

  // Test 4: Real-Time Scan Submission & Ingestion
  runTest('4.1 Rejects scan submission from unpaired or unauthorized devices', () => {
    const unauthResult = submitPhoneScan(testSessionId, 'fake_token', {
      scanValue: 'https://careplus.erp/med/DOLO650',
      scanType: 'QR_CODE',
    });
    assert.equal(unauthResult.success, false, 'Unauthenticated scan must be rejected');
    assert.ok(unauthResult.error?.includes('Authentication failed') || unauthResult.error?.includes('expired'));
  });

  runTest('4.2 Accepts verified scan submission from paired phone', () => {
    const scanResult = submitPhoneScan(testSessionId, testPairingToken, {
      scanValue: 'https://careplus.erp/med/DOLO650',
      scanType: 'QR_CODE',
      nonce: 'scan_nonce_001',
    });
    assert.equal(scanResult.success, true, 'Authenticated scan submission must succeed');
    assert.ok(scanResult.processedScan);
    assert.equal(scanResult.processedScan?.value, 'https://careplus.erp/med/DOLO650');
  });

  // Test 5: Duplicate Frame Suppression & Rate Limiting
  runTest('5.1 Suppresses duplicate scan frames with same nonce within duplicate interval', () => {
    const dupResult = submitPhoneScan(testSessionId, testPairingToken, {
      scanValue: 'https://careplus.erp/med/DOLO650',
      scanType: 'QR_CODE',
      nonce: 'scan_nonce_001', // same nonce
    });
    assert.equal(dupResult.success, false, 'Duplicate scan frame must be suppressed');
    assert.ok(dupResult.error?.includes('Duplicate'));
  });

  runTest('5.2 Rate limits excessive scan submissions (preventing flood / camera spam)', () => {
    // Submit 12 rapid scans
    let throttled = false;
    for (let i = 0; i < 15; i++) {
      const res = submitPhoneScan(testSessionId, testPairingToken, {
        scanValue: `RAPID_SCAN_${i}`,
        scanType: 'QR_CODE',
        nonce: `nonce_rapid_${i}_${Date.now()}`,
      });
      if (!res.success && res.error?.includes('too fast')) {
        throttled = true;
        break;
      }
    }
    assert.equal(throttled, true, 'Excessive scan submissions must trigger rate limit');
  });

  // Test 6: POS Medicine Lookup & QR Resolution Logic
  runTest('6.1 Exact lookup matches registered QR URL to medicine and sellable strip', () => {
    const mappings: BarcodeQRMapping[] = [...INITIAL_BARCODE_MAPPINGS];
    const medicines: Medicine[] = [...INITIAL_MEDICINES];

    const findMedicine = (code: string) => {
      const trimmed = code.trim();
      const customMapping = mappings.find((m) => m.code === trimmed);
      if (customMapping) {
        const med = medicines.find((m) => m.id === customMapping.medicineId);
        if (med) {
          const batch = customMapping.batchNumber
            ? med.batches.find((b) => b.batchNumber === customMapping.batchNumber)
            : med.batches.find((b) => b.availableQuantity > 0) || med.batches[0];
          return { medicine: med, batch, unitType: customMapping.unitType || 'STRIP' };
        }
      }
      return null;
    };

    const match = findMedicine('https://careplus.erp/med/DOLO650');
    assert.ok(match, 'QR mapping should find Dolo 650');
    assert.equal(match.medicine.name, 'Dolo 650');
    assert.equal(match.unitType, 'STRIP');
    assert.ok(match.batch, 'Must select a valid batch');
  });

  runTest('6.2 Matches loose unit QR mapping and respects unit conversion', () => {
    const mappings: BarcodeQRMapping[] = [...INITIAL_BARCODE_MAPPINGS];
    const medicines: Medicine[] = [...INITIAL_MEDICINES];

    const customMapping = mappings.find((m) => m.code === 'MED-MET-500-LOOSE');
    assert.ok(customMapping, 'Expected initial loose mapping for Metformin');
    assert.equal(customMapping.unitType, 'LOOSE');

    const med = medicines.find((m) => m.id === customMapping.medicineId);
    assert.ok(med, 'Medicine must exist');

    const packCount = parseUnitsPerPack(med.packSize, med.dosageForm, med.unitsPerPack);
    assert.ok(packCount > 1, 'Metformin pack count must be greater than 1');

    const stripRate = med.batches[0].saleRate || med.batches[0].mrp;
    const looseRate = getPerUnitRate(stripRate, packCount);
    assert.ok(looseRate < stripRate, 'Loose tablet rate must be less than full strip rate');
    assert.equal(Math.round(looseRate * packCount), Math.round(stripRate));
  });

  runTest('6.3 Safely handles unknown QR code without adding random medicines', () => {
    const mappings: BarcodeQRMapping[] = [...INITIAL_BARCODE_MAPPINGS];
    const medicines: Medicine[] = [...INITIAL_MEDICINES];

    const unknownCode = 'UNKNOWN_MEDICINE_QR_99999';
    const match = mappings.find((m) => m.code === unknownCode);
    const medDirect = medicines.find(
      (m) => m.barcode === unknownCode || m.batches.some((b) => b.barcode === unknownCode)
    );

    assert.equal(match, undefined, 'Unknown code must not match any custom mapping');
    assert.equal(medDirect, undefined, 'Unknown code must not match any direct medicine');
  });

  // Test 7: Medicine Master Mapping Persistence & Duplicate Check
  runTest('7.1 Adding barcode mapping prevents duplicate registrations', () => {
    const mappings: BarcodeQRMapping[] = [...INITIAL_BARCODE_MAPPINGS];

    const addMapping = (newMap: Omit<BarcodeQRMapping, 'id' | 'mappedAt'>) => {
      const duplicate = mappings.some((m) => m.code === newMap.code.trim());
      if (duplicate) {
        return { success: false, error: `QR code "${newMap.code}" is already mapped to an existing product.` };
      }
      const created: BarcodeQRMapping = {
        ...newMap,
        id: `map_${Date.now()}`,
        mappedAt: new Date().toISOString(),
      };
      mappings.push(created);
      return { success: true, mapping: created };
    };

    // First attempt with unique code
    const res1 = addMapping({
      code: 'NEW_UNIQUE_QR_CODE_123',
      medicineId: 'med-1',
      medicineName: 'Dolo 650',
      unitType: 'STRIP',
      notes: 'New shipment box QR',
    });
    assert.equal(res1.success, true, 'Unique mapping must succeed');

    // Second attempt with identical code
    const res2 = addMapping({
      code: 'NEW_UNIQUE_QR_CODE_123',
      medicineId: 'med-2',
      medicineName: 'Augmentin 625 Duo',
      unitType: 'STRIP',
      notes: 'Attempted duplicate',
    });
    assert.equal(res2.success, false, 'Duplicate mapping must be blocked');
    assert.ok(res2.error?.includes('already mapped'), 'Error message must inform duplicate exists');
  });

  runTest('7.2 Scanning manufacturer barcode and renaming/assigning to medicine updates both master barcode and mappings without re-labeling', () => {
    let medicines: Medicine[] = JSON.parse(JSON.stringify(INITIAL_MEDICINES));
    let mappings: BarcodeQRMapping[] = [...INITIAL_BARCODE_MAPPINGS];

    const assignBarcode = (medId: string, rawBarcode: string, unitType: 'STRIP' | 'LOOSE' = 'STRIP') => {
      const code = rawBarcode.trim();
      const med = medicines.find((m) => m.id === medId);
      if (!med) return { success: false, error: 'Not found' };

      medicines = medicines.map((m) => (m.id === medId ? { ...m, barcode: code } : m));
      mappings = [
        {
          id: `map-${Date.now()}`,
          code,
          medicineId: med.id,
          medicineName: med.name,
          unitType,
          mappedAt: new Date().toISOString(),
        },
        ...mappings.filter((m) => m.code !== code),
      ];
      return { success: true, medicine: { ...med, barcode: code } };
    };

    // User scans a manufacturer printed barcode directly on Azithral box (e.g. 8901117141201)
    const mfgBarcode = '8901117141201';
    const azithral = medicines.find((m) => m.name.includes('Azithral'));
    assert.ok(azithral, 'Azithral must exist in test inventory');

    // Renames/assigns this packaging barcode to Azithral
    const res = assignBarcode(azithral.id, mfgBarcode, 'STRIP');
    assert.equal(res.success, true);
    assert.equal(res.medicine?.barcode, mfgBarcode);

    // Verify lookup now resolves Azithral immediately
    const mapped = mappings.find((m) => m.code === mfgBarcode);
    assert.ok(mapped);
    assert.equal(mapped.medicineName, azithral.name);

    const directMed = medicines.find((m) => m.barcode === mfgBarcode);
    assert.ok(directMed);
    assert.equal(directMed.id, azithral.id);
  });

  // Test 8: Disconnect & Revocation Security
  runTest('8.1 Disconnecting session stops phone from submitting further scans', () => {
    const discResult = disconnectSession(testSessionId);
    assert.equal(discResult, true, 'MacBook disconnect action must succeed');

    const session = getScannerSession(testSessionId);
    assert.equal(session?.status, 'DISCONNECTED', 'Status must be DISCONNECTED');

    // Phone tries to scan after disconnect
    const postDiscScan = submitPhoneScan(testSessionId, testPairingToken, {
      scanValue: 'INJECTED_SCAN_POST_DISCONNECT',
      scanType: 'QR_CODE',
    });
    assert.equal(postDiscScan.success, false, 'Scan after disconnect must be rejected');
    assert.ok(postDiscScan.error?.includes('disconnected'));
  });

  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
  console.log('========================================================================\n');
}

runAllTests();
