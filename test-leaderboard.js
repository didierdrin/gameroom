// test-leaderboard.js
// Simple test script to verify leaderboard functionality

const BASE_URL = 'https://alu-globe-gameroom.onrender.com';

async function testLeaderboard() {
  console.log('🧪 Testing ALU Globe Game Room Leaderboard System\n');

  try {
    // Test 1: Get global leaderboard
    console.log('1️⃣ Testing global leaderboard...');
    const globalResponse = await fetch(`${BASE_URL}/user/leaderboard`);
    const globalResult = await globalResponse.json();
    
    if (globalResult.success && globalResult.data) {
      console.log('   ✅ Global leaderboard retrieved successfully');
      console.log('   📊 Players found:', globalResult.data.length);
      if (globalResult.data.length > 0) {
        console.log('   🏆 Top player:', globalResult.data[0].username, 'with', globalResult.data[0].score, 'points');
        console.log('   🎮 Games played:', globalResult.data[0].gamesPlayed);
        console.log('   🏅 Games won:', globalResult.data[0].gamesWon);
        if (globalResult.data[0].winRate !== undefined) {
          console.log('   📈 Win rate:', Math.round(globalResult.data[0].winRate) + '%');
        }
      }
    } else {
      console.log('   ❌ Failed to get global leaderboard:', globalResult.error || 'Unknown error');
    }

    // Test 2: Get trivia-specific leaderboard
    console.log('\n2️⃣ Testing trivia leaderboard...');
    const triviaResponse = await fetch(`${BASE_URL}/user/leaderboard?gameType=trivia`);
    const triviaResult = await triviaResponse.json();
    
    if (triviaResult.success && triviaResult.data) {
      console.log('   ✅ Trivia leaderboard retrieved successfully');
      console.log('   📊 Players found:', triviaResult.data.length);
      if (triviaResult.data.length > 0) {
        console.log('   🏆 Top trivia player:', triviaResult.data[0].username);
      }
    } else {
      console.log('   ❌ Failed to get trivia leaderboard:', triviaResult.error || 'Unknown error');
    }

    // Test 3: Get chess-specific leaderboard
    console.log('\n3️⃣ Testing chess leaderboard...');
    const chessResponse = await fetch(`${BASE_URL}/user/leaderboard?gameType=chess`);
    const chessResult = await chessResponse.json();
    
    if (chessResult.success && chessResult.data) {
      console.log('   ✅ Chess leaderboard retrieved successfully');
      console.log('   📊 Players found:', chessResult.data.length);
      if (chessResult.data.length > 0) {
        console.log('   🏆 Top chess player:', chessResult.data[0].username);
      }
    } else {
      console.log('   ❌ Failed to get chess leaderboard:', chessResult.error || 'Unknown error');
    }

    // Test 4: Get ludo-specific leaderboard
    console.log('\n4️⃣ Testing ludo leaderboard...');
    const ludoResponse = await fetch(`${BASE_URL}/user/leaderboard?gameType=ludo`);
    const ludoResult = await ludoResponse.json();
    
    if (ludoResult.success && ludoResult.data) {
      console.log('   ✅ Ludo leaderboard retrieved successfully');
      console.log('   📊 Players found:', ludoResult.data.length);
      if (ludoResult.data.length > 0) {
        console.log('   🏆 Top ludo player:', ludoResult.data[0].username);
      }
    } else {
      console.log('   ❌ Failed to get ludo leaderboard:', ludoResult.error || 'Unknown error');
    }

    console.log('\n🎉 Leaderboard testing completed!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

// Run the test
testLeaderboard();
