

// import { ForkEffect } from 'redux-saga/effects';
import { Effect } from 'redux-saga/effects';

import { IState as IDiceState } from '../containers/Dice/state/interfaces';
import { IState as ILudoState } from '../containers/Ludo/state/interfaces';
import { IState as IContextMenuState } from '../services/contextMenu/interfaces';

import { Actions as LudoActions } from '../containers/Ludo/state/actions';
import { Actions as ContextMenuActions } from '../services/contextMenu/actions';
import { Actions as DiceActions } from '../containers/Dice/state/actions';

export type GlobalActions = LudoActions | ContextMenuActions | DiceActions;

export enum BaseColors {
  RED = 'RED',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  YELLOW = 'YELLOW',
}

// export enum WalkwayPosition {
//   NORTH = 'NORTH',
//   EAST = 'EAST',
//   WEST = 'WEST',
//   SOUTH = 'SOUTH',
// }
// Add to your interfaces file or at the top of sagas.ts
export type WalkwayPosition = 'NORTH_WEST' | 'NORTH_EAST' | 'SOUTH_WEST' | 'SOUTH_EAST';

export interface IApplicationState {
  ludo: ILudoState;
  contextMenu: IContextMenuState;
  dice: IDiceState;
}

export interface IReduxAction<T = any, D = any> {
  type: T;
  data?: D;
}

export interface ISaga {
  (): IterableIterator<Effect>;
}
