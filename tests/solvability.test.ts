import { ROOMS, generateShuffledRoomRewards, applyShuffledRewards, validateRoomSolvability } from '../src/data/rooms';

console.log('🧪 Starting Room Solvability & Shuffling Test Suite...');

// 1. Test static baseline rooms
for (const room of ROOMS) {
  try {
    validateRoomSolvability(room);
    console.log(`  ✓ Room ${room.number} ("${room.name}") baseline: Solvable for "${room.targetWord}"`);
  } catch (err: any) {
    console.error(`  ❌ Room ${room.number} baseline failure:`, err.message);
    process.exit(1);
  }
}

// 2. Test 100 randomized shuffle runs
const RUN_COUNT = 100;
console.log(`\n🎲 Testing ${RUN_COUNT} randomized room reward shuffle iterations...`);

for (let run = 1; run <= RUN_COUNT; run++) {
  const shuffledRewards = generateShuffledRoomRewards(ROOMS);
  for (const room of ROOMS) {
    const activeRoom = applyShuffledRewards(room, shuffledRewards);
    try {
      validateRoomSolvability(activeRoom);
    } catch (err: any) {
      console.error(`  ❌ Shuffle iteration ${run} failed on Room ${room.number}:`, err.message);
      process.exit(1);
    }
  }
}

console.log(`  ✓ All ${RUN_COUNT} shuffle runs maintained 100% room solvability without missing Kana!`);
console.log('🎉 Solvability tests PASSED!\n');
