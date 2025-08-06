
import {
  call,
  // delay,
  apply,
  put,
  select,
  take, 
  // takeLatest,
} from 'redux-saga/effects';

import { api } from '../../../common/http';
import { mapByProperty } from '../../../common/utils';
import { enableDie, invalidateDieRoll } from '../../../containers/Dice/state/actions';
import { Rolls } from '../../../containers/Dice/state/interfaces';
import { currentDieRollSelector } from '../../../containers/Dice/state/selectors';
import { WINNING_MOVES } from '../../../globalConstants';
import { BaseColors, WalkwayPosition } from '../../../state/interfaces';

import {
  disqualifyCoin,
  enableBase,
  getInitialGameDataSuccess,
  homeCoin,
  liftCoin,
  markWinner,
  moveCoin,
  moveCoinFailure,
  moveCoinSuccess,
  nextTurn,
  passTurnTo,
  placeCoin,
  setPlayers,
  spawnCoin,
  spawnCoinSuccess,
  ActionTypes,
} from './actions';
import {
  BaseID,
  BoardEntities,
  CellType,
  ICell,
  ICoin,
  IServerGameData,
  IState,
} from './interfaces';
import {
  basesSelector,
  cellsSelector,
  coinsSelector,
  currentTurnSelector,
  linksSelector,
  walkwaysSelector,
} from './selectors';

// function * watchForGetInitialGameData() {
//   yield takeLatest(ActionTypes.GET_INITIAL_GAME_DATA, getInitialGameDataSaga);
// }
function * watchForGetInitialGameData() {
  while (true) {
    yield take(ActionTypes.GET_INITIAL_GAME_DATA);
    yield call(getInitialGameDataSaga);
  }
}

function * getInitialGameDataSaga() {
  const data: IServerGameData = yield call(api.get as any, { url: '/initialGameData.json' });
  const basesArray = data.bases.map((base) => ({ ...base, spawnable: false }));
  const bases = mapByProperty(basesArray, 'ID');
  const coins = data.coins.map((coin) => ({ ...coin, color: bases[coin.baseID].color }));
  const gameData: IState = {
    bases,
    cells: data.cells,
    coins: mapByProperty(coins, 'coinID'),
    currentTurn: BaseID.BASE_3,
    links: data.links,
    relationships: data.relationships,
    walkways: mapByProperty(data.walkways, 'ID'),
  };
  yield put(getInitialGameDataSuccess(gameData));
}





function * watchForSpawnCoin() {
  while (true) {
    const action: ReturnType<typeof spawnCoin> = yield take(ActionTypes.SPAWN_COIN);
    yield call(spawnCoinSaga, action);
  }
}

function * spawnCoinSaga(action: ReturnType<typeof spawnCoin> | undefined) {
  if (!action || !action.data) return; 
  const { baseID, coinID } = action.data;
  const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
  const walkways: ReturnType<typeof walkwaysSelector> = yield select(walkwaysSelector);
  const cells: ReturnType<typeof cellsSelector> = yield select(cellsSelector);
  const base = bases[baseID];
  const walkway = Object.values(walkways).find((walkway) => walkway.baseID === baseID)!;
  const walkwayCells = cells[walkway.position];
  const spawnCellForCoin = Object.values(walkwayCells).find((cell) => cell.cellType === CellType.SPAWN)!;
  const coinIDToSpawn = base.coinIDs.find((ID) => ID === coinID)!;

  yield put(spawnCoinSuccess(spawnCellForCoin.cellID, coinIDToSpawn, baseID, walkway.position));
  yield put(invalidateDieRoll());
}

// function * spawnCoinSaga(action: ReturnType<typeof spawnCoin>) {
//   if ( !action || !action.data) return; 
//   const { baseID, coinID } = action.data!;
//   const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
//   const walkways: ReturnType<typeof walkwaysSelector> = yield select(walkwaysSelector);
//   const cells: ReturnType<typeof cellsSelector> = yield select(cellsSelector);
//   const base = bases[baseID];
//   const walkway = Object.values(walkways).find((walkway) => walkway.baseID === baseID)!;
//   const walkwayCells = cells[walkway.position];
//   const spawnCellForCoin = Object.values(walkwayCells).find((cell) => cell.cellType === CellType.SPAWN)!;
//   const coinIDToSpawn = base.coinIDs.find((ID) => ID === coinID)!;

//   yield put(spawnCoinSuccess(spawnCellForCoin.cellID, coinIDToSpawn, baseID, walkway.position));
//   yield put(invalidateDieRoll());
// }

// function * watchForMoveCoin() {
//   yield take(ActionTypes.MOVE_COIN, moveCoinSaga);
// }
function * watchForMoveCoin() {
  while (true) {
    const action: ReturnType<typeof moveCoin> = yield take(ActionTypes.MOVE_COIN);
    yield call(moveCoinSaga as any, action);
  }
}

// function * isCurrentMoveValid(coinID: ICoin['coinID'], stepsToTake: Rolls) {
//   const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
//   const coin = coins[coinID];
//   return coin.steps + stepsToTake <= WINNING_MOVES;
// }

function * isCurrentMoveValid() {
  const coinID: ICoin['coinID'] = yield select((state) => state.ludo.currentCoinID); // You'd need to add this to state
  const stepsToTake: Rolls = yield select(currentDieRollSelector);
  const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
  const coin = coins[coinID];
  return coin.steps + stepsToTake <= WINNING_MOVES;
}

// export function * getMovableCoins(stepsToTake: Rolls) {
//   const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
//   const currentTurnBase: ReturnType<typeof currentTurnSelector> = yield select(currentTurnSelector);
//   const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
//   const movableCoins =
//     bases[currentTurnBase].coinIDs
//     .filter((coinID) =>
//       coins[coinID].isSpawned
//       && !coins[coinID].isRetired
//       && coins[coinID].steps + stepsToTake <= WINNING_MOVES,
//     );
//   return movableCoins;
// }


export function * getMovableCoins() {
  const stepsToTake: Rolls = yield select(currentDieRollSelector);
  const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
  const currentTurnBase: ReturnType<typeof currentTurnSelector> = yield select(currentTurnSelector);
  const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
  const movableCoins =
    bases[currentTurnBase].coinIDs
    .filter((coinID) =>
      coins[coinID].isSpawned
      && !coins[coinID].isRetired
      && coins[coinID].steps + stepsToTake <= WINNING_MOVES,
    );
  return movableCoins;
}

