
import React, { useEffect, useRef } from 'react';

const Background: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let points: Point[] = [];

    class Point {
      x: number;
      y: number;
      baseX: number;
      baseY: number;
      size: number;
      angle: number;
      speed: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.baseX = this.x;
        this.baseY = this.y;
        this.size = Math.random() * 2 + 0.8;
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.001 + 0.0005;
      }

      update(time: number) {
        this.x = this.baseX + Math.cos(this.angle + time * this.speed) * 35;
        this.y = this.baseY + Math.sin(this.angle + time * this.speed) * 35;
      }

      draw() {
        if (!ctx) return;
        const opacity = 0.25 + Math.sin(Date.now() * 0.001 + this.angle) * 0.15;
        ctx.fillStyle = `rgba(34, 211, 238, ${opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.size > 2) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      points = [];
      for (let i = 0; i < 40; i++) {
        points.push(new Point());
      }
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.lineWidth = 0.8;
      
      for (let i = 0; i < points.length; i++) {
        points[i].update(time);
        points[i].draw();
        
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 350) {
            const lineOpacity = (1 - distance / 350) * 0.15;
            ctx.strokeStyle = `rgba(34, 211, 238, ${lineOpacity})`;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    requestAnimationFrame(animate);

    const handleResize = () => {
      init();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#000002]">
      {/* Deep Gradient Void */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(8,24,40,0.5)_0%,rgba(1,1,3,1)_90%)]" />
      
      {/* Dynamic Patterns */}
      <div className="absolute inset-0 tech-pattern pointer-events-none" />
      
      {/* Structural Framing Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03]">
         <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
               <pattern id="grid-large-modern" width="150" height="150" patternUnits="userSpaceOnUse">
                  <path d="M 150 0 L 0 0 0 150" fill="none" stroke="white" strokeWidth="1.2"/>
               </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-large-modern)" />
         </svg>
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-50 mix-blend-screen" />
    </div>
  );
};

export default Background;
