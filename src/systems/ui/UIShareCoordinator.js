const GAME_URL = 'https://t-i-oak.github.io/GravityFreight/';

class UIShareCoordinator {
    constructor({ shareImageRenderer, shareService, gameDataRepository, mapCanvas }) {
        this.shareImageRenderer = shareImageRenderer;
        this.shareService = shareService;
        this.gameDataRepository = gameDataRepository;
        this.mapCanvas = mapCanvas;
    }

    async shareFlightResult(viewData) {
        const blob = await this.shareImageRenderer.createFlightResultImage({
            viewData,
            mapCanvas: this.mapCanvas,
            gameDataRepository: this.gameDataRepository
        });
        return this.shareService.shareImage({
            blob,
            fileName: 'gravity-freight-flight-result.png',
            title: 'Gravity Freight Result',
            text: this.#createShareText(viewData?.title || 'Flight Result')
        });
    }

    async shareGameEnd(payload) {
        const blob = await this.shareImageRenderer.createGameEndImage(payload);
        return this.shareService.shareImage({
            blob,
            fileName: 'gravity-freight-terminal-report.png',
            title: 'Gravity Freight Terminal Report',
            text: this.#createShareText('Terminal Report')
        });
    }

    #createShareText(title) {
        return `【GRAVITY FREIGHT】\n${title}\n${GAME_URL}\n#GravityFreight #GameWorksOAK`;
    }
}

export default UIShareCoordinator;