function * moveCoinSaga(action: ReturnType<typeof moveCoin>) {
  let { cellID, walkwayPosition } = { ...action.data! };
  const { coinID } = action.data!;
  const currentDieRoll: ReturnType<typeof currentDieRollSelector> = yield select(currentDieRollSelector);

  // const movableCoins: ICoin['coinID'][] = yield call(getMovableCoins, currentDieRoll);
  // const isCurrentMovePossible: boolean = yield call(isCurrentMoveValid, coinID, currentDieRoll);
  const movableCoins: ICoin['coinID'][] = yield call(getMovableCoins);
  const isCurrentMovePossible: boolean = yield call(isCurrentMoveValid);

  if (movableCoins.length === 0) {
    yield put(moveCoinFailure());
    yield put(nextTurn());
    yield put(enableDie());
    return;
  } else if (!isCurrentMovePossible) {
    yield put(moveCoinFailure());
    return;
  }

  yield put(invalidateDieRoll());

  let bonusChanceForHomeCoin = false;

  for (let i = 0; i < currentDieRoll; i++) {
    const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
    const cells: ReturnType<typeof cellsSelector> = yield select(cellsSelector);
    const links: ReturnType<typeof linksSelector> = yield select(linksSelector);
    const nextCells = links[cellID];
    let nextCell;

    // Possibility of entering HOMEPATH
    nextCell = nextCells.length > 1
    ? nextCells.find(
      (cell) =>
        cells[cell.position][cell.cellID].cellType === CellType.HOMEPATH
        && coins[coinID].baseID === cells[cell.position][cell.cellID].baseID,
    ) || nextCells[0]
    : nextCells[0];

    yield put(liftCoin(cellID, coinID, walkwayPosition));
    if (nextCell.cellID === 'HOME') {
      yield put(homeCoin(coinID));
      bonusChanceForHomeCoin = true;
    } else {
      yield put(placeCoin(nextCell.cellID, coinID, nextCell.position));
    }

    // yield delay(100);
    yield call(() => new Promise(resolve => setTimeout(resolve, 100)));

    cellID = nextCell.cellID;
    walkwayPosition = nextCell.position;
  }

  const bonusChance = bonusChanceForHomeCoin
  || (yield call(performDisqualificationCheck as any, action.data!.coinID, walkwayPosition, cellID))
  || (currentDieRoll === Rolls.SIX)
  ;

  yield put(moveCoinSuccess(bonusChance, coinID, currentDieRoll));

  if (!bonusChance) {
    yield put(nextTurn());
  }
  yield put(enableDie());
}

function * performDisqualificationCheck(activeCoinID: ICoin['coinID'], walkwayPosition: WalkwayPosition, cellID: ICell['cellID']) {
  if (cellID === 'HOME') {
    return false;
  }
  const cells: ReturnType<typeof cellsSelector> = yield select(cellsSelector);
  const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);

  const activeCoin = coins[activeCoinID];
  const cellInWhichCoinLanded = cells[walkwayPosition][cellID];
  console.log(cellInWhichCoinLanded, activeCoin);
  if (cellInWhichCoinLanded.cellType === CellType.NORMAL) {
    // Check if the coin disqualifies another of a different base
    for (const coinID of cellInWhichCoinLanded.coinIDs) {
      const coin = coins[coinID];
      if (activeCoin.baseID !== coin.baseID) {
        yield put(disqualifyCoin(coinID, walkwayPosition, cellID));
        return true;
      }
    }
  }

  return false;
}

// function * watchForNextTurn() {
//   yield takeLatest(ActionTypes.NEXT_TURN, nextTurnSaga);
// }
function * watchForNextTurn() {
  while (true) {
    yield take(ActionTypes.NEXT_TURN);
    yield call(nextTurnSaga);
  }
}

function * nextTurnSaga() {
  const currentTurnBase: ReturnType<typeof currentTurnSelector> = yield select(currentTurnSelector);
  const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
  let nextTurn = bases[currentTurnBase].nextTurn;
  let nextBaseID = currentTurnBase;
  for (const key in bases) {
    if (bases[key]) {
      nextBaseID = bases[nextBaseID].nextTurn;
      const nextBase = bases[nextBaseID];
      if (nextBase.enabled && !nextBase.hasWon) {
        nextTurn = nextBaseID;
        break;
      }
    }
  }
  yield put(passTurnTo(nextTurn));
}

// function * watchForSetPlayers() {
//   yield takeLatest(ActionTypes.SET_PLAYERS, setPlayersSaga);
// }
function * watchForSetPlayers() {
  while (true) {
    const action: ReturnType<typeof setPlayers> = yield take(ActionTypes.SET_PLAYERS);
    yield call(setPlayersSaga as any, action);
  }
}

function * setPlayersSaga(action: ReturnType<typeof setPlayers>) {
  const { playerCount } = action.data!;
  switch (playerCount) {
    case 2:
      yield put(enableBase(BaseID.BASE_2));
      yield put(enableBase(BaseID.BASE_3));
      break;
    case 3:
      yield put(enableBase(BaseID.BASE_2));
      yield put(enableBase(BaseID.BASE_3));
      yield put(enableBase(BaseID.BASE_4));
      break;
    case 4:
      yield put(enableBase(BaseID.BASE_1));
      yield put(enableBase(BaseID.BASE_2));
      yield put(enableBase(BaseID.BASE_3));
      yield put(enableBase(BaseID.BASE_4));
      break;
    default:
      return;
  }
}

// function * watchForHomeCoin() {
//   yield takeLatest(ActionTypes.HOME_COIN, homeCoinSaga);
// }
function * watchForHomeCoin() {
  while (true) {
    const action: ReturnType<typeof homeCoin> = yield take(ActionTypes.HOME_COIN);
    yield call(homeCoinSaga as any, action);
  }
}

function * homeCoinSaga(action: ReturnType<typeof homeCoin>) {
  const { coinID } = action.data!;

  const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
  const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
  const { baseID } = coins[coinID];
  const base = bases[baseID];
  const retiredCoins = base.coinIDs.filter((coinID) => coins[coinID].isRetired);

  const hasWon = retiredCoins.length === base.coinIDs.length;
  if (hasWon) {
    yield put(markWinner(baseID));
  }
}

export const sagas = [
  watchForGetInitialGameData,
  watchForSpawnCoin,
  watchForMoveCoin,
  watchForNextTurn,
  watchForSetPlayers,
  watchForHomeCoin,
];











// import {
//   call,
//   // delay,
//   apply,
//   put,
//   select,
//   take, 
//   // takeLatest,
// } from 'redux-saga/effects';

// import { api } from '../../../common/http';
// import { mapByProperty } from '../../../common/utils';
// import { enableDie, invalidateDieRoll } from '../../../containers/Dice/state/actions';
// import { Rolls } from '../../../containers/Dice/state/interfaces';
// import { currentDieRollSelector } from '../../../containers/Dice/state/selectors';
// import { WINNING_MOVES } from '../../../globalConstants';
// import { BaseColors, WalkwayPosition } from '../../../state/interfaces';

// import {
//   disqualifyCoin,
//   enableBase,
//   getInitialGameDataSuccess,
//   homeCoin,
//   liftCoin,
//   markWinner,
//   moveCoin,
//   moveCoinFailure,
//   moveCoinSuccess,
//   nextTurn,
//   passTurnTo,
//   placeCoin,
//   setPlayers,
//   spawnCoin,
//   spawnCoinSuccess,
//   ActionTypes,
// } from './actions';
// import {
//   BaseID,
//   BoardEntities,
//   CellType,
//   ICell,
//   ICoin,
//   IServerGameData,
//   IState,
// } from './interfaces';
// import {
//   basesSelector,
//   cellsSelector,
//   coinsSelector,
//   currentTurnSelector,
//   linksSelector,
//   walkwaysSelector,
// } from './selectors';

