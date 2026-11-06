import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { mockDashboardData } from '../data/mockData';

const OutbreakAlert = () => {
  return (
    <div className="space-y-4">
      {mockDashboardData.alerts.map((alert, idx) => (
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.2 }}
          viewport={{ once: true }}
          key={alert.id}
          className={`p-4 rounded-xl flex items-center gap-4 ${
            alert.type === 'critical' 
              ? 'bg-[var(--color-alert-red)]/10 border border-[var(--color-alert-red)]/50 text-[var(--color-alert-red)]'
              : 'bg-yellow-500/10 border border-yellow-500/50 text-yellow-500'
          }`}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <AlertTriangle size={28} />
          </motion.div>
          <div>
            <p className="font-bold tracking-wider uppercase text-sm mb-1">
              {alert.type === 'critical' ? '🚨 HIGH RISK ALERT' : '⚠️ WARNING'}
            </p>
            <p className="text-lg text-white">{alert.message}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default OutbreakAlert;
