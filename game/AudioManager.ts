export class AudioManager {
    private static instance: AudioManager;
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private buffers: Map<string, AudioBuffer> = new Map();
    private loadingPromise: Promise<void> | null = null;
    
    private thrustSource: AudioBufferSourceNode | null = null;
    private thrustGain: GainNode | null = null;

    private readonly SOUND_URLS = {
        thrust: 'https://actions.google.com/sounds/v1/science_fiction/ambience_hum_loop.ogg',
        click: 'start_button.wav',      // パスをシンプルに
        hover: 'https://actions.google.com/sounds/v1/ui/button_rollover.ogg',
        explosion: 'knockout.wav',      // パスをシンプルに
        start: 'https://actions.google.com/sounds/v1/science_fiction/stinger_rising.ogg',
        gameOver: 'https://actions.google.com/sounds/v1/science_fiction/power_down.ogg',
        victory: 'https://actions.google.com/sounds/v1/crowds/stadium_cheer.ogg'
    };

    private constructor() {}

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    private async init() {
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = (async () => {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            console.log("AudioManager: Loading sounds...");

            const loadPromises = Object.entries(this.SOUND_URLS).map(async ([name, url]) => {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
                    this.buffers.set(name, audioBuffer);
                    console.log(`AudioManager: Loaded ${name}`);
                } catch (err) {
                    console.error(`AudioManager: Error loading ${name} (${url}):`, err);
                }
            });

            await Promise.all(loadPromises);
            this.setupThrustLoop();
        })();

        return this.loadingPromise;
    }

    private setupThrustLoop() {
        if (!this.ctx || !this.masterGain || !this.buffers.has('thrust')) return;

        this.thrustSource = this.ctx.createBufferSource();
        this.thrustSource.buffer = this.buffers.get('thrust')!;
        this.thrustSource.loop = true;

        this.thrustGain = this.ctx.createGain();
        this.thrustGain.gain.setValueAtTime(0, this.ctx.currentTime);

        this.thrustSource.connect(this.thrustGain);
        this.thrustGain.connect(this.masterGain);
        this.thrustSource.start();
    }

    public async resume() {
        await this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    private playOneShot(name: string, volume: number = 1.0) {
        if (!this.ctx || !this.masterGain) {
            console.warn(`AudioManager: Context not ready for ${name}`);
            return;
        }
        if (!this.buffers.has(name)) {
            console.warn(`AudioManager: Buffer not loaded for ${name}`);
            return;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers.get(name)!;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);

        source.connect(gain);
        gain.connect(this.masterGain);
        source.start();
    }

    public setThrust(intensity: number) {
        if (!this.ctx || !this.thrustGain || !this.thrustSource) return;
        const now = this.ctx.currentTime;
        this.thrustGain.gain.setTargetAtTime(intensity * 0.4, now, 0.1);
        this.thrustSource.playbackRate.setTargetAtTime(0.8 + intensity * 0.7, now, 0.2);
    }

    public playUiClick() { this.playOneShot('click', 0.8); }
    public playUiHover() { this.playOneShot('hover', 0.3); }
    public playExplosion() { this.playOneShot('explosion', 1.0); }
    public playStart() { this.playOneShot('start', 0.7); }
    public playGameOver() { this.playOneShot('gameOver', 0.9); }
    public playVictory() { this.playOneShot('victory', 0.7); }
}