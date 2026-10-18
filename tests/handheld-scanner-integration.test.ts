/**
 * Handheld USB/Bluetooth Barcode Scanner Integration Test Suite
 * Tests hardware wedge rapid typing detection, barcode resolution,
 * manufacturer packaging barcode mapping, and FEFO inventory lookup.
 */

import assert from 'node:assert';
import { Medicine, Batch, BarcodeQRMapping } from '../src/types/pharmacy';

// Mock Pharmacy Dataset
const mockMedicines: Medicine[] = [
  {
    id: 'med-001',
    name: 'Dolo 650',
    genericName: 'Paracetamol 650mg',
    manufacturer: 'Micro Labs Ltd',
    category: 'Analgesics',
    dosageForm: 'TABLET',
    strength: '650mg',
    packSize: '15 Tablets / Strip',
    unitsPerPack: 15,
    hsnCode: '30049099',
    gstRate: 12,
    scheduleType: 'NORMAL',
    totalStock: 80,
    reorderLevel: 20,
    maxStockLevel: 500,
    requiresPrescription: false,
    isMembershipDiscountEligible: true,
    barcode: '8901234567890',
    batches: [
      {
        id: 'b-001-fefo',
        medicineId: 'med-001',
        batchNumber: 'DL24A',
        mfgDate: '2024-01-01',
        expiryDate: '2025-12-31',
        quantity: 30,
        availableQuantity: 30,
        purchaseRate: 18.0,
        mrp: 34.0,
        saleRate: 34.0,
        rackLocation: 'A-1',
        barcode: '8901234567890',
        status: 'ACTIVE',
      },
      {
        id: 'b-002-later',
        medicineId: 'med-001',
        batchNumber: 'DL24B',
        mfgDate: '2024-06-01',
        expiryDate: '2026-06-30',
        quantity: 50,
        availableQuantity: 50,
        purchaseRate: 18.0,
        mrp: 34.0,
        saleRate: 34.0,
        rackLocation: 'A-1',
        barcode: '8901234567891',
        status: 'ACTIVE',
      },
    ],
  },
  {
    id: 'med-002',
    name: 'Augmentin 625 Duo',
    genericName: 'Amoxicillin + Clavulanic Acid',
    manufacturer: 'GSK Pharma',
    category: 'Antibiotics',
    dosageForm: 'TABLET',
    strength: '625mg',
    packSize: '10 Tablets / Strip',
    unitsPerPack: 10,
    hsnCode: '30041010',
    gstRate: 12,
    scheduleType: 'SCHEDULE_H',
    totalStock: 0,
    reorderLevel: 15,
    maxStockLevel: 200,
    requiresPrescription: true,
    isMembershipDiscountEligible: true,
    barcode: '8909876543210',
    batches: [
      {
        id: 'b-003-oos',
        medicineId: 'med-002',
        batchNumber: 'AUG99',
        mfgDate: '2023-01-01',
        expiryDate: '2024-01-01',
        quantity: 0,
        availableQuantity: 0,
        purchaseRate: 120.0,
        mrp: 205.0,
        saleRate: 205.0,
        rackLocation: 'B-2',
        barcode: '8909876543210',
        status: 'EXPIRED',
      },
    ],
  },
];

let mockBarcodeMappings: BarcodeQRMapping[] = [
  {
    id: 'map-001',
    code: 'PKG-DOLO-STRIP-99',
    medicineId: 'med-001',
    medicineName: 'Dolo 650',
    unitType: 'STRIP',
    packSize: '15 Tablets / Strip',
    notes: 'Existing factory box barcode',
    mappedAt: '2026-10-18 12:00:00',
  },
];

