import { useState, useEffect } from 'react';
import { MapPin, Navigation, Phone, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { translations } from '../utils/translations';

const MapSection = ({ language }) => {
  const t = translations[language] || translations['English'];
  
  const [location, setLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(() => Boolean(navigator.geolocation));
  const [errorMsg, setErrorMsg] = useState(() => (
    navigator.geolocation ? '' : 'Geolocation is not supported by your browser.'
  ));

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLocation({ lat, lon });

        try {
          const query = `[out:json][timeout:25];(node["amenity"="hospital"](around:10000,${lat},${lon});node["amenity"="clinic"](around:10000,${lat},${lon});way["amenity"="hospital"](around:10000,${lat},${lon});way["amenity"="clinic"](around:10000,${lat},${lon});relation["amenity"="hospital"](around:10000,${lat},${lon});relation["amenity"="clinic"](around:10000,${lat},${lon}););out center 20;`;
          const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
          if (!response.ok) throw new Error('Nearby facility data is unavailable.');
          const data = await response.json();
          
          if (data && data.elements && data.elements.length > 0) {
            setHospitals(data.elements
              .map((facility) => ({
                ...facility,
                lat: facility.lat || facility.center?.lat,
                lon: facility.lon || facility.center?.lon
              }))
              .filter((facility) => facility.lat && facility.lon));
          } else {
            setErrorMsg("No mapped clinics or hospitals were found within 10 km of your location.");
          }
        } catch (err) {
          console.error(err);
          setErrorMsg("Nearby facility data is unavailable. Please try again later.");
        }
        setLoading(false);
      },
      () => {
        setErrorMsg("Please allow location access to find nearby hospitals.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const renderMapIframe = () => {
    if (!location) {
      // Default to Bangalore if no location
      return (
        <iframe 
          src="https://www.openstreetmap.org/export/embed.html?bbox=77.58,12.97,77.60,12.99&layer=mapnik&marker=12.98,77.59" 
          width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" title="Map"
        ></iframe>
      );
    }
    const { lat, lon } = location;
    // Bounding box: minLon, minLat, maxLon, maxLat
    const offset = 0.02;
    const bbox = `${lon - offset},${lat - offset},${lon + offset},${lat + offset}`;
    return (
      <iframe 
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`} 
        width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" title="Map"
      ></iframe>
    );
  };

  const getGoogleMapsUrl = (destLat, destLon) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLon}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 flex flex-col h-full space-y-6 pb-12">
      
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="h-64 lg:h-80 bg-slate-200 relative w-full flex items-center justify-center">
          {loading && !location ? (
            <div className="flex flex-col items-center text-slate-500">
              <Loader2 size={32} className="animate-spin mb-2" />
              <span className="font-bold">Locating you...</span>
            </div>
          ) : (
            renderMapIframe()
          )}
        </div>
        <div className="p-5 lg:p-6 bg-teal-700 text-white">
          <h2 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <MapPin size={28} />
            {t.nearby_facilities}
          </h2>
          <p className="text-teal-100 mt-1 text-base lg:text-lg">{t.showing_closest}</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="text-center p-8 text-slate-500 font-bold flex justify-center items-center gap-2">
             <Loader2 className="animate-spin" /> Finding nearest hospitals...
          </div>
        )}
        
        {!loading && errorMsg && (
          <div className="bg-orange-50 text-orange-800 p-4 rounded-2xl border border-orange-200 text-center font-bold">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!loading && hospitals.map((hospital, idx) => (
          <div key={hospital.id || idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between gap-4 relative overflow-hidden">
            {idx === 0 && (
              <div className="absolute top-0 right-0 bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-bl-2xl shadow-sm">
                ★ {t.recommended}
              </div>
            )}
            <div>
              <div className="flex gap-2 items-center mb-2">
                {idx === 0 && <span className="bg-green-100 text-green-800 text-sm font-bold px-3 py-1 rounded-full">{t.urgent_care}</span>}
                <span className="bg-slate-100 text-slate-600 text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <MapPin size={14}/> Nearby
                </span>
                <span className="text-green-600 text-sm font-bold flex items-center gap-1">
                  <Clock size={16} /> {t.open_now}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {hospital.tags?.name || "Local Health Clinic"}
              </h3>
            </div>
            
            <div className={`flex gap-3 mt-2 ${idx === 0 ? 'flex-col sm:flex-row' : 'flex-row'}`}>
              <a 
                href={getGoogleMapsUrl(hospital.lat, hospital.lon)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 ${idx === 0 ? 'bg-teal-700 hover:bg-teal-800 text-white' : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50'} py-3.5 lg:py-4 rounded-2xl font-bold text-base lg:text-lg flex items-center justify-center gap-2 transition-colors active:scale-95`}
              >
                <Navigation size={20} /> {t.get_directions}
              </a>
              {idx === 0 && (
                <a 
                  href={`tel:${hospital.tags?.phone || '104'}`}
                  className="flex-1 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 py-3.5 lg:py-4 rounded-2xl font-bold text-base lg:text-lg flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  <Phone size={20} /> {t.call_clinic}
                </a>
              )}
            </div>
          </div>
        ))}
        </div>
      </div>
      
      {/* Emergency Contact */}
      <div className="bg-red-100 rounded-3xl p-6 border-2 border-red-200 mt-6 mb-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 text-white p-3 rounded-full shadow-md">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-red-800 font-bold text-xl">{t.severe_emergency}</h3>
              <p className="text-red-700 text-base">{t.dont_wait}</p>
            </div>
          </div>
          <a href="tel:108" className="bg-red-700 text-white font-bold py-4 px-6 rounded-2xl w-full flex items-center justify-center gap-3 shadow-md text-xl active:scale-95 transition-transform">
            <Phone size={24} /> 911 / 108
          </a>
        </div>
      </div>

    </div>
  );
};

export default MapSection;
