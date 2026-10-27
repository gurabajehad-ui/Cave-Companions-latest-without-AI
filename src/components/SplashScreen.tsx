import React from 'react';
import { motion } from 'motion/react';
import splashBg from '../assets/images/cave_splash_no_text_v2_1788014135103.jpg';

interface SplashScreenProps {
  onStart: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  return (
    <div 
      className="min-h-screen bg-black flex flex-col items-center justify-end p-12 relative overflow-hidden cursor-pointer"
      onClick={onStart}
    >
      {/* Cinematic Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={splashBg} 
          alt="Cave Companions Background" 
          className="w-full h-full object-cover opacity-90"
          referrerPolicy="no-referrer"
        />
        {/* Subtle vignette overlay to ensure text readability and depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
      </div>

      {/* Brand Identity - Minimalist Approach */}
      <div className="relative z-10 text-center space-y-6 w-full">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="flex flex-col items-center"
        >

          <h1 
            className="text-4xl sm:text-5xl font-extrabold tracking-[0.2em] text-[#F3E5AB] drop-shadow-2xl uppercase"
            style={{ 
              fontFamily: "'Playfair Display', serif",
              textShadow: '0 0 25px rgba(243, 229, 171, 0.4)'
            }}
          >
            Cave <br /> Companions
          </h1>
          
          {/* Subtle line decoration */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: "60px" }}
            transition={{ delay: 0.8, duration: 1 }}
            className="h-[1px] bg-[#F3E5AB]/40 mt-4"
          />
        </motion.div>

        {/* Call to action - Extremely minimal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="pb-12"
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-light">
            Touch anywhere to begin
          </p>
        </motion.div>
      </div>

      {/* Atmospheric Glowing Particles (Visual Polish) */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`splash-particle-${i}`}
            className="absolute w-1 h-1 bg-[#F3E5AB] rounded-full blur-[1px]"
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: "110%", 
              opacity: 0 
            }}
            animate={{ 
              y: "-10%", 
              opacity: [0, 0.4, 0] 
            }}
            transition={{ 
              duration: 10 + Math.random() * 10, 
              repeat: Infinity, 
              delay: Math.random() * 5,
              ease: "linear"
            }}
          />
        ))}
      </div>
    </div>
  );
};

