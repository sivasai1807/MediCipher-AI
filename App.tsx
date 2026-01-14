
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { analyzePrescription, fetchNearbyHealthCenters } from './services/geminiService';
import { fileToBase64, getCurrentLocation, getHealthTip } from './utils';
import { PrescriptionResponse, LocationState, LanguageCode, AppView, ExpiryItem, NearbyPlace } from './types';

declare const L: any;

// --- Expanded UI Translation Dictionary ---
const UI_TEXT: Record<LanguageCode, any> = {
  en: { 
    scan: 'Prescription Scan', expiry: 'Expiry Tracker', map: 'Health Locator', 
    upload: 'Upload Prescription', analyze: 'Analyze Now', safety: 'Safety Notice',
    nearby: 'Medical Facilities', add: 'Track Medicine', name: 'Name', date: 'Expiry',
    placeholder: 'e.g. Aspirin', notes: 'Medical Advice', extracted: 'Deciphered Results',
    change: 'Change Photo', tip: 'Daily Wellness Tip', clear: 'Image must be clear and flat.',
    expiredAlert: 'Alert: This medicine is expired or expires today! Do not consume.',
    expiredTitle: 'Expired Medication', getDirections: 'Get Directions'
  },
  te: { 
    scan: 'ప్రిస్క్రిప్షన్ స్కాన్', expiry: 'గడువు ట్రాకర్', map: 'ఆరోగ్య స్థానం', 
    upload: 'ప్రిస్క్రిప్షన్‌ను అప్‌లోడ్ చేయండి', analyze: 'ఇప్పుడే విశ్లేషించండి', safety: 'భద్రతా నోటీసు',
    nearby: 'వైద్య సౌకర్యాలు', add: 'మందులను ట్రాక్ చేయండి', name: 'పేరు', date: 'గడువు తేదీ',
    placeholder: 'ఉదా. ఆస్పిరిన్', notes: 'వైద్య సలహా', extracted: 'ఫలితాలు',
    change: 'ఫోటో మార్చండి', tip: 'రోజువారీ ఆరోగ్యం', clear: 'చిత్రం స్పష్టంగా మరియు సమాంతరంగా ఉండాలి.',
    expiredAlert: 'హెచ్చరిక: ఈ మందు గడువు ముగిసింది లేదా ఈరోజే ముగుస్తుంది! వాడకండి.',
    expiredTitle: 'గడువు ముగిసిన మందు', getDirections: 'దారి చూపు'
  },
  hi: { 
    scan: 'नुस्खा स्कैन', expiry: 'समाप्ति ట్రాకర్', map: 'स्वास्थ्य खोजक', 
    upload: 'नुस्खा अपलोड करें', analyze: 'अभी विश्लेषण करें', safety: 'सुरक्षा सूचना',
    nearby: 'चिकित्सा सुविधाएं', add: 'दवा जोड़ें', name: 'नाम', date: 'समाप्ति',
    placeholder: 'उदा. एस्पिरिन', notes: 'चिकित्सा सलाह', extracted: 'परिणाम',
    change: 'फोटो बदलें', tip: 'स्वास्थ्य टिप', clear: 'छवि स्पष्ट और सीधी होनी चाहिए।',
    expiredAlert: 'चेतावनी: यह दवा समाप्त हो चुकी है या आज समाप्त हो रही है! सेवन न करें।',
    expiredTitle: 'समय समाप्त दवा', getDirections: 'दिशा-निर्देश प्राप्त करें'
  },
  es: { 
    scan: 'Escaneo de Receta', expiry: 'Vencimiento', map: 'Localizador', 
    upload: 'Subir Receta', analyze: 'Analizar Ahora', safety: 'Aviso de Seguridad',
    nearby: 'Instalaciones Médicas', add: 'Seguir Medicina', name: 'Nombre', date: 'Vencimiento',
    placeholder: 'ej. Aspirina', notes: 'Consejo Médico', extracted: 'Resultados Descifrados',
    change: 'Cambiar Foto', tip: 'Consejo de Salud', clear: 'La imagen debe ser clara y plana.',
    expiredAlert: 'Alerta: ¡Esta medicina ha expirado o expira hoy! No consumir.',
    expiredTitle: 'Medicamento Expirado', getDirections: 'Obtener Direcciones'
  },
  fr: { 
    scan: 'Scan Ordonnance', expiry: 'Suivi Expiration', map: 'Localisateur Santé', 
    upload: 'Télécharger', analyze: 'Analyser Maintenant', safety: 'Sécurité',
    nearby: 'Établissements', add: 'Ajouter', name: 'Nom', date: 'Expiration',
    placeholder: 'ex. Aspirine', notes: 'Conseils', extracted: 'Résultats',
    change: 'Changer', tip: 'Conseil Santé', clear: 'L\'image deve essere chiara.',
    expiredAlert: 'Alerte: ce médicament est périmé ou expire aujourd\'hui ! Ne pas consommer.',
    expiredTitle: 'Médicament Périmé', getDirections: 'Obtenir l\'itinéraire'
  },
  ar: { 
    scan: 'مسح الوصفة', expiry: 'تتبع الانتهاء', map: 'موقع الصحة', 
    upload: 'تحميل الوصفة', analyze: 'تحليل الآن', safety: 'تنبيه',
    nearby: 'المرافق الطبية', add: 'تتبع الدواء', name: 'الاسم', date: 'الانتهاء',
    placeholder: 'مثال: أسبرين', notes: 'نصيحة طبية', extracted: 'النتائج',
    change: 'تحليل الصورة', tip: 'نصيحة اليوم', clear: 'يجب أن تكون الصورة واضحة.',
    expiredAlert: 'تنبيه: هذا الدواء منتهي الصلاحية أو ينتهي اليوم! لا تستهلكه.',
    expiredTitle: 'دواء منتهي الصلاحية', getDirections: 'الحصول على الاتجاهات'
  },
  de: { 
    scan: 'Rezept Scan', expiry: 'Haltbarkeit', map: 'Gesundheitssuche', 
    upload: 'Hochladen', analyze: 'Jetzt Analysieren', safety: 'Sicherheit',
    nearby: 'Einrichtungen', add: 'Verfolgen', name: 'Name', date: 'Ablauf',
    placeholder: 'z.B. Paracetamol', notes: 'Ärztlicher Rat', extracted: 'Ergebnisse',
    change: 'Foto ändern', tip: 'Gesundheitstipp', clear: 'Bild muss klar sein.',
    expiredAlert: 'Warnung: Dieses Medikament ist abgelaufen oder läuft heute ab! Nicht konsumieren.',
    expiredTitle: 'Abgelaufenes Medikament', getDirections: 'Route berechnen'
  },
  zh: { scan: '处方扫描', expiry: '到期追踪', map: '健康定位', upload: '上传处方', analyze: '立即分析', safety: '安全须知', nearby: '医疗设施', add: '添加药物', name: '名称', date: '到期日期', placeholder: '如 阿司匹林', notes: '医生建议', extracted: '识别结果', change: '更改照片', tip: '健康提示', clear: '图片必须清晰且平整。', expiredAlert: '警告：此药已过期！请勿服用。', expiredTitle: '过期药物', getDirections: '获取路线' },
  ja: { scan: '処方箋スキャン', expiry: '期限管理', map: 'ヘルスロケーター', upload: '処方箋をアップロード', analyze: '分析開始', safety: '安全上の注意', nearby: '医療施設', add: '薬を追加', name: '名前', date: '使用期限', placeholder: '例：アスピリン', notes: '医師のアドバイス', extracted: '結果', change: '写真を変更', tip: '健康のヒント', clear: '画像は鮮明で平らである必要があります。', expiredAlert: '警告：この薬は期限切れです！服用しないでください。', expiredTitle: '期限切れの薬', getDirections: 'ルートを検索' },
  pt: { scan: 'Digitalizar Receita', expiry: 'Validade', map: 'Localizador', upload: 'Enviar Receita', analyze: 'Analisar Agora', safety: 'Aviso de Segurança', nearby: 'Instalações', add: 'Adicionar', name: 'Nome', date: 'Validade', placeholder: 'ex. Aspirina', notes: 'Conselhos', extracted: 'Resultados', change: 'Alterar', tip: 'Dica de Saúde', clear: 'A imagem deve estar clara.', expiredAlert: 'Alerta: Este medicamento está vencido ou vence hoje! Não consumir.', expiredTitle: 'Medicamento Vencido', getDirections: 'Obter Direções' },
  it: { scan: 'Scansione Ricetta', expiry: 'Scadenza', map: 'Localizzatore', upload: 'Carica Ricetta', analyze: 'Analizza Ora', safety: 'Sicurezza', nearby: 'Strutture', add: 'Aggiungi', name: 'Nome', date: 'Scadenza', placeholder: 'es. Aspirina', notes: 'Consigli', extracted: 'Risultati', change: 'Cambia', tip: 'Consiglio Salute', clear: 'L\'immagine deve essere nitida.', expiredAlert: 'Avviso: questo medicinale è scaduto o scade oggi! Non consumare.', expiredTitle: 'Farmaco Scaduto', getDirections: 'Ottieni Indicazioni' }
};

