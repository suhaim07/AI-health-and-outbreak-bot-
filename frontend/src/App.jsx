import { useEffect, useState } from 'react';
import { Stethoscope, AlertTriangle, MapPin, HeartPulse, MessagesSquare, Loader2, ShieldCheck } from 'lucide-react';
import Chatbot from './components/Chatbot';
import MapSection from './components/MapSection';
import { translations } from './utils/translations';

import { API_BASE_URL } from './config';

function App() {
  const [language, setLanguage] = useState('English');
  const [activeTab, setActiveTab] = useState('Checkup'); // Checkup, Map, Chat
  const [localAlert, setLocalAlert] = useState(null);
  const [alertLoading, setAlertLoading] = useState(true);

  const languages = ['English', 'Hindi', 'Kannada', 'Tamil', 'Urdu'];
  const t = translations[language] || translations['English'];

  useEffect(() => {
    let cancelled = false;

    const fallbackAlert = {
      level: 'unknown',
      title: t.health_alert,
      message: 'Allow location access to check health risks near you.',
      precautions: 'Wash hands, drink clean water, remove standing water, and visit a clinic if symptoms become severe.'
    };

    const loadLocalAlert = async () => {
      setAlertLoading(true);

      if (!navigator.geolocation) {
        setLocalAlert(fallbackAlert);
        setAlertLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(`${API_BASE_URL}/outbreak-alert`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                language
              })
            });
            const alertData = await response.json();
            if (!cancelled) setLocalAlert(alertData);
          } catch (error) {
            console.error('Error loading local health alert:', error);
            if (!cancelled) setLocalAlert(fallbackAlert);
          } finally {
            if (!cancelled) setAlertLoading(false);
          }
        },
        () => {
          if (!cancelled) {
            setLocalAlert(fallbackAlert);
            setAlertLoading(false);
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };

    loadLocalAlert();

    return () => {
      cancelled = true;
    };
  }, [language, t.health_alert]);

  const alertStyles = {
    high: {
      card: 'bg-red-50 border-red-200',
      icon: 'text-red-600',
      title: 'text-red-800',
      text: 'text-red-700'
    },
    medium: {
      card: 'bg-orange-50 border-orange-200',
      icon: 'text-orange-600',
      title: 'text-orange-800',
      text: 'text-orange-700'
    },
    low: {
      card: 'bg-emerald-50 border-emerald-200',
      icon: 'text-emerald-600',
      title: 'text-emerald-800',
      text: 'text-emerald-700'
    },
    unknown: {
      card: 'bg-slate-50 border-slate-200',
      icon: 'text-slate-600',
      title: 'text-slate-800',
      text: 'text-slate-700'
    }
  };

  const currentAlertStyle = alertStyles[localAlert?.level] || alertStyles.unknown;

  return (
    <div className="min-h-dvh bg-slate-100 font-sans lg:flex lg:items-center lg:justify-center lg:p-6">
      <div className="min-h-dvh w-full bg-slate-50 flex flex-col relative pb-20 lg:min-h-[min(900px,calc(100vh-48px))] lg:max-w-6xl lg:rounded-3xl lg:shadow-2xl lg:overflow-hidden lg:aspect-[16/10]">
      {/* Top Bar */}
      <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-slate-100">
        <div className="flex items-center gap-2 text-teal-800 font-bold text-xl">
          <HeartPulse size={28} className="text-teal-600" />
          {t.title}
        </div>
      </header>

      {/* Language Selector Buttons */}
      <div className="bg-white px-4 py-3 border-b border-slate-100 overflow-x-auto no-scrollbar flex gap-2">
        {languages.map(lang => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-colors border-2 ${
              language === lang 
                ? 'bg-teal-600 text-white border-teal-600' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        {/* Main Tabs */}
        {activeTab === 'Checkup' && (
          <div className="p-4 space-y-6 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-6 lg:space-y-0 lg:p-8 lg:items-start">
            
            {/* Welcome Section */}
            <div className="text-center py-4 lg:text-left lg:py-10">
              <h1 className="text-2xl lg:text-4xl font-bold text-slate-800 mb-2">{t.greeting}</h1>
              <p className="text-slate-500 mb-6 lg:text-lg">{t.tagline}</p>
              
              <div className="bg-teal-100 rounded-3xl p-6 mx-auto lg:mx-0 mb-6 flex justify-center w-40 h-40 lg:w-48 lg:h-48 items-center shadow-inner">
                <Stethoscope size={96} className="text-teal-600" />
              </div>
              
              <button 
                onClick={() => setActiveTab('Chat')}
                className="w-full lg:max-w-md bg-teal-600 text-white font-bold text-xl py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <Stethoscope size={28} />
                {t.start_checkup}
              </button>
            </div>

            <div className="space-y-6">
            {/* Emergency Alert */}
            <div className={`${currentAlertStyle.card} border-2 rounded-2xl p-5 shadow-sm mt-4 lg:mt-0`}>
              <div className="flex items-center gap-3 mb-2">
                {alertLoading ? (
                  <Loader2 size={28} className={`${currentAlertStyle.icon} animate-spin`} />
                ) : localAlert?.level === 'low' ? (
                  <ShieldCheck size={28} className={currentAlertStyle.icon} />
                ) : (
                  <AlertTriangle size={28} className={currentAlertStyle.icon} />
                )}
                <h3 className={`${currentAlertStyle.title} font-bold text-xl`}>
                  {alertLoading ? t.health_alert : localAlert?.title || t.health_alert}
                </h3>
              </div>
              <p className={`${currentAlertStyle.text} text-lg`}>
                {alertLoading ? 'Checking health alerts near your location...' : localAlert?.message}
              </p>
              {!alertLoading && localAlert?.precautions && (
                <p className={`${currentAlertStyle.text} text-base mt-3 font-semibold`}>
                  {localAlert.precautions}
                </p>
              )}
            </div>

            {/* Simple Footer */}
            <footer className="pt-6 border-t border-slate-200 text-center pb-6">
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-lg mb-2">{t.important_numbers}</h4>
                  <div className="flex justify-center gap-6 text-teal-700 font-bold text-xl">
                    <span>📞 {t.ambulance}</span>
                  </div>
                  <div className="flex justify-center gap-6 text-teal-700 font-bold text-xl mt-2">
                    <span>📞 {t.health_help}</span>
                  </div>
                </div>
                
                <p className="text-slate-500 text-sm">
                  <strong>{t.title}</strong> {t.disclaimer1}<br/>
                  {t.disclaimer2}
                </p>
              </div>
            </footer>
            </div>
          </div>
        )}

        {activeTab === 'Chat' && (
          <div className="h-full flex flex-col min-h-[calc(100dvh-154px)] lg:min-h-full">
            <Chatbot onBack={() => setActiveTab('Checkup')} language={language} />
          </div>
        )}

        {activeTab === 'Map' && (
          <div className="h-full min-h-[calc(100dvh-154px)] lg:min-h-full">
            <MapSection language={language} />
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-slate-200 flex justify-around py-3 px-2 z-20 pb-safe shadow-[0_-4px_15px_rgba(0,0,0,0.05)] lg:absolute">
        <button 
          onClick={() => setActiveTab('Checkup')} 
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'Checkup' ? 'text-teal-700 bg-teal-50' : 'text-slate-500'}`}
        >
          <HeartPulse size={24} />
          <span className="text-xs font-bold">{t.nav_home}</span>
        </button>
        <button 
          onClick={() => setActiveTab('Chat')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'Chat' ? 'text-teal-700 bg-teal-50' : 'text-slate-500'}`}
        >
          <MessagesSquare size={24} />
          <span className="text-xs font-bold">{t.nav_chat}</span>
        </button>
        <button 
          onClick={() => setActiveTab('Map')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'Map' ? 'text-teal-700 bg-teal-50' : 'text-slate-500'}`}
        >
          <MapPin size={24} />
          <span className="text-xs font-bold">{t.nav_map}</span>
        </button>
      </nav>
      </div>
    </div>
  );
}

export default App;
