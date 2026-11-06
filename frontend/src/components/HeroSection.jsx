import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

const HeroSection = () => {
  return (
    <div className="relative py-20 flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-neon-blue)]/10 rounded-full blur-[100px] -z-10"></div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <Activity className="mx-auto h-20 w-20 text-[var(--color-neon-blue)] mb-6 opacity-80" />
      </motion.div>

      <motion.h1 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl md:text-7xl font-extrabold mb-6 glow-text-blue"
      >
        Next-Gen Community <br /> Health Intelligence
      </motion.h1>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xl text-gray-300 max-w-2xl mb-10"
      >
        AI-Powered Community Health & Outbreak Alert System. Instantly analyze symptoms, track regional health risks, and receive early outbreak warnings.
      </motion.p>
      
      <motion.button 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => document.getElementById('chatbot-section').scrollIntoView({ behavior: 'smooth' })}
        className="bg-gradient-to-r from-[var(--color-neon-blue)] to-[var(--color-neon-purple)] text-white px-8 py-4 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(0,240,255,0.4)]"
      >
        Start Monitoring
      </motion.button>
    </div>
  );
};

export default HeroSection;
