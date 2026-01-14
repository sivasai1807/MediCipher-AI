
import React, { useState, useEffect, useCallback } from 'react';
import { analyzePrescription } from './services/geminiService';
import { fileToBase64, getCurrentLocation, getHealthTip } from './utils';
import { PrescriptionResponse, LocationState, ExpiryInput } from './types';

// Sub-components
const MedicineCard: React.FC<{ med: any }> = ({ med }) => (
  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-lg font-bold text-blue-800">{med.name}</h3>
      <span className={`px-2 py-1 text-xs font-semibold rounded ${
        med.confidence === 'High' ? 'bg-green-100 text-green-700' : 
        med.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
      }`}>
        {med.confidence} confidence
      </span>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
      <p><span className="font-semibold text-gray-800">Purpose:</span> {med.purpose}</p>
      <p><span className="font-semibold text-gray-800">Dosage:</span> {med.dosage}</p>
      <p><span className="font-semibold text-gray-800">Timing:</span> {med.timing}</p>
      <p><span className="font-semibold text-gray-800">Relation:</span> {med.food_relation}</p>
      <p><span className="font-semibold text-gray-800">Duration:</span> {med.duration}</p>
    </div>
    <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
      <p className="text-sm font-medium text-blue-900 italic">" {med.how_to_use} "</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrescriptionResponse | null>(null);
  const [location, setLocation] = useState<LocationState>({ lat: null, lng: null, error: null });
  const [expiryInputs, setExpiryInputs] = useState<ExpiryInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dailyTip, setDailyTip] = useState('');

  useEffect(() => {
    setDailyTip(getHealthTip());
    getCurrentLocation()
      .then(loc => setLocation({ ...loc, error: null }))
      .catch(err => setLocation(prev => ({ ...prev, error: err.message })));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const addExpiryInput = () => {
    setExpiryInputs([...expiryInputs, { medicineName: '', expiryDate: '' }]);
  };

  const updateExpiryInput = (index: number, field: keyof ExpiryInput, value: string) => {
    const newInputs = [...expiryInputs];
    newInputs[index][field] = value;
    setExpiryInputs(newInputs);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please select a prescription image first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(selectedFile);
      const data = await analyzePrescription(
        base64,
        { lat: location.lat, lng: location.lng },
        expiryInputs.map(i => ({ name: i.medicineName, date: i.expiryDate }))
      );
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setExpiryInputs([]);
    setError(null);
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 w-10 h-10 rounded-xl flex items-center justify-center text-white">
              <i className="fa-solid fa-file-medical text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-none">MediCipher AI</h1>
              <p className="text-xs text-gray-500 font-medium">Smart Prescription Assistant</p>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              <i className="fa-solid fa-location-dot text-blue-500"></i>
              {location.lat ? 'Location Active' : 'Location Not Set'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {!result ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Health Tip */}
            <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full">
                <i className="fa-solid fa-lightbulb text-xl"></i>
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider opacity-80">Daily Health Tip</h4>
                <p className="text-lg font-medium">{dailyTip}</p>
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <i className="fa-solid fa-upload text-blue-600"></i>
                Upload Prescription
              </h2>
              
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <label className="group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-all overflow-hidden">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <i className="fa-solid fa-cloud-arrow-up text-4xl text-gray-400 mb-3 group-hover:text-blue-500 transition-colors"></i>
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-400">Doctor's handwritten note (PNG, JPG)</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                    <h4 className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-circle-exclamation"></i>
                      Optional: Check Expiry
                    </h4>
                    <div className="space-y-2">
                      {expiryInputs.map((input, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            placeholder="Medicine Name"
                            className="flex-1 text-sm border p-2 rounded-lg"
                            value={input.medicineName}
                            onChange={(e) => updateExpiryInput(idx, 'medicineName', e.target.value)}
                          />
                          <input 
                            type="date"
                            className="text-sm border p-2 rounded-lg"
                            value={input.expiryDate}
                            onChange={(e) => updateExpiryInput(idx, 'expiryDate', e.target.value)}
                          />
                        </div>
                      ))}
                      <button 
                        onClick={addExpiryInput}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        + Add Medicine to Check
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleAnalyze}
                    disabled={loading || !selectedFile}
                    className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl transition-all flex items-center justify-center gap-3 ${
                      loading || !selectedFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                    }`}
                  >
                    {loading ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        Analyzing Handwriting...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                        Decipher Prescription
                      </>
                    )}
                  </button>
                  {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-700">
            {/* Back Button */}
            <button onClick={resetApp} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-semibold transition-colors">
              <i className="fa-solid fa-arrow-left"></i>
              Analyze another one
            </button>

            {/* Results Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-gray-900">Digitalized Prescription</h2>
                <p className="text-gray-500 font-medium">Verified by AI Medical Assistant</p>
              </div>
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-100">
                <i className="fa-solid fa-check-circle"></i>
                <span className="font-bold">Accuracy: {result.overall_confidence}</span>
              </div>
            </div>

            {/* Warnings Alert */}
            {result.warnings.length > 0 && (
              <div className="bg-red-50 border-2 border-red-200 p-5 rounded-2xl space-y-2">
                <h4 className="text-red-700 font-bold flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  Critical Safety Warnings
                </h4>
                <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
                  {result.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                </ul>
              </div>
            )}

            {/* Expiry Alerts */}
            {result.expiry_alerts.length > 0 && (
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-xl">
                <h4 className="text-orange-800 font-bold flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-hourglass-half"></i>
                  Medicine Expiry Alerts
                </h4>
                <ul className="list-disc list-inside text-orange-700 text-sm">
                  {result.expiry_alerts.map((a, idx) => <li key={idx}>{a}</li>)}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Prescription Data */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Extracted Medicines</h3>
                  <div className="grid gap-4">
                    {result.medicines.map((med, idx) => (
                      <MedicineCard key={idx} med={med} />
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Doctor's Original Text</h3>
                  <p className="text-gray-600 leading-relaxed font-mono bg-gray-50 p-4 rounded-xl border border-gray-200">
                    {result.clean_prescription_text}
                  </p>
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-lg">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-user-doctor"></i>
                    Doctor's Notes
                  </h3>
                  <p className="text-blue-100 text-sm leading-relaxed mb-4">
                    {result.doctor_notes || "No additional notes detected."}
                  </p>
                  <div className="pt-4 border-t border-blue-800 flex items-center gap-3">
                    <i className="fa-solid fa-info-circle text-blue-300"></i>
                    <p className="text-[10px] text-blue-300 uppercase font-bold">Disclaimer: Always verify with your physician or pharmacist before consumption.</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-map-location-dot text-blue-600"></i>
                    Nearby Care
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pharmacies</h4>
                      <ul className="space-y-2">
                        {result.nearby_pharmacies.map((p, idx) => (
                          <li key={idx} className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Medical Centers</h4>
                      <ul className="space-y-2">
                        {result.nearby_hospitals.map((h, idx) => (
                          <li key={idx} className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer sticky tip for mobile */}
      {!result && !loading && (
        <div className="fixed bottom-6 left-4 right-4 md:hidden">
          <div className="glass-effect p-3 rounded-2xl shadow-xl flex items-center gap-3 border border-blue-100">
            <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0">
              <i className="fa-solid fa-camera text-xs"></i>
            </div>
            <p className="text-xs font-bold text-gray-700">Tap the center to capture a clear photo of your prescription</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