// // function * watchForGetInitialGameData() {
// //   yield takeLatest(ActionTypes.GET_INITIAL_GAME_DATA, getInitialGameDataSaga);
// // }
// function * watchForGetInitialGameData() {
//   while (true) {
//     yield take(ActionTypes.GET_INITIAL_GAME_DATA);
//     yield call(getInitialGameDataSaga);
//   }
// }

// // function * getInitialGameDataSaga() {
// //   // const data: IServerGameData = yield call(api.get, { url: '/initialGameData.json' });
// //   const data: IServerGameData = yield call(api.get as any, { url: '/initialGameData.json' });
// //   const basesArray = data.bases.map((base) => ({ ...base, spawnable: false }));
// //   const bases = mapByProperty(basesArray, 'ID');
// //   const coins = data.coins.map((coin) => ({ ...coin, color: bases[coin.baseID].color }));
// //   const gameData: IState = {
// //     bases,
// //     cells: data.cells,
// //     coins: mapByProperty(coins, 'coinID'),
// //     currentTurn: BaseID.BASE_3,
// //     links: data.links,
// //     relationships: data.relationships,
// //     walkways: mapByProperty(data.walkways, 'ID'),
// //   };
// //   yield put(getInitialGameDataSuccess(gameData));
// // }



// function * getInitialGameDataSaga() {
//   // Instead of fetching from API, create initial data structure
//    initialData: {
//     bases: [
//       {
//         ID: "BASE_1",
//         coinIDs: [
//           "BASE_1_COIN_1",
//           "BASE_1_COIN_2",
//           "BASE_1_COIN_3",
//           "BASE_1_COIN_4"
//         ],
//         color: "BLUE",
//         nextTurn: "BASE_2",
//         enabled: false,
//         hasWon: false
//       },
//       {
//         ID: "BASE_2",
//         coinIDs: [
//           "BASE_2_COIN_1",
//           "BASE_2_COIN_2",
//           "BASE_2_COIN_3",
//           "BASE_2_COIN_4"
//         ],
//         color: "GREEN",
//         nextTurn: "BASE_4",
//         enabled: false,
//         hasWon: false
//       },
//       {
//         ID: "BASE_3",
//         coinIDs: [
//           "BASE_3_COIN_1",
//           "BASE_3_COIN_2",
//           "BASE_3_COIN_3",
//           "BASE_3_COIN_4"
//         ],
//         color: "RED",
//         nextTurn: "BASE_1",
//         enabled: false,
//         hasWon: false
//       },
//       {
//         ID: "BASE_4",
//         coinIDs: [
//           "BASE_4_COIN_1",
//           "BASE_4_COIN_2",
//           "BASE_4_COIN_3",
//           "BASE_4_COIN_4"
//         ],
//         color: "YELLOW",
//         nextTurn: "BASE_3",
//         enabled: false,
//         hasWon: false
//       }
//     ],
//     coins: [
//       { coinID: "BASE_1_COIN_1", isRetired: false, isSpawned: false, baseID: "BASE_1", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_1_COIN_2", isRetired: false, isSpawned: false, baseID: "BASE_1", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_1_COIN_3", isRetired: false, isSpawned: false, baseID: "BASE_1", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_1_COIN_4", isRetired: false, isSpawned: false, baseID: "BASE_1", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_2_COIN_1", isRetired: false, isSpawned: false, baseID: "BASE_2", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_2_COIN_2", isRetired: false, isSpawned: false, baseID: "BASE_2", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_2_COIN_3", isRetired: false, isSpawned: false, baseID: "BASE_2", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_2_COIN_4", isRetired: false, isSpawned: false, baseID: "BASE_2", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_3_COIN_1", isRetired: false, isSpawned: false, baseID: "BASE_3", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_3_COIN_2", isRetired: false, isSpawned: false, baseID: "BASE_3", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_3_COIN_3", isRetired: false, isSpawned: false, baseID: "BASE_3", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_3_COIN_4", isRetired: false, isSpawned: false, baseID: "BASE_3", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_4_COIN_1", isRetired: false, isSpawned: false, baseID: "BASE_4", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_4_COIN_2", isRetired: false, isSpawned: false, baseID: "BASE_4", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_4_COIN_3", isRetired: false, isSpawned: false, baseID: "BASE_4", steps: 0, cellID: null, position: null },
//       { coinID: "BASE_4_COIN_4", isRetired: false, isSpawned: false, baseID: "BASE_4", steps: 0, cellID: null, position: null }
//     ],
//     walkways: [
//       { ID: "WALKWAY_1", position: "NORTH", baseID: "BASE_2" },
//       { ID: "WALKWAY_2", position: "EAST", baseID: "BASE_4" },
//       { ID: "WALKWAY_3", position: "WEST", baseID: "BASE_1" },
//       { ID: "WALKWAY_4", position: "SOUTH", baseID: "BASE_3" }
//     ],
//     relationships: [
//       { ID: "BASE_1", type: "BASE" },
//       { ID: "WALKWAY_1", type: "WALKWAY" },
//       { ID: "BASE_2", type: "BASE" },
//       { ID: "WALKWAY_3", type: "WALKWAY" },
//       { ID: "HOME", type: "HOME", baseIDs: ["BASE_2", "BASE_4", "BASE_3", "BASE_1"] },
//       { ID: "WALKWAY_2", type: "WALKWAY" },
//       { ID: "BASE_3", type: "BASE" },
//       { ID: "WALKWAY_4", type: "WALKWAY" },
//       { ID: "BASE_4", type: "BASE" }
//     ],
//     cells: {
//       "SOUTH": {
//         "SOUTH_5_0": { baseID: "BASE_3", cellID: "SOUTH_5_0", column: 0, position: "SOUTH", row: 5, cellType: "NORMAL", coinIDs: [] },
//         "SOUTH_5_1": { baseID: "BASE_3", cellID: "SOUTH_5_1", column: 1, position: "SOUTH", row: 5, cellType: "NORMAL", coinIDs: [] },
//         "SOUTH_5_2": { baseID: "BASE_3", cellID: "SOUTH_5_2", column: 2, position: "SOUTH", row: 5, cellType: "NORMAL", coinIDs: [] },
//         "SOUTH_4_0": { baseID: "BASE_3", cellID: "SOUTH_4_0", column: 0, position: "SOUTH", row: 4, cellType: "SPAWN", coinIDs: [] },
//         "SOUTH_4_1": { baseID: "BASE_3", cellID: "SOUTH_4_1", column: 1, position: "SOUTH", row: 4, cellType: "HOMEPATH", coinIDs: [] },
//         "SOUTH_4_2": { baseID: "BASE_3", cellID: "SOUTH_4_2", column: 2, position: "SOUTH", row: 4, cellType: "NORMAL", coinIDs: [] },
//         "SOUTH_3_0": { baseID: "BASE_3", cellID: "SOUTH_3_0", column: 0, position: "SOUTH", row: 3, cellType: "NORMAL", coinIDs: [] },
//         "SOUTH_3_1": { baseID: "BASE_3", cellID: "SOUTH_3_1", column: 1, position: "SOUTH", row: 3, cellType: "HOMEPATH", coinIDs: [] },
//         "SOUTH_3_2": { baseID: "BASE_3", cellID: "SOUTH_3_2", column: 2, position: "SOUTH", row: 3, cellType: "STAR", coinIDs: [] },
//         "SOUTH_2_0": { baseID: "BASE_3", cellID: "SOUTH_2_0", column: 0, position: "SOUTH", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "SOUTH_2_1": { baseID: "BASE_3", cellID: "SOUTH_2_1", column: 1, position: "SOUTH", row: 2, cellType: "HOMEPATH", coinIDs: [] },
//         "SOUTH_2_2": { baseID: "BASE_3", cellID: "SOUTH_2_2", column: 2, position: "SOUTH", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "SOUTH_1_0": { baseID: "BASE_3", cellID: "SOUTH_1_0", column: 0, position: "SOUTH", row: 1, cellType: "NORMAL", coinIDs: [] },
//         "SOUTH_1_1": { baseID: "BASE_3", cellID: "SOUTH_1_1", column: 1, position: "SOUTH", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "SOUTH_1_2": { baseID: "BASE_3", cellID: "SOUTH_1_2", column: 2, position: "SOUTH", row: 1, cellType: "NORMAL", coinIDs: [] },
//         "SOUTH_0_0": { baseID: "BASE_3", cellID: "SOUTH_0_0", column: 0, position: "SOUTH", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "SOUTH_0_1": { baseID: "BASE_3", cellID: "SOUTH_0_1", column: 1, position: "SOUTH", row: 0, cellType: "HOMEPATH", coinIDs: [] },
//         "SOUTH_0_2": { baseID: "BASE_3", cellID: "SOUTH_0_2", column: 2, position: "SOUTH", row: 0, cellType: "NORMAL", coinIDs: [] }
//       },
//       "WEST": {
//         "WEST_2_5": { baseID: "BASE_1", cellID: "WEST_2_5", column: 5, position: "WEST", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "WEST_2_4": { baseID: "BASE_1", cellID: "WEST_2_4", column: 4, position: "WEST", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "WEST_2_3": { baseID: "BASE_1", cellID: "WEST_2_3", column: 3, position: "WEST", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "WEST_2_2": { baseID: "BASE_1", cellID: "WEST_2_2", column: 2, position: "WEST", row: 2, cellType: "STAR", coinIDs: [] },
//         "WEST_2_1": { baseID: "BASE_1", cellID: "WEST_2_1", column: 1, position: "WEST", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "WEST_2_0": { baseID: "BASE_1", cellID: "WEST_2_0", column: 0, position: "WEST", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "WEST_1_0": { baseID: "BASE_1", cellID: "WEST_1_0", column: 0, position: "WEST", row: 1, cellType: "NORMAL", coinIDs: [] },
//         "WEST_1_1": { baseID: "BASE_1", cellID: "WEST_1_1", column: 1, position: "WEST", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "WEST_1_2": { baseID: "BASE_1", cellID: "WEST_1_2", column: 2, position: "WEST", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "WEST_1_3": { baseID: "BASE_1", cellID: "WEST_1_3", column: 3, position: "WEST", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "WEST_1_4": { baseID: "BASE_1", cellID: "WEST_1_4", column: 4, position: "WEST", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "WEST_1_5": { baseID: "BASE_1", cellID: "WEST_1_5", column: 5, position: "WEST", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "WEST_0_0": { baseID: "BASE_1", cellID: "WEST_0_0", column: 0, position: "WEST", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "WEST_0_1": { baseID: "BASE_1", cellID: "WEST_0_1", column: 1, position: "WEST", row: 0, cellType: "SPAWN", coinIDs: [] },
//         "WEST_0_2": { baseID: "BASE_1", cellID: "WEST_0_2", column: 2, position: "WEST", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "WEST_0_3": { baseID: "BASE_1", cellID: "WEST_0_3", column: 3, position: "WEST", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "WEST_0_4": { baseID: "BASE_1", cellID: "WEST_0_4", column: 4, position: "WEST", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "WEST_0_5": { baseID: "BASE_1", cellID: "WEST_0_5", column: 5, position: "WEST", row: 0, cellType: "NORMAL", coinIDs: [] }
//       },
//       "NORTH": {
//         "NORTH_5_0": { baseID: "BASE_2", cellID: "NORTH_5_0", column: 0, position: "NORTH", row: 5, cellType: "NORMAL", coinIDs: [] },
//         "NORTH_4_0": { baseID: "BASE_2", cellID: "NORTH_4_0", column: 0, position: "NORTH", row: 4, cellType: "NORMAL", coinIDs: [] },
//         "NORTH_3_0": { baseID: "BASE_2", cellID: "NORTH_3_0", column: 0, position: "NORTH", row: 3, cellType: "NORMAL", coinIDs: [] },
//         "NORTH_2_0": { baseID: "BASE_2", cellID: "NORTH_2_0", column: 0, position: "NORTH", row: 2, cellType: "STAR", coinIDs: [] },
//         "NORTH_1_0": { baseID: "BASE_2", cellID: "NORTH_1_0", column: 0, position: "NORTH", row: 1, cellType: "NORMAL", coinIDs: [] },
//         "NORTH_0_0": { baseID: "BASE_2", cellID: "NORTH_0_0", column: 0, position: "NORTH", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "NORTH_0_1": { baseID: "BASE_2", cellID: "NORTH_0_1", column: 1, position: "NORTH", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "NORTH_1_1": { baseID: "BASE_2", cellID: "NORTH_1_1", column: 1, position: "NORTH", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "NORTH_2_1": { baseID: "BASE_2", cellID: "NORTH_2_1", column: 1, position: "NORTH", row: 2, cellType: "HOMEPATH", coinIDs: [] },
//         "NORTH_3_1": { baseID: "BASE_2", cellID: "NORTH_3_1", column: 1, position: "NORTH", row: 3, cellType: "HOMEPATH", coinIDs: [] },
//         "NORTH_4_1": { baseID: "BASE_2", cellID: "NORTH_4_1", column: 1, position: "NORTH", row: 4, cellType: "HOMEPATH", coinIDs: [] },
//         "NORTH_5_1": { baseID: "BASE_2", cellID: "NORTH_5_1", column: 1, position: "NORTH", row: 5, cellType: "HOMEPATH", coinIDs: [] },
//         "NORTH_0_2": { baseID: "BASE_2", cellID: "NORTH_0_2", column: 2, position: "NORTH", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "NORTH_1_2": { baseID: "BASE_2", cellID: "NORTH_1_2", column: 2, position: "NORTH", row: 1, cellType: "SPAWN", coinIDs: [] },
//         "NORTH_2_2": { baseID: "BASE_2", cellID: "NORTH_2_2", column: 2, position: "NORTH", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "NORTH_3_2": { baseID: "BASE_2", cellID: "NORTH_3_2", column: 2, position: "NORTH", row: 3, cellType: "NORMAL", coinIDs: [] },
//         "NORTH_4_2": { baseID: "BASE_2", cellID: "NORTH_4_2", column: 2, position: "NORTH", row: 4, cellType: "NORMAL", coinIDs: [] },
//         "NORTH_5_2": { baseID: "BASE_2", cellID: "NORTH_5_2", column: 2, position: "NORTH", row: 5, cellType: "NORMAL", coinIDs: [] }
//       },
//       "EAST": {
//         "EAST_0_0": { baseID: "BASE_4", cellID: "EAST_0_0", column: 0, position: "EAST", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "EAST_0_1": { baseID: "BASE_4", cellID: "EAST_0_1", column: 1, position: "EAST", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "EAST_0_2": { baseID: "BASE_4", cellID: "EAST_0_2", column: 2, position: "EAST", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "EAST_0_3": { baseID: "BASE_4", cellID: "EAST_0_3", column: 3, position: "EAST", row: 0, cellType: "STAR", coinIDs: [] },
//         "EAST_0_4": { baseID: "BASE_4", cellID: "EAST_0_4", column: 4, position: "EAST", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "EAST_0_5": { baseID: "BASE_4", cellID: "EAST_0_5", column: 5, position: "EAST", row: 0, cellType: "NORMAL", coinIDs: [] },
//         "EAST_1_5": { baseID: "BASE_4", cellID: "EAST_1_5", column: 5, position: "EAST", row: 1, cellType: "NORMAL", coinIDs: [] },
//         "EAST_1_4": { baseID: "BASE_4", cellID: "EAST_1_4", column: 4, position: "EAST", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "EAST_1_3": { baseID: "BASE_4", cellID: "EAST_1_3", column: 3, position: "EAST", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "EAST_1_2": { baseID: "BASE_4", cellID: "EAST_1_2", column: 2, position: "EAST", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "EAST_1_1": { baseID: "BASE_4", cellID: "EAST_1_1", column: 1, position: "EAST", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "EAST_1_0": { baseID: "BASE_4", cellID: "EAST_1_0", column: 0, position: "EAST", row: 1, cellType: "HOMEPATH", coinIDs: [] },
//         "EAST_2_0": { baseID: "BASE_4", cellID: "EAST_2_0", column: 0, position: "EAST", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "EAST_2_1": { baseID: "BASE_4", cellID: "EAST_2_1", column: 1, position: "EAST", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "EAST_2_2": { baseID: "BASE_4", cellID: "EAST_2_2", column: 2, position: "EAST", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "EAST_2_3": { baseID: "BASE_4", cellID: "EAST_2_3", column: 3, position: "EAST", row: 2, cellType: "NORMAL", coinIDs: [] },
//         "EAST_2_4": { baseID: "BASE_4", cellID: "EAST_2_4", column: 4, position: "EAST", row: 2, cellType: "SPAWN", coinIDs: [] },
//         "EAST_2_5": { baseID: "BASE_4", cellID: "EAST_2_5", column: 5, position: "EAST", row: 2, cellType: "NORMAL", coinIDs: [] }
//       }
//     },
//     links: {
//       "SOUTH_4_0": [{"cellID": "SOUTH_3_0", "position": "SOUTH"}],
//       "SOUTH_3_0": [{"cellID": "SOUTH_2_0", "position": "SOUTH"}],
//       "SOUTH_2_0": [{"cellID": "SOUTH_1_0", "position": "SOUTH"}],
//       "SOUTH_1_0": [{"cellID": "SOUTH_0_0", "position": "SOUTH"}],
//       "SOUTH_0_0": [{"cellID": "WEST_2_5", "position": "WEST"}],
//       "WEST_2_5": [{"cellID": "WEST_2_4", "position": "WEST"}],
//       "WEST_2_4": [{"cellID": "WEST_2_3", "position": "WEST"}],
//       "WEST_2_3": [{"cellID": "WEST_2_2", "position": "WEST"}],
//       "WEST_2_2": [{"cellID": "WEST_2_1", "position": "WEST"}],
//       "WEST_2_1": [{"cellID": "WEST_2_0", "position": "WEST"}],
//       "WEST_2_0": [{"cellID": "WEST_1_0", "position": "WEST"}],
//       "WEST_1_0": [{"cellID": "WEST_0_0", "position": "WEST"}, {"cellID": "WEST_1_1", "position": "WEST"}],
//       "WEST_1_1": [{"cellID": "WEST_1_2", "position": "WEST"}],
//       "WEST_1_2": [{"cellID": "WEST_1_3", "position": "WEST"}],
//       "WEST_1_3": [{"cellID": "WEST_1_4", "position": "WEST"}],
//       "WEST_1_4": [{"cellID": "WEST_1_5", "position": "WEST"}],
//       "WEST_0_0": [{"cellID": "WEST_0_1", "position": "WEST"}],
//       "WEST_0_1": [{"cellID": "WEST_0_2", "position": "WEST"}],
//       "WEST_0_2": [{"cellID": "WEST_0_3", "position": "WEST"}],
//       "WEST_0_3": [{"cellID": "WEST_0_4", "position": "WEST"}],
//       "WEST_0_4": [{"cellID": "WEST_0_5", "position": "WEST"}],
//       "WEST_0_5": [{"cellID": "NORTH_5_0", "position": "NORTH"}],
//       "NORTH_5_0": [{"cellID": "NORTH_4_0", "position": "NORTH"}],
//       "NORTH_4_0": [{"cellID": "NORTH_3_0", "position": "NORTH"}],
//       "NORTH_3_0": [{"cellID": "NORTH_2_0", "position": "NORTH"}],
//       "NORTH_2_0": [{"cellID": "NORTH_1_0", "position": "NORTH"}],
//       "NORTH_1_0": [{"cellID": "NORTH_0_0", "position": "NORTH"}],
//       "NORTH_0_0": [{"cellID": "NORTH_0_1", "position": "NORTH"}],
//       "NORTH_0_1": [{"cellID": "NORTH_0_2", "position": "NORTH"}, {"cellID": "NORTH_1_1", "position": "NORTH"}],
//       "NORTH_1_1": [{"cellID": "NORTH_2_1", "position": "NORTH"}],
//       "NORTH_2_1": [{"cellID": "NORTH_3_1", "position": "NORTH"}],
//       "NORTH_3_1": [{"cellID": "NORTH_4_1", "position": "NORTH"}],
//       "NORTH_4_1": [{"cellID": "NORTH_5_1", "position": "NORTH"}],
//       "NORTH_0_2": [{"cellID": "NORTH_1_2", "position": "NORTH"}],
//       "NORTH_1_2": [{"cellID": "NORTH_2_2", "position": "NORTH"}],
//       "NORTH_2_2": [{"cellID": "NORTH_3_2", "position": "NORTH"}],
//       "NORTH_3_2": [{"cellID": "NORTH_4_2", "position": "NORTH"}],
//       "NORTH_4_2": [{"cellID": "NORTH_5_2", "position": "NORTH"}],
//       "NORTH_5_2": [{"cellID": "EAST_0_0", "position": "EAST"}],
//       "EAST_0_0": [{"cellID": "EAST_0_1", "position": "EAST"}],
//       "EAST_0_1": [{"cellID": "EAST_0_2", "position": "EAST"}],
//       "EAST_0_2": [{"cellID": "EAST_0_3", "position": "EAST"}],
//       "EAST_0_3": [{"cellID": "EAST_0_4", "position": "EAST"}],
//       "EAST_0_4": [{"cellID": "EAST_0_5", "position": "EAST"}],
//       "EAST_0_5": [{"cellID": "EAST_1_5", "position": "EAST"}],
//       "EAST_1_5": [{"cellID": "EAST_2_5", "position": "EAST"}, {"cellID": "EAST_1_4", "position": "EAST"}],
//       "EAST_1_4": [{"cellID": "EAST_1_3", "position": "EAST"}],
//       "EAST_1_3": [{"cellID": "EAST_1_2", "position": "EAST"}],
//       "EAST_1_2": [{"cellID": "EAST_1_1", "position": "EAST"}],
//       "EAST_1_1": [{"cellID": "EAST_1_0", "position": "EAST"}],
//       "EAST_2_5": [{"cellID": "EAST_2_4", "position": "EAST"}],
//       "EAST_2_4": [{"cellID": "EAST_2_3", "position": "EAST"}],
//       "EAST_2_3": [{"cellID": "EAST_2_2", "position": "EAST"}],
//       "EAST_2_2": [{"cellID": "EAST_2_1", "position": "EAST"}],
//       "EAST_2_1": [{"cellID": "EAST_2_0", "position": "EAST"}],
//       "EAST_2_0": [{"cellID": "SOUTH_0_2", "position": "SOUTH"}],
//       "SOUTH_0_2": [{"cellID": "SOUTH_1_2", "position": "SOUTH"}],
//       "SOUTH_1_2": [{"cellID": "SOUTH_2_2", "position": "SOUTH"}],
//       "SOUTH_2_2": [{"cellID": "SOUTH_3_2", "position": "SOUTH"}],
//       "SOUTH_3_2": [{"cellID": "SOUTH_4_2", "position": "SOUTH"}],
//       "SOUTH_4_2": [{"cellID": "SOUTH_5_2", "position": "SOUTH"}],
//       "SOUTH_5_2": [{"cellID": "SOUTH_5_1", "position": "SOUTH"}],
//       "SOUTH_5_1": [{"cellID": "SOUTH_5_0", "position": "SOUTH"}, {"cellID": "SOUTH_4_1", "position": "SOUTH"}],
//       "SOUTH_5_0": [{"cellID": "SOUTH_4_0", "position": "SOUTH"}],
//       "SOUTH_4_1": [{"cellID": "SOUTH_3_1", "position": "SOUTH"}],
//       "SOUTH_3_1": [{"cellID": "SOUTH_2_1", "position": "SOUTH"}],
//       "SOUTH_2_1": [{"cellID": "SOUTH_1_1", "position": "SOUTH"}],
//       "SOUTH_1_1": [{"cellID": "SOUTH_0_1", "position": "SOUTH"}],
//       "SOUTH_0_1": [{"cellID": "HOME", "position": "HOME"}],
//       "EAST_1_0": [{"cellID": "HOME", "position": "HOME"}],
//       "NORTH_5_1": [{"cellID": "HOME", "position": "HOME"}],
//       "WEST_1_5": [{"cellID": "HOME", "position": "HOME"}]
//     }
//   }};

