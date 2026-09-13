import React, { useState } from 'react';
import { X, Eye, FileText } from 'lucide-react';
import { api } from '../../api/client.js';
import { Prescription } from '../../types/index.js';

interface PrescriptionFormModalProps {
  isOpen: boolean;
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSuccess: (prescription: Prescription) => void;
}

export const PrescriptionFormModal: React.FC<PrescriptionFormModalProps> = ({
  isOpen,
  customerId,
  customerName,
  onClose,
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().substring(0, 10);

  // Form State
  const [testDate, setTestDate] = useState(todayStr);
  const [doctor, setDoctor] = useState('');
  const [pd, setPd] = useState('');
  const [remarks, setRemarks] = useState('');

  // Right Eye (OD)
  const [rSph, setRSph] = useState('');
  const [rCyl, setRCyl] = useState('');
  const [rAxis, setRAxis] = useState('');
  const [rAdd, setRAdd] = useState('');

  // Left Eye (OS)
  const [lSph, setLSph] = useState('');
  const [lCyl, setLCyl] = useState('');
  const [lAxis, setLAxis] = useState('');
  const [lAdd, setLAdd] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post<{ prescription: Prescription }>('/prescriptions', {
        customer_id: customerId,
        test_date: testDate,
        prescribing_doctor: doctor.trim() || null,
        pupillary_distance: pd.trim() || null,
        remarks: remarks.trim() || null,
        right_sphere: rSph.trim() || null,
        right_cylinder: rCyl.trim() || null,
        right_axis: rAxis.trim() || null,
        right_add: rAdd.trim() || null,
        left_sphere: lSph.trim() || null,
        left_cylinder: lCyl.trim() || null,
        left_axis: lAxis.trim() || null,
        left_add: lAdd.trim() || null,
      });

      onSuccess(res.prescription);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record prescription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-100 text-brand-700 rounded-lg">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record New Eyesight Prescription</h2>
              <p className="text-xs text-slate-500">
                Customer: <strong className="text-slate-800">{customerName}</strong> (Chronological entry)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Test Date & Doctor Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Test Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prescribing Doctor / Hospital
              </label>
              <input
                type="text"
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                placeholder="Dr. Tariq Mahmood"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pupillary Distance (PD mm)
              </label>
              <input
                type="text"
                value={pd}
                onChange={(e) => setPd(e.target.value)}
                placeholder="e.g. 64"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* OD / OS Optical Grid */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Optical Prescription Grid (Diopters)
              </span>
            </div>
            <div className="p-4 space-y-4">
              {/* Right Eye (OD) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-brand-100 text-brand-800 rounded">
                    OD
                  </span>
                  <span className="text-xs font-semibold text-slate-800">Right Eye</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">SPH</label>
                    <input
                      type="text"
                      value={rSph}
                      onChange={(e) => setRSph(e.target.value)}
                      placeholder="-1.50"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">CYL</label>
                    <input
                      type="text"
                      value={rCyl}
                      onChange={(e) => setRCyl(e.target.value)}
                      placeholder="-0.50"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">AXIS</label>
                    <input
                      type="text"
                      value={rAxis}
                      onChange={(e) => setRAxis(e.target.value)}
                      placeholder="180"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">ADD</label>
                    <input
                      type="text"
                      value={rAdd}
                      onChange={(e) => setRAdd(e.target.value)}
                      placeholder="+1.75"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Left Eye (OS) */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-brand-100 text-brand-800 rounded">
                    OS
                  </span>
                  <span className="text-xs font-semibold text-slate-800">Left Eye</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">SPH</label>
                    <input
                      type="text"
                      value={lSph}
                      onChange={(e) => setLSph(e.target.value)}
                      placeholder="-1.75"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">CYL</label>
                    <input
                      type="text"
                      value={lCyl}
                      onChange={(e) => setLCyl(e.target.value)}
                      placeholder="-0.75"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">AXIS</label>
                    <input
                      type="text"
                      value={lAxis}
                      onChange={(e) => setLAxis(e.target.value)}
                      placeholder="175"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">ADD</label>
                    <input
                      type="text"
                      value={lAdd}
                      onChange={(e) => setLAdd(e.target.value)}
                      placeholder="+1.75"
                      className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Clinical Advice / Lens Recommendations
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Advised progressive lenses with blue-cut coating..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
            >
              {loading ? 'Saving...' : 'Save Prescription Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
