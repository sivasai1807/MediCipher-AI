
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { analyzePrescription, fetchNearbyHealthCenters } from './services/geminiService';
import { fileToBase64, getCurrentLocation, getHealthTip } from './utils';
import { PrescriptionResponse, LocationState, LanguageCode, AppView, ExpiryItem, NearbyPlace } from './types';

declare const L: any;

// --- UI Translation Dictionary ---
const UI_TEXT: Record<LanguageCode, any> = {
  en: { 
    scan: 'Prescription Scan', expiry: 'Expiry Tracker', map: 'Health Locator', 
    upload: 'Upload Prescription', analyze: 'Analyze Now', safety: 'Safety Notice',
    nearby: 'Medical Facilities', add: 'Track Medicine', name: 'Name', date: 'Expiry',
    placeholder: 'e.g. Aspirin', notes: 'Medical Advice', extracted: 'Deciphered Results',
    change: 'Change Photo', tip: 'Daily Wellness Tip', clear: 'Image must be clear and flat.'
  },
  es: { 
    scan: 'Escaneo de Receta', expiry: 'Vencimiento', map: 'Localizador', 
    upload: 'Subir Receta', analyze: 'Analizar Ahora', safety: 'Aviso de Seguridad',
    nearby: 'Instalaciones Médicas', add: 'Seguir Medicina', name: 'Nombre', date: 'Vencimiento',
    placeholder: 'ej. Aspirina', notes: 'Consejo Médico', extracted: 'Resultados Descifrados',
    change: 'Cambiar Foto', tip: 'Consejo de Salud', clear: 'La imagen debe ser clara y plana.'
  },
  hi: { 
    scan: 'नुस्खा स्कैन', expiry: 'समाप्ति ट्रैकर', map: 'स्वास्थ्य खोजक', 
    upload: 'नुस्खा अपलोड करें', analyze: 'अभी विश्लेषण करें', safety: 'सुरक्षा सूचना',
    nearby: 'चिकित्सा सुविधाएं', add: 'दवा जोड़ें', name: 'नाम', date: 'समाप्ति',
    placeholder: 'उदा. एस्पिरिन', notes: 'चिकित्सा सलाह', extracted: 'परिणाम',
    change: 'फोटो बदलें', tip: 'स्वास्थ्य टिप', clear: 'छवि स्पष्ट और सीधी होनी चाहिए।'
  },
  fr: { 
    scan: 'Scan Ordonnance', expiry: 'Suivi Expiration', map: 'Localisateur Santé', 
    upload: 'Télécharger', analyze: 'Analyser Maintenant', safety: 'Sécurité',
    nearby: 'Établissements', add: 'Ajouter', name: 'Nom', date: 'Expiration',
    placeholder: 'ex. Aspirine', notes: 'Conseils', extracted: 'Résultats',
    change: 'Changer', tip: 'Conseil Santé', clear: 'L\'image doit être claire.'
  },
  ar: { 
    scan: 'مسح الوصفة', expiry: 'تتبع الانتهاء', map: 'موقع الصحة', 
    upload: 'تحميل الوصفة', analyze: 'تحليل الآن', safety: 'تنبيه',
    nearby: 'المرافق الطبية', add: 'تتبع الدواء', name: 'الاسم', date: 'الانتهاء',
    placeholder: 'مثال: أسبرين', notes: 'نصيحة طبية', extracted: 'النتائج',
    change: 'تغيير الصورة', tip: 'نصيحة اليوم', clear: 'يجب أن تكون الصورة واضحة.'
  },
  de: { 
    scan: 'Rezept Scan', expiry: 'Haltbarkeit', map: 'Gesundheitssuche', 
    upload: 'Hochladen', analyze: 'Jetzt Analysieren', safety: 'Sicherheit',
    nearby: 'Einrichtungen', add: 'Verfolgen', name: 'Name', date: 'Ablauf',
    placeholder: 'z.B. Aspirin', notes: 'Ärztlicher Rat', extracted: 'Ergebnisse',
    change: 'Foto ändern', tip: 'Gesundheitstipp', clear: 'Bild muss klar sein.'
  }
};

// --- Sub-Modules ---

const HealthMap: React.FC<{ userLoc: LocationState; lang: LanguageCode }> = ({ userLoc, lang }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [data, setData] = useState<{pharmacies: any[], hospitals: any[]}>({pharmacies: [], hospitals: []});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([userLoc.lat || 0, userLoc.lng || 0], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);
    }
    if (userLoc.lat && userLoc.lng && data.pharmacies.length === 0) {
      setLoading(true);
      fetchNearbyHealthCenters({ lat: userLoc.lat, lng: userLoc.lng }, lang)
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [userLoc, lang]);

  useEffect(() => {
    if (mapInstance.current && (data.pharmacies.length > 0 || data.hospitals.length > 0)) {
      [...data.pharmacies, ...data.hospitals].forEach(p => {
        if (p.lat && p.lng) {
          const isHosp = p.name.toLowerCase().includes('hospital');
          const color = isHosp ? 'red' : 'green';
          L.circleMarker([p.lat, p.lng], { color, radius: 8 }).addTo(mapInstance.current).bindPopup(p.name);
        }
      });
    }
  }, [data]);

  return (
    <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-6 px-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{UI_TEXT[lang].nearby}</h2>
          <p className="text-sm text-slate-400 font-medium">Real-time facility mapping</p>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase text-slate-500">Live Grounding</span>
        </div>
      </div>
      <div className="h-[600px] w-full rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-inner relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
             <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
};