// //   const basesArray = initialData.bases.map((base) => ({ ...base, spawnable: false }));
// //   const bases = mapByProperty(basesArray, 'ID');
// //   const coins = Object.values(initialData.coins).map((coin) => ({ ...coin, color: bases[coin.baseID].color }));
// //   const gameData: IState = {
// //     bases,
// //     cells: initialData.cells,
// //     coins: mapByProperty(coins, 'coinID'),
// //     currentTurn: "BASE_1",
// //     links: initialData.links,
// //     relationships: initialData.relationships,
// //     walkways: mapByProperty(initialData.walkways, 'ID'),
// //   };
// //   yield put(getInitialGameDataSuccess(gameData));
// // }

//   // const initialData: IServerGameData = {
//   //   bases: [
//   //     {
//   //       ID: BaseID.BASE_1,
//   //       color: BaseColors.RED,
//   //       coinIDs: ['red-1', 'red-2', 'red-3', 'red-4'],
//   //       nextTurn: BaseID.BASE_2,
//   //       spawnable: false,
//   //       hasWon: false,
//   //       enabled: true,
//   //     },
//   //     {
//   //       ID: BaseID.BASE_2,
//   //       color: BaseColors.BLUE,
//   //       coinIDs: ['blue-1', 'blue-2', 'blue-3', 'blue-4'],
//   //       nextTurn: BaseID.BASE_3,
//   //       spawnable: false,
//   //       hasWon: false,
//   //       enabled: true,
//   //     },
//   //     {
//   //       ID: BaseID.BASE_3,
//   //       color: BaseColors.GREEN,
//   //       coinIDs: ['green-1', 'green-2', 'green-3', 'green-4'],
//   //       nextTurn: BaseID.BASE_4,
//   //       spawnable: false,
//   //       hasWon: false,
//   //       enabled: true,
//   //     },
//   //     {
//   //       ID: BaseID.BASE_4,
//   //       color: BaseColors.YELLOW,
//   //       coinIDs: ['yellow-1', 'yellow-2', 'yellow-3', 'yellow-4'],
//   //       nextTurn: BaseID.BASE_1,
//   //       spawnable: false,
//   //       hasWon: false,
//   //       enabled: true,
//   //     },
//   //   ],
//   //   coins: [
//   //     { coinID: 'red-1', color: BaseColors.RED, baseID: BaseID.BASE_1, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.NORTH },
//   //     { coinID: 'red-2', color: BaseColors.RED, baseID: BaseID.BASE_1, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.NORTH },
//   //     { coinID: 'red-3', color: BaseColors.RED, baseID: BaseID.BASE_1, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.NORTH },
//   //     { coinID: 'red-4', color: BaseColors.RED, baseID: BaseID.BASE_1, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.NORTH },
//   //     { coinID: 'blue-1', color: BaseColors.BLUE, baseID: BaseID.BASE_2, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.EAST },
//   //     { coinID: 'blue-2', color: BaseColors.BLUE, baseID: BaseID.BASE_2, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.EAST },
//   //     { coinID: 'blue-3', color: BaseColors.BLUE, baseID: BaseID.BASE_2, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.EAST },
//   //     { coinID: 'blue-4', color: BaseColors.BLUE, baseID: BaseID.BASE_2, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.EAST },
//   //     { coinID: 'green-1', color: BaseColors.GREEN, baseID: BaseID.BASE_3, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.SOUTH },
//   //     { coinID: 'green-2', color: BaseColors.GREEN, baseID: BaseID.BASE_3, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.SOUTH },
//   //     { coinID: 'green-3', color: BaseColors.GREEN, baseID: BaseID.BASE_3, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.SOUTH },
//   //     { coinID: 'green-4', color: BaseColors.GREEN, baseID: BaseID.BASE_3, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.SOUTH },
//   //     { coinID: 'yellow-1', color: BaseColors.YELLOW, baseID: BaseID.BASE_4, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.WEST },
//   //     { coinID: 'yellow-2', color: BaseColors.YELLOW, baseID: BaseID.BASE_4, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.WEST },
//   //     { coinID: 'yellow-3', color: BaseColors.YELLOW, baseID: BaseID.BASE_4, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.WEST },
//   //     { coinID: 'yellow-4', color: BaseColors.YELLOW, baseID: BaseID.BASE_4, isSpawned: false, isRetired: false, steps: 0, cellID: '', position: WalkwayPosition.WEST },
//   //   ],
//   //   walkways: [
//   //     { ID: 'walkway-north', position: WalkwayPosition.NORTH, baseID: BaseID.BASE_1 },
//   //     { ID: 'walkway-east', position: WalkwayPosition.EAST, baseID: BaseID.BASE_2 },
//   //     { ID: 'walkway-south', position: WalkwayPosition.SOUTH, baseID: BaseID.BASE_3 },
//   //     { ID: 'walkway-west', position: WalkwayPosition.WEST, baseID: BaseID.BASE_4 },
//   //   ],
//   //   relationships: [
//   //     { ID: 'base-1', type: BoardEntities.BASE },
//   //     { ID: 'base-2', type: BoardEntities.BASE },
//   //     { ID: 'base-3', type: BoardEntities.BASE },
//   //     { ID: 'base-4', type: BoardEntities.BASE },
//   //     { ID: 'home', type: BoardEntities.HOME, baseIDs: [BaseID.BASE_1, BaseID.BASE_2, BaseID.BASE_3, BaseID.BASE_4] },
//   //     { ID: 'walkway-north', type: BoardEntities.WALKWAY },
//   //     { ID: 'walkway-east', type: BoardEntities.WALKWAY },
//   //     { ID: 'walkway-south', type: BoardEntities.WALKWAY },
//   //     { ID: 'walkway-west', type: BoardEntities.WALKWAY },
//   //   ],
//   //   cells: {
//   //     [WalkwayPosition.NORTH]: {},
//   //     [WalkwayPosition.EAST]: {},
//   //     [WalkwayPosition.SOUTH]: {},
//   //     [WalkwayPosition.WEST]: {},
//   //   },
//   //   links: {},
//   // };