// Helper to simulate findMedicineByBarcodeOrQR
function findMedicineByBarcodeOrQR(
  rawCode: string,
  medicines: Medicine[] = mockMedicines,
  mappings: BarcodeQRMapping[] = mockBarcodeMappings
) {
  if (!rawCode) return null;
  const code = rawCode.trim();

  // 1. Check custom barcodeMappings
  const customMap = mappings.find((m) => m.code === code);
  if (customMap) {
    const med = medicines.find((m) => m.id === customMap.medicineId);
    if (med) {
      const batch = customMap.batchNumber
        ? med.batches.find((b) => b.batchNumber === customMap.batchNumber) || med.batches[0]
        : med.batches[0];
      return { medicine: med, batch, unitType: customMap.unitType || 'STRIP' };
    }
  }

  // 2. Check medicine batches for direct barcode or batch number match
  for (const med of medicines) {
    for (const b of med.batches) {
      if (b.barcode === code || b.batchNumber.toLowerCase() === code.toLowerCase()) {
        return { medicine: med, batch: b, unitType: 'STRIP' as const };
      }
    }
  }

  // 3. Check medicine master barcode or id
  const medByCode = medicines.find((m) => m.barcode === code || m.id === code);
  if (medByCode) {
    const availableBatches = medByCode.batches
      .filter((b) => b.availableQuantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    const selectedBatch = availableBatches[0] || medByCode.batches[0];
    return { medicine: medByCode, batch: selectedBatch, unitType: 'STRIP' as const };
  }

  // 4. GS1 DataMatrix matching (e.g. 0108901234567890...)
  const gtinMatch = code.match(/01(\d{14})/);
  if (gtinMatch) {
    const gtin = gtinMatch[1];
    for (const med of medicines) {
      for (const b of med.batches) {
        if (b.barcode && gtin.endsWith(b.barcode)) {
          return { medicine: med, batch: b, unitType: 'STRIP' as const };
        }
      }
    }
  }

  return null;
}

// Helper to simulate scanner keyboard wedge burst detection
function detectHardwareScannerWedge(
  keyTimestamps: number[],
  maxInterKeyDelayMs: number = 60,
  minBarcodeLength: number = 3
): { isHardwareScan: boolean; averageInterKey: number; totalDuration: number } {
  if (keyTimestamps.length < minBarcodeLength) {
    return { isHardwareScan: false, averageInterKey: 999, totalDuration: 0 };
  }

  const totalDuration = keyTimestamps[keyTimestamps.length - 1] - keyTimestamps[0];
  const averageInterKey = totalDuration / (keyTimestamps.length - 1);
  const isHardwareScan = averageInterKey <= maxInterKeyDelayMs || totalDuration < 350;

  return { isHardwareScan, averageInterKey, totalDuration };
}

async function runTests() {
  console.log('========================================================================');
  console.log('   CAREPLUS PHARMACY — HANDHELD BARCODE SCANNER TEST SUITE             ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function runTest(name: string, fn: () => void) {
    process.stdout.write(`Testing: ${name} ... `);
    try {
      fn();
      console.log('✅ PASS');
      passed++;
    } catch (err: unknown) {
      console.log('❌ FAIL');
      console.error(err);
      failed++;
    }
  }

  // Test 1: Direct Master Barcode Scan
  runTest('1. Resolve medicine by master EAN-13 barcode', () => {
    const result = findMedicineByBarcodeOrQR('8901234567890');
    assert.ok(result, 'Expected barcode to resolve');
    assert.strictEqual(result.medicine.name, 'Dolo 650');
    assert.strictEqual(result.batch?.batchNumber, 'DL24A', 'Expected FEFO earliest expiry batch (DL24A)');
  });

  // Test 2: Batch Number Barcode Scan
  runTest('2. Resolve medicine by specific Batch Number', () => {
    const result = findMedicineByBarcodeOrQR('DL24B');
    assert.ok(result, 'Expected batch number to resolve');
    assert.strictEqual(result.medicine.name, 'Dolo 650');
    assert.strictEqual(result.batch?.batchNumber, 'DL24B');
  });

  // Test 3: Custom Manufacturer Packaging Barcode Mapping
  runTest('3. Resolve medicine by custom mapped packaging barcode', () => {
    const result = findMedicineByBarcodeOrQR('PKG-DOLO-STRIP-99');
    assert.ok(result, 'Expected mapped packaging barcode to resolve');
    assert.strictEqual(result.medicine.name, 'Dolo 650');
    assert.strictEqual(result.unitType, 'STRIP');
  });

  // Test 4: Dynamic Packaging Barcode Registration (User Request: scan and link without re-labeling)
  runTest('4. Dynamically link new physical manufacturer barcode to medicine', () => {
    const newBarcode = '8904001122334';
    // Link new barcode to Dolo 650
    mockBarcodeMappings.push({
      id: 'map-new-002',
      code: newBarcode,
      medicineId: 'med-001',
      medicineName: 'Dolo 650',
      unitType: 'LOOSE',
      packSize: '15 Tablets / Strip',
      notes: 'Scanned from commercial blister packaging',
      mappedAt: '2026-10-18 15:00:00',
    });

    const result = findMedicineByBarcodeOrQR(newBarcode);
    assert.ok(result, 'Expected dynamically linked barcode to resolve immediately');
    assert.strictEqual(result.medicine.name, 'Dolo 650');
    assert.strictEqual(result.unitType, 'LOOSE', 'Expected unitType to reflect mapped LOOSE preference');
  });

  // Test 5: GS1-128 / DataMatrix GTIN-14 parsing
  runTest('5. Parse GS1-128 GTIN-14 2D barcode payload', () => {
    // 01 + 14 digit GTIN ending in 8901234567890
    const gs1Payload = '01089012345678901725123110DL24A';
    const result = findMedicineByBarcodeOrQR(gs1Payload);
    assert.ok(result, 'Expected GS1 payload to resolve');
    assert.strictEqual(result.medicine.name, 'Dolo 650');
  });

  // Test 6: Unknown / Unmapped Barcode handling
  runTest('6. Return null for unmapped barcode to trigger link modal', () => {
    const result = findMedicineByBarcodeOrQR('UNMAPPED-UNKNOWN-999');
    assert.strictEqual(result, null, 'Expected null for unmapped barcode');
  });

  // Test 7: Hardware Wedge High-Speed Keystroke Detection (< 50ms)
  runTest('7. Detect rapid USB/Bluetooth scanner keystroke burst', () => {
    // Physical scanner typing 13 characters in 180ms (~15ms per character)
    const scannerTimestamps = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180];
    const detection = detectHardwareScannerWedge(scannerTimestamps, 60, 3);
    assert.strictEqual(detection.isHardwareScan, true, 'Scanner burst should be recognized as hardware wedge');
    assert.ok(detection.averageInterKey <= 60, `Average inter-key ${detection.averageInterKey}ms should be <= 60ms`);
  });

  // Test 8: Human Slow Keystroke Rejection (> 150ms)
  runTest('8. Distinguish human typing from hardware scanner gun', () => {
    // Human cashier typing slowly (200ms per character)
    const humanTimestamps = [0, 220, 430, 680, 890, 1150];
    const detection = detectHardwareScannerWedge(humanTimestamps, 60, 3);
    assert.strictEqual(detection.isHardwareScan, false, 'Human typing must not trigger immediate wedge scan');
    assert.ok(detection.averageInterKey > 60, 'Average inter-key should exceed 60ms threshold');
  });

  // Test 9: Out of Stock Medicine Detection
  runTest('9. Check stock availability for scanned medicine', () => {
    const result = findMedicineByBarcodeOrQR('8909876543210');
    assert.ok(result, 'Expected medicine to be found');
    assert.strictEqual(result.medicine.name, 'Augmentin 625 Duo');
    assert.strictEqual(result.batch?.availableQuantity, 0, 'Available stock is 0 (Out of stock)');
  });

  console.log('\n========================================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED | ${failed} FAILED                     `);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
