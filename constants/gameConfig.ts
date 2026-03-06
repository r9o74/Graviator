// デバイス検知（モバイルかどうかの判定）
export const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// --- ゲーム定数定義 ---
// 物理演算やゲームバランスに関わるパラメータ
export const PLAYER_RADIUS = 12.0;           // プレイヤーの半径
export const ENTITY_MASS = 10.0;             // 基本質量
// 以下の値はデフォルト値として保持し、難易度によってクラス内でオーバーライドされる
export const DEFAULT_GRAVITY_CONSTANT = 40000.0;     
export const DEFAULT_CPU_THRUST_FORCE = 1800.0;      
export const DEFAULT_ENEMY_NUMBER_SURVIVAL = 10;     

export const GRAVITY_MAX = 250000.0;         // 重力の最大値制限（特異点回避）
export const THRUST_FORCE = 1800.0;          // プレイヤーの推進力
export const BREAKING_CONSTANT = 3.5;        // 壁際などでの減速係数
export const WALL_MARGIN = 150;              // 壁からの危険エリア距離
export const BREAK_BOOST = 25;               // 減速力のブースト係数
export const SAFE_DISTANCE = 200;            // スポーン時の安全距離
export const DIST_EXP = 0.88;                // 引力計算の距離の指数（1.0で物理的に正しい逆二乗則に近い挙動だが、ゲーム用に調整）
export const G_LINE_WIDTH = 1;               // 重力結合線の描画幅
export const TRAIL_WIDTH = PLAYER_RADIUS / 1.8; // 軌跡の幅
export const FRICTION = 0.100;               // 空間摩擦係数
export const FRICTION_VEL_EXP = 0.0;         // 摩擦の速度依存指数


export const BASE_LOGICAL_SIZE = IS_MOBILE ? 800 : 700; // 画面サイズの基準値

export const TRAIL_LENGTH = 70;             // 軌跡の長さ
// カラーパレット
export const COLOR_PLAYER = '#00F0FF';       // シアン（プレイヤー）
export const COLOR_ENEMY = '#FF0055';        // マゼンタ（敵）
export const COLOR_PARTICLE = '#FFFFFF';     // パーティクル基本色
export const COLOR_ITEM_MASS = '#FFD700';    // 質量増加（金）
export const COLOR_ITEM_SATELLITE = '#E0E0E0'; // 衛星（白銀）
export const COLOR_ITEM_STEALTH = '#646464'; // 透明化（灰）
export const COLOR_ITEM_WAVE = '#BF40BF';    // 重力波（紫）
export const COLOR_ITEM_INVERSION = '#32CD32'; // 反転（緑）
export const COLOR_ITEM_REPULSIVE = '#FF3300'; // 軌斥（赤）
export const COLOR_ITEM_CAPTURE = '#FF8C00';   // 強奪（ダークオレンジ）
export const COLOR_ITEM_RAMJET_FRONT = '#FF4500'; // ラムジェット前方（赤系）
export const COLOR_ITEM_RAMJET_REAR = '#1E90FF';  // ラムジェット後方（青系）

export const PARTICLE_PHYSICAL_RADIUS = 1.5; // スラスト粒子の大きさ（基準値）
export const LABEL_PHYSICAL_FONT_SIZE = 14;  // ラベルフォントサイズ

// アイテムスポーン設定
export const ITEM_RADIUS = 15; 
export const ITEM_AREA_RADIUS = 30; 
export const ITEM_SPAWN_START_DELAY = 3.0; 
export const ITEM_SPAWN_INTERVAL_MIN = 2.0;
export const ITEM_SPAWN_INTERVAL_MAX = 4.0;


// アイテム出現比率
// 質量増加：衛星：透明化：重力波：反転：軌斥：強奪：ラムジェット
export const item_ratio = [10, 10, 8, 10, 10, 8, 5, 30]; 


// --- アイテム効果パラメータ ---
// 質量増加
export const POWERUP_DURATION = 6.0;
export const MASS_BOOST_MULTIPLIER = 7.0;

// 衛星
export const SATELLITE_MASS = 10.0;
export const SATELLITE_RADIUS = 6.0;
export const SATELLITE_THRUST = 3000.0;
export const SATELLITE_NUM = 7;
export const SATELLITE_TRAIL_LENGTH = 50;

// 透明化
export const STEALTH_FADE_DURATION = 1.0;
export const STEALTH_INVIS_DURATION = 8.0; 
export const STEALTH_TOTAL_DURATION = STEALTH_FADE_DURATION * 2 + STEALTH_INVIS_DURATION;
export const GRAVITY_REDUCTION = 0.30; // 重力影響の軽減率

// 重力波
export const WAVE_SPEED = 700.0;
export const WAVE_FORCE = 45000.0;
export const WAVE_DURATION = 0.15;
export const WAVE_INTERVAL = 1.0;
export const WAVE_MAX_RADIUS = 600.0;

// 反転
export const INVERSION_DURATION = 7.0;
export const INVERSION_MULTIPLE_1 = 5.0;  // 自分 -> 敵 への斥力倍率
export const INVERSION_MULTIPLE_2 = 0.05; // 敵 -> 自分 への斥力倍率

// 軌斥 (Repulsive Trail)
export const REPULSIVE_TRAIL_DURATION = 7.0;
export const REPULSIVE_TRAIL_RESTITUTION = 1.5; // 法線方向反発係数
export const REPULSIVE_TRAIL_RESTITUTION_TAN = 0.5; // 接線方向反発係数
export const TRAIL_LENGTH_EXTENDED = 3000; // トレイル最大長さ（壁を作るため長くする）

// 強奪 (Capture)
export const CAPTURE_DURATION = 8.0;
export const CAPTURE_RADIUS = 100.0;
// 各効果ごとの強奪所要時間
export const CAPTURE_TIME_MASS = 0.3;
export const CAPTURE_TIME_STEALTH = 0.6;
export const CAPTURE_TIME_INVERSION = 0.3;
export const CAPTURE_TIME_TRAIL = 0.3;
export const CAPTURE_TIME_WAVE = 0.05;
export const CAPTURE_TIME_RAMJET = 0.3;

// ラムジェット
export const RAMJET_DURATION = 8.0;
export const RAMJET_FRONT_GAIN = 2.5;
export const RAMJET_REAR_GAIN = -6.0;



