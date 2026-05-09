'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FileText,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Download
} from 'lucide-react';

type PrescriptionFilter = 'all' | 'pending' | 'verified' | 'rejected';

export function PharmacistPrescriptions() {
  const [activeFilter, setActiveFilter] = useState<PrescriptionFilter>('all');

  const prescriptions = [
    {
      id: 'RX-2024-001',
      patient: 'John Doe',
      doctor: 'Dr. Sarah Mukasa',
      clinic: 'Kampala Medical Centre',
      date: '2024-01-15',
      status: 'pending',
      medicines: ['Amoxicillin 500mg x20', 'Paracetamol 500mg x10'],
      notes: 'Take after meals. Complete the full course.',
    },
    {
      id: 'RX-2024-002',
      patient: 'Mary Nambuya',
      doctor: 'Dr. Peter Kato',
      clinic: 'Nakasero Hospital',
      date: '2024-01-15',
      status: 'verified',
      medicines: ['Metformin 500mg x60', 'Glibenclamide 5mg x30'],
      notes: 'For diabetes management. Monitor blood sugar.',
    },
    {
      id: 'RX-2024-003',
      patient: 'James Ssempala',
      doctor: 'Dr. Grace Achieng',
      clinic: 'Mulago Hospital',
      date: '2024-01-14',
      status: 'rejected',
      medicines: ['Tramadol 50mg x30'],
      notes: 'Prescription expired. Please get a new prescription.',
    },
    {
      id: 'RX-2024-004',
      patient: 'Sarah Namugga',
      doctor: 'Dr. David Ochieng',
      clinic: 'Kampala Family Clinic',
      date: '2024-01-15',
      status: 'pending',
      medicines: ['Ciprofloxacin 500mg x14', 'ORS Sachets x10'],
      notes: 'For bacterial infection. Stay hydrated.',
    },
  ];

  const filters: { id: PrescriptionFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'verified', label: 'Verified' },
    { id: 'rejected', label: 'Rejected' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'verified':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredPrescriptions = activeFilter === 'all'
    ? prescriptions
    : prescriptions.filter(p => p.status === activeFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 sticky top-6 z-40">
        <h1 className="text-xl font-bold text-gray-900">Prescriptions</h1>
      </div>

      {/* Search and Filter */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search prescriptions..."
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeFilter === filter.id
                  ? "bg-rose-600 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="px-4 mt-4 pb-6">
        <div className="space-y-4">
          {filteredPrescriptions.map((rx) => (
            <Card key={rx.id} className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-rose-500" />
                    <span className="font-bold text-gray-900">{rx.id}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{rx.date}</p>
                </div>
                <Badge className={cn("text-xs", getStatusColor(rx.status))}>
                  {rx.status.charAt(0).toUpperCase() + rx.status.slice(1)}
                </Badge>
              </div>

              {/* Patient & Doctor Info */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Patient</p>
                    <p className="font-medium text-gray-900">{rx.patient}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Doctor</p>
                    <p className="font-medium text-gray-900">{rx.doctor}</p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Facility</p>
                  <p className="text-sm text-gray-700">{rx.clinic}</p>
                </div>
              </div>

              {/* Medicines */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Prescribed Medicines</p>
                <div className="space-y-1">
                  {rx.medicines.map((medicine, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                      <span className="text-gray-700">{medicine}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {rx.notes && (
                <div className="bg-blue-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">Notes</p>
                  <p className="text-sm text-blue-700">{rx.notes}</p>
                </div>
              )}

              {/* Actions */}
              {rx.status === 'pending' && (
                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 font-medium flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-medium flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors">
                    <CheckCircle className="h-4 w-4" />
                    Verify
                  </button>
                </div>
              )}
              {rx.status === 'verified' && (
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Eye className="h-4 w-4 mr-2" />
                  Process Order
                </Button>
              )}
              {rx.status === 'rejected' && (
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Rejection Details
                </Button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
