import React, { useRef, useState, useEffect } from 'react';
import { InputState } from '../types';

interface VirtualJoystickProps {
    onInput: (input: InputState) => void;
}

const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onInput }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    
    // Configuration
    const maxRadius = 50; // Maximum distance the stick can move
    const deadZone = 5;   // Threshold to register input (Lowered for smoother analog start)

    const handleStart = (clientX: number, clientY: number) => {
        setActive(true);
        updatePosition(clientX, clientY);
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!active) return;
        updatePosition(clientX, clientY);
    };

    const handleEnd = () => {
        setActive(false);
        setPosition({ x: 0, y: 0 });
        onInput({ up: false, down: false, left: false, right: false, vector: { x: 0, y: 0 } });
    };

    const updatePosition = (clientX: number, clientY: number) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Limit the stick movement to maxRadius
        let clampedX = dx;
        let clampedY = dy;
        
        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            clampedX = Math.cos(angle) * maxRadius;
            clampedY = Math.sin(angle) * maxRadius;
        }

        setPosition({ x: clampedX, y: clampedY });

        // Calculate analog vector input (-1.0 to 1.0)
        let vectorX = 0;
        let vectorY = 0;

        if (distance > deadZone) {
            // Normalize based on maxRadius to get a smooth 0.0 to 1.0 range
            vectorX = clampedX / maxRadius;
            vectorY = clampedY / maxRadius;
        }

        // Send both digital flags (for compatibility) and accurate analog vector
        const threshold = 0.3;
        onInput({
            up: vectorY < -threshold,
            down: vectorY > threshold,
            left: vectorX < -threshold,
            right: vectorX > threshold,
            vector: { x: vectorX, y: vectorY }
        });
    };

    // Mouse Events
    const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
    const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();
    const onMouseLeave = () => handleEnd();

    // Touch Events
    const onTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: React.TouchEvent) => {
        e.preventDefault();
        handleEnd();
    };

    return (
        <div 
            className="relative w-full h-full flex items-center justify-center select-none touch-none"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Base */}
            <div 
                ref={containerRef}
                className={`
                    w-28 h-28 rounded-full border-2 
                    flex items-center justify-center
                    transition-colors duration-200
                    ${active ? 'border-cyan-400/50 bg-cyan-900/20' : 'border-white/30 bg-white/10'}
                `}
            >
                {/* Visual Guides */}
                <div className="absolute inset-0 rounded-full border border-white/20 scale-75"></div>
                <div className="absolute inset-0 rounded-full border border-white/20 scale-50"></div>
                
                {/* Stick */}
                <div 
                    className={`
                        w-12 h-12 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)]
                        transition-transform duration-75
                        flex items-center justify-center
                        ${active ? 'bg-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.6)]' : 'bg-white/20'}
                    `}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px)`
                    }}
                >
                    {/* Inner detail (Glassmorphic) */}
                    <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm border border-white/20"></div>
                </div>
            </div>
            
            {/* Minimal Indicators */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-px h-full bg-white/5 absolute"></div>
                <div className="h-px w-full bg-white/5 absolute"></div>
            </div>
        </div>
    );
};

export default VirtualJoystick;