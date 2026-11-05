// Rain and snow falling across the whole map.
import type { GameState } from '../../sim/types';
import type { Env } from '../palette';
import type { Particles } from './particles';

export class Weather {
  private weatherAcc = 0;

  emitWeather(s: GameState, env: Env, dt: number, W: number, H: number, P: Particles): void {
    if (!env.rainy && !env.snowy && env.seasonal !== 'blizzard') return;
    this.weatherAcc += (env.rainy ? 140 : env.seasonal === 'blizzard' ? 160 : 40) * dt;
    while (this.weatherAcc >= 1) {
      this.weatherAcc -= 1;
      const x = Math.random() * (W + 80) - 40, y = -10 - Math.random() * 20;
      const groundY = Math.random() * H;
      if (env.rainy) P.spawn('rain', x, y, -30, 260, (groundY - y) / 260, 1, 'rgba(190,215,255,0.7)');
      else P.spawn('snow', x, y, 0, 18 + Math.random() * 12, (groundY - y) / 24, 1 + Math.random() * 1.5, 'rgba(255,255,255,0.9)');
    }
    void s;
  }

}
