import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/Engine';
import { GameState, InputState, GameStats, GameMode, Difficulty } from './types';
import MenuOverlay from './components/MenuOverlay';
import InfoPanel from './components/InfoPanel';
import VirtualJoystick from './components/VirtualJoystick';
import { supabase, isSupabaseConfigured, saveScore, getProfile, updateProfile } from './lib/supabase';

function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    
    const [gameState, setGameState] = useState<GameState>(GameState.MENU);
    const [gameStats, setGameStats] = useState<GameStats | null>(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
    const [showItemGuide, setShowItemGuide] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    // 直前にプレイした（または選択された）モードを記憶
    const [lastGameMode, setLastGameMode] = useState<GameMode>(GameMode.SURVIVAL);
    
    const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error' | 'offline'>('checking');
    const [userId, setUserId] = useState<string | null>(null);
    
    const keyboardInputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });
    const joystickInputRef = useRef<InputState>({ up: false, down: false, left: false, right: false });

    // スコア重複保存防止用
    const lastSavedRef = useRef<{mode: GameMode, difficulty: Difficulty, date: number} | null>(null);

    const [userName, setUserName] = useState<string>(localStorage.getItem('graviator_name') || '');

    useEffect(() => {
        const initAuth = async () => {
            if (!isSupabaseConfigured) {
                setDbStatus('offline');
                return;
            }
            try {
                const auth = supabase.auth as any;
                const { data: { session }, error: sessionError } = await auth.getSession();
                if (sessionError) throw sessionError;
                
                if (session) {
                    setUserId(session.user.id);
                    setDbStatus('connected');
                } else if (auth.signInAnonymously) {
                    const { data, error: signInError } = await auth.signInAnonymously();
                    if (signInError) throw signInError;
                    if (data?.user) {
                        setUserId(data.user.id);
                        setDbStatus('connected');
                    }
                }
            } catch (error) {
                console.error("Auth error:", error);
                setDbStatus('error');
            }
        };
        initAuth();

        // ★追加: 認証状態の変更（ログイン・ログアウト）をリアルタイムに監視する
        if (isSupabaseConfigured) {
            const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
                if (session) {
                    const uid = session.user.id;
                    setUserId(uid);
                    setDbStatus('connected');

                    // ★追加：ログインしたユーザーの保存済み名前を取得する
                    const savedName = await getProfile(uid);
                    if (savedName) {
                        setUserName(savedName);
                        localStorage.setItem('graviator_name', savedName);
                    }
                } else {
                    setUserId(null);
                    initAuth();
                }
            });

            return () => {
                authListener.subscription.unsubscribe();
            };
        }
    }, []);


    // 名前が変更されたらDBとローカルストレージを更新
    useEffect(() => {
        if (!userId) return;

        // 名前が有効な値（空文字でなく、'Player'でもない）の場合
        if (userName && userName.trim() !== '' && userName !== 'Player') {
            localStorage.setItem('graviator_name', userName);
            updateProfile(userId, userName);
        } 
        // 名前が空文字（0文字）になった場合
        else if (userName === '') {
            localStorage.removeItem('graviator_name');
            // 過去の記録も名前なし（null）に更新してID表示に戻す
            updateProfile(userId, null as any); 
        }
    }, [userName, userId]);


    // スコア自動保存ロジック
    useEffect(() => {
        if (!userId || !gameStats) return;

        // 保存すべき条件:
        // 1. サバイバルモードでVICTORY（勝利）
        // 2. エンドレスモードでGAME_OVER（敗北）
        const shouldSave = 
            (gameState === GameState.VICTORY && gameStats.mode === GameMode.SURVIVAL) ||
            (gameState === GameState.GAME_OVER && gameStats.mode === GameMode.ENDLESS);

        if (shouldSave) {
            // 重複保存防止（5秒以内の同じ条件での保存を防ぐ）
            const now = Date.now();
            if (lastSavedRef.current && 
                lastSavedRef.current.mode === gameStats.mode && 
                lastSavedRef.current.difficulty === gameStats.difficulty &&
                now - lastSavedRef.current.date < 5000) {
                return;
            }
            
            // スコア: サバイバルは生存時間、エンドレスはキル数
            const score = gameStats.mode === GameMode.SURVIVAL ? gameStats.timeSurvived : gameStats.kills;
            const currentName = userName.trim() !== '' ? userName : '';
            
            saveScore(userId, gameStats.mode, gameStats.difficulty, score, currentName);
            
            // 保存記録更新
            lastSavedRef.current = { mode: gameStats.mode, difficulty: gameStats.difficulty, date: now };
        }
    }, [gameState, gameStats, userId]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const engine = new GameEngine(
            canvasRef.current,
            (newState) => setGameState(newState),
            (stats) => setGameStats(stats)
        );
        engineRef.current = engine;

        const inputLoop = () => {
            if (engineRef.current) {
                const k = keyboardInputRef.current;
                const j = joystickInputRef.current;
                const combinedInput: InputState = {
                    up: k.up || j.up,
                    down: k.down || j.down,
                    left: k.left || j.left,
                    right: k.right || j.right,
                    vector: (j.vector && (Math.abs(j.vector.x) > 0.01 || Math.abs(j.vector.y) > 0.01)) 
                            ? j.vector 
                            : undefined
                };
                engineRef.current.handleInput(combinedInput);
            }
            requestAnimationFrame(inputLoop);
        };
        const loopId = requestAnimationFrame(inputLoop);
        return () => {
            cancelAnimationFrame(loopId);
            engine.stop();
        };
    }, []);

    // 移動操作用キーイベント
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // ショートカットキーとの干渉を考慮し、PLAYING時以外は移動入力を受け付けない（任意）
            // ここでは常時受け付けるが、ショートカット処理側で制御する
            const k = keyboardInputRef.current;
            switch(e.code) {
                case 'ArrowUp': case 'KeyW': k.up = true; break;
                case 'ArrowDown': case 'KeyS': k.down = true; break;
                case 'ArrowLeft': case 'KeyA': k.left = true; break;
                case 'ArrowRight': case 'KeyD': k.right = true; break;
                case 'Escape': if (engineRef.current) engineRef.current.togglePause(); break;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            const k = keyboardInputRef.current;
            switch(e.code) {
                case 'ArrowUp': case 'KeyW': k.up = false; break;
                case 'ArrowDown': case 'KeyS': k.down = false; break;
                case 'ArrowLeft': case 'KeyA': k.left = false; break;
                case 'ArrowRight': case 'KeyD': k.right = false; break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // ショートカットキー用イベントリスナー
    useEffect(() => {
        const handleShortcut = (e: KeyboardEvent) => {
            if (e.repeat) return; // 押しっぱなしによる連続発火防止

            // 入力フィールド等にフォーカスがある場合は無視
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // 1. アイテムガイド表示中の処理（最優先）
            // ガイドが表示されている場合は、Backspace または i キーで閉じる
            if (showItemGuide) {
                if (e.code === 'Backspace' || e.key.toLowerCase() === 'i' || e.code === 'Escape') {
                    setShowItemGuide(false);
                    e.preventDefault();
                }
                return; // ガイド表示中は他のショートカットを無効化
            }

            // 2. ランキング表示中の処理
            if (showLeaderboard) {
                if (e.code === 'Backspace' || e.key.toLowerCase() === 'r' || e.code === 'Escape') {
                    setShowLeaderboard(false);
                    e.preventDefault();
                }
                return;
            }

            // 3. 設定画面表示中の処理
            if (showSettings) {
                if (e.code === 'Escape') {
                    setShowSettings(false);
                    e.preventDefault();
                }
                return;
            }

            // 4. グローバルショートカット（難易度変更）: メニューまたはリザルト画面
            if (gameState === GameState.MENU || gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
                if (e.key === '1') { setSelectedDifficulty(Difficulty.EASY); return; }
                if (e.key === '2') { setSelectedDifficulty(Difficulty.NORMAL); return; }
                if (e.key === '3') { setSelectedDifficulty(Difficulty.HARD); return; }
            }

            // 5. 各ゲーム状態ごとの処理
            switch (gameState) {
                case GameState.MENU:
                    if (e.key.toLowerCase() === 's') handleStart(GameMode.SURVIVAL, selectedDifficulty);
                    else if (e.key.toLowerCase() === 'e') handleStart(GameMode.ENDLESS, selectedDifficulty);
                    else if (e.key.toLowerCase() === 't') handleStart(GameMode.TUTORIAL, Difficulty.EASY);
                    else if (e.code === 'Space' || e.code === 'Enter') handleStart(lastGameMode, selectedDifficulty);
                    else if (e.key.toLowerCase() === 'i') setShowItemGuide(true);
                    else if (e.key.toLowerCase() === 'r') setShowLeaderboard(true);
                    break;

                case GameState.PLAYING:
                    if (e.code === 'Space' || e.code === 'Enter') handleResume();
                    else if (e.key.toLowerCase() === 'i') {
                        // ゲームを一時停止してアイテムガイドを表示
                        handleResume(); 
                        setShowItemGuide(true);
                    }
                    break;

                case GameState.PAUSED:
                    if (e.code === 'Space' || e.code === 'Enter') handleResume();
                    else if (e.code === 'Backspace') handleHome();
                    else if (e.key.toLowerCase() === 'i') setShowItemGuide(true);
                    else if (e.key.toLowerCase() === 'r') setShowLeaderboard(true);
                    break;

                case GameState.GAME_OVER:
                case GameState.VICTORY:
                    if (e.key.toLowerCase() === 's') handleStart(GameMode.SURVIVAL, selectedDifficulty);
                    else if (e.key.toLowerCase() === 'e') handleStart(GameMode.ENDLESS, selectedDifficulty);
                    else if (e.code === 'Space' || e.code === 'Enter') handleStart(lastGameMode, selectedDifficulty);
                    else if (e.code === 'Backspace') handleHome();
                    else if (e.key.toLowerCase() === 'r') setShowLeaderboard(true);
                    break;
            }
        };

        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, [gameState, selectedDifficulty, lastGameMode, showItemGuide, showLeaderboard, showSettings]);

    // ゲーム状態が変わった時（ジョイスティック表示の切り替えなど）にリサイズを実行
    useEffect(() => {
        const timer = setTimeout(() => {
            if (engineRef.current) {
                engineRef.current.resize();
            }
        }, 50); // DOM更新を待つための微小な遅延
        return () => clearTimeout(timer);
    }, [gameState]);

    const handleStart = (mode: GameMode, difficulty: Difficulty) => {
        setLastGameMode(mode);
        engineRef.current?.start(mode, difficulty);
    };

    const handleHome = () => {
        setGameState(GameState.MENU);
        engineRef.current?.setGameState(GameState.MENU);
    };

    const handleResume = () => {
        engineRef.current?.togglePause();
    };

    const handleJoystickInput = (input: InputState) => {
        joystickInputRef.current = input;
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-[#020205] flex flex-col touch-none select-none">
            {/* 上部・中部コンテンツエリア（InfoPanel + Canvas） */}
            {/* flex-1 により、残りの高さを占有する。下部に要素が追加されれば自動的に縮む */}
            <div className="flex flex-col landscape:flex-row flex-1 overflow-hidden min-h-0">
                {/* InfoPanel & Joystick Container (横画面用左サイドバー) */}
                <div className="shrink-0 z-20 w-full landscape:w-[240px] xl:landscape:w-[280px] border-b landscape:border-b-0 landscape:border-r border-white/20 bg-black/80 flex flex-col">
                    <div className="shrink-0">
                        <InfoPanel stats={gameStats} />
                    </div>
                    
                    {/* 横画面用ジョイスティックエリア (プレイ中のみ、残りのスペースを使用) */}
                    {gameState === GameState.PLAYING && (
                        <div className="hidden landscape:flex flex-1 relative bg-[#050510] border-t border-white/10 w-full min-h-0">
                            <VirtualJoystick onInput={handleJoystickInput} />
                        </div>
                    )}
                </div>

                {/* Game Main Area */}
                <div className="relative flex-1 bg-black overflow-hidden w-full h-full">
                    <canvas ref={canvasRef} className="block w-full h-full" />
                    
                    {/* Pause Button */}
                    {gameState === GameState.PLAYING && (
                        <button 
                            onClick={handleResume} 
                            className="absolute bottom-6 right-6 z-40 w-12 h-12 flex items-center justify-center 
                                       bg-black/40 border border-white/20 rounded-full backdrop-blur-sm
                                       text-white/70 hover:text-white hover:bg-white/10 hover:border-white/40
                                       transition-all duration-200 active:scale-95 group shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                            aria-label="Pause"
                        >
                            <div className="flex gap-1.5 h-4">
                                <div className="w-1.5 bg-current rounded-sm shadow-[0_0_8px_currentColor] opacity-80 group-hover:opacity-100"></div>
                                <div className="w-1.5 bg-current rounded-sm shadow-[0_0_8px_currentColor] opacity-80 group-hover:opacity-100"></div>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* 画面下部の仮想ジョイスティックエリア (縦画面のみ表示) */}
            {/* DOMフロー内に配置され、親のflexコンテナにより上部エリアの高さを減らす */}
            {gameState === GameState.PLAYING && (
                <div className="h-48 shrink-0 border-t border-white/10 bg-[#050510] relative z-30 landscape:hidden w-full">
                    <VirtualJoystick onInput={handleJoystickInput} />
                </div>
            )}

            {/* フルスクリーンメニューレイヤー */}
            <MenuOverlay 
                gameState={gameState}
                onStart={handleStart}
                onHome={handleHome}
                onResume={handleResume}
                gameStats={gameStats}
                selectedDifficulty={selectedDifficulty}
                setSelectedDifficulty={setSelectedDifficulty}
                showItemGuide={showItemGuide}
                setShowItemGuide={setShowItemGuide}
                showLeaderboard={showLeaderboard}
                setShowLeaderboard={setShowLeaderboard}
                showSettings={showSettings}
                setShowSettings={setShowSettings}
                userName={userName}
                setUserName={setUserName}
                userId={userId}
                dbStatus={dbStatus}
            />
        </div>
    );
}

export default App;
