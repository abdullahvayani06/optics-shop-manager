import React from 'react';
import { Printer, X, Glasses } from 'lucide-react';
import { Prescription, Customer } from '../../types/index.js';
import { formatOpticalDiopter, formatOpticalAxis, formatDate } from '../../utils/formatters.js';

interface PrintablePrescriptionProps {
  prescription: Prescription;
  customer: Customer;
  shopName?: string;
  shopPhone?: string;
  shopAddress?: string;
  onClose: () => void;
}

export const PrintablePrescription: React.FC<PrintablePrescriptionProps> = ({
  prescription,
  customer,
  shopName = 'VisionOptics Pakistan',
  shopPhone = '+92 300 1234567',
  shopAddress = 'Suite 402, Al-Latif Centre, Main Boulevard, Gulberg III, Lahore',
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden my-8">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="no-print flex items-center justify-between p-4 bg-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-semibold">Optical Prescription Card Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Prescription</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Prescription Body */}
        <div className="p-8 bg-white printable-card">
          {/* Shop Header */}
          <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white">
                <Glasses className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                  {shopName}
                </h1>
                <p className="text-xs text-slate-600 font-medium">Optometry & Eyecare Specialists</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{shopAddress}</p>
                <p className="text-[11px] text-slate-500">Contact: {shopPhone}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-bold uppercase rounded-md tracking-wider">
                Optical Prescription
              </span>
              <p className="text-xs text-slate-600 mt-2 font-medium">
                Test Date: <strong className="text-slate-900">{formatDate(prescription.test_date)}</strong>
              </p>
              {prescription.prescribing_doctor && (
                <p className="text-xs text-slate-600 mt-0.5">
                  Doctor: <span className="font-semibold text-slate-800">{prescription.prescribing_doctor}</span>
                </p>
              )}
            </div>
          </div>

          {/* Customer Information Block */}
          <div className="grid grid-cols-2 gap-4 py-4 my-4 bg-slate-50 rounded-lg px-4 border border-slate-200">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Customer Name</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{customer.full_name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Contact Phone</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{customer.phone}</p>
            </div>
          </div>

          {/* Optical Rx Matrix Table */}
          <div className="my-6">
            <table className="w-full text-center border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider">
                  <th className="border border-slate-300 p-2.5 text-left pl-4">Eye</th>
                  <th className="border border-slate-300 p-2.5">SPH (Sphere)</th>
                  <th className="border border-slate-300 p-2.5">CYL (Cylinder)</th>
                  <th className="border border-slate-300 p-2.5">AXIS</th>
                  <th className="border border-slate-300 p-2.5">ADD (Near)</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-slate-900">
                <tr>
                  <td className="border border-slate-300 p-3 text-left pl-4 font-bold bg-slate-50">
                    OD (Right Eye)
                  </td>
                  <td className="border border-slate-300 p-3 font-semibold">
                    {formatOpticalDiopter(prescription.right_sphere)}
                  </td>
                  <td className="border border-slate-300 p-3 font-semibold">
                    {formatOpticalDiopter(prescription.right_cylinder)}
                  </td>
                  <td className="border border-slate-300 p-3 font-semibold">
                    {formatOpticalAxis(prescription.right_axis)}
                  </td>
                  <td className="border border-slate-300 p-3 font-semibold">
                    {formatOpticalDiopter(prescription.right_add)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 p-3 text-left pl-4 font-bold bg-slate-50">
                    OS (Left Eye)
                  </td>
                  <td className="border border-slate-300 p-3 font-semibold">
                    {formatOpticalDiopter(prescription.left_sphere)}
                  </td>
                  <td className="border border-slate-300 p-3 font-semibold">
                    {formatOpticalDiopter(prescription.left_cylinder)}
                  </td>
                  <td className="border border-slate-300 p-3 font-semibold">
                    {formatOpticalAxis(prescription.left_axis)}
                  </td>
                  <td className="border border-slate-300 p-3 font-semibold">
                    {formatOpticalDiopter(prescription.left_add)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pupillary Distance & Remarks */}
          <div className="grid grid-cols-3 gap-4 p-4 border border-slate-200 rounded-lg bg-white">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Pupillary Distance (PD)
              </p>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {prescription.pupillary_distance ? `${prescription.pupillary_distance} mm` : 'Not recorded'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Clinical Remarks & Lens Guidance
              </p>
              <p className="text-xs text-slate-700 mt-1">
                {prescription.remarks || 'Standard optical corrective eyewear.'}
              </p>
            </div>
          </div>

          {/* Signatures & Footer Note */}
          <div className="flex items-end justify-between pt-12 mt-8 border-t border-slate-200">
            <div className="text-[10px] text-slate-500 max-w-xs">
              <p className="font-semibold text-slate-700">Instructions for Wearer:</p>
              <p className="mt-0.5">
                New optical prescriptions may require 2 to 5 days of adaptation. Keep lenses clean using microfiber cloth.
              </p>
            </div>
            <div className="text-center">
              <div className="w-44 border-b border-slate-400 mb-1" />
              <p className="text-xs font-bold text-slate-900">Optometrist / Dispenser</p>
              <p className="text-[10px] text-slate-400">Authorized Signature & Stamp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
