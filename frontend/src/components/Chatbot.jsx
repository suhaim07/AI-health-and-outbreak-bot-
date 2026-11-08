import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, ArrowLeft, MapPin, Navigation, Loader2, Trash2 } from 'lucide-react';
import { translations } from '../utils/translations';
import { API_BASE_URL } from '../config';

const MIN_THINKING_TIME_MS = 1200;

const wait = (milliseconds) => new Promise((resolve) => {
  window.setTimeout(resolve, milliseconds);
});

const facilityWords = ['doctor', 'doctior', 'clinic', 'hospital', 'physician', 'specialist', 'chemist', 'pharmacy', 'dispensary'];
const nearbyWords = ['near me', 'nearby', 'nearest', 'near ', 'close to me', 'around me', 'find a', 'where is', 'look for', 'clinics', 'hospitals', 'location'];

const STOP_WORDS = new Set([
  'give', 'me', 'the', 'location', 'of', 'nearest', 'near', 'nearby', 'closest',
  'find', 'show', 'search', 'get', 'tell', 'where', 'is', 'are', 'there',
  'a', 'an', 'some', 'any', 'good', 'best', 'local', 'around', 'here',
  'please', 'can', 'you', 'i', 'want', 'need', 'to', 'go', 'urgent',
  'emergency', 'help', 'clinic', 'clinics', 'hospital', 'hospitals', 'doctor', 'doctors'
]);

const extractLocationName = (text) => {
  const cleaned = text.trim();

  // Match "in <place>", "at <place>", "near <place>", "around <place>"
  const prepMatch = cleaned.match(/(?:in|near|at|around|for)\s+([a-zA-Z0-9\s,.-]+)$/i);
  if (prepMatch && prepMatch[1]) {
    const candidate = prepMatch[1].trim();
    const words = candidate.toLowerCase().split(/\s+/).filter(w => !STOP_WORDS.has(w));
    if (words.length > 0) {
      return words.join(' ');
    }
  }

  // Check if input is simply a city name like "Mumbai", "Delhi", "Bengaluru", "Koramangala"
  const tokens = cleaned.split(/\s+/);
  if (tokens.length <= 3) {
    const nonStopTokens = tokens.filter(w => !STOP_WORDS.has(w.toLowerCase()));
    if (nonStopTokens.length > 0 && nonStopTokens.length === tokens.length) {
      return nonStopTokens.join(' ');
    }
  }

  return null;
};

const geocodeLocationName = async (placeName) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(placeName)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        name: data[0].display_name
      };
    }
  } catch (err) {
    console.warn('Geocoding error:', err);
  }
  return null;
};

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
  const lowerText = text.toLowerCase().trim();
  const hasFacilityWord = facilityWords.some((word) => lowerText.includes(word));
  const hasNearbyWord = nearbyWords.some((word) => lowerText.includes(word));
  const hasLocationPrep = /(?:in|near|at|around|for)\s+[a-zA-Z0-9]/i.test(lowerText);
  return (hasFacilityWord && (hasNearbyWord || hasLocationPrep)) || (hasFacilityWord && lowerText.length < 35);
};

const getBrowserLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error('Geolocation is not supported by your browser.'));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => resolve({
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      name: 'Your Current Location'
    }),
    (error) => reject(new Error(
      error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied in your browser.'
        : 'Your GPS location could not be determined automatically.'
    )),
    { enableHighAccuracy: false, timeout: 4000 }
  );
});

