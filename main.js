(() => {
  'use strict';

  const EB = window.EB;
  const canvas = document.getElementById('game');
  const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const bootScreen = document.getElementById('boot-screen');
  const loadingFill = document.getElementById('loading-fill');
  const loadingLabel = document.getElementById('loading-label');
  const errorScreen = document.getElementById('error-screen');
  const errorMessage = document.getElementById('error-message');
  const reloadButton = document.getElementById('reload-button');
  const soundButton = document.getElementById('sound-button');
  const fullscreenButton = document.getElementById('fullscreen-button');

  context.imageSmoothingEnabled = false;
  context.textBaseline = 'alphabetic';

  let manager = null;
  let audio = null;

  function showError(error) {
    const message = error instanceof Error
      ? `${error.name}: ${error.message}\n\n${error.stack || ''}`
      : String(error);
    console.error(error);
    errorMessage.textContent = message;
    errorScreen.hidden = false;
    bootScreen.hidden = true;
  }

  window.addEventListener('error', event => showError(event.error || event.message));
  window.addEventListener('unhandledrejection', event => showError(event.reason));
  window.addEventListener('eb-fatal', event => showError(event.detail));
  reloadButton.addEventListener('click', () => location.reload());

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('Não foi possível alternar a tela cheia.', error);
    }
  }

  fullscreenButton.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    fullscreenButton.textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia';
  });

  soundButton.addEventListener('click', async () => {
    if (!audio) return;
    await audio.start();
    const muted = audio.toggleMute();
    soundButton.textContent = muted ? 'Som desligado' : 'Som ligado';
  });

  window.addEventListener('keydown', event => {
    if (event.code === 'KeyF') toggleFullscreen();
    if (event.code === 'KeyM' && audio) {
      audio.start();
      const muted = audio.toggleMute();
      soundButton.textContent = muted ? 'Som desligado' : 'Som ligado';
    }
  });

  async function unlockAudio() {
    if (!audio) return;
    try { await audio.start(); } catch (error) { console.warn(error); }
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  }

  async function boot() {
    try {
      const save = EB.loadSave();
      const assets = new EB.AssetManager();
      assets.onProgress = (progress, key) => {
        loadingFill.style.width = `${Math.round(progress * 100)}%`;
        loadingLabel.textContent = `Carregando ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}...`;
      };
      await assets.loadAll();

      loadingFill.style.width = '100%';
      loadingLabel.textContent = 'A mata está pronta.';

      const input = new EB.InputController(canvas);
      audio = new EB.AudioDirector(save.settings);
      manager = new EB.SceneManager(canvas, context, input, assets, audio, save);
      manager.setScene(new EB.MenuScene(manager));
      manager.start();

      window.EBGame = {
        manager,
        assets,
        audio,
        input,
        save,
        startLevel: id => manager.startLevel(id, false),
        menu: () => manager.setScene(new EB.MenuScene(manager)),
        fullscreen: toggleFullscreen
      };

      window.__EB_SMOKE_TEST = () => {
        const report = { ok: true, checks: [] };
        try {
          manager.startLevel('terra_viva', false);
          const scene = manager.scene;
          report.checks.push(['game scene', scene instanceof EB.GameScene]);
          const potira = scene.npcs.find(npc => npc.id === 'potira');
          scene.player.x = potira.x - 45;
          scene.player.y = potira.y;
          scene.tryInteract();
          report.checks.push(['potira dialogue opens', scene.dialogue.active]);
          let safety = 0;
          while (scene.dialogue.active && safety < 20) {
            scene.dialogue.reveal = 9999;
            scene.dialogue.next();
            safety += 1;
          }
          report.checks.push(['potira dialogue closes', !scene.dialogue.active]);
          report.checks.push(['potira flag', scene.flags.talked_potira === true]);
          scene.update(1 / 60);
          report.checks.push(['scene continues after dialogue', true]);
          report.ok = report.checks.every(([, value]) => Boolean(value));
        } catch (error) {
          report.ok = false;
          report.error = String(error.stack || error);
        }
        manager.setScene(new EB.MenuScene(manager));
        return report;
      };

      setTimeout(() => {
        bootScreen.style.opacity = '0';
        bootScreen.style.transition = 'opacity .55s ease';
        setTimeout(() => { bootScreen.hidden = true; }, 580);
      }, 250);

      window.addEventListener('pointerdown', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
      canvas.focus();
    } catch (error) {
      showError(error);
    }
  }

  boot();
})();