const CabinetModule: React.FC<{ lang: LanguageCode }> = ({ lang }) => {
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const t = UI_TEXT[lang];

  const handleAdd = () => {
    if (!name || !date) return;
    const exp = new Date(date);
    const now = new Date();
    const diff = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
    let status: any = 'safe';
    if (diff < 0) status = 'expired';
    else if (diff < 30) status = 'warning';
    
    setItems([{ id: Date.now().toString(), name, date, status }, ...items]);
    setName(''); setDate('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
        <h2 className="text-2xl font-black text-slate-900 mb-8">{t.expiry}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder={t.placeholder} 
            className="p-5 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium" 
          />
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            className="p-5 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium" 
          />
          <button onClick={handleAdd} className="bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest">{t.add}</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <div key={item.id} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${item.status === 'expired' ? 'bg-red-500 shadow-red-100' : item.status === 'warning' ? 'bg-orange-500 shadow-orange-100' : 'bg-green-500 shadow-green-100'}`}>
                  <i className="fa-solid fa-pills"></i>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 leading-tight">{item.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{t.date}: {item.date}</p>
                </div>
              </div>
              <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-30">
              <i className="fa-solid fa-box-archive text-5xl mb-4"></i>
              <p className="font-bold text-lg">Your medicine cabinet is empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('prescriptions');
  const [lang, setLang] = useState<LanguageCode>('en');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrescriptionResponse | null>(null);
  const [location, setLocation] = useState<LocationState>({ lat: null, lng: null, error: null });
  const [tip, setTip] = useState('');

  useEffect(() => {
    setTip(getHealthTip());
    getCurrentLocation()
      .then(loc => setLocation({ ...loc, error: null }))
      .catch(e => setLocation(prev => ({ ...prev, error: e.message })));
  }, []);

  const t = UI_TEXT[lang];

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const b64 = await fileToBase64(file);
      const res = await analyzePrescription(b64, location, lang);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 selection:bg-slate-900 selection:text-white">
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-[1000]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl">
              <i className="fa-solid fa-briefcase-medical text-lg"></i>
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">MediCipher</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
              <i className="fa-solid fa-location-arrow text-slate-400 text-xs"></i>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{location.lat ? 'Location Sync' : 'Static Mode'}</span>
            </div>
            <select 
              value={lang} 
              onChange={e => setLang(e.target.value as LanguageCode)}
              className="bg-white border-2 border-slate-100 rounded-2xl px-5 py-2 text-sm font-black outline-none hover:border-slate-300 transition-all cursor-pointer"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="hi">हिन्दी</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-12">
        {/* Module Nav */}
        <nav className="flex items-center bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-100 mb-12 w-fit mx-auto sticky top-24 z-[999] backdrop-blur-md">
          <button onClick={() => setView('prescriptions')} className={`px-8 py-3.5 rounded-[2rem] text-sm font-black transition-all uppercase tracking-widest ${view === 'prescriptions' ? 'bg-slate-900 text-white shadow-2xl shadow-slate-300' : 'text-slate-400 hover:text-slate-900'}`}>
            {t.scan}
          </button>
          <button onClick={() => setView('expiry')} className={`px-8 py-3.5 rounded-[2rem] text-sm font-black transition-all uppercase tracking-widest ${view === 'expiry' ? 'bg-slate-900 text-white shadow-2xl shadow-slate-300' : 'text-slate-400 hover:text-slate-900'}`}>
            {t.expiry}
          </button>
          <button onClick={() => setView('map')} className={`px-8 py-3.5 rounded-[2rem] text-sm font-black transition-all uppercase tracking-widest ${view === 'map' ? 'bg-slate-900 text-white shadow-2xl shadow-slate-300' : 'text-slate-400 hover:text-slate-900'}`}>
            {t.map}
          </button>
        </nav>

        {/* Content */}
        {view === 'prescriptions' && (
          <div className="space-y-10">
            {!result ? (
              <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500">
                <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 text-center relative overflow-hidden">
                  <div className="mb-10">
                    <h2 className="text-4xl font-black text-slate-900 mb-3">{t.upload}</h2>
                    <p className="text-slate-400 font-medium">{t.clear}</p>
                  </div>
                  
                  <label className="block w-full h-96 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 cursor-pointer group hover:bg-slate-50 transition-all overflow-hidden relative">
                    {preview ? (
                      <img src={preview} className="w-full h-full object-contain p-6" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-camera-retro text-slate-400 text-3xl"></i>
                        </div>
                        <span className="text-slate-400 font-black uppercase tracking-widest text-xs">Capture Prescription</span>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={e => {
                      if (e.target.files?.[0]) {
                        setFile(e.target.files[0]);
                        setPreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }} />
                  </label>

                  <button 
                    onClick={handleProcess} 
                    disabled={!file || loading}
                    className={`w-full mt-10 py-6 rounded-[2.5rem] font-black text-xl text-white shadow-2xl transition-all uppercase tracking-[0.2em] ${!file || loading ? 'bg-slate-300' : 'bg-slate-900 hover:bg-black active:scale-[0.98]'}`}
                  >
                    {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : t.analyze}
                  </button>
                </div>

                <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 opacity-10 translate-x-8 -translate-y-8">
                     <i className="fa-solid fa-notes-medical text-[12rem]"></i>
                   </div>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">{t.tip}</h4>
                   <p className="text-2xl font-bold leading-snug max-w-lg">{tip}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-10 animate-in slide-in-from-bottom-10 duration-700">
                <div className="flex items-center justify-between px-6">
                  <button onClick={() => setResult(null)} className="group flex items-center gap-4 text-slate-400 hover:text-slate-900 font-black transition-all uppercase tracking-widest text-xs">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-all border border-slate-100">
                      <i className="fa-solid fa-arrow-left"></i>
                    </div>
                    New Scan
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confidence Score</p>
                       <p className="text-sm font-black text-blue-600">{result.overall_confidence}</p>
                    </div>
                  </div>
                </div>

                {/* Emergency Warnings Only */}
                {result.warnings.length > 0 && (
                  <div className="bg-red-600 text-white p-8 rounded-[3rem] shadow-xl flex items-start gap-6 animate-pulse-slow">
                    <div className="bg-white/20 p-4 rounded-3xl shrink-0">
                      <i className="fa-solid fa-triangle-exclamation text-3xl"></i>
                    </div>
                    <div>
                      <h4 className="font-black uppercase tracking-[0.2em] text-xs mb-2 opacity-80">{t.safety}</h4>
                      {result.warnings.map((w, i) => <p key={i} className="text-lg font-bold leading-tight">{w}</p>)}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-8 space-y-10">
                    <section className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm">
                      <h3 className="text-3xl font-black mb-10 text-slate-900 border-b border-slate-50 pb-6">{t.extracted}</h3>
                      <div className="grid gap-8">
                        {result.medicines.map((med, i) => (
                          <div key={i} className="group p-8 bg-slate-50 rounded-[3rem] border border-slate-100 hover:border-slate-300 transition-all">
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <h4 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{med.name}</h4>
                                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">{med.purpose}</p>
                              </div>
                              <span className="text-[10px] font-black px-4 py-1.5 bg-white rounded-full border border-slate-200 text-slate-500 uppercase tracking-widest shadow-sm">Accuracy: {med.confidence}</span>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-[10px] font-black text-slate-500 mb-8 uppercase tracking-[0.15em]">
                              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>{med.dosage}</div>
                              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>{med.timing}</div>
                              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>{med.food_relation}</div>
                              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>{med.duration}</div>
                            </div>
                            <div className="bg-white p-6 rounded-[2rem] text-sm font-bold text-slate-700 border border-slate-100 shadow-inner italic leading-relaxed">
                              "{med.how_to_use}"
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                  
                  <div className="lg:col-span-4 space-y-10">
                    <section className="bg-slate-900 text-white p-10 rounded-[4rem] shadow-2xl relative overflow-hidden">
                      <div className="absolute bottom-0 right-0 opacity-5 translate-x-10 translate-y-10">
                        <i className="fa-solid fa-stethoscope text-[15rem]"></i>
                      </div>
                      <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                         <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-sm shadow-lg shadow-blue-500/50">
                            <i className="fa-solid fa-user-doctor"></i>
                         </div>
                         {t.notes}
                      </h3>
                      <p className="text-blue-100 text-lg leading-relaxed mb-8 font-medium italic opacity-90">"{result.doctor_notes}"</p>
                      <div className="pt-6 border-t border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] leading-normal">
                         System: Medical OCR v2.5
                         <br/>Deciphered & Translated
                      </div>
                    </section>
                    
                    <section className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Handwriting Trace</h3>
                      <div className="text-[11px] font-mono font-medium text-slate-400 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 break-words whitespace-pre-wrap leading-relaxed">
                        {result.clean_prescription_text}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'expiry' && <CabinetModule lang={lang} />}

        {view === 'map' && <HealthMap userLoc={location} lang={lang} />}
      </main>

      <style>{`
        .animate-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .85; } }
        .leaflet-container { border-radius: 2.5rem !important; }
        .leaflet-popup-content-wrapper { border-radius: 1.5rem !important; padding: 0.25rem !important; font-weight: 700; }
      `}</style>
    </div>
  );
};

export default App;
