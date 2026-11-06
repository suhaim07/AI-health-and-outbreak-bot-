import { AlertTriangle, Activity, Map } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  // Mock data as per requirements
  const caseData = [
    { name: 'Dengue', cases: 42, color: '#e74c3c' },
    { name: 'Malaria', cases: 18, color: '#f39c12' },
    { name: 'Typhoid', cases: 12, color: '#3498db' },
    { name: 'Cholera', cases: 5, color: '#9b59b6' },
  ];

  return (
    <div className="glass-card">
      <h2 className="card-title">
        <Activity size={28} /> Outbreak Alert Dashboard
      </h2>

      <div className="dashboard-grid">
        <div className="stat-card" style={{ borderLeftColor: '#e74c3c' }}>
          <h3>Dengue Cases</h3>
          <span className="value">42</span>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#f39c12' }}>
          <h3>Malaria Cases</h3>
          <span className="value">18</span>
        </div>
      </div>

      <div style={{ width: '100%', height: 250, marginBottom: '2rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={caseData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="cases" fill="#3aafa9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="alert-banner">
        <AlertTriangle size={24} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>HIGH RISK LEVEL</div>
          <div>Possible dengue outbreak detected in the region.</div>
        </div>
      </div>

      <div className="alert-banner warning">
        <Map size={24} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Nearby Facilities</div>
          <div>3 health centers are equipped for Dengue testing within 5km.</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
