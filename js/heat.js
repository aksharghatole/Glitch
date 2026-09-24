// NFS MW 2005-style heat system.

export const Heat = {
  stars: 0,          // 0..10, fractional internally
  displayStars: 0,
  decayTimer: 0,
  decayDelay: 4,     // seconds before decay starts
  decayRate: 0.25,   // stars per second
  riseRate: 0.4,     // stars per second during chaos
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

  // Called every frame
  update(dt, activeCops) {
    if (activeCops > 0) {
      // being pursued → slight rise over time
      this.addHeat(0.02 * dt * activeCops * 0.5);
      this.decayTimer = 0;
    } else if (this.stars > 0) {
      this.decayTimer += dt;
      if (this.decayTimer > this.decayDelay) {
        this.stars = Math.max(0, this.stars - this.decayRate * dt);
      }
    }

    // Smooth display number
    this.displayStars += (this.stars - this.displayStars) * Math.min(1, dt * 6);
  },

  get wholeStars() {
    return Math.floor(this.stars);
  },
};