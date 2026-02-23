// ゲームの進行状態を管理する列挙型
export enum GameState {
    MENU = 'MENU',           // タイトル画面
    PLAYING = 'PLAYING',     // ゲームプレイ中
    PAUSED = 'PAUSED',       // 一時停止中
    GAME_OVER = 'GAME_OVER', // ゲームオーバー（敗北）
    VICTORY = 'VICTORY'      // ゲームクリア（勝利）
}

// ゲームモードの定義
export enum GameMode {
    SURVIVAL = 'SURVIVAL', // 敵を全滅させるモード
    ENDLESS = 'ENDLESS',   // 敵が無限に湧くモード
    TUTORIAL = 'TUTORIAL'  // 操作説明モード
}

// 難易度の定義
export enum Difficulty {
    EASY = 'EASY',
    NORMAL = 'NORMAL',
    HARD = 'HARD'
}

// 入力状態を管理するインターフェース
export interface InputState {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    // ジョイスティック等のアナログ入力用ベクトル (-1.0 to 1.0)
    vector?: { x: number, y: number };
}

// ゲームの基本設定（今回はコード内で定数として持っているため未使用に近い）
export interface GameConfig {
    entityCount: number;
    gravityConstant: number;
    thrustForce: number;
}

// UI表示用にエンジンからReact側へ渡す統計情報
export interface GameStats {
    mode: GameMode;
    difficulty: Difficulty;  // 現在の難易度
    speed: number;           // プレイヤーの現在の速度
    gravityForce: number;    // 現在受けている重力の総量
    maxSpeed: number;        // 最大速度記録
    maxGravity: number;      // 最大重力記録
    currentEnemies: number;  // 残存敵数
    initialEnemies: number;  // 開始時の敵数
    timeSurvived: number;    // 生存時間（秒）
    dangerLevel: number;     // 危険度（0-100%: 壁や敵との距離に基づく）
    kills: number;           // 撃破数
    tutorialMessage?: string; // チュートリアル用の指示テキスト
    tutorial_step_show?: string; // チュートリアルのステップ表示 (e.g. "STEP 1/3")
}

// DBに保存するスコアレコード
export interface ScoreRecord {
    id: string;
    user_id: string;
    game_mode: GameMode;
    difficulty: Difficulty;
    score: number;
    created_at: string;
    user_name?: string;
}