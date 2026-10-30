import Pool from './base/pool';

let instance;

/**
 * 全局状态管理器
 */
export default class DataBus {
  state = 'SELECT'; // 'SELECT' | 'PLAYING' | 'LEVEL_UP' | 'GAME_OVER'
  frame = 0;
  time = 0; // 存活时间（秒）
  kills = 0;
  score = 0;
  isGameOver = false;
  pool = new Pool();

  constructor() {
    if (instance) return instance;
    instance = this;
  }

  reset() {
    this.state = 'SELECT';
    this.frame = 0;
    this.time = 0;
    this.kills = 0;
    this.score = 0;
    this.isGameOver = false;
  }

  startFight() {
    this.state = 'PLAYING';
    this.frame = 0;
    this.time = 0;
    this.kills = 0;
    this.score = 0;
    this.isGameOver = false;
  }

  pauseForLevelUp() {
    this.state = 'LEVEL_UP';
  }

  resumeFight() {
    this.state = 'PLAYING';
  }

  gameOver() {
    this.state = 'GAME_OVER';
    this.isGameOver = true;
  }
}
