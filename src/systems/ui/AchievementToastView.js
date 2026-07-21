class AchievementToastView {
    constructor({
        document,
        gameDataRepository,
        archiveComponents,
        durationMs = 3500,
        formatNumber
    }) {
        this.document = document;
        this.gameDataRepository = gameDataRepository;
        this.archiveComponents = archiveComponents;
        this.durationMs = durationMs;
        this.formatNumber = formatNumber;
        this.container = document.querySelector('#achievement-toast-container');
    }

    show(events = []) {
        if (!Array.isArray(events) || events.length === 0) {
            return;
        }

        const container = this.#getContainer();
        events.forEach(event => {
            const definition = this.gameDataRepository.getAchievementDefinition(event.achievementId);
            const toast = this.document.createElement('article');
            toast.className = 'AchievementToast state-active';
            toast.dataset.achievementId = event.achievementId;
            toast.dataset.achievementTier = String(event.tier);
            toast.dataset.achievementValue = String(event.value ?? 0);
            toast.innerHTML = this.archiveComponents.createAchievementToastCard(
                this.#createToastRow(definition, event)
            );
            container.append(toast);
            setTimeout(() => {
                toast.classList.remove('state-active');
                toast.classList.add('state-exit');
                setTimeout(() => toast.remove(), 250);
            }, this.durationMs);
        });
    }

    refresh() {
        const container = this.#getContainer();
        container.querySelectorAll('.AchievementToast').forEach(toast => {
            const achievementId = toast.dataset.achievementId;
            const tier = Number(toast.dataset.achievementTier);
            const value = Number(toast.dataset.achievementValue);
            if (!achievementId || !Number.isFinite(tier)) {
                throw new Error('[UIController] Achievement toast refresh data is missing.');
            }

            const definition = this.gameDataRepository.getAchievementDefinition(achievementId);
            toast.innerHTML = this.archiveComponents.createAchievementToastCard(
                this.#createToastRow(definition, { achievementId, tier, value })
            );
        });
    }

    #getContainer() {
        if (this.container) {
            return this.container;
        }

        this.container = this.document.createElement('div');
        this.container.id = 'achievement-toast-container';
        this.document.body.append(this.container);
        return this.container;
    }

    #createToastRow(definition, event) {
        const tier = definition.tiers?.[event.tier - 1] ?? {};
        const value = event.value ?? 0;
        const goal = tier.goal ?? null;

        return {
            title: tier.title ?? definition.label ?? event.achievementId,
            method: definition.label ?? event.achievementId,
            stats: goal ? `${this.formatNumber(value)} / ${this.formatNumber(goal)}` : `${this.formatNumber(value)} / MAX`,
            progressRate: goal ? Math.min(1, Math.max(0, value / goal)) : 1,
            achievedTier: event.tier
        };
    }
}

export default AchievementToastView;
