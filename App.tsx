import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/Engine.ts';
import { GameState, InputState, GameStats, GameMode, Difficulty } from './types.ts';
import MenuOverlay from './components/MenuOverlay.tsx';
import InfoPanel from './components/InfoPanel.tsx';
import VirtualJoystick from './components/VirtualJoystick.tsx';

function App() {
    // Canvas要素への参照
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // ゲームエンジンインスタンスへの参照（レンダリング毎に作り直さないためRefを使用）
    const engineRef = useRef<GameEngine | null>(null);
    
    // Reactのステート管理（UI表示用）
    const [gameState, setGameState] = useState<GameState>(GameState.MENU);
    const [gameStats, setGameStats] = useState<GameStats | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
    const [showItemGuide, setShowItemGuide] = useState(false);
    
    // 現在選択されているモードをステートとRefの両方で管理（イベントリスナー内での参照用）
    const [currentMode, setCurrentMode] = useState<GameMode>(GameMode.SURVIVAL);
    const currentModeRef = useRef<GameMode>(GameMode.SURVIVAL);
    
    // イベントリスナー内で最新のステートを参照するためのRef
    const gameStateRef = useRef<GameState>(GameState.MENU);
    
    // 入力状態の保持
    const keyboardInputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });
    const joystickInputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });

    // StateをRefに同期
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const isMenu = gameState === GameState.MENU;

    // UIアニメーション完了後にCanvasサイズを再計算する処理
    useEffect(() => {
        const timer = setTimeout(() => {
            if (engineRef.current) {
                engineRef.current.resize();
            }
        }, 550); 
        return () => clearTimeout(timer);
    }, [gameState]);

    // ゲーム開始処理
    const handleStartGame = (mode: GameMode = GameMode.SURVIVAL, difficulty: Difficulty = selectedDifficulty) => {
        // 1. UIの状態を変更してアニメーション開始
        setGameState(GameState.PLAYING);
        setCurrentMode(mode);
        currentModeRef.current = mode;
        setShowItemGuide(false);

        // 2. アニメーション完了を待ってからゲームループを開始
        setTimeout(() => {
            if (engineRef.current) {
                engineRef.current.resize();
                engineRef.current.start(mode, difficulty);
            }
        }, 600); 
    };

    // ホーム画面へ戻る
    const handleGoHome = () => {
        setShowItemGuide(false);
        if (engineRef.current) {
            engineRef.current.setGameState(GameState.MENU);
        } else {
            setGameState(GameState.MENU);
        }
    };

    // 再開
    const handleResume = () => {
        if (engineRef.current) {
            engineRef.current.togglePause();
        }
    };

    // ポーズ切り替え
    const handlePauseToggle = () => {
        if (engineRef.current) {
            engineRef.current.togglePause();
        }
    };

    // キーボード入力とジョイスティック入力を統合してエンジンに渡す
    const updateEngineInput = () => {
        if (!engineRef.current) return;
        
        const k = keyboardInputRef.current;
        const j = joystickInputRef.current;

        const mergedInput: InputState = {
            up: k.up || j.up,
            down: k.down || j.down,
            left: k.left || j.left,
            right: k.right || j.right,
            vector: j.vector // ジョイスティックのアナログ入力優先
        };

        engineRef.current.handleInput(mergedInput);
    };

    // ジョイスティックからの入力ハンドラ
    const handleJoystickInput = (input: InputState) => {
        joystickInputRef.current = input;
        updateEngineInput();
    };

    // 初期化エフェクト（マウント時に1回だけ実行）
    useEffect(() => {
        if (!canvasRef.current) return;

        // ゲームエンジンのインスタンス化
        const engine = new GameEngine(
            canvasRef.current, 
            (state) => {
                setGameState(state); // エンジンからの状態変更通知をReactステートに反映
            },
            (stats) => {
                setGameStats(stats); // エンジンからの統計情報をReactステートに反映
            }
        );
        engineRef.current = engine;

        // キーボードイベントハンドラ
        const handleKey = (e: KeyboardEvent, isDown: boolean) => {
            const key = e.key;
            if (key === 'ArrowUp' || key === 'w') keyboardInputRef.current.up = isDown;
            if (key === 'ArrowDown' || key === 's') keyboardInputRef.current.down = isDown;
            if (key === 'ArrowLeft' || key === 'a') keyboardInputRef.current.left = isDown;
            if (key === 'ArrowRight' || key === 'd') keyboardInputRef.current.right = isDown;
            updateEngineInput();
        };

        const onKeyDown = (e: KeyboardEvent) => {
            handleKey(e, true);
            
            const current = gameStateRef.current;
            const key = e.key.toLowerCase();
            const code = e.code;

            // スペースキーでのポーズ切り替えやメニュー操作
            if (current === GameState.PLAYING) {
                if (code === 'Space') {
                    e.preventDefault(); 
                    if (engineRef.current) engineRef.current.togglePause();
                }
            }
            else if (current === GameState.PAUSED) {
                if (code === 'Space') {
                    e.preventDefault();
                    if (engineRef.current) engineRef.current.togglePause();
                }
                else if (key === 'backspace') {
                     e.preventDefault(); 
                     handleGoHome();
                }
            }
            else if (current === GameState.MENU || current === GameState.GAME_OVER || current === GameState.VICTORY) {
                // 1, 2, 3 で難易度切り替え
                if (key === '1') setSelectedDifficulty(Difficulty.EASY);
                if (key === '2') setSelectedDifficulty(Difficulty.NORMAL);
                if (key === '3') setSelectedDifficulty(Difficulty.HARD);

                // ホーム画面での追加操作
                if (current === GameState.MENU) {
                    if (key === 't') handleStartGame(GameMode.TUTORIAL, Difficulty.EASY);
                    if (key === 'i') setShowItemGuide(prev => !prev);
                }

                // 結果画面で Backspace を押すとホームへ
                if ((current === GameState.GAME_OVER || current === GameState.VICTORY) && key === 'backspace') {
                    e.preventDefault();
                    handleGoHome();
                }

                // S, E でゲーム開始
                if (key === 's') {
                    handleStartGame(GameMode.SURVIVAL);
                } else if (key === 'e') {
                    handleStartGame(GameMode.ENDLESS);
                } else if (code === 'Enter' || code === 'Space') {
                    e.preventDefault();
                    handleStartGame(currentModeRef.current);
                }
            }

            if (code === 'Escape') {
                if (current === GameState.PLAYING || current === GameState.PAUSED) {
                    if (engineRef.current) engineRef.current.togglePause();
                }
            }
        };
        const onKeyUp = (e: KeyboardEvent) => handleKey(e, false);

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // ゲームループ開始
        engine.loop(0);

        // クリーンアップ
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            engine.stop();
        };
    }, [selectedDifficulty]); // handleStartGameが現在のselectedDifficultyを使用するように依存関係を追加

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden select-none flex flex-col landscape:flex-row">
            {/* サイドバー (横画面時) */}
            <div className={`
                hidden landscape:flex flex-col bg-[#080808] border-r border-white/10 shrink-0 relative z-30 shadow-[10px_0_30px_rgba(0,0,0,0.5)] h-full overflow-hidden
                transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
                ${isMenu ? 'w-0 opacity-0 -translate-x-full border-none' : 'w-64 opacity-100 translate-x-0'}
            `}>
                <div className="w-full shrink-0">
                    <InfoPanel stats={gameStats} />
                </div>
                <div className="w-full flex-1 border-t border-white/5 bg-[#050505] relative z-40">
                     <VirtualJoystick onInput={handleJoystickInput} />
                </div>
            </div>

            {/* トップバー (縦画面時) */}
            <div className={`
                landscape:hidden w-full relative z-30
                transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden
                ${isMenu ? 'max-h-0 opacity-0 -translate-y-full' : 'max-h-[200px] opacity-100 translate-y-0'}
            `}>
                <InfoPanel stats={gameStats} />
            </div>

            {/* メインゲームエリア */}
            <div className="flex-1 relative min-h-0 w-full transition-all duration-500">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80 z-0"></div>
                <canvas ref={canvasRef} className="absolute inset-0 z-10 block" />
                <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]"></div>
                
                {/* ポーズボタン */}
                {gameState === GameState.PLAYING && (
                    <button 
                        onClick={handlePauseToggle}
                        className="absolute top-4 right-4 z-40 p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm transition-all duration-300 group"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/70 group-hover:text-white transition-colors">
                            <rect x="6" y="4" width="4" height="16" rx="1" strokeWidth="2" />
                            <rect x="14" y="4" width="4" height="16" rx="1" strokeWidth="2" />
                        </svg>
                    </button>
                )}

                {/* チュートリアルメッセージオーバーレイ */}
                {gameState === GameState.PLAYING && currentMode === GameMode.TUTORIAL && gameStats?.tutorialMessage && (
                    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-40 w-full px-4 text-center pointer-events-none">
                        <div className="inline-block bg-black/10 backdrop-blur-sm border border-cyan-500/30 px-6 py-2 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                            <h2 className="font-fugaz text-md md:text-xl tracking-wider flex flex-col items-center">
                                {gameStats.tutorial_step_show && (
                                    <span className="text-sm mb-1">{gameStats.tutorial_step_show}</span>
                                )}
                                <span className="text-cyan-400">{gameStats.tutorialMessage}</span>
                            </h2>
                        </div>
                    </div>
                )}

                <MenuOverlay 
                    gameState={gameState} 
                    onStart={handleStartGame} 
                    onHome={handleGoHome} 
                    onResume={handleResume}
                    gameStats={gameStats}
                    selectedDifficulty={selectedDifficulty}
                    setSelectedDifficulty={setSelectedDifficulty}
                    showItemGuide={showItemGuide}
                    setShowItemGuide={setShowItemGuide}
                />
            </div>

            {/* ボトムバー ジョイスティック (縦画面時) */}
            <div className={`
                landscape:hidden w-full bg-[#080808] border-t border-white/10 shrink-0 relative z-30 flex items-center justify-center
                transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-hidden
                ${isMenu ? 'h-0 opacity-0 translate-y-full border-none' : 'h-48 opacity-100 translate-y-0 pb-4'}
            `}>
                 <VirtualJoystick onInput={handleJoystickInput} />
            </div>
        </div>
    );
}

export default App;