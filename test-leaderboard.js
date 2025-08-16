// test-leaderboard.js
// Simple test script to verify leaderboard functionality

const BASE_URL = 'https://alu-globe-gameroom.onrender.com';

async function testLeaderboard() {
  console.log('🧪 Testing ALU Globe Game Room Leaderboard System\n');

  try {
    // Test 1: Populate sample data
    console.log('1️⃣ Populating sample game data...');
    const populateResponse = await fetch(`${BASE_URL}/user/populate-sample-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const populateResult = await populateResponse.json();
    console.log('   Result:', populateResult.success ? '✅ Success' : '❌ Failed');
    if (populateResult.message) {
      console.log('   Message:', populateResult.message);
    }

    // Wait a moment for data to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Get global leaderboard
    console.log('\n2️⃣ Testing global leaderboard...');
    const globalResponse = await fetch(`${BASE_URL}/user/leaderboard`);
    const globalResult = await globalResponse.json();
    
    if (globalResult.success && globalResult.data) {
      console.log('   ✅ Global leaderboard retrieved successfully');
      console.log('   📊 Players found:', globalResult.data.length);
      if (globalResult.data.length > 0) {
        console.log('   🏆 Top player:', globalResult.data[0].username, 'with', globalResult.data[0].score, 'points');
      }
    } else {
      console.log('   ❌ Failed to get global leaderboard:', globalResult.error || 'Unknown error');
    }

    // Test 3: Get trivia-specific leaderboard
    console.log('\n3️⃣ Testing trivia leaderboard...');
    const triviaResponse = await fetch(`${BASE_URL}/user/leaderboard?gameType=trivia`);
    const triviaResult = await triviaResponse.json();
    
    if (triviaResult.success && triviaResult.data) {
      console.log('   ✅ Trivia leaderboard retrieved successfully');
      console.log('   📊 Players found:', triviaResult.data.length);
      if (triviaResult.data.length > 0) {
        console.log('   🏆 Top trivia player:', triviaResult.data[0].username, 'with', triviaResult.data[0].score, 'points');
      }
    } else {
      console.log('   ❌ Failed to get trivia leaderboard:', triviaResult.error || 'Unknown error');
    }

    // Test 4: Get chess-specific leaderboard
    console.log('\n4️⃣ Testing chess leaderboard...');
    const chessResponse = await fetch(`${BASE_URL}/user/leaderboard?gameType=chess`);
    const chessResult = await chessResponse.json();
    
    if (chessResult.success && chessResult.data) {
      console.log('   ✅ Chess leaderboard retrieved successfully');
      console.log('   📊 Players found:', chessResult.data.length);
      if (chessResult.data.length > 0) {
        console.log('   🏆 Top chess player:', chessResult.data[0].username, 'with', chessResult.data[0].score, 'points');
      }
    } else {
      console.log('   ❌ Failed to get chess leaderboard:', chessResult.error || 'Unknown error');
    }

    // Test 5: Test invalid game type
    console.log('\n5️⃣ Testing invalid game type...');
    const invalidResponse = await fetch(`${BASE_URL}/user/leaderboard?gameType=invalidgame`);
    const invalidResult = await invalidResponse.json();
    
    if (invalidResult.success !== false) {
      console.log('   ⚠️  Invalid game type should return empty results or error');
    } else {
      console.log('   ✅ Invalid game type handled correctly');
    }

    console.log('\n🎉 Leaderboard testing completed!');
    console.log('\n📝 Next steps:');
    console.log('   - Check the frontend LeaderboardPage to see the data');
    console.log('   - Verify the podium and table display correctly');
    console.log('   - Test different game type filters');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testLeaderboard();
