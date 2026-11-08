import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, ArrowLeft, MapPin, Navigation, Loader2, Trash2 } from 'lucide-react';
import { translations } from '../utils/translations';
import { API_BASE_URL } from '../config';

const MIN_THINKING_TIME_MS = 1200;

const wait = (milliseconds) => new Promise((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

const facilityWords = ['doctor', 'doctior', 'clinic', 'hospital', 'physician', 'specialist'];
const nearbyWords = ['near me', 'nearby', 'nearest', 'near ', 'close to me', 'around me', 'find a'];

const specialtyRules = [
  {
    specialty: 'Pulmonologist',
    keywords: ['cough', 'cold', 'breath', 'asthma', 'lungs', 'tb', 'tuberculosis', 'chest congestion']
  },
  {
    specialty: 'Cardiologist',
    keywords: ['heart', 'chest pain', 'bp', 'blood pressure', 'palpitation']
  },
  {
    specialty: 'Gastroenterologist',
    keywords: ['stomach', 'vomit', 'vomiting', 'diarrhea', 'loose motion', 'gastric', 'abdomen']
  },
  {
    specialty: 'Dermatologist',
    keywords: ['skin', 'rash', 'itch', 'allergy', 'pimple', 'acne']
  },
  {
    specialty: 'Neurologist',
    keywords: ['headache', 'migraine', 'seizure', 'fits', 'stroke', 'numbness']
  },
  {
    specialty: 'Orthopedic Doctor',
    keywords: ['bone', 'joint', 'fracture', 'knee', 'back pain', 'body pain', 'sprain']
  },
  {
    specialty: 'ENT Specialist',
    keywords: ['ear', 'nose', 'throat', 'tonsil', 'sinus']
  },
  {
    specialty: 'Ophthalmologist',
    keywords: ['eye', 'vision', 'sight']
  },
  {
    specialty: 'Dentist',
    keywords: ['tooth', 'teeth', 'dental', 'gum', 'decay', 'decaying', 'cavity']
  },
  {
    specialty: 'Gynecologist',
    keywords: ['pregnancy', 'period', 'periods', 'women', 'uterus', 'vaginal']
  },
  {
    specialty: 'Pediatrician',
    keywords: ['child', 'baby', 'infant', 'kids']
  },
  {
    specialty: 'Endocrinologist',
    keywords: ['diabetes', 'sugar', 'thyroid']
  },
  {
    specialty: 'General Physician',
    keywords: ['fever', 'dengue', 'malaria', 'viral', 'infection', 'unwell', 'weakness']
  }
];

const getDistanceKm = (from, to) => {
  const earthRadiusKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a = Math.sin(dLat / 2) ** 2
    + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const inferSpecialty = (text) => {
  const lowerText = text.toLowerCase();
  return specialtyRules.find((rule) =>
    rule.keywords.some((keyword) => lowerText.includes(keyword))
  )?.specialty || 'General Physician';
};

const isNearbyFacilityRequest = (text) => {
  const lowerText = text.toLowerCase();
  return facilityWords.some((word) => lowerText.includes(word))
    && nearbyWords.some((word) => lowerText.includes(word));
};

const getBrowserLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Geolocation is not supported by your browser.'));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => resolve({
      lat: position.coords.latitude,
      lon: position.coords.longitude
    }),
    (error) => reject(new Error(
      error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Allow it in your browser settings to find nearby clinics or hospitals.'
        : 'Your location could not be determined. Please try again outdoors or with location services enabled.'
    )),
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

const fetchNearbyDoctors = async (location, specialty) => {
  const radius = 10000;
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="doctors"](around:${radius},${location.lat},${location.lon});
      node["healthcare"="doctor"](around:${radius},${location.lat},${location.lon});
      node["amenity"="clinic"](around:${radius},${location.lat},${location.lon});
      node["amenity"="hospital"](around:${radius},${location.lat},${location.lon});
      way["amenity"="doctors"](around:${radius},${location.lat},${location.lon});
      way["healthcare"="doctor"](around:${radius},${location.lat},${location.lon});
      way["amenity"="clinic"](around:${radius},${location.lat},${location.lon});
      way["amenity"="hospital"](around:${radius},${location.lat},${location.lon});
      relation["amenity"="clinic"](around:${radius},${location.lat},${location.lon});
      relation["amenity"="hospital"](around:${radius},${location.lat},${location.lon});
    );
    out center 50;
  `;
  const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Nearby facility data is temporarily unavailable. Please try again in a moment.');
  }
  const data = await response.json();
  const specialtyWords = specialty.toLowerCase().split(/\s+/);

  const nearbyDoctors = (data.elements || [])
    .map((item) => ({
      id: item.id,
      lat: item.lat || item.center?.lat,
      lon: item.lon || item.center?.lon,
      name: item.tags?.name || item.tags?.operator || 'Nearby health clinic',
      phone: item.tags?.phone || item.tags?.['contact:phone'],
      address: [
        item.tags?.['addr:housenumber'],
        item.tags?.['addr:street'],
        item.tags?.['addr:suburb'],
        item.tags?.['addr:city']
      ].filter(Boolean).join(', '),
      tags: item.tags || {}
    }))
    .filter((item) => item.lat && item.lon)
    .map((item) => {
      const searchable = Object.values(item.tags).join(' ').toLowerCase();
      const specialtyMatch = specialtyWords.some((word) => searchable.includes(word));
      return {
        ...item,
        distanceKm: getDistanceKm(location, item),
        specialtyMatch
      };
    })
    .sort((a, b) => {
      if (a.specialtyMatch !== b.specialtyMatch) return a.specialtyMatch ? -1 : 1;
      return a.distanceKm - b.distanceKm;
    });

  return nearbyDoctors;
};

const Chatbot = ({ onBack, language }) => {
  const t = translations[language] || translations['English'];
  
  // Persistent chat messages from localStorage
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('pulseguard_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading chat history from localStorage:', e);
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync chat messages to localStorage whenever they update
  useEffect(() => {
    try {
      localStorage.setItem('pulseguard_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history to localStorage:', e);
    }
  }, [messages]);

  // Clear chat history
  const clearChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem('pulseguard_chat_history');
    } catch (e) {
      console.error('Error clearing chat history:', e);
    }
  };

  // Auto-focus input on mount and language change
  useEffect(() => {
    inputRef.current?.focus();
  }, [language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickSymptoms = [
    { label: t.symp_fever, icon: "🌡️" },
    { label: t.symp_headache, icon: "🤕" },
    { label: t.symp_cough, icon: "🤒" },
    { label: t.symp_stomach, icon: "🤢" },
    { label: t.symp_body, icon: "🫂" },
    { label: t.symp_vomiting, icon: "🤮" }
  ];

  const findNearbyDoctor = async (userMsg) => {
    const previousUserText = messages
      .filter((msg) => msg.sender === 'user')
      .map((msg) => msg.text)
      .join(' ');
    const specialty = inferSpecialty(`${previousUserText} ${userMsg}`);

    setDoctorLoading(true);
    setMessages(prev => [...prev, {
      text: `Please allow location access. I will use it only to find nearby clinics or hospitals.`,
      sender: 'bot'
    }]);

    try {
      const userLocation = await getBrowserLocation();
      const doctors = await fetchNearbyDoctors(userLocation, specialty);
      const selectedDoctor = doctors[0];

      if (!selectedDoctor) {
        setMessages(prev => [...prev, {
          text: `I could not find a mapped clinic or hospital within 10 km of your location. Try again later or search in Google Maps.`,
          sender: 'bot'
        }]);
        return;
      }

      setMessages(prev => [...prev, {
        sender: 'bot',
        kind: 'doctor',
        specialty,
        doctor: selectedDoctor,
        text: `Nearest mapped facility: ${selectedDoctor.name}. It is about ${selectedDoctor.distanceKm.toFixed(1)} km away.`
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        text: error.message || 'Please allow location access to find a nearby doctor.',
        sender: 'bot'
      }]);
    } finally {
      setDoctorLoading(false);
    }
  };

  const sendMessage = async (text = input) => {
    if (loading || doctorLoading) return;
    if (!text.trim()) return;

    const userMsg = text.trim();
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setInput('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    if (isNearbyFacilityRequest(userMsg)) {
      await findNearbyDoctor(userMsg);
      inputRef.current?.focus();
      return;
    }

    setLoading(true);
    const thinkingStartedAt = Date.now();

    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, { 
        message: userMsg,
        language: language
      }, { timeout: 45000 });
      const elapsedTime = Date.now() - thinkingStartedAt;
      if (elapsedTime < MIN_THINKING_TIME_MS) {
        await wait(MIN_THINKING_TIME_MS - elapsedTime);
      }
      setMessages(prev => [...prev, { text: response.data.reply, sender: 'bot' }]);
    } catch (error) {
      console.error("Error communicating with AI:", error);
      const elapsedTime = Date.now() - thinkingStartedAt;
      if (elapsedTime < MIN_THINKING_TIME_MS) {
        await wait(MIN_THINKING_TIME_MS - elapsedTime);
      }
      const isNetworkError = !error.response;
      setMessages(prev => [...prev, {
        text: isNetworkError
          ? "I could not connect to the server. Please make sure the backend is running and try again."
          : "Sorry, something went wrong. Please try again.",
        sender: 'bot'
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50">
      <div className="bg-white px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-10 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer">
            <ArrowLeft size={22} />
          </button>
          <div className="font-bold text-lg lg:text-xl text-slate-800 flex items-center gap-2">
            <div className="bg-teal-100 p-2 rounded-full text-teal-700">
              <Bot size={22} />
            </div>
            {t.chat_title}
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs lg:text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 size={16} />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 pb-10">
        <div className="max-w-4xl mx-auto w-full space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] lg:max-w-[70%] p-4 lg:p-5 rounded-3xl text-base sm:text-lg ${msg.sender === 'user' ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}`}>
              {msg.kind === 'doctor' ? (
                <div className="space-y-3">
                  <div>
                    <div className="font-bold text-lg">{msg.specialty}</div>
                    <div className="text-slate-700 font-medium">{msg.doctor.name}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin size={16} /> {msg.doctor.distanceKm.toFixed(1)} km away
                    </div>
                    {msg.doctor.address && (
                      <div className="text-sm text-slate-500 mt-1">{msg.doctor.address}</div>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${msg.doctor.lat},${msg.doctor.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-teal-700 text-white py-3 px-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <Navigation size={18} /> Get Directions
                  </a>
                  {msg.doctor.phone && (
                    <a href={`tel:${msg.doctor.phone}`} className="block text-center text-teal-700 font-bold">
                      Call Clinic
                    </a>
                  )}
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {(loading || doctorLoading) && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-4 rounded-3xl rounded-bl-sm shadow-sm">
              {doctorLoading ? (
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <Loader2 size={20} className="animate-spin" /> Finding nearby facilities...
                </div>
              ) : (
                <div className="typing-indicator">
                  <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-3 max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {quickSymptoms.map((symptom, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  sendMessage(symptom.label);
                }}
                className="bg-white border-2 border-slate-100 p-3 lg:p-3.5 rounded-2xl flex items-center justify-center gap-2 text-slate-700 font-bold shadow-sm hover:border-teal-300 hover:bg-teal-50 active:scale-95 transition-all text-sm lg:text-base cursor-pointer"
              >
                <span className="text-xl">{symptom.icon}</span>
                <span className="truncate">{symptom.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 bg-white border-t border-slate-200 shadow-sm sticky bottom-0 z-10 shrink-0">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex gap-2 items-center bg-slate-100 rounded-full p-1.5 pl-5 border border-slate-200/80 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
            <input 
              ref={inputRef}
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={t.chat_placeholder}
              className="flex-1 bg-transparent border-none py-3 text-base lg:text-lg outline-none placeholder:text-slate-400"
            />
            <button 
              onClick={() => sendMessage()} 
              disabled={loading || doctorLoading || !input.trim()}
              className="p-3.5 lg:p-4 bg-teal-600 text-white rounded-full flex-shrink-0 disabled:bg-slate-300 disabled:cursor-not-allowed active:bg-teal-700 hover:bg-teal-700 transition-colors shadow-sm cursor-pointer"
            >
              <Send size={22} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
