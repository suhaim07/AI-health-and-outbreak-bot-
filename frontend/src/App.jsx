import { useEffect, useState } from 'react';
import { Stethoscope, AlertTriangle, MapPin, HeartPulse, MessagesSquare, Loader2, ShieldCheck } from 'lucide-react';
import Chatbot from './components/Chatbot';
import MapSection from './components/MapSection';
import { translations } from './utils/translations';

import { API_BASE_URL } from './config';

function App() {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('pulseguard_language') || 'English';
  });
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('pulseguard_active_tab') || 'Checkup';
  });
  const [localAlert, setLocalAlert] = useState(null);
  const [alertLoading, setAlertLoading] = useState(true);

  const languages = ['English', 'Hindi', 'Kannada', 'Tamil', 'Urdu'];
  const t = translations[language] || translations['English'];

  useEffect(() => {
    localStorage.setItem('pulseguard_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('pulseguard_active_tab', activeTab);
  }, [activeTab]);

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
    <div className="h-screen w-full bg-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="bg-white px-4 lg:px-8 py-3.5 flex items-center justify-between z-20 border-b border-slate-200 shrink-0 shadow-sm">
        <div 
          className="flex items-center gap-3 text-teal-800 font-bold text-xl lg:text-2xl cursor-pointer select-none" 
          onClick={() => setActiveTab('Checkup')}
        >
          <div className="bg-teal-50 p-2 rounded-xl text-teal-600">
            <HeartPulse size={26} />
          </div>
          <span>{t.title}</span>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setActiveTab('Checkup')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'Checkup' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartPulse size={18} />
            <span>{t.nav_home}</span>
          </button>
          <button 
            onClick={() => setActiveTab('Chat')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'Chat' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessagesSquare size={18} />
            <span>{t.nav_chat}</span>
          </button>
          <button 
            onClick={() => setActiveTab('Map')} 
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'Map' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin size={18} />
            <span>{t.nav_map}</span>
          </button>
        </div>

        {/* Language Selector Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {languages.map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full font-bold text-xs lg:text-sm transition-all border ${
                language === lang 
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-hidden flex flex-col bg-slate-50 relative pb-16 lg:pb-0">
        {/* Main Tabs */}
        {activeTab === 'Checkup' && (
          <div className="flex-1 overflow-y-auto w-full">
            <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-10 space-y-6 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:space-y-0 lg:items-start">
            
            {/* Welcome Section */}
            <div className="text-center py-4 lg:text-left lg:py-6">
              <h1 className="text-2xl lg:text-4xl font-bold text-slate-800 mb-2">{t.greeting}</h1>
              <p className="text-slate-500 mb-6 lg:text-lg">{t.tagline}</p>
              
              <div className="bg-teal-100 rounded-3xl p-6 mx-auto lg:mx-0 mb-6 flex justify-center w-40 h-40 lg:w-48 lg:h-48 items-center shadow-inner">
                <Stethoscope size={96} className="text-teal-600" />
              </div>
              
              <button 
                onClick={() => setActiveTab('Chat')}
                className="w-full lg:max-w-md bg-teal-600 text-white font-bold text-xl py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 hover:bg-teal-700 transition-all cursor-pointer"
              >
                <Stethoscope size={28} />
                {t.start_checkup}
              </button>
            </div>

            <div className="space-y-6">
            {/* Emergency Alert */}
            <div className={`${currentAlertStyle.card} border-2 rounded-2xl p-6 shadow-sm mt-4 lg:mt-0`}>
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
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
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
          </div>
        )}

        {activeTab === 'Chat' && (
          <div className="flex-1 h-full w-full overflow-hidden flex flex-col">
            <Chatbot onBack={() => setActiveTab('Checkup')} language={language} />
          </div>
        )}

        {activeTab === 'Map' && (
          <div className="flex-1 h-full w-full overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full">
              <MapSection language={language} />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 w-full bg-white border-t border-slate-200 flex justify-around py-2.5 px-2 z-30 pb-safe shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('Checkup')} 
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'Checkup' ? 'text-teal-700 bg-teal-50' : 'text-slate-500'}`}
        >
          <HeartPulse size={22} />
          <span className="text-xs font-bold">{t.nav_home}</span>
        </button>
        <button 
          onClick={() => setActiveTab('Chat')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'Chat' ? 'text-teal-700 bg-teal-50' : 'text-slate-500'}`}
        >
          <MessagesSquare size={22} />
          <span className="text-xs font-bold">{t.nav_chat}</span>
        </button>
        <button 
          onClick={() => setActiveTab('Map')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${activeTab === 'Map' ? 'text-teal-700 bg-teal-50' : 'text-slate-500'}`}
        >
          <MapPin size={22} />
          <span className="text-xs font-bold">{t.nav_map}</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