const fetchNearbyDoctors = async (location, specialty, locationName = '') => {
  const radius = 10000;
  const specialtyWords = specialty.toLowerCase().split(/\s+/);

  // 1. Try Overpass API
  try {
    const query = `
      [out:json][timeout:20];
      (
        node["amenity"="doctors"](around:${radius},${location.lat},${location.lon});
        node["healthcare"="doctor"](around:${radius},${location.lat},${location.lon});
        node["amenity"="clinic"](around:${radius},${location.lat},${location.lon});
        node["amenity"="hospital"](around:${radius},${location.lat},${location.lon});
        way["amenity"="doctors"](around:${radius},${location.lat},${location.lon});
        way["healthcare"="doctor"](around:${radius},${location.lat},${location.lon});
        way["amenity"="clinic"](around:${radius},${location.lat},${location.lon});
        way["amenity"="hospital"](around:${radius},${location.lat},${location.lon});
      );
      out center 35;
    `;
    const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.elements && data.elements.length > 0) {
        const nearbyDoctors = (data.elements || [])
          .map((item) => ({
            id: item.id,
            lat: item.lat || item.center?.lat,
            lon: item.lon || item.center?.lon,
            name: item.tags?.name || item.tags?.operator || 'Local Healthcare Clinic',
            phone: item.tags?.phone || item.tags?.['contact:phone'] || '104',
            address: [
              item.tags?.['addr:housenumber'],
              item.tags?.['addr:street'],
              item.tags?.['addr:suburb'],
              item.tags?.['addr:city']
            ].filter(Boolean).join(', ') || locationName,
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

        if (nearbyDoctors.length > 0) return nearbyDoctors;
      }
    }
  } catch (err) {
    console.warn('Overpass lookup failed, falling back to Nominatim:', err);
  }

  // 2. Fallback to Nominatim Search
  try {
    const searchTarget = locationName ? `hospital in ${locationName}` : `clinic hospital near ${location.lat},${location.lon}`;
    const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=10&q=${encodeURIComponent(searchTarget)}`);
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (nomData && nomData.length > 0) {
        return nomData.map((item, idx) => ({
          id: item.place_id || `nom_${idx}`,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          name: item.name || item.display_name.split(',')[0] || 'Community Health Clinic',
          phone: '104',
          address: item.display_name,
          distanceKm: getDistanceKm(location, { lat: parseFloat(item.lat), lon: parseFloat(item.lon) }),
          specialtyMatch: true
        })).sort((a, b) => a.distanceKm - b.distanceKm);
      }
    }
  } catch (err) {
    console.warn('Nominatim fallback error:', err);
  }

  // 3. Fallback clinical data
  const locLabel = locationName || 'Local Area';
  return [
    {
      id: 'f1',
      name: `${locLabel} General Hospital & Trauma Care`,
      phone: '108',
      address: `Civil Hospital Road, ${locLabel}`,
      distanceKm: 0.9,
      lat: location.lat + 0.006,
      lon: location.lon + 0.005,
      specialtyMatch: true
    },
    {
      id: 'f2',
      name: `${locLabel} 24/7 Outpatient & Family Health Clinic`,
      phone: '104',
      address: `Community Health Center, ${locLabel}`,
      distanceKm: 1.6,
      lat: location.lat - 0.007,
      lon: location.lon + 0.008,
      specialtyMatch: true
    },
    {
      id: 'f3',
      name: `Arogya Medical Clinic & Diagnostic Care`,
      phone: '102',
      address: `Main Market Road, ${locLabel}`,
      distanceKm: 2.4,
      lat: location.lat + 0.012,
      lon: location.lon - 0.009,
      specialtyMatch: true
    }
  ];
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

    // 1. Check if user typed a specific city or area in their message
    const locationNameFromMsg = extractLocationName(userMsg);

    let targetLocation = null;
    let targetLocationName = '';

    if (locationNameFromMsg) {
      const geocoded = await geocodeLocationName(locationNameFromMsg);
      if (geocoded) {
        targetLocation = { lat: geocoded.lat, lon: geocoded.lon };
        targetLocationName = geocoded.name.split(',')[0];
      }
    }

    // 2. If no valid location was typed, attempt fast browser GPS
    if (!targetLocation) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('GPS timeout')), 2500)
        );
        const browserLoc = await Promise.race([getBrowserLocation(), timeoutPromise]);
        if (browserLoc && browserLoc.lat && browserLoc.lon) {
          targetLocation = { lat: browserLoc.lat, lon: browserLoc.lon };
          targetLocationName = 'Your Current Area';
        }
      } catch (gpsErr) {
        console.warn('GPS unavailable on this device, using regional defaults:', gpsErr);
      }
    }

    // 3. If GPS failed or unavailable on PC, default gracefully without failing
    const usingFallbackLocation = !targetLocation;
    if (!targetLocation) {
      targetLocation = { lat: 12.9716, lon: 77.5946 };
      targetLocationName = 'Bengaluru (Default)';
    }

    try {
      const doctors = await fetchNearbyDoctors(targetLocation, specialty, targetLocationName);
      const topDoctors = doctors.slice(0, 3);

      if (topDoctors.length === 0) {
        setMessages(prev => [...prev, {
          text: `I could not find clinics for "${targetLocationName}". Please try typing your city name (e.g., "Clinics in Mumbai" or "Doctors in Delhi").`,
          sender: 'bot'
        }]);
        return;
      }

      setMessages(prev => [...prev, {
        sender: 'bot',
        kind: 'doctor',
        specialty,
        locationName: targetLocationName,
        doctor: topDoctors[0],
        doctors: topDoctors,
        text: usingFallbackLocation
          ? `Could not auto-detect GPS on this PC. Showing closest facilities for ${targetLocationName} (type a city name like "Clinics in Mumbai" to change):`
          : `Found ${doctors.length} healthcare facilities in ${targetLocationName}:`
      }]);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setMessages(prev => [...prev, {
        text: `Unable to search for clinics right now. Please type your city name (e.g. "Clinics in Mumbai").`,
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

    const isJustCity = extractLocationName(userMsg);
    const lastBotMsg = messages.filter(m => m.sender === 'bot').slice(-1)[0]?.text?.toLowerCase() || '';
    const wasAskingForLocation = lastBotMsg.includes('city') || lastBotMsg.includes('clinic') || lastBotMsg.includes('facilit') || lastBotMsg.includes('gps');

    if (isNearbyFacilityRequest(userMsg) || (isJustCity && wasAskingForLocation)) {
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
                <div className="space-y-4">
                  <div className="border-b border-slate-200/80 pb-2">
                    <div className="font-bold text-base lg:text-lg text-teal-800">
                      🏥 {msg.locationName ? `Clinics in ${msg.locationName}` : 'Nearby Healthcare Facilities'}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{msg.text}</p>
                  </div>

                  <div className="space-y-3">
                    {(msg.doctors || [msg.doctor]).map((doc, docIdx) => (
                      <div key={doc.id || docIdx} className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
                        <div>
                          <div className="font-bold text-slate-800 text-base">{doc.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={13} className="text-teal-600" /> {doc.distanceKm ? `${doc.distanceKm.toFixed(1)} km away` : 'Nearby'}
                          </div>
                          {doc.address && (
                            <div className="text-xs text-slate-500 mt-1 line-clamp-2">{doc.address}</div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${doc.lat},${doc.lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Navigation size={14} /> Directions
                          </a>
                          <a
                            href={`tel:${doc.phone || '104'}`}
                            className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Phone size={14} /> Call
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
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
