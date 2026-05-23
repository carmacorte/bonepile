export class HUD {
  constructor() {
    this.mode = document.getElementById('hud-mode');
    this.detection = document.getElementById('hud-detection');
    this.detectionBar = document.getElementById('detection-bar');
    this.scrap = document.getElementById('hud-scrap');
    this.repaired = document.getElementById('hud-repaired');
    this.flux = document.getElementById('hud-flux');
    this.prompt = document.getElementById('hud-prompt');
  }

  update({ detection, state, resources, player, prompt }) {
    const percent = Math.round(detection * 100);
    this.mode.textContent = state;
    this.detection.textContent = `${percent}%`;
    this.detectionBar.style.width = `${percent}%`;
    this.scrap.textContent = String(resources.scrap);
    this.repaired.textContent = String(resources.repaired);
    if (player.isHidden) {
      this.flux.textContent = `Active ${player.hiddenTimer.toFixed(1)}s`;
    } else if (player.fluxReady) {
      this.flux.textContent = 'Ready';
    } else {
      this.flux.textContent = `${player.fluxCooldown.toFixed(1)}s`;
    }
    this.prompt.textContent = prompt;
  }
}