// //   const basesArray = initialData.bases.map((base) => ({ ...base, spawnable: false }));
// //   const bases = mapByProperty(basesArray, 'ID');
// //   const coins = Object.values(initialData.coins).map((coin) => ({ ...coin, color: bases[coin.baseID].color }));
// //   const gameData: IState = {
// //     bases,
// //     cells: initialData.cells,
// //     coins: mapByProperty(coins, 'coinID'),
// //     currentTurn: BaseID.BASE_1,
// //     links: initialData.links,
// //     relationships: initialData.relationships,
// //     walkways: mapByProperty(initialData.walkways, 'ID'),
// //   };
// //   yield put(getInitialGameDataSuccess(gameData));
// // }

// // function * watchForSpawnCoin() {
// //   yield takeLatest(ActionTypes.SPAWN_COIN, spawnCoinSaga);
// // }


// function * watchForSpawnCoin() {
//   while (true) {
//     const action: ReturnType<typeof spawnCoin> = yield take(ActionTypes.SPAWN_COIN);
//     yield call(spawnCoinSaga, action);
//   }
// }

// function * spawnCoinSaga(action: ReturnType<typeof spawnCoin> | undefined) {
//   if (!action || !action.data) return; 
//   const { baseID, coinID } = action.data;
//   const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
//   const walkways: ReturnType<typeof walkwaysSelector> = yield select(walkwaysSelector);
//   const cells: ReturnType<typeof cellsSelector> = yield select(cellsSelector);
//   const base = bases[baseID];
//   const walkway = Object.values(walkways).find((walkway) => walkway.baseID === baseID)!;
//   const walkwayCells = cells[walkway.position];
//   const spawnCellForCoin = Object.values(walkwayCells).find((cell) => cell.cellType === CellType.SPAWN)!;
//   const coinIDToSpawn = base.coinIDs.find((ID) => ID === coinID)!;

