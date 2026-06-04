import AppOrchestrator from './core/AppOrchestrator.js';

const app = new AppOrchestrator();

app.boot().then(() => {
    window.gravityFreightApp = app;
}).catch(error => {
    console.error('[GravityFreight] Failed to boot.', error);
});
