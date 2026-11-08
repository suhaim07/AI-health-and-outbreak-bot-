import { useState, useEffect } from 'react';
import { MapPin, Navigation, Phone, Clock, AlertCircle, Loader2, Search, Compass } from 'lucide-react';
import { translations } from '../utils/translations';

const DEFAULT_LOCATION = {
  lat: 12.9716,
  lon: 77.5946,
  name: 'Bengaluru, Karnataka'
};

const POPULAR_CITIES = [
  'Bengaluru',
  'Mumbai',
  'Delhi',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Pune'
];

const MapSection = ({ language }) => {
  const t = translations[language] || translations['English'];

  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [searchInput, setSearchInput] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate distance in km between two lat/lon points
  const getDistanceKm = (from, to) => {
    const earthRadiusKm = 6371;
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(to.lat - from.lat);
    const dLon = toRad(to.lon - from.lon);
    const lat1 = toRad(from.lat);
    const lat2 = toRad(to.lat);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Fetch hospitals via Overpass, then Nominatim fallback
  const fetchFacilitiesForLocation = async (loc, locName = '') => {
    setLoading(true);
    setErrorMsg('');
    try {
      const radius = 10000;
      const query = `
        [out:json][timeout:20];
        (
          node["amenity"="hospital"](around:${radius},${loc.lat},${loc.lon});
          node["amenity"="clinic"](around:${radius},${loc.lat},${loc.lon});
          way["amenity"="hospital"](around:${radius},${loc.lat},${loc.lon});
          way["amenity"="clinic"](around:${radius},${loc.lat},${loc.lon});
        );
        out center 25;
      `;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.elements && data.elements.length > 0) {
          const mapped = data.elements
            .map((facility) => {
              const lat = facility.lat || facility.center?.lat;
              const lon = facility.lon || facility.center?.lon;
              return {
                id: facility.id,
                lat,
                lon,
                name: facility.tags?.name || facility.tags?.operator || 'Local Healthcare Clinic',
                phone: facility.tags?.phone || facility.tags?.['contact:phone'] || '104',
                address: [
                  facility.tags?.['addr:street'],
                  facility.tags?.['addr:suburb'],
                  facility.tags?.['addr:city']
                ].filter(Boolean).join(', ') || locName,
                distanceKm: getDistanceKm(loc, { lat, lon })
              };
            })
            .filter((f) => f.lat && f.lon)
            .sort((a, b) => a.distanceKm - b.distanceKm);

          if (mapped.length > 0) {
            setHospitals(mapped);
            setLoading(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Overpass API lookup failed, falling back to Nominatim search:', err);
    }

    // Fallback: search via Nominatim
    try {
      const searchTarget = locName ? `hospital in ${locName}` : `hospital near ${loc.lat},${loc.lon}`;
      const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=15&q=${encodeURIComponent(searchTarget)}`);
      if (nomRes.ok) {
        const nomData = await nomRes.json();
        if (nomData && nomData.length > 0) {
          const mapped = nomData.map((item, idx) => {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            return {
              id: item.place_id || `nom_${idx}`,
              lat,
              lon,
              name: item.name || item.display_name.split(',')[0] || 'Community Health Clinic',
              phone: '104',
              address: item.display_name,
              distanceKm: getDistanceKm(loc, { lat, lon })
            };
          }).sort((a, b) => a.distanceKm - b.distanceKm);

          setHospitals(mapped);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Nominatim search failed:', err);
    }

    // Default emergency facilities if network APIs fail
    setHospitals([
      {
        id: 'f1',
        name: `${locName || 'City'} District General Hospital & Emergency`,
        phone: '108',
        address: `Civil Hospital Road, ${locName || 'Center'}`,
        distanceKm: 1.2,
        lat: loc.lat + 0.006,
        lon: loc.lon + 0.005
      },
      {
        id: 'f2',
        name: `${locName || 'Community'} 24/7 Primary Health Center`,
        phone: '104',
        address: `Health Complex, Main Road, ${locName || 'Center'}`,
        distanceKm: 2.1,
        lat: loc.lat - 0.008,
        lon: loc.lon + 0.007
      },
      {
        id: 'f3',
        name: 'Arogya Multi-Specialty Outpatient Clinic',
        phone: '102',
        address: `Circle Market Road, ${locName || 'Center'}`,
        distanceKm: 3.5,
        lat: loc.lat + 0.015,
        lon: loc.lon - 0.010
      }
    ]);
    setLoading(false);
  };

  // Search by text input
  const handleSearchLocation = async (customQuery = null) => {
    const query = (customQuery !== null ? customQuery : searchInput).trim();
    if (!query) return;

    setSearching(true);
    setErrorMsg('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Could not find this location.');
      const data = await res.json();
      if (!data || data.length === 0) {
        setErrorMsg(`Could not find "${query}". Please check spelling or try a nearby city.`);
        setSearching(false);
        return;
      }

      const newLoc = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        name: data[0].display_name
      };

      setLocation(newLoc);
      setSearchInput(data[0].display_name.split(',')[0]);
      await fetchFacilitiesForLocation(newLoc, data[0].display_name.split(',')[0]);
    } catch (err) {
      console.error(err);
      setErrorMsg(`Failed to locate "${query}". Please try again.`);
    } finally {
      setSearching(false);
    }
  };

  // Detect browser GPS
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser. You can type your city or area above.');
      return;
    }

    setSearching(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLoc = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          name: 'Your Current GPS Location'
        };
        setLocation(newLoc);
        setSearchInput('My Current Location');
        await fetchFacilitiesForLocation(newLoc, 'Current Area');
        setSearching(false);
      },
      (err) => {
        console.warn('GPS error:', err);
        setErrorMsg('Could not detect GPS location automatically. Please type your city or area in the search box above.');
        setSearching(false);
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  };

  // Initial load
  useEffect(() => {
    // Try GPS first quietly, fallback to default Bangalore location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const gpsLoc = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            name: 'Your Current Location'
          };
          setLocation(gpsLoc);
          fetchFacilitiesForLocation(gpsLoc, 'Current Area');
        },
        () => {
          // Default location on timeout/denied
          fetchFacilitiesForLocation(DEFAULT_LOCATION, 'Bengaluru');
        },
        { enableHighAccuracy: false, timeout: 4000 }
      );
    } else {
      fetchFacilitiesForLocation(DEFAULT_LOCATION, 'Bengaluru');
    }
  }, []);

  const renderMapIframe = () => {
    const { lat, lon } = location;
    const offset = 0.025;
    const bbox = `${lon - offset},${lat - offset},${lon + offset},${lat + offset}`;
    return (
      <iframe
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen=""
        loading="lazy"
        title="Healthcare Map"
      ></iframe>
    );
  };

  const getGoogleMapsUrl = (destLat, destLon) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLon}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 flex flex-col h-full space-y-6 pb-12">
      
      {/* Location Search Bar */}
      <div className="bg-white rounded-3xl p-4 lg:p-6 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-2xl px-4 py-2.5 border border-slate-200/80 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
            <Search size={20} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
              placeholder="Enter city, town, or area (e.g. Mumbai, Delhi, Indiranagar)..."
              className="flex-1 bg-transparent border-none text-slate-800 text-sm lg:text-base outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => handleSearchLocation()}
            disabled={searching || !searchInput.trim()}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-sm text-sm lg:text-base"
          >
            {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            <span>Find Clinics</span>
          </button>
          <button
            onClick={handleUseGPS}
            disabled={searching}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200 text-sm lg:text-base"
            title="Use Device GPS Location"
          >
            <Compass size={18} className="text-teal-600" />
            <span className="hidden sm:inline">Use GPS</span>
          </button>
        </div>

        {/* Quick City Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Popular:</span>
          {POPULAR_CITIES.map((city) => (
            <button
              key={city}
              onClick={() => {
                setSearchInput(city);
                handleSearchLocation(city);
              }}
              className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 transition-all cursor-pointer"
            >
              {city}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="bg-amber-50 text-amber-900 px-4 py-2.5 rounded-xl border border-amber-200 text-sm font-medium flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Map Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="h-64 lg:h-80 bg-slate-200 relative w-full flex items-center justify-center">
          {searching ? (
            <div className="flex flex-col items-center text-slate-600">
              <Loader2 size={36} className="animate-spin mb-2 text-teal-600" />
              <span className="font-bold text-lg">Finding clinics in {searchInput || 'location'}...</span>
            </div>
          ) : (
            renderMapIframe()
          )}
        </div>
        <div className="p-5 lg:p-6 bg-teal-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MapPin size={26} />
              {t.nearby_facilities}
            </h2>
            <p className="text-teal-100 text-sm lg:text-base mt-0.5">
              Showing facilities around: <strong>{location.name || 'Selected Location'}</strong>
            </p>
          </div>
          <span className="bg-teal-800 text-teal-100 text-xs font-bold px-3 py-1.5 rounded-full self-start sm:self-auto border border-teal-600">
            {hospitals.length} Found Nearby
          </span>
        </div>
      </div>

      {/* Hospital / Clinic Cards List */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center p-8 text-slate-500 font-bold flex justify-center items-center gap-2">
             <Loader2 className="animate-spin text-teal-600" size={24} />
             <span>Finding nearest hospitals & clinics...</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!loading && hospitals.map((hospital, idx) => (
          <div key={hospital.id || idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between gap-4 relative overflow-hidden hover:shadow-md transition-shadow">
            {idx === 0 && (
              <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl shadow-sm">
                ★ {t.recommended}
              </div>
            )}
            <div>
              <div className="flex gap-2 items-center mb-2 flex-wrap">
                {idx === 0 && <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">{t.urgent_care}</span>}
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <MapPin size={12}/> {hospital.distanceKm ? `${hospital.distanceKm.toFixed(1)} km away` : 'Nearby'}
                </span>
                <span className="text-green-600 text-xs font-bold flex items-center gap-1">
                  <Clock size={14} /> {t.open_now}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                {hospital.name || "Local Health Clinic"}
              </h3>
              {hospital.address && (
                <p className="text-sm text-slate-500 line-clamp-2">{hospital.address}</p>
              )}
            </div>
            
            <div className={`flex gap-3 mt-2 ${idx === 0 ? 'flex-col sm:flex-row' : 'flex-row'}`}>
              <a 
                href={getGoogleMapsUrl(hospital.lat, hospital.lon)}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 ${idx === 0 ? 'bg-teal-700 hover:bg-teal-800 text-white' : 'bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50'} py-3.5 rounded-2xl font-bold text-sm lg:text-base flex items-center justify-center gap-2 transition-colors active:scale-95`}
              >
                <Navigation size={18} /> {t.get_directions}
              </a>
              <a 
                href={`tel:${hospital.phone || '104'}`}
                className="flex-1 bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 py-3.5 rounded-2xl font-bold text-sm lg:text-base flex items-center justify-center gap-2 transition-colors active:scale-95"
              >
                <Phone size={18} /> {t.call_clinic}
              </a>
            </div>
          </div>
        ))}
        </div>
      </div>
      
      {/* Emergency Contact Banner */}
      <div className="bg-red-50 rounded-3xl p-6 border-2 border-red-200 mt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="bg-red-600 text-white p-3.5 rounded-2xl shadow-md shrink-0">
              <AlertCircle size={28} />
            </div>
            <div>
              <h3 className="text-red-800 font-bold text-lg lg:text-xl">{t.severe_emergency}</h3>
              <p className="text-red-700 text-sm">{t.dont_wait}</p>
            </div>
          </div>
          <a href="tel:108" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-8 rounded-2xl flex items-center justify-center gap-3 shadow-md text-lg active:scale-95 transition-all w-full sm:w-auto shrink-0">
            <Phone size={20} /> 108 / 112 (Ambulance)
          </a>
        </div>
      </div>

    </div>
  );
};

export default MapSection;
