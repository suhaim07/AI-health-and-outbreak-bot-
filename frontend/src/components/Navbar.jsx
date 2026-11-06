import { Link } from 'react-router-dom';
import { Activity, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = () => {
  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-panel sticky top-0 z-50 flex items-center justify-between p-4 px-8 mb-8"
    >
      <Link to="/" className="flex items-center gap-2 text-neon-blue">
        <Activity className="h-8 w-8" />
        <span className="text-2xl font-bold tracking-wider text-white">
          Pulse<span className="text-[var(--color-neon-blue)]">Guard</span> AI
        </span>
      </Link>
      <div className="flex gap-6 items-center">
        <Link to="/" className="hover:text-[var(--color-neon-blue)] transition-colors">Home</Link>
        <Link to="/dashboard" className="hover:text-[var(--color-neon-blue)] transition-colors">Dashboard</Link>
        <Link to="/dashboard" className="flex items-center gap-2 bg-[var(--color-neon-purple)]/20 text-[var(--color-neon-purple)] px-4 py-2 rounded-full border border-[var(--color-neon-purple)]/50 hover:bg-[var(--color-neon-purple)]/30 transition-colors">
          <ShieldAlert size={18} />
          Alerts
        </Link>
      </div>
    </motion.nav>
  );
};

export default Navbar;
