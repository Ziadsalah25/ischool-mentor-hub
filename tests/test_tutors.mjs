import { SEED_TUTORS, SEED_SCHOOLS, SEED_TPL } from "../public/js/data_seed.js";
import { S, seed, getTutorStats, findSubstitutes } from "../public/js/state.js";

console.log("=== Verifying Tutor Features & Dynamic Calculations ===");

// 1. Dataset checks
if (SEED_TUTORS.length !== 30) throw new Error(`Expected 30 tutors, got ${SEED_TUTORS.length}`);
if (SEED_SCHOOLS.length < 15) throw new Error(`Expected at least 15 schools, got ${SEED_SCHOOLS.length}`);
console.log("PASS: 30 tutors and schools verified in dataset.");

// 2. Stats calculation
const t1 = S.tutors[0];
const stats1 = getTutorStats(t1);
console.log(`PASS: Tutor ${t1.n} stats:`, {
  sessions: stats1.sessionsCount,
  schoolsCount: stats1.schoolsCount,
  schools: stats1.schools,
  availPct: stats1.availPct,
  occPct: stats1.occPct
});

if (typeof stats1.availPct !== "number" || typeof stats1.occPct !== "number") {
  throw new Error("Stats calculation failed!");
}
if (stats1.availPct + stats1.occPct > 105) {
  throw new Error("Availability and occupation sum should not exceed ~100%");
}

// 3. Substitute Finder
const subs = findSubstitutes({ dayIndex: 0, slotIndex: 1, gov: "Alexandria", lang: "English" });
if (!Array.isArray(subs) || subs.length === 0) throw new Error("Substitute finder returned empty list");
console.log(`PASS: Substitute finder returned ${subs.length} candidates.`);
const availableCandidates = subs.filter(c => c.isAvailable);
console.log(`PASS: ${availableCandidates.length} available tutors found for Sunday 09:00 AM.`);

console.log("ALL TUTOR AVAILABILITY TESTS PASSED!");
