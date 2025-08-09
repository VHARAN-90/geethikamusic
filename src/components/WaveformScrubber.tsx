import React, { useRef, useEffect, useState, useCallback } from 'react';

interface WaveformScrubberProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  audioData?: Uint8Array;
  isPlaying: boolean;
}

export const WaveformScrubber: React.FC<WaveformScrubberProps> = ({
  currentTime,
  duration,
  onSeek,
  audioData,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [previewTime, setPreviewTime] = useState(-1);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [canvasInitialized, setCanvasInitialized] = useState(false);

  // Generate realistic waveform data
  const generateWaveform = useCallback(() => {
    const bars = 150;
    const data = [];
    
    for (let i = 0; i < bars; i++) {
      // Create more realistic music waveform pattern
      const position = i / bars;
      
      // Base wave with multiple frequencies
      const wave1 = Math.sin(position * Math.PI * 8) * 0.4;
      const wave2 = Math.sin(position * Math.PI * 16) * 0.2;
      const wave3 = Math.sin(position * Math.PI * 32) * 0.1;
      
      // Add some randomness for natural variation
      const noise = (Math.random() - 0.5) * 0.3;
      
      // Create peaks and valleys like real music
      const envelope = Math.sin(position * Math.PI * 4) * 0.5 + 0.5;
      
      // Combine all elements
      let amplitude = (wave1 + wave2 + wave3 + noise) * envelope;
      
      // Add some dramatic peaks occasionally
      if (Math.random() < 0.05) {
        amplitude += Math.random() * 0.4;
      }
      
      // Normalize to 0.1 - 1.0 range
      amplitude = Math.max(0.1, Math.min(1.0, Math.abs(amplitude) + 0.3));
      
      data.push(amplitude);
    }
    
    setWaveformData(data);
  }, []);

  // Initialize waveform data
  useEffect(() => {
    generateWaveform();
  }, [generateWaveform]);

  // Canvas drawing function
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = 80 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '80px';
    
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, 80);
    
    // Draw waveform bars
    const barWidth = rect.width / waveformData.length;
    const centerY = 40;
    const maxBarHeight = 35;
    
    // Calculate progress for coloring
    const progress = duration > 0 ? currentTime / duration : 0;
    const hoverProgress = duration > 0 && previewTime >= 0 ? previewTime / duration : -1;
    
    waveformData.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = amplitude * maxBarHeight;
      const barPosition = index / waveformData.length;
      
      // Determine bar color based on playback state
      let fillStyle = 'rgba(255, 255, 255, 0.25)'; // Default unplayed
      
      if (hoverProgress >= 0 && barPosition <= hoverProgress && barPosition > progress) {
        // Hover preview area
        fillStyle = 'rgba(120, 75, 160, 0.7)';
      } else if (barPosition <= progress) {
        // Played area with gradient effect
        const playedIntensity = Math.min(1, (progress - barPosition) * 10 + 0.6);
        fillStyle = `rgba(255, 60, 172, ${playedIntensity})`;
      }
      
      ctx.fillStyle = fillStyle;
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 1), barHeight);
    });
    
    // Draw playhead
    if (duration > 0) {
      const playheadX = progress * rect.width;
      
      // Playhead line
      ctx.strokeStyle = isDragging ? '#FF3CAC' : '#FFFFFF';
      ctx.lineWidth = isDragging ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 5);
      ctx.lineTo(playheadX, 75);
      ctx.stroke();
      
      // Playhead circle
      ctx.fillStyle = isDragging ? '#FF3CAC' : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(playheadX, centerY, isDragging ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Add glow effect when dragging
      if (isDragging) {
        ctx.shadowColor = '#FF3CAC';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(playheadX, centerY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    
    // Draw hover preview line
    if (isHovering && previewTime >= 0 && duration > 0) {
      const hoverX = (previewTime / duration) * rect.width;
      
      ctx.strokeStyle = 'rgba(120, 75, 160, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 5);
      ctx.lineTo(hoverX, 75);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    setCanvasInitialized(true);
  }, [waveformData, currentTime, duration, isHovering, isDragging, previewTime]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(drawWaveform, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWaveform]);

  const handleInteractionStart = (clientX: number) => {
    setIsDragging(true);
    handleSeek(clientX);
  };

  const handleInteractionMove = (clientX: number) => {
    if (isDragging) {
      handleSeek(clientX);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && isHovering) {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const progress = Math.max(0, Math.min(1, x / rect.width));
      const time = progress * duration;
      
      setPreviewTime(time);
      setHoverTime(time);
    }
  };

  const handleSeek = (clientX: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const seekTime = progress * duration;
    
    onSeek(seekTime);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleInteractionStart(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    handleInteractionStart(e.touches[0].clientX);
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    handleInteractionMove(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    handleInteractionMove(e.touches[0].clientX);
  };

  const handleEnd = () => {
    setIsDragging(false);
    setPreviewTime(-1);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, duration]);
  
  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-20 cursor-pointer transition-all duration-200 ${
        isHovering || isDragging ? 'transform scale-[1.02]' : ''
      }`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setPreviewTime(-1);
      }}
      onMouseMove={handleMouseMove}
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full rounded-lg backdrop-blur-sm border transition-all duration-200 ${
          isDragging 
            ? 'border-[#FF3CAC]/50 shadow-lg shadow-[#FF3CAC]/25 bg-black/20' 
            : isHovering 
              ? 'border-white/30 bg-black/10' 
              : 'border-white/10 bg-black/5'
        }`}
        style={{
          background: canvasInitialized 
            ? 'linear-gradient(90deg, rgba(255,60,172,0.05) 0%, rgba(120,75,160,0.05) 50%, rgba(255,60,172,0.05) 100%)'
            : 'rgba(0,0,0,0.1)'
        }}
      />
      
      {/* Loading state */}
      {!canvasInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg">
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-white/40 rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.random() * 20}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Time preview tooltip */}
      {isHovering && !isDragging && previewTime >= 0 && duration > 0 && (
        <div 
          className="absolute -top-10 bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none transform -translate-x-1/2 shadow-lg border border-white/10"
          style={{ 
            left: `${(previewTime / duration) * 100}%`,
          }}
        >
          <div className="text-center">
            <div className="font-mono">{formatTime(previewTime)}</div>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
        </div>
      )}
      
      {/* Enhanced visual feedback during dragging */}
      {isDragging && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF3CAC]/10 to-[#784BA0]/10 rounded-lg" />
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#FF3CAC] to-[#784BA0] text-white text-sm px-4 py-2 rounded-full font-medium shadow-lg">
            <div className="text-center">
              <div className="font-mono">{formatTime(currentTime)} / {formatTime(duration)}</div>
            </div>
          </div>
        </>
      )}
      
      {/* Ripple effect on interaction */}
      {isDragging && duration > 0 && (
        <div 
          className="absolute w-6 h-6 bg-[#FF3CAC]/20 rounded-full animate-ping pointer-events-none"
          style={{
            left: `${(currentTime / duration) * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
      
      {/* Progress indicator */}
      {isPlaying && duration > 0 && (
        <div 
          className="absolute top-0 h-1 bg-gradient-to-r from-[#FF3CAC] to-[#784BA0] rounded-full transition-all duration-1000"
          style={{
            width: `${(currentTime / duration) * 100}%`,
          }}
        />
      )}
    </div>
  );
};