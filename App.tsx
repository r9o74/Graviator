import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/Engine.ts';
import { GameState, InputState, GameStats } from './types.ts';
import MenuOverlay from './components/MenuOverlay.tsx';
import InfoPanel from './components/InfoPanel.tsx';
import VirtualJoystick from './components/VirtualJoystick.tsx';

function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const [gameState, setGameState] = useState<GameState>(GameState.MENU);
    const [gameStats, setGameStats] = useState<GameStats | null>(null);
    
    // State Ref for Event Listeners
    const gameStateRef = useRef<GameState>(GameState.MENU);
    
    // Inputs
    const keyboardInputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });
    const joystickInputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });

    // Sync state to ref
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const handleStartGame = () => {
        if (engineRef.current) {
            engineRef.current.start();
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
            // アナログベクトルを優先的に引き継ぐ
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

        // Initialize Engine
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
            if (e.key === 'Enter' || e.code === 'Space') {
                const current = gameStateRef.current;
                if (current === GameState.MENU || current === GameState.GAME_OVER || current === GameState.VICTORY) {
                    if (engineRef.current) engineRef.current.start();
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
    }, []);

    return (
        <div className="relative w-screen h-screen bg-black overflow-hidden select-none flex flex-col landscape:flex-row">
            {/* Sidebar (Landscape) */}
            <div className="hidden landscape:flex flex-col w-64 bg-[#080808] border-r border-white/10 shrink-0 relative z-30 shadow-[10px_0_30px_rgba(0,0,0,0.5)] h-full overflow-hidden">
                <div className="w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                    <InfoPanel stats={gameStats} />
                </div>
                {/* Joystick at the bottom of sidebar, slightly shorter to accommodate stats */}
                <div className="w-full h-32 shrink-0 border-t border-white/5 bg-[#050505] flex items-center justify-center relative z-40">
                     <VirtualJoystick onInput={handleJoystickInput} />
                </div>
            </div>

            {/* Top Bar (Portrait) */}
            <div className="landscape:hidden w-full relative z-30">
                <InfoPanel stats={gameStats} />
            </div>

            {/* Main Game Area */}
            <div className="flex-1 relative min-h-0 w-full">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80 z-0"></div>
                <canvas ref={canvasRef} className="absolute inset-0 z-10 block" />
                <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]"></div>
                <MenuOverlay gameState={gameState} onStart={handleStartGame} />
            </div>

            {/* Bottom Bar Joystick (Portrait) */}
            <div className="landscape:hidden w-full h-48 bg-[#080808] border-t border-white/10 shrink-0 relative z-30 flex items-center justify-center pb-4">
                 <VirtualJoystick onInput={handleJoystickInput} />
            </div>
        </div>
    );
}

export default App;