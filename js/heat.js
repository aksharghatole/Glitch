// NFS MW 2005-style heat system — tuned so pursuit actually happens.

export const Heat = {
  stars: 0,
  displayStars: 0,
  decayTimer: 0,
  decayDelay: 4,
  decayRate: 0.35,
  maxStars: 10,

  reset() {
    this.stars = 0;
    this.displayStars = 0;
    this.decayTimer = 0;
  },

  addHeat(amount) {
    this.stars = Math.min(this.maxStars, this.stars + amount);
    this.decayTimer = 0;
  },

  update(dt, activeCops, player) {
    // Baseline: ANY decent speed raises heat slowly.
    if (player) {
      const kmh = player.speedKmh;
      if (kmh > 80)  this.addHeat(0.10 * dt);   // normal driving
      if (kmh > 160) this.addHeat(0.25 * dt);   // speeding
      if (kmh > 240) this.addHeat(0.40 * dt);   // reckless
    }

    // Active pursuit — heat climbs fast
    if (activeCops > 0) {
      this.addHeat(0.30 * dt * Math.min(activeCops, 6));
      this.decayTimer = 0;
    } else if (this.stars > 0) {
      this.decayTimer += dt;
      if (this.decayTimer > this.decayDelay) {
        this.stars = Math.max(0, this.stars - this.decayRate * dt);
      }
    }

    this.displayStars += (this.stars - this.displayStars) * Math.min(1, dt * 6);
  },

  get wholeStars() {
    return Math.floor(this.stars);
  },
};