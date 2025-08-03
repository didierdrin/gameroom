// import { ForkEffect } from 'redux-saga/effects';
import { Effect } from 'redux-saga/effects';

import { IState as IDiceState } from '../containers/Dice/state/interfaces';
import { IState as ILudoState } from '../containers/Ludo/state/interfaces';
import { IState as IContextMenuState } from '../services/contextMenu/interfaces';

export enum BaseColors {
  RED = 'RED',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
  YELLOW = 'YELLOW',
}

export enum WalkwayPosition {
  NORTH = 'NORTH',
  EAST = 'EAST',
  WEST = 'WEST',
  SOUTH = 'SOUTH',
}

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
