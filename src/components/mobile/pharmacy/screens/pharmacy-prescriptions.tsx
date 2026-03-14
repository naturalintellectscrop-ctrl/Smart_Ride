'use client';

import { useState } from 'react';
import { MobileCard } from '../../shared/mobile-components';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Eye,
  AlertCircle,
  ChevronRight,
  Search,
  Filter,
  User,
  Calendar,
  Pill
} from 'lucide-react';

type PrescriptionFilter = 'pending' | 'verified' | 'rejected';

export function PharmacyPrescriptions() {
  const [activeFilter, setActiveFilter] = useState<PrescriptionFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);

  const prescriptions = [
    {
      id: 'RX-2024-001',
      orderNumber: 'HLTH-2024-09823',
      orderPOT: 'POT-001',
      customer: 'John Doe',
      doctorName: 'Dr. James Mukasa',
      doctorLicense: 'UMC-45678',
      clinicName: 'Kampala Medical Center',
      prescriptionDate: '2024-01-14',
      expiryDate: '2024-07-14',
      uploadedAt: '5 min ago',
      status: 'PENDING',
      medicines: [
        { name: 'Paracetamol 500mg', qty: 20, dosage: '1 tablet 3 times daily' },
        { name: 'Amoxicillin 250mg', qty: 21, dosage: '1 capsule 3 times daily for 7 days' },
      ],
      notes: 'Take with food. Complete the full course of antibiotics.',
    },
    {
      id: 'RX-2024-002',
      orderNumber: 'HLTH-2024-09820',
      orderPOT: 'POT-004',
      customer: 'Mary K.',
      doctorName: 'Dr. Sarah Namugga',
      doctorLicense: 'UMC-34521',
      clinicName: 'Nakasero Hospital',
      prescriptionDate: '2024-01-10',
      expiryDate: '2024-04-10',
      uploadedAt: '2 hours ago',
      status: 'VERIFIED',
      verifiedBy: 'Pharm. David O.',
      verifiedAt: '1 hour ago',
      medicines: [
        { name: 'Metformin 500mg', qty: 60, dosage: '1 tablet twice daily' },
      ],
      notes: 'For diabetes management. Monitor blood sugar levels.',
    },
    {
      id: 'RX-2024-003',
      orderNumber: 'HLTH-2024-09815',
      orderPOT: 'POT-005',
      customer: 'Peter S.',
      doctorName: 'Dr. Unknown',
      doctorLicense: 'N/A',
      clinicName: 'Unknown Clinic',
      prescriptionDate: '2024-01-05',
      expiryDate: '2024-02-05',
      uploadedAt: '3 hours ago',
      status: 'REJECTED',
      rejectedBy: 'Pharm. Grace M.',
      rejectedAt: '2 hours ago',
      rejectionReason: 'Invalid prescription - doctor license not verified',
      medicines: [
        { name: 'Codeine 30mg', qty: 30, dosage: 'As needed for pain' },
      ],
      notes: '',
    },
  ];

  const filters: { id: PrescriptionFilter; label: string }[] = [
    { id: 'pending', label: 'Pending Review' },
    { id: 'verified', label: 'Verified' },
    { id: 'rejected', label: 'Rejected' },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending Review' };
      case 'VERIFIED':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Verified' };
      case 'REJECTED':
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    }
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (activeFilter === 'pending') return rx.status === 'PENDING';
    if (activeFilter === 'verified') return rx.status === 'VERIFIED';
    if (activeFilter === 'rejected') return rx.status === 'REJECTED';
    return true;
  });

  // Prescription Detail View
  if (selectedPrescription) {
    const rx = prescriptions.find((r) => r.id === selectedPrescription);
    if (!rx) return null;

    return (
      <div className="min-h-screen bg-gray-50 pb-4">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
          <button 
            onClick={() => setSelectedPrescription(null)}
            className="text-rose-600 font-medium flex items-center gap-2"
          >
            ← Back to Prescriptions
          </button>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Prescription ID & Status */}
          <MobileCard className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-bold text-xl text-gray-900">{rx.id}</h2>
                <p className="text-sm text-gray-500">Order: {rx.orderNumber}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${getStatusConfig(rx.status).bg} ${getStatusConfig(rx.status).text}`}>
                {getStatusConfig(rx.status).label}
              </span>
            </div>

            {/* Security Notice */}
            <div className="bg-rose-50 rounded-lg p-3 flex items-start gap-2">
              <Shield className="h-4 w-4 text-rose-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-rose-800">Secure Prescription</p>
                <p className="text-xs text-rose-600">Access is logged for compliance</p>
              </div>
            </div>
          </MobileCard>

          {/* Prescription Image */}
          <MobileCard className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Prescription Image</h3>
            <div className="bg-gray-100 rounded-xl aspect-[4/3] flex items-center justify-center relative">
              <div className="text-center">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Tap to view prescription</p>
                <p className="text-xs text-gray-400 mt-1">Encrypted image storage</p>
              </div>
              <button className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/5 transition-colors rounded-xl">
                <Eye className="h-8 w-8 text-white bg-rose-600 rounded-full p-2" />
              </button>
            </div>
          </MobileCard>

          {/* Doctor Info */}
          <MobileCard className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Doctor Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{rx.doctorName}</p>
                  <p className="text-sm text-gray-500">License: {rx.doctorLicense}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-gray-400">Clinic:</span>
                {rx.clinicName}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Prescribed: {rx.prescriptionDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Expires: {rx.expiryDate}</span>
              </div>
            </div>
          </MobileCard>

          {/* Prescribed Medicines */}
          <MobileCard className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Prescribed Medicines</h3>
            <div className="space-y-3">
              {rx.medicines.map((med, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <Pill className="h-5 w-5 text-rose-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{med.name}</p>
                      <p className="text-sm text-gray-500">Qty: {med.qty}</p>
                      <p className="text-sm text-rose-600 mt-1">{med.dosage}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {rx.notes && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-amber-600 font-medium mb-1">PHARMACIST NOTES</p>
                <p className="text-sm text-amber-800">{rx.notes}</p>
              </div>
            )}
          </MobileCard>

          {/* Verification/Rejection Info */}
          {rx.status === 'VERIFIED' && (
            <MobileCard className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Verified by {rx.verifiedBy}</p>
                  <p className="text-sm text-green-600">{rx.verifiedAt}</p>
                </div>
              </div>
            </MobileCard>
          )}

          {rx.status === 'REJECTED' && (
            <MobileCard className="p-4 bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Rejected by {rx.rejectedBy}</p>
                  <p className="text-sm text-red-600">{rx.rejectedAt}</p>
                  <p className="text-sm text-red-700 mt-2">{rx.rejectionReason}</p>
                </div>
              </div>
            </MobileCard>
          )}

          {/* Actions */}
          {rx.status === 'PENDING' && (
            <div className="space-y-3">
              <button className="w-full py-4 rounded-xl bg-rose-600 text-white font-semibold flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Verify Prescription
              </button>
              <button className="w-full py-4 rounded-xl bg-white text-red-600 font-semibold border-2 border-red-200 flex items-center justify-center gap-2">
                <XCircle className="h-5 w-5" />
                Reject Prescription
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Prescriptions</h1>
        <p className="text-sm text-gray-500">Verify and manage prescriptions</p>
      </div>

      <div className="px-4 pt-4">
        {/* Search */}
        <div className="bg-white rounded-xl p-3 flex items-center gap-3 border border-gray-200 mb-4">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search prescriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 outline-none"
          />
          <button className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
            <Filter className="h-4 w-4 text-rose-600" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-4">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                activeFilter === filter.id
                  ? 'bg-rose-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Prescriptions List */}
        <div className="space-y-3">
          {filteredPrescriptions.map((rx) => {
            const statusConfig = getStatusConfig(rx.status);
            return (
              <MobileCard 
                key={rx.id} 
                className="p-4 cursor-pointer active:bg-gray-50"
                onClick={() => setSelectedPrescription(rx.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{rx.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{rx.orderNumber}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>

                {/* Doctor */}
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{rx.doctorName}</span>
                </div>

                {/* Medicines Preview */}
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Pill className="h-3 w-3 text-rose-400" />
                    <span>{rx.medicines.map(m => m.name).join(', ')}</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                  <span>Customer: {rx.customer}</span>
                  <span>{rx.uploadedAt}</span>
                </div>
              </MobileCard>
            );
          })}
        </div>

        {filteredPrescriptions.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No prescriptions in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
