import { motion } from 'framer-motion';
import { mockDashboardData } from '../data/mockData';
import { Shield, Activity, Users } from 'lucide-react';

const DashboardCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {mockDashboardData.cases.map((item, idx) => (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          viewport={{ once: true }}
          key={item.name}
          className="glass-panel p-6 border-l-4"
          style={{ borderLeftColor: item.color }}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-gray-400 font-medium uppercase tracking-wider text-sm">{item.name} Cases</h3>
            <Users size={20} color={item.color} />
          </div>
          <p className="text-5xl font-bold" style={{ color: item.color }}>{item.count}</p>
        </motion.div>
      ))}

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="glass-panel neon-border p-6 md:col-span-3 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[var(--color-alert-red)]/20 rounded-full text-[var(--color-alert-red)]">
            <Shield size={32} />
          </div>
          <div>
            <h3 className="text-gray-400 font-medium uppercase tracking-wider text-sm mb-1">Current Risk Level</h3>
            <p className="text-3xl font-bold text-[var(--color-alert-red)] glow-text-red">{mockDashboardData.riskLevel}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="p-4 bg-[var(--color-neon-blue)]/20 rounded-full text-[var(--color-neon-blue)]">
            <Activity size={32} />
          </div>
          <div>
            <h3 className="text-gray-400 font-medium uppercase tracking-wider text-sm mb-1">Community Health Index</h3>
            <p className="text-3xl font-bold text-[var(--color-neon-blue)] glow-text-blue">{mockDashboardData.healthIndex}/100</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardCards;
