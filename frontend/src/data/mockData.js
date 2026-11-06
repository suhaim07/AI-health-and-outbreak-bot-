export const mockDashboardData = {
  cases: [
    { name: 'Dengue', count: 42, color: '#ff3366' },
    { name: 'Malaria', count: 18, color: '#ffaa00' },
    { name: 'Cholera', count: 5, color: '#00f0ff' }
  ],
  riskLevel: 'HIGH',
  healthIndex: 72,
  alerts: [
    { id: 1, type: 'critical', message: 'Possible dengue outbreak detected in Sector 4' },
    { id: 2, type: 'warning', message: 'Malaria cases rising 15% above normal' }
  ]
};

export const nearbyClinics = [
  { id: 1, name: 'City Central Hospital', distance: '1.2 km', emergency: '102', status: 'Available' },
  { id: 2, name: 'Green Valley Clinic', distance: '3.5 km', emergency: '104', status: 'Busy' },
  { id: 3, name: 'Community Health Center', distance: '5.0 km', emergency: '108', status: 'Available' }
];

export const languages = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu'];
export const llmModels = ['Gemini 1.5 Flash', 'Gemini 1.5 Pro', 'GPT-4o', 'Claude 3.5 Sonnet'];
