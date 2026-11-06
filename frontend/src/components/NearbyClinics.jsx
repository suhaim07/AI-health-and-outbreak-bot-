import { motion } from 'framer-motion';
import { MapPin, Phone } from 'lucide-react';
import { nearbyClinics } from '../data/mockData';

const NearbyClinics = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {nearbyClinics.map((clinic, idx) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          viewport={{ once: true }}
          key={clinic.id}
          className="glass-panel p-6 flex flex-col gap-4"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-bold text-[var(--color-neon-blue)]">{clinic.name}</h3>
            <span className={`text-xs px-2 py-1 rounded border ${
              clinic.status === 'Available' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-orange-500/20 border-orange-500/50 text-orange-400'
            }`}>
              {clinic.status}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-gray-300">
            <MapPin size={16} className="text-[var(--color-neon-purple)]" />
            <span>{clinic.distance} away</span>
          </div>
          
          <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
            <span className="text-sm text-gray-400">Emergency Contact</span>
            <a href={`tel:${clinic.emergency}`} className="flex items-center gap-2 text-[var(--color-neon-blue)] hover:text-white transition-colors">
              <Phone size={16} />
              {clinic.emergency}
            </a>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default NearbyClinics;
