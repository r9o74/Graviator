export enum GameState {
    MENU = 'MENU',
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    GAME_OVER = 'GAME_OVER',
    VICTORY = 'VICTORY'
}

export enum GameMode {
    SURVIVAL = 'SURVIVAL',
    ENDLESS = 'ENDLESS',
    TUTORIAL = 'TUTORIAL'
}

export interface InputState {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    // アナログ入力用のベクトル (-1.0 to 1.0)
    vector?: { x: number, y: number };
}

export interface GameConfig {
    entityCount: number;
    gravityConstant: number;
    thrustForce: number;
}

export interface GameStats {
    mode: GameMode;
    speed: number;
    gravityForce: number;
    maxSpeed: number;
    maxGravity: number;
    currentEnemies: number;
    initialEnemies: number;
    timeSurvived: number;
    dangerLevel: number; // 0-100% based on proximity to walls/enemies
    kills: number;
    tutorialMessage?: string; // チュートリアル用の指示テキスト
}