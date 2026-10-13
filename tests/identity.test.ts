import {
  generatePlayerTag,
  parsePlayerIdentity,
} from '../src/utils/leaderboard';

console.log('🏷️  Starting Player # Identification Tag Test Suite...');

// Mock localStorage for node environment
const storage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => { storage[key] = val; },
  removeItem: (key: string) => { delete storage[key]; },
};

// 1. Test generatePlayerTag format
for (let i = 0; i < 50; i++) {
  const tag = generatePlayerTag();
  if (!/^#[1-9][0-9]{3}$/.test(tag)) {
    console.error(`❌ Invalid tag generated: ${tag}`);
    process.exit(1);
  }
}
console.log('  ✓ 50 random player tags verified format #XXXX (4 digits)');

// 2. Test parsePlayerIdentity with explicit playerTag
const entry1 = { runName: 'Speedster', playerName: 'Speedster', playerTag: '#4910' };
const parsed1 = parsePlayerIdentity(entry1);
if (parsed1.name !== 'Speedster' || parsed1.tag !== '#4910' || parsed1.fullName !== 'Speedster#4910') {
  console.error('❌ Failed parsing explicit playerTag:', parsed1);
  process.exit(1);
}
console.log('  ✓ Explicit playerTag parsed accurately: "Speedster#4910"');

// 3. Test parsePlayerIdentity with composite runName ("Alex#1234")
const entry2 = { runName: 'Alex#1234' };
const parsed2 = parsePlayerIdentity(entry2);
if (parsed2.name !== 'Alex' || parsed2.tag !== '#1234' || parsed2.fullName !== 'Alex#1234') {
  console.error('❌ Failed parsing composite runName:', parsed2);
  process.exit(1);
}
console.log('  ✓ Composite runName parsed into name and tag: "Alex" + "#1234"');

// 4. Test parsePlayerIdentity with default Run #1 (should NOT treat #1 as player discriminator)
const entry3 = { runName: 'Run #1' };
const parsed3 = parsePlayerIdentity(entry3);
if (parsed3.name !== 'Run #1' || parsed3.tag !== '' || parsed3.fullName !== 'Run #1') {
  console.error('❌ Failed preserving default Run #1 without misidentifying #1 as tag:', parsed3);
  process.exit(1);
}
console.log('  ✓ Default "Run #1" properly preserved without treating "#1" as discriminator tag');

// 5. Test parsePlayerIdentity with custom alphanumeric tag ("ProGamer#GG77")
const entry4 = { playerName: 'ProGamer', playerTag: 'GG77' };
const parsed4 = parsePlayerIdentity(entry4);
if (parsed4.name !== 'ProGamer' || parsed4.tag !== '#GG77' || parsed4.fullName !== 'ProGamer#GG77') {
  console.error('❌ Failed normalizing prefix-less tag:', parsed4);
  process.exit(1);
}
console.log('  ✓ Normalized prefix-less tag: "#GG77"');

console.log('🎉 Player # Identification Tag tests PASSED!\n');
