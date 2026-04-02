/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../../GravityFreight/src/core/Game.js';
import { Vector2 } from '../../../GravityFreight/src/utils/Physics.js';
import { setupStandardDOM } from '../../test-utils.js';

// Mock TitleAnimation (called via updateUI -> _updateTitleUI in Game constructor)
vi.mock('../../../GravityFreight/src/utils/TitleAnimation.js', () => {
    return {
        TitleAnimation: class {
            constructor() {}
            start() {}
            stop() {}
            draw() {}
            update() {}
        }
    };
});

describe('Implementation: Game Core Controllers', () => {
    let mockCanvas, mockUI, game;

    beforeEach(() => {
        // Create all necessary DOM elements for Game initialization
        document.body.innerHTML = `
            <canvas id="gameCanvas"></canvas>
            <div id="ui-layer"></div>
            <div id="title-screen"></div>
            <div id="mission-hud" class="hidden">
                <div id="score-display">0</div>
                <div id="coin-display">0</div>
                <div id="sector-display">1</div>
            </div>
            <div id="terminal-panel" class="hidden">
                <div class="collapse-btn" id="terminal-collapse-btn"><span class="icon">∧</span></div>
                <div class="tab-btn" data-tab="flight" id="flight-tab"></div>
                <div class="tab-btn" data-tab="factory" id="factory-tab"></div>
                <div id="chassis-list"></div>
                <div id="logic-list"></div>
                <div id="logic-option-list"></div>
                <div id="acc-option-list"></div>
                <div id="launcher-list"></div>
                <div id="rocket-list"></div>
                <button id="build-btn"></button>
            </div>
            <div id="build-overlay" class="hidden"></div>
            <div id="launch-control" class="hidden"></div>
            <div id="launch-btn" class="hidden"></div>
            <div id="result-overlay" class="hidden">
                <div id="result-title"></div>
                <div id="result-subtitle"></div>
                <div id="result-stats-list"></div>
                <div id="result-items-list"></div>
                <div id="result-total-score"></div>
                <div id="result-total-coin"></div>
                <button id="result-view-map-btn">VIEW MAP</button>
                <button id="result-close-btn"></button>
            </div>
            <div id="receipt-overlay" class="hidden">
                <div id="receipt-content-area"></div>
            </div>
            <button id="back-to-result-btn" class="hidden">BACK TO RESULT</button>
            <div id="event-screen" class="hidden"></div>
            <div id="how-to-play-overlay" class="hidden"></div>
            <div id="star-info-panel" class="hidden"></div>
            <div id="star-info-list"></div>
            <div id="star-info-title"></div>
            <canvas id="title-bg-canvas"></canvas>
            <canvas id="title-fg-canvas"></canvas>
        `;
        mockCanvas = document.getElementById('gameCanvas');
        mockCanvas.width = 800;
        mockCanvas.height = 600;
        const mockContext = {
            fillRect: vi.fn(),
            clearRect: vi.fn(),
            drawImage: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            scale: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            arc: vi.fn(),
            measureText: vi.fn(() => ({ width: 0 })),
            fillText: vi.fn(),
            strokeText: vi.fn(),
            createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
            setLineDash: vi.fn()
        };
        mockCanvas.getContext = vi.fn().mockReturnValue(mockContext);

        // Also mock getContext for title canvases
        const bgCanvas = document.getElementById('title-bg-canvas');
        const fgCanvas = document.getElementById('title-fg-canvas');
        if (bgCanvas) bgCanvas.getContext = vi.fn().mockReturnValue(mockContext);
        if (fgCanvas) fgCanvas.getContext = vi.fn().mockReturnValue(mockContext);

        mockUI = { layer: document.getElementById('ui-layer') };
        game = new Game(mockCanvas, mockUI);
    });

    it('should initialize all subsystems correctly on construction', () => {
        expect(game.inventorySystem).toBeDefined();
        expect(game.economySystem).toBeDefined();
        expect(game.assemblySystem).toBeDefined();
        expect(game.missionSystem).toBeDefined();
        expect(game.physicsOrchestrator).toBeDefined();
        expect(game.uiSystem).toBeDefined();
        expect(game.eventSystem).toBeDefined();
    });

    it('should correctly handle home star initialization', () => {
        game.missionSystem.initStage();
        const homeStar = game.bodies.find(b => b.isHome);
        expect(homeStar).toBeDefined();
        expect(homeStar.position.x).toBe(mockCanvas.width / 2);
    });

    it('should assign input handlers to the canvas on construction', () => {
        expect(mockCanvas.onmousedown).toBeDefined();
        expect(mockCanvas.onmousemove).toBeDefined();
        expect(mockCanvas.onmouseup).toBeDefined();
        expect(mockCanvas.onwheel).toBeDefined();
    });

    it('should update mousePos and cameraOffset when mouse events occur', () => {
        const startPos = { x: 10, y: 10 };
        game.onMouseDown({ clientX: startPos.x, clientY: startPos.y, shiftKey: true });
        expect(game.mousePos.x).toBe(startPos.x);
        expect(game.isPointerDown).toBe(true);
        expect(game.interactionMode).toBe('pan');

        const moveDelta = { x: 5, y: 5 };
        game.onMouseMove({ clientX: startPos.x + moveDelta.x, clientY: startPos.y + moveDelta.y });
        expect(game.cameraOffset.x).toBe(moveDelta.x);
        
        game.onMouseUp();
        expect(game.isPointerDown).toBe(false);
    });

    it('should select rotation mode even in non-aiming states when clicking outside boundaryRadius', () => {
        game.state = 'building';
        game.boundaryRadius = 400;
        const centerX = mockCanvas.width / 2;
        const centerY = mockCanvas.height / 2;

        vi.spyOn(game, 'getWorldPos').mockReturnValue(new Vector2(centerX + 500, centerY));
        
        game.onMouseDown({ clientX: centerX + 500, clientY: centerY, shiftKey: false });
        expect(game.interactionMode).toBe('rotate');
    });

    it('should select pan mode in non-aiming state even when clicking inside boundaryRadius', () => {
        game.state = 'building';
        game.boundaryRadius = 400;
        const centerX = mockCanvas.width / 2;
        const centerY = mockCanvas.height / 2;

        vi.spyOn(game, 'getWorldPos').mockReturnValue(new Vector2(centerX + 10, centerY + 10));
        
        game.onMouseDown({ clientX: centerX + 10, clientY: centerY + 10, shiftKey: false });
        expect(game.interactionMode).toBe('pan');
    });

    it('should select aim mode when clicking inside boundaryRadius in aiming state', () => {
        game.state = 'aiming';
        game.boundaryRadius = 400;
        const centerX = mockCanvas.width / 2;
        const centerY = mockCanvas.height / 2;
        game.homeStar = { position: new Vector2(centerX, centerY), radius: 25 };
        game.ship = { position: new Vector2(centerX, centerY - 37), rotation: -Math.PI / 2 };

        vi.spyOn(game, 'getWorldPos').mockReturnValue(new Vector2(centerX + 10, centerY + 10));
        
        game.onMouseDown({ clientX: centerX + 10, clientY: centerY + 10, shiftKey: false });
        expect(game.interactionMode).toBe('aim');

        // Verify rotation is updated during aiming move
        // Simplify test with zoom 1.0
        game.zoom = 1.0;
        // Place mouse directly to the right of ship (centerX + 100) -> 0 degrees
        game.onMouseMove({ clientX: centerX + 100, clientY: centerY - 37 });
        expect(game.ship.rotation).toBeCloseTo(0);
        expect(game.ship.position.x).toBeCloseTo(centerX + 37); // radius(25) + 12 = 37
        expect(game.ship.position.y).toBeCloseTo(centerY);
    });

    it('should correctly convert screen angle to world angle under mapRotation', () => {
        game.state = 'aiming';
        game.mapRotation = Math.PI / 2; // 90度回転状態
        game.zoom = 1.0;
        
        const centerX = mockCanvas.width / 2;
        const centerY = mockCanvas.height / 2;
        game.homeStar = { position: new Vector2(centerX, centerY), radius: 25 };
        // 初期位置を WORLD-UP に設定
        game.ship = { position: new Vector2(centerX, centerY - 37), rotation: -Math.PI / 2 };

        // mock getScreenPos (simplified for test)
        // WORLD-UP (-37) becomes SCREEN-RIGHT in mapRotation=90deg
        vi.spyOn(game, 'getScreenPos').mockReturnValue(new Vector2(centerX + 37, centerY));

        // Place mouse to the right of ship (SCREEN-RIGHT) -> screenAngle = 0
        game.onMouseMove({ clientX: centerX + 100, clientY: centerY });
        
        // screenAngle(0) - mapRotation(PI/2) = -PI/2 (WORLD-UP)
        expect(game.ship.rotation).toBeCloseTo(-Math.PI / 2);
    });

    it('should prioritize panning when Shift key is pressed regardless of click position', () => {
        game.state = 'aiming';
        game.boundaryRadius = 400;
        const centerX = mockCanvas.width / 2;
        const centerY = mockCanvas.height / 2;

        vi.spyOn(game, 'getWorldPos').mockReturnValue(new Vector2(centerX + 10, centerY + 10));
        game.onMouseDown({ clientX: centerX + 10, clientY: centerY + 10, shiftKey: true });
        
        expect(game.interactionMode).toBe('pan');
    });

    it('should update zoom when wheel event occurs', () => {
        const initialZoom = game.zoom;
        game.onWheel({ deltaY: 100, preventDefault: () => {} });
        expect(game.zoom).toBeLessThan(initialZoom);
    });

    it('should have the correct version', () => {
        expect(game.version).toBe('0.9.0');
    });

    it('should persist minimized state when viewing map from result overlay', async () => {
        // 1. Set to result screen (cleared)
        // [Spec 2.6/2.7] state change alone shouldn't show it
        game.state = 'cleared';
        game.updateUI();
        const resultOverlay = document.getElementById('result-overlay');
        expect(resultOverlay.classList.contains('hidden')).toBe(true, 'updateUI() should NOT show result overlay');

        // 2. Only shows after showResult() is called
        game.uiSystem.showResult('cleared');
        
        // Wait for requestAnimationFrame in showResult()
        await new Promise(resolve => requestAnimationFrame(resolve));

        const checkMapBtn = document.getElementById('result-view-map-btn');
        const backToResultBtn = document.getElementById('back-to-result-btn');

        // Verify visibility
        expect(resultOverlay.classList.contains('hidden')).toBe(false, 'showResult() should be the only way to show it');
        expect(resultOverlay.classList.contains('minimized')).toBe(false);

        // 3. Click [VIEW MAP] button
        vi.spyOn(game.uiSystem, 'enterMapViewMode');
        checkMapBtn.click();
        expect(game.uiSystem.enterMapViewMode).toHaveBeenCalled();
        expect(resultOverlay.classList.contains('minimized')).toBe(true);

        // 4. Important: updateUI() shouldn't add hidden class or lose minimized state
        game.updateUI();
        expect(resultOverlay.classList.contains('minimized')).toBe(true);
        expect(resultOverlay.classList.contains('hidden')).toBe(false, 'Overlay should stay visible even after updateUI()');
    });

    it('[Spec 2.4] showResult() must reset minimized state to prevent stale display', () => {
        // Verify Spec 2.4 requirement: showResult() -> resetResultOverlay()
        const resultOverlay = document.getElementById('result-overlay');
        resultOverlay.classList.add('minimized'); // Residual state from previous run

        // Verify resetResultOverlay() is called via spy
        vi.spyOn(game.uiSystem, 'resetResultOverlay');
        vi.spyOn(game, 'updateUI').mockImplementation(() => {});
        game.uiSystem.showResult('cleared');

        // Must reset minimized state
        expect(game.uiSystem.resetResultOverlay).toHaveBeenCalled();
        expect(resultOverlay.classList.contains('minimized')).toBe(false,
            'showResult() must call resetResultOverlay() per Tech Spec 2.4');
    });

    it('[Spec 2.6] enterMapViewMode() must add minimized and show back button', () => {
        const resultOverlay = document.getElementById('result-overlay');
        const receiptOverlay = document.getElementById('receipt-overlay');
        const backToResultBtn = document.getElementById('back-to-result-btn');

        game.uiSystem.enterMapViewMode();

        expect(resultOverlay.classList.contains('minimized')).toBe(true);
        expect(receiptOverlay.classList.contains('minimized')).toBe(true);
        expect(backToResultBtn.classList.contains('hidden')).toBe(false);
    });

    it('[Spec 2.6] exitMapViewMode() must remove minimized and hide back button', () => {
        const resultOverlay = document.getElementById('result-overlay');
        const receiptOverlay = document.getElementById('receipt-overlay');
        const backToResultBtn = document.getElementById('back-to-result-btn');

        // Set MAP VIEW state
        game.uiSystem.enterMapViewMode();
        // Set state to cleared for updateUI call
        game.state = 'cleared';

        game.uiSystem.exitMapViewMode();

        expect(resultOverlay.classList.contains('minimized')).toBe(false);
        expect(receiptOverlay.classList.contains('minimized')).toBe(false);
        expect(backToResultBtn.classList.contains('hidden')).toBe(true);
    });

    it('should throw an error during flight update if ship.trail is missing (Rule 5.1 verification)', () => {
        game.state = 'flying';
        // Intentionally set trail to undefined
        game.ship = { 
            position: new Vector2(100, 100), 
            velocity: new Vector2(1, 1), 
            mass: 10, 
            rotation: 0,
            trail: undefined 
        };
        
        // Verify exception based on Rule 5.1
        // simulatedTime % 0.01 = 0 < 0.002 ensures physicsOrchestrator throws
        game.simulatedTime = 0;
        expect(() => game.physicsOrchestrator.step(0.002)).toThrow();
    });

    it('should not throw error and return early when launcher charges are zero', () => {
        // Verify error handling when launcher charges are zero
        game.selection.launcher = { id: 'ln1', power: 1, charges: 0 };
        game.state = 'aiming';

        // Mock dependencies
        vi.spyOn(game, 'updateUI').mockImplementation(() => {});
        vi.spyOn(game, 'showStatus').mockImplementation(() => {});

        // Test if launch() handles zero charges properly
        expect(() => game.eventSystem.launch()).not.toThrow();
        expect(game.state).toBe('aiming'); // State should not transition
        expect(game.showStatus).toHaveBeenCalledWith(expect.any(String), 'error');
    });

    it('should consume booster from inventory upon launch', () => {
        // Verify booster consumption from inventory upon launch
        const booster = { id: 'test_booster', category: 'boosters', powerMultiplier: 1.5, instanceId: 'inst_b1', count: 1 };
        game.inventory.boosters = [booster];
        game.selection.booster = booster;
        game.selection.chassis = { id: 'c1', mass: 10 };
        game.selection.logic = { id: 'l1' };
        game.selection.rocket = { id: 'r1', powerMultiplier: 1.0 };
        game.selection.launcher = { id: 'ln1', power: 1, charges: 10 };
        game.state = 'aiming';

        // Mock drawing system
        vi.spyOn(game, 'updateUI').mockImplementation(() => {});

        // Execute launch (calls EventSystem.launch)
        game.eventSystem.launch();

        // Must be removed from inventory and selection cleared
        expect(game.inventory.boosters.length).toBe(0);
        expect(game.selection.booster).toBe(null);
    });

    it('should remove launcher from inventory when charges reach 0 after launch', () => {
        // [New Test] Prepare launcher with 1 charge
        const launcher = { id: 'ln1', category: 'launchers', instanceId: 'inst_l1', charges: 1, power: 1 };
        game.inventory.launchers = [launcher];
        game.selection.launcher = launcher;
        game.selection.rocket = { id: 'r1', powerMultiplier: 1.0 };
        game.state = 'aiming';

        vi.spyOn(game, 'updateUI').mockImplementation(() => {});
        vi.spyOn(game, 'showStatus').mockImplementation(() => {});

        // Execute launch
        game.eventSystem.launch();

        // Must be removed from inventory when charges reach 0
        expect(game.inventory.launchers).not.toContain(launcher);
        expect(game.selection.launcher).toBe(null);
    });

    it('should hide all overlays and show title screen upon fullReset()', () => {
        // [New Test] Simulate visible overlays
        const resultOverlay = document.getElementById('result-overlay');
        const receiptOverlay = document.getElementById('receipt-overlay');
        const titleScreen = document.getElementById('title-screen');
        
        resultOverlay.classList.remove('hidden');
        receiptOverlay.classList.remove('hidden');
        titleScreen.classList.add('hidden');

        // Execute full reset
        game.fullReset();

        // All overlays must be hidden and title screen visible
        expect(resultOverlay.classList.contains('hidden')).toBe(true, 'Result overlay should be hidden');
        expect(receiptOverlay.classList.contains('hidden')).toBe(true, 'Receipt overlay should be hidden');
        expect(titleScreen.classList.contains('hidden')).toBe(false, 'Title screen should be visible');
    });
});
