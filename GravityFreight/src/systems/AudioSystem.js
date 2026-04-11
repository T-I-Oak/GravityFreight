import { StorageUtils } from '../utils/StorageUtils.js';

export class AudioSystem {
    constructor(game) {
        this.game = game;
        this.ctx = null;
        this.masterGain = null;
        this.lowPass = null;
        this.active = false;
        this.init(); // インスタンス化時に基本コンポーネントを作成（suspended状態で待機）
    }

    /**
     * システムの初期化。
     */
    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            this.ctx = new AudioContext();
            
            this.masterGain = this.ctx.createGain();
            const initialVol = StorageUtils.get('gf_se_volume', 0.5);
            this.currentVolume = initialVol;
            this.masterGain.gain.value = initialVol * 0.5; // マスターゲインは0.5倍を基準とする
            
            this.lowPass = this.ctx.createBiquadFilter();
            this.lowPass.type = 'lowpass';
            this.lowPass.frequency.setValueAtTime(3500, 0);
            this.lowPass.Q.setValueAtTime(1, 0);

            this.masterGain.connect(this.lowPass);
            this.lowPass.connect(this.ctx.destination);
            
            this.active = true;
        } catch (e) {
            console.warn("AudioSystem initialization failed:", e);
            this.active = false;
        }
    }

    /**
     * コンテキストを再開する。
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * 発音準備ができているか確認。
     */
    _prepare() {
        if (!this.ctx) return false;
        if (this.currentVolume <= 0) return false; // 消音設定なら音を鳴らさない
        if (this.ctx.state === 'suspended') {
            this.resume();
        }
        return true;
    }

    /**
     * マスターボリュームの設定 (0.0 to 1.0)
     */
    setVolume(value) {
        if (!this.masterGain) return;
        const vol = Math.max(0, Math.min(1, value));
        this.currentVolume = vol; // 現在の音量を保持
        
        // 設定を保存
        StorageUtils.set('gf_se_volume', vol);

        // 急激な変更によるノイズを避けるため、滑らかに（50ms）遷移させる
        const t = this.ctx.currentTime;
        this.masterGain.gain.setTargetAtTime(vol * 0.5, t, 0.05);
    }

    // --- Sound Patches (100点満点を目指した調整) ---

    /**
     * ロケット発射音: 「ドンッ」という力強いが短い噴射音。質感を極めて滑らかに。
     */
    playLaunch() {
        if (!this._prepare()) return;
        const t = this.ctx.currentTime;
        const duration = 1.0; // 持続をさらに短縮
        
        // 滑らかなサイン波による重み
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(60, t);
        sub.frequency.exponentialRampToValueAtTime(30, t + duration);
        
        subGain.gain.setValueAtTime(0, t);
        subGain.gain.linearRampToValueAtTime(0.6, t + 0.05);
        subGain.gain.linearRampToValueAtTime(0, t + duration);
        
        // 控えめなノイズ（ザラつきをカット）
        const noise = this.ctx.createBufferSource();
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const d = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) d[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(400, t); // 低周波のみ残して耳障りな音をカット

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0, t);
        noiseGain.gain.linearRampToValueAtTime(0.3, t + 0.05);
        noiseGain.gain.linearRampToValueAtTime(0, t + duration);

        sub.connect(subGain);
        subGain.connect(this.masterGain);
        noise.connect(lp);
        lp.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        sub.start(t);
        sub.stop(t + duration);
        noise.start(t);
        noise.stop(t + duration);
    }
    
    /**
     * 航行音の管理 (速度同期)
     */
    /**
     * ロケットの速度に応じた航行音の更新。
     * 宇宙の静寂を優先し、現在は無効化されています。
     */
    updateFlightSound(speed) {
        // 現在の音響設計方針に基づき、処理を空にしています。
    }

    /**
     * 航行音の停止。
     */
    stopFlightSound() {
        if (this.flightGain) {
            const t = this.ctx.currentTime;
            this.flightGain.gain.cancelScheduledValues(t);
            this.flightGain.gain.linearRampToValueAtTime(0, t + 0.1);
            setTimeout(() => {
                if (this.flightOsc) {
                    this.flightOsc.stop();
                    this.flightOsc = null;
                    this.flightGain = null;
                }
            }, 150);
        }
    }
    
    /**
     * ソナー音: 「ポーン」という丸みのある落ち着いたパルス音。
     */
    playSonar() {
        if (!this._prepare()) return;
        // 波紋がロケットからはみ出すタイミング（約0.25秒）に合わせて遅延再生
        const t = this.ctx.currentTime + 0.25; 
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.linearRampToValueAtTime(580, t + 0.1); 
        
        gain.gain.setValueAtTime(0, t);
        // 極限まで音量を絞る (0.002)
        gain.gain.linearRampToValueAtTime(0.002, t + 0.02); 
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 1.2);
    }

    /**
     * アイテム取得音。
     */
    playPickup() {
        if (!this._prepare()) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.1);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    /**
     * UI 確定音: playTick に統合（ユーザー様のご希望）。
     */
    playConfirm() {
        this.playTick();
    }

    /**
     * 衝突音: インパクトを強化し、不快な高域ノイズを排除。
     */
    playCrash() {
        if (!this._prepare()) return;
        const t = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle'; // 刺さるノコギリ波から丸みのある三角波へ
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.4);
        
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.8, t + 0.005); // クリック防止の極短アタック
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        // 衝撃の厚みを出すノイズ
        const noise = this.ctx.createBufferSource();
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(800, t); // 高域の「刺さり」をカット
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0, t);
        noiseGain.gain.linearRampToValueAtTime(0.5, t + 0.005);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.5);
        noise.start(t);
        noise.stop(t + 0.5);
    }
    
    /**
     * ゴール到達音: 荘厳な響き。
     */
    playGoal() {
        if (!this._prepare()) return;
        const t = this.ctx.currentTime;
        const freqs = [130.81, 164.81, 196.00, 261.63];
        freqs.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle'; // より聞き取りやすい三角波に変更
            osc.frequency.setValueAtTime(freq, t);
            // 画面遷移に合わせて 1.0s 以内に収める
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 1.0);
        });
    }

    /**
     * ロスト音。
     */
    playLost() {
        if (!this._prepare()) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle'; // 下降を明確にするため三角波に変更
        // 1.0s 以内に素早く下降 (画面遷移との同期)
        osc.frequency.setValueAtTime(110, t);
        osc.frequency.linearRampToValueAtTime(55, t + 1.0);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 1.0);
    }

    /**
     * 母星帰還音: 軽やかな上昇チャイム。
     */
    playReturn() {
        if (!this._prepare()) return;
        const t = this.ctx.currentTime;
        
        [783.99, 1046.50].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = t + i * 0.08;
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    }

    /**
     * UI 操作音: 短いクリック音。
     */
    playTick() {
        if (!this._prepare()) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        
        // 50ms (0.05s) の減衰。CPU負荷に耐えられる程度の余裕を持たせる。
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.05);
    }

    /**
     * ワープ演出音: ホワイトノイズとフィルターによる加速感の表現。
     * @param {number} duration 演出時間 (デフォルト3.5s)
     */
    playWarp(duration = 3.5) {
        if (!this._prepare()) return;
        const t = this.ctx.currentTime;
        
        // ホワイトノイズ生成
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        // 加速感: 周波数を低域から高域へスイープ
        filter.frequency.setValueAtTime(100, t);
        filter.frequency.exponentialRampToValueAtTime(5000, t + duration * 0.7);
        filter.frequency.exponentialRampToValueAtTime(100, t + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.5); // フェードイン
        gain.gain.linearRampToValueAtTime(0.08, t + duration - 0.5);
        gain.gain.linearRampToValueAtTime(0, t + duration); // フェードアウト

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        noise.start(t);
        noise.stop(t + duration);
    }

    /**
     * スタンプ音: 「ドン」という重厚な叩きつけ音。
     */
    playStamp() {
        if (!this._prepare()) return;
        const t = this.ctx.currentTime;
        
        // 1. メインの衝撃波 (150Hz -> 40Hz)
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
        
        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        
        // 2. 超低域のサブライン（地響きの質感）
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(60, t);
        sub.frequency.linearRampToValueAtTime(20, t + 0.5);
        subGain.gain.setValueAtTime(0.6, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

        // 3. 打撃のテクスチャ (フィルターを下げてスネア感をカット)
        const noiseBufferSize = this.ctx.sampleRate * 0.4;
        const noiseBuffer = this.ctx.createBuffer(1, noiseBufferSize, this.ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t); 
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, t); 
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        sub.connect(subGain);
        subGain.connect(this.masterGain);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        osc.start(t);
        osc.stop(t + 0.6);
        sub.start(t);
        sub.stop(t + 0.8);
        noise.start(t);
        noise.stop(t + 0.2);
    }
}