//   yield put(spawnCoinSuccess(spawnCellForCoin.cellID, coinIDToSpawn, baseID, walkway.position));
//   yield put(invalidateDieRoll());
// }

// // function * spawnCoinSaga(action: ReturnType<typeof spawnCoin>) {
// //   if ( !action || !action.data) return; 
// //   const { baseID, coinID } = action.data!;
// //   const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
// //   const walkways: ReturnType<typeof walkwaysSelector> = yield select(walkwaysSelector);
// //   const cells: ReturnType<typeof cellsSelector> = yield select(cellsSelector);
// //   const base = bases[baseID];
// //   const walkway = Object.values(walkways).find((walkway) => walkway.baseID === baseID)!;
// //   const walkwayCells = cells[walkway.position];
// //   const spawnCellForCoin = Object.values(walkwayCells).find((cell) => cell.cellType === CellType.SPAWN)!;
// //   const coinIDToSpawn = base.coinIDs.find((ID) => ID === coinID)!;

// //   yield put(spawnCoinSuccess(spawnCellForCoin.cellID, coinIDToSpawn, baseID, walkway.position));
// //   yield put(invalidateDieRoll());
// // }

// // function * watchForMoveCoin() {
// //   yield take(ActionTypes.MOVE_COIN, moveCoinSaga);
// // }
// function * watchForMoveCoin() {
//   while (true) {
//     const action: ReturnType<typeof moveCoin> = yield take(ActionTypes.MOVE_COIN);
//     yield call(moveCoinSaga as any, action);
//   }
// }