// --- Sub-Modules ---

const CustomAlert: React.FC<{ message: string; title: string; onClose: () => void }> = ({ message, title, onClose }) => (
  <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
    <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center border border-red-100 animate-in zoom-in duration-300">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <i className="fa-solid fa-calendar-xmark text-2xl"></i>
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 font-medium mb-8 leading-relaxed">{message}</p>
      <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all">OK</button>
    </div>
  </div>
);

const HealthMap: React.FC<{ userLoc: LocationState; lang: LanguageCode }> = ({ userLoc, lang }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [data, setData] = useState<{pharmacies: any[], hospitals: any[]}>({pharmacies: [], hospitals: []});
  const [loading, setLoading] = useState(false);
  const t = UI_TEXT[lang];

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      const initialLat = userLoc.lat || 0;
      const initialLng = userLoc.lng || 0;
      mapInstance.current = L.map(mapRef.current).setView([initialLat, initialLng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);

      // User Position Marker
      if (userLoc.lat && userLoc.lng) {
        L.marker([userLoc.lat, userLoc.lng], {
          icon: L.divIcon({
            className: 'user-loc-icon',
            html: `<div class="w-5 h-5 bg-blue-600 rounded-full border-4 border-white shadow-xl animate-pulse"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(mapInstance.current).bindPopup("<b>You are here</b>");
      }
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
          const isHosp = p.name.toLowerCase().includes('hospital') || p.name.toLowerCase().includes('medical center');
          const color = isHosp ? '#ef4444' : '#22c55e';
          
          const popupContent = document.createElement('div');
          popupContent.className = 'p-3 flex flex-col gap-3 min-w-[180px]';
          popupContent.innerHTML = `
            <div class="font-black text-slate-900 text-sm mb-1">${p.name}</div>
            <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${isHosp ? 'Hospital' : 'Pharmacy'}</div>
            <button class="nav-btn w-full bg-slate-900 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
              <i class="fa-solid fa-location-arrow"></i> ${t.getDirections}
            </button>
          `;

          // Fix: Casting Element to HTMLElement to access the onclick property in TypeScript
          const btn = popupContent.querySelector('.nav-btn') as HTMLElement | null;
          if (btn) {
            btn.onclick = () => {
              const url = `https://www.google.com/maps/dir/?api=1&origin=${userLoc.lat},${userLoc.lng}&destination=${p.lat},${p.lng}&travelmode=driving`;
              window.open(url, '_blank');
            };
          }

          L.circleMarker([p.lat, p.lng], { 
            color, 
            fillColor: color,
            fillOpacity: 0.9,
            radius: 9,
            weight: 2,
            stroke: true
          }).addTo(mapInstance.current).bindPopup(popupContent);
        }
      });
    }
  }, [data, userLoc, t]);

  return (
    <div className="bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-6 px-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{t.nearby}</h2>
          <p className="text-sm text-slate-400 font-medium">Click markers for navigation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Pharmacy
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-600 bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Hospital
          </div>
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
  const [items, setItems] = useState<ExpiryItem[]>(() => {
    const saved = localStorage.getItem('medi_cabinet');
    return saved ? JSON.parse(saved) : [];
  });
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [showAlert, setShowAlert] = useState<{show: boolean, msg: string}>({show: false, msg: ''});
  const t = UI_TEXT[lang];

  useEffect(() => {
    localStorage.setItem('medi_cabinet', JSON.stringify(items));
  }, [items]);

  const handleAdd = () => {
    if (!name || !date) return;
    const exp = new Date(date);
    const now = new Date();
    // Normalize to start of day for comparison
    now.setHours(0,0,0,0);
    exp.setHours(0,0,0,0);

    const diff = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
    let status: any = 'safe';
    
    // Explicitly check if expired or same day
    if (diff <= 0) {
      status = 'expired';
      setShowAlert({show: true, msg: t.expiredAlert});
    } else if (diff < 30) {
      status = 'warning';
    }
    
    setItems([{ id: Date.now().toString(), name, date, status }, ...items]);
    setName(''); setDate('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {showAlert.show && <CustomAlert title={t.expiredTitle} message={showAlert.msg} onClose={() => setShowAlert({show: false, msg: ''})} />}
      
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
        <h2 className="text-2xl font-black text-slate-900 mb-8">{t.expiry}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">{t.name}</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder={t.placeholder} 
              className="w-full p-5 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">{t.date}</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="w-full p-5 bg-slate-50 rounded-2xl border-0 ring-1 ring-slate-100 focus:ring-2 focus:ring-slate-900 transition-all outline-none font-medium" 
            />
          </div>
          <div className="flex items-end">
            <button onClick={handleAdd} className="w-full h-[60px] bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest">
              <i className="fa-solid fa-plus mr-2"></i> {t.add}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <div key={item.id} className="p-6 bg-white rounded-[2.5rem] border border-slate-100 flex items-center justify-between group shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${item.status === 'expired' ? 'bg-red-500 shadow-red-100' : item.status === 'warning' ? 'bg-orange-500 shadow-orange-100' : 'bg-green-500 shadow-green-100'}`}>
                  <i className="fa-solid fa-pills text-xl"></i>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 leading-tight text-lg">{item.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {item.status === 'expired' ? '🔴 Expired' : item.status === 'warning' ? '🟠 Near Expiry' : '🟢 Safe'} • {item.date}
                  </p>
                </div>
              </div>
              <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all">
                <i className="fa-solid fa-trash-can"></i>
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-20">
              <i className="fa-solid fa-box-archive text-6xl mb-4"></i>
              <p className="font-black text-xl">Medicine Cabinet Empty</p>
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
      {/* Dynamic Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-[1000]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => {setResult(null); setView('prescriptions');}}>
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110">
              <i className="fa-solid fa-microscope text-lg"></i>
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">MediCipher <span className="text-blue-600">AI</span></h1>
          </div>

          <div className="flex items-center gap-6">
            <select 
              value={lang} 
              onChange={e => setLang(e.target.value as LanguageCode)}
              className="bg-white border-2 border-slate-100 rounded-2xl px-5 py-2.5 text-sm font-black outline-none hover:border-slate-300 transition-all cursor-pointer shadow-sm"
            >
              <option value="en">English</option>
              <option value="te">Telugu (తెలుగు)</option>
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
              <option value="de">Deutsch</option>
              <option value="zh">Chinese (中文)</option>
              <option value="ja">Japanese (日本語)</option>
              <option value="pt">Portuguese</option>
              <option value="it">Italiano</option>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-12">
        {/* Module Nav */}
        <nav className="flex items-center bg-white p-2.5 rounded-[2.5rem] shadow-sm border border-slate-100 mb-12 w-fit mx-auto sticky top-24 z-[999] backdrop-blur-md">
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

        {/* Prescription View */}
        {view === 'prescriptions' && (
          <div className="space-y-10">
            {!result ? (
              <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in duration-500">
                <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 text-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <i className="fa-solid fa-notes-medical text-9xl"></i>
                  </div>
                  <div className="mb-10 relative">
                    <h2 className="text-4xl font-black text-slate-900 mb-3">{t.upload}</h2>
                    <p className="text-slate-400 font-medium">{t.clear}</p>
                  </div>
                  
                  <label className="block w-full h-96 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 cursor-pointer group hover:bg-white hover:border-blue-300 transition-all overflow-hidden relative">
                    {preview ? (
                      <img src={preview} className="w-full h-full object-contain p-6" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-camera-retro text-slate-400 text-3xl"></i>
                        </div>
                        <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Capture Medical Record</span>
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
                    {loading ? <i className="fa-solid fa-dna fa-spin mr-3"></i> : <i className="fa-solid fa-wand-sparkles mr-3"></i>}
                    {loading ? 'Processing...' : t.analyze}
                  </button>
                </div>

                <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 opacity-10 translate-x-8 -translate-y-8">
                     <i className="fa-solid fa-heart-pulse text-[12rem]"></i>
                   </div>
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-4">{t.tip}</h4>
                   <p className="text-2xl font-bold leading-snug max-w-lg">{tip}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-10 animate-in slide-in-from-bottom-10 duration-700">
                <div className="flex items-center justify-between px-6">
                  <button onClick={() => setResult(null)} className="group flex items-center gap-4 text-slate-400 hover:text-slate-900 font-black transition-all uppercase tracking-widest text-xs">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-all border border-slate-100 text-slate-900">
                      <i className="fa-solid fa-arrow-left"></i>
                    </div>
                    {t.change}
                  </button>
                  <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-right">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global Accuracy Score</p>
                       <p className="text-lg font-black text-blue-600 leading-none">{result.overall_confidence}</p>
                    </div>
                  </div>
                </div>

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
                      <h3 className="text-3xl font-black mb-10 text-slate-900 border-b border-slate-50 pb-6 flex items-center gap-3">
                        <i className="fa-solid fa-table-pills text-blue-600"></i>
                        {t.extracted}
                      </h3>
                      <div className="grid gap-8">
                        {result.medicines.map((med, i) => (
                          <div key={i} className="group p-8 bg-slate-50 rounded-[3rem] border border-slate-100 hover:border-slate-300 hover:bg-white transition-all">
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <h4 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{med.name}</h4>
                                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">{med.purpose}</p>
                              </div>
                              <span className={`text-[9px] font-black px-4 py-1.5 rounded-full border uppercase tracking-widest shadow-sm ${
                                med.confidence === 'High' ? 'bg-green-50 text-green-600 border-green-100' : 
                                med.confidence === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                                'bg-red-50 text-red-600 border-red-100'
                              }`}>
                                Accuracy: {med.confidence}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-[9px] font-black text-slate-500 mb-8 uppercase tracking-[0.1em]">
                              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-100"><i className="fa-solid fa-vial text-blue-500"></i>{med.dosage}</div>
                              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-100"><i className="fa-solid fa-clock text-blue-500"></i>{med.timing}</div>
                              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-100"><i className="fa-solid fa-utensils text-blue-500"></i>{med.food_relation}</div>
                              <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-100"><i className="fa-solid fa-calendar-days text-blue-500"></i>{med.duration}</div>
                            </div>
                            <div className="bg-white p-6 rounded-[2rem] text-sm font-bold text-slate-700 border border-slate-100 shadow-inner italic leading-relaxed group-hover:bg-slate-50 transition-colors">
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
                    </section>
                    
                    <section className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Text Trace</h3>
                      <div className="text-[10px] font-mono font-medium text-slate-400 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 break-words whitespace-pre-wrap leading-relaxed">
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
        .leaflet-container { border-radius: 2.5rem !important; z-index: 10; font-family: inherit; }
        .leaflet-popup-content-wrapper { border-radius: 2rem !important; padding: 0.5rem !important; font-weight: 800; border: none !important; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25) !important; overflow: hidden; }
        .leaflet-popup-tip { display: none; }
        .user-loc-icon { pointer-events: none; }
      `}</style>
    </div>
  );
};

export default App;
