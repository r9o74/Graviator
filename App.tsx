import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/Engine.ts';
import { GameState, InputState, GameStats, GameMode } from './types.ts';
import MenuOverlay from './components/MenuOverlay.tsx';
import InfoPanel from './components/InfoPanel.tsx';
import VirtualJoystick from './components/VirtualJoystick.tsx';

function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const [gameState, setGameState] = useState<GameState>(GameState.MENU);
    const [gameStats, setGameStats] = useState<GameStats | null>(null);
    
    // 現在選択されているモードをステートとRefの両方で管理
    // StateはUI表示用、Refはイベントリスナー内での最新値参照用
    const [currentMode, setCurrentMode] = useState<GameMode>(GameMode.SURVIVAL);
    const currentModeRef = useRef<GameMode>(GameMode.SURVIVAL);
    
    // State Ref for Event Listeners
    const gameStateRef = useRef<GameState>(GameState.MENU);
    
    // Inputs
    const keyboardInputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });
    const joystickInputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });

    // Sync state to refs
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const handleStartGame = (mode: GameMode = GameMode.SURVIVAL) => {
        setCurrentMode(mode);
        currentModeRef.current = mode;
        if (engineRef.current) {
            engineRef.current.start(mode);
        }
    };

    const handleGoHome = () => {
        // エンジンの状態も更新して同期を保つ
        if (engineRef.current) {
            engineRef.current.setGameState(GameState.MENU);
        } else {
            setGameState(GameState.MENU);
        }
    };

    const handleResume = () => {
        if (engineRef.current) {
            engineRef.current.togglePause();
        }
    };

    const handlePauseToggle = () => {
        if (engineRef.current) {
            engineRef.current.togglePause();
        }
    };

    // Merge inputs and send to engine
    const updateEngineInput = () => {
        if (!engineRef.current) return;
        
        const k = keyboardInputRef.current;
        const j = joystickInputRef.current;

        const mergedInput: InputState = {
            up: k.up || j.up,
            down: k.down || j.down,
            left: k.left || j.left,
            right: k.right || j.right,
            vector: j.vector 
        };

        engineRef.current.handleInput(mergedInput);
    };

    const handleJoystickInput = (input: InputState) => {
        joystickInputRef.current = input;
        updateEngineInput();
    };

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Engine once
        const engine = new GameEngine(
            canvasRef.current, 
            (state) => {
                setGameState(state);
            },
            (stats) => {
                setGameStats(stats);
            }
        );
        engineRef.current = engine;

        // Keyboard Input Handlers
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

            // プレイ中：スペースキーで一時停止
            if (current === GameState.PLAYING) {
                if (code === 'Space') {
                    e.preventDefault(); 
                    if (engineRef.current) engineRef.current.togglePause();
                }
            }
            // 一時停止中
            else if (current === GameState.PAUSED) {
                // スペースキーで再開
                if (code === 'Space') {
                    e.preventDefault();
                    if (engineRef.current) engineRef.current.togglePause();
                }
                // バックスペースキーでホーム画面に戻る
                else if (key === 'backspace') {
                     e.preventDefault(); 
                     if (engineRef.current) engineRef.current.setGameState(GameState.MENU);
                }
            }
            // メニューまたはリザルト画面
            else if (current === GameState.MENU || current === GameState.GAME_OVER || current === GameState.VICTORY) {
                if (key === 's') {
                    handleStartGame(GameMode.SURVIVAL);
                } else if (key === 'e') {
                    handleStartGame(GameMode.ENDLESS);
                } else if (code === 'Enter' || code === 'Space') {
                    e.preventDefault();
                    if (engineRef.current) engineRef.current.start(currentModeRef.current);
                }
            }

            // Escapeキーでのポーズ切り替え（既存機能維持）
            if (code === 'Escape') {
                if (current === GameState.PLAYING || current === GameState.PAUSED) {
                    if (engineRef.current) engineRef.current.togglePause();
                }
            }
        };
        const onKeyUp = (e: KeyboardEvent) => handleKey(e, false);

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        engine.loop(0);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            engine.stop();
        };
    }, []); // 依存配列を空に。エンジンは一度だけ生成。

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden select-none flex flex-col landscape:flex-row">
            {/* Sidebar (Landscape) */}
            <div className="hidden landscape:flex flex-col w-64 bg-[#080808] border-r border-white/10 shrink-0 relative z-30 shadow-[10px_0_30px_rgba(0,0,0,0.5)] h-full overflow-hidden">
                <div className="w-full shrink-0">
                    <InfoPanel stats={gameStats} />
                </div>
                {/* The joystick takes all remaining vertical space */}
                <div className="w-full flex-1 border-t border-white/5 bg-[#050505] relative z-40">
                     <VirtualJoystick onInput={handleJoystickInput} />
                </div>
            </div>

            {/* Top Bar (Portrait) */}
            <div className="landscape:hidden w-full relative z-30">
                <InfoPanel stats={gameStats} />
            </div>

            {/* Main Game Area */}
            <div className="flex-1 relative z-50 min-h-0 w-full">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80 z-0"></div>
                <canvas ref={canvasRef} className="absolute inset-0 z-10 block" />
                <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]"></div>
                
                {/* Pause Button (Visible only when playing) */}
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

                <MenuOverlay 
                    gameState={gameState} 
                    onStart={handleStartGame} 
                    onHome={handleGoHome} 
                    onResume={handleResume}
                    gameStats={gameStats}
                />
            </div>

            {/* Bottom Bar Joystick (Portrait) */}
            <div className="landscape:hidden w-full h-48 bg-[#080808] border-t border-white/10 shrink-0 relative z-30 flex items-center justify-center pb-4">
                 <VirtualJoystick onInput={handleJoystickInput} />
            </div>
        </div>
    );
}

export default App;