// // function * isCurrentMoveValid(coinID: ICoin['coinID'], stepsToTake: Rolls) {
// //   const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
// //   const coin = coins[coinID];
// //   return coin.steps + stepsToTake <= WINNING_MOVES;
// // }

// function * isCurrentMoveValid() {
//   const coinID: ICoin['coinID'] = yield select((state) => state.ludo.currentCoinID); // You'd need to add this to state
//   const stepsToTake: Rolls = yield select(currentDieRollSelector);
//   const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
//   const coin = coins[coinID];
//   return coin.steps + stepsToTake <= WINNING_MOVES;
// }

// // export function * getMovableCoins(stepsToTake: Rolls) {
// //   const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
// //   const currentTurnBase: ReturnType<typeof currentTurnSelector> = yield select(currentTurnSelector);
// //   const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
// //   const movableCoins =
// //     bases[currentTurnBase].coinIDs
// //     .filter((coinID) =>
// //       coins[coinID].isSpawned
// //       && !coins[coinID].isRetired
// //       && coins[coinID].steps + stepsToTake <= WINNING_MOVES,
// //     );
// //   return movableCoins;
// // }


// export function * getMovableCoins() {
//   const stepsToTake: Rolls = yield select(currentDieRollSelector);
//   const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
//   const currentTurnBase: ReturnType<typeof currentTurnSelector> = yield select(currentTurnSelector);
//   const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
//   const movableCoins =
//     bases[currentTurnBase].coinIDs
//     .filter((coinID) =>
//       coins[coinID].isSpawned
//       && !coins[coinID].isRetired
//       && coins[coinID].steps + stepsToTake <= WINNING_MOVES,
//     );
//   return movableCoins;
// }

