export interface BaseTracker {
  name: string;
  init: (sdk: any) => void;
}

export const version = '0.0.1';