// function * moveCoinSaga(action: ReturnType<typeof moveCoin>) {
//   let { cellID, walkwayPosition } = { ...action.data! };
//   const { coinID } = action.data!;
//   const currentDieRoll: ReturnType<typeof currentDieRollSelector> = yield select(currentDieRollSelector);

//   // const movableCoins: ICoin['coinID'][] = yield call(getMovableCoins, currentDieRoll);
//   // const isCurrentMovePossible: boolean = yield call(isCurrentMoveValid, coinID, currentDieRoll);
//   const movableCoins: ICoin['coinID'][] = yield call(getMovableCoins);
//   const isCurrentMovePossible: boolean = yield call(isCurrentMoveValid);

//   if (movableCoins.length === 0) {
//     yield put(moveCoinFailure());
//     yield put(nextTurn());
//     yield put(enableDie());
//     return;
//   } else if (!isCurrentMovePossible) {
//     yield put(moveCoinFailure());
//     return;
//   }

//   yield put(invalidateDieRoll());

//   let bonusChanceForHomeCoin = false;

//   for (let i = 0; i < currentDieRoll; i++) {
//     const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
//     const cells: ReturnType<typeof cellsSelector> = yield select(cellsSelector);
//     const links: ReturnType<typeof linksSelector> = yield select(linksSelector);
//     const nextCells = links[cellID];
//     let nextCell;

//     // Possibility of entering HOMEPATH
//     nextCell = nextCells.length > 1
//     ? nextCells.find(
//       (cell) =>
//         cells[cell.position][cell.cellID].cellType === CellType.HOMEPATH
//         && coins[coinID].baseID === cells[cell.position][cell.cellID].baseID,
//     ) || nextCells[0]
//     : nextCells[0];

//     yield put(liftCoin(cellID, coinID, walkwayPosition));
//     if (nextCell.cellID === 'HOME') {
//       yield put(homeCoin(coinID));
//       bonusChanceForHomeCoin = true;
//     } else {
//       yield put(placeCoin(nextCell.cellID, coinID, nextCell.position));
//     }

//     // yield delay(100);
//     yield call(() => new Promise(resolve => setTimeout(resolve, 100)));

//     cellID = nextCell.cellID;
//     walkwayPosition = nextCell.position;
//   }

//   const bonusChance = bonusChanceForHomeCoin
//   || (yield call(performDisqualificationCheck as any, action.data!.coinID, walkwayPosition, cellID))
//   || (currentDieRoll === Rolls.SIX)
//   ;

//   yield put(moveCoinSuccess(bonusChance, coinID, currentDieRoll));

//   if (!bonusChance) {
//     yield put(nextTurn());
//   }
//   yield put(enableDie());
// }

// function * performDisqualificationCheck(activeCoinID: ICoin['coinID'], walkwayPosition: WalkwayPosition, cellID: ICell['cellID']) {
//   if (cellID === 'HOME') {
//     return false;
//   }
//   const cells: ReturnType<typeof cellsSelector> = yield select(cellsSelector);
//   const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);

//   const activeCoin = coins[activeCoinID];
//   const cellInWhichCoinLanded = cells[walkwayPosition][cellID];
//   console.log(cellInWhichCoinLanded, activeCoin);
//   if (cellInWhichCoinLanded.cellType === CellType.NORMAL) {
//     // Check if the coin disqualifies another of a different base
//     for (const coinID of cellInWhichCoinLanded.coinIDs) {
//       const coin = coins[coinID];
//       if (activeCoin.baseID !== coin.baseID) {
//         yield put(disqualifyCoin(coinID, walkwayPosition, cellID));
//         return true;
//       }
//     }
//   }

//   return false;
// }

// // function * watchForNextTurn() {
// //   yield takeLatest(ActionTypes.NEXT_TURN, nextTurnSaga);
// // }
// function * watchForNextTurn() {
//   while (true) {
//     yield take(ActionTypes.NEXT_TURN);
//     yield call(nextTurnSaga);
//   }
// }

// function * nextTurnSaga() {
//   const currentTurnBase: ReturnType<typeof currentTurnSelector> = yield select(currentTurnSelector);
//   const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
//   let nextTurn = bases[currentTurnBase].nextTurn;
//   let nextBaseID = currentTurnBase;
//   for (const key in bases) {
//     if (bases[key]) {
//       nextBaseID = bases[nextBaseID].nextTurn;
//       const nextBase = bases[nextBaseID];
//       if (nextBase.enabled && !nextBase.hasWon) {
//         nextTurn = nextBaseID;
//         break;
//       }
//     }
//   }
//   yield put(passTurnTo(nextTurn));
// }

// // function * watchForSetPlayers() {
// //   yield takeLatest(ActionTypes.SET_PLAYERS, setPlayersSaga);
// // }
// function * watchForSetPlayers() {
//   while (true) {
//     const action: ReturnType<typeof setPlayers> = yield take(ActionTypes.SET_PLAYERS);
//     yield call(setPlayersSaga as any, action);
//   }
// }

// function * setPlayersSaga(action: ReturnType<typeof setPlayers>) {
//   const { playerCount } = action.data!;
//   switch (playerCount) {
//     case 2:
//       yield put(enableBase(BaseID.BASE_2));
//       yield put(enableBase(BaseID.BASE_3));
//       break;
//     case 3:
//       yield put(enableBase(BaseID.BASE_2));
//       yield put(enableBase(BaseID.BASE_3));
//       yield put(enableBase(BaseID.BASE_4));
//       break;
//     case 4:
//       yield put(enableBase(BaseID.BASE_1));
//       yield put(enableBase(BaseID.BASE_2));
//       yield put(enableBase(BaseID.BASE_3));
//       yield put(enableBase(BaseID.BASE_4));
//       break;
//     default:
//       return;
//   }
// }

// // function * watchForHomeCoin() {
// //   yield takeLatest(ActionTypes.HOME_COIN, homeCoinSaga);
// // }
// function * watchForHomeCoin() {
//   while (true) {
//     const action: ReturnType<typeof homeCoin> = yield take(ActionTypes.HOME_COIN);
//     yield call(homeCoinSaga as any, action);
//   }
// }

// function * homeCoinSaga(action: ReturnType<typeof homeCoin>) {
//   const { coinID } = action.data!;

//   const coins: ReturnType<typeof coinsSelector> = yield select(coinsSelector);
//   const bases: ReturnType<typeof basesSelector> = yield select(basesSelector);
//   const { baseID } = coins[coinID];
//   const base = bases[baseID];
//   const retiredCoins = base.coinIDs.filter((coinID) => coins[coinID].isRetired);

//   const hasWon = retiredCoins.length === base.coinIDs.length;
//   if (hasWon) {
//     yield put(markWinner(baseID));
//   }
// }

// export const sagas = [
//   watchForGetInitialGameData,
//   watchForSpawnCoin,
//   watchForMoveCoin,
//   watchForNextTurn,
//   watchForSetPlayers,
//   watchForHomeCoin,
// ];
