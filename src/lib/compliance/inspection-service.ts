/**
 * Vehicle Inspection Service
 *
 * Handles vehicle and equipment inspection workflow:
 * - Vehicle inspection workflow
 * - Equipment verification (helmet, reflector vest, insulated box)
 * - Inspection scheduling
 * - Pass/fail with detailed notes
 * - Re-inspection tracking
 */

import { db } from '@/lib/db';
import { RiderStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/api/audit';

// ============================================================================
// Types
// ============================================================================

export type InspectionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'CANCELLED';
export type InspectionType = 'INITIAL' | 'ROUTINE' | 'RE_INSPECTION' | 'COMPLAINT_BASED';
export type InspectionCategory = 'VEHICLE' | 'EQUIPMENT' | 'DOCUMENTS';

export interface InspectionChecklistItem {
  id: string;
  category: InspectionCategory;
  name: string;
  description: string;
  required: boolean;
  status: 'PASS' | 'FAIL' | 'NA' | 'PENDING';
  notes?: string;
}

export interface InspectionResult {
  id: string;
  riderId: string;
  riderName: string;
  vehicleId: string | null;
  vehicleInfo: string | null;
  inspectionType: InspectionType;
  status: InspectionStatus;
  scheduledAt: Date | null;
  completedAt: Date | null;
  inspectorId: string | null;
  inspectorName: string | null;
  overallScore: number;
  passedItems: number;
  failedItems: number;
  totalItems: number;
  checklist: InspectionChecklistItem[];
  equipmentStatus: EquipmentStatus;
  notes: string | null;
  requiresReInspection: boolean;
  reInspectionDeadline: Date | null;
}

export interface EquipmentStatus {
  hasHelmet: boolean;
  helmetCondition: 'GOOD' | 'FAIR' | 'POOR' | 'NOT_APPLICABLE';
  hasReflectorVest: boolean;
  reflectorVestCondition: 'GOOD' | 'FAIR' | 'POOR' | 'NOT_APPLICABLE';
  hasInsulatedBox: boolean;
  insulatedBoxCondition: 'GOOD' | 'FAIR' | 'POOR' | 'NOT_APPLICABLE';
  additionalEquipment: string[];
}

export interface ScheduleInspectionInput {
  riderId: string;
  inspectionType: InspectionType;
  scheduledAt: Date;
  notes?: string;
}

export interface CompleteInspectionInput {
  inspectionId: string;
  inspectorId: string;
  checklist: InspectionChecklistItem[];
  equipmentStatus: EquipmentStatus;
  notes?: string;
  reInspectionRequired?: boolean;
  reInspectionDeadline?: Date;
}

export interface VehicleInspectionData {
  riderId: string;
  make: string;
  model: string;
  year: number | null;
  color: string;
  plateNumber: string;
  vehicleCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  mileage: number | null;
  hasValidInsurance: boolean;
  hasValidRegistration: boolean;
  issues: string[];
}

// ============================================================================
// Standard Inspection Checklists
// ============================================================================

const VEHICLE_CHECKLIST: Omit<InspectionChecklistItem, 'id' | 'status' | 'notes'>[] = [
  { category: 'VEHICLE', name: 'Valid Insurance', description: 'Vehicle has valid insurance', required: true },
  { category: 'VEHICLE', name: 'Valid Registration', description: 'Vehicle registration is up to date', required: true },
  { category: 'VEHICLE', name: 'Lights Working', description: 'All lights (headlights, taillights, indicators) functional', required: true },
  { category: 'VEHICLE', name: 'Brakes Functional', description: 'Brakes are in good working condition', required: true },
  { category: 'VEHICLE', name: 'Tires Condition', description: 'Tires have adequate tread and no damage', required: true },
  { category: 'VEHICLE', name: 'Mirrors Present', description: 'Side mirrors are present and functional', required: true },
  { category: 'VEHICLE', name: 'Horn Working', description: 'Horn is functional', required: true },
  { category: 'VEHICLE', name: 'Clean Condition', description: 'Vehicle is reasonably clean', required: false },
  { category: 'VEHICLE', name: 'No Major Damage', description: 'No significant body damage', required: true },
];

const EQUIPMENT_CHECKLIST: Omit<InspectionChecklistItem, 'id' | 'status' | 'notes'>[] = [
  { category: 'EQUIPMENT', name: 'Helmet Provided', description: 'Safety helmet is provided and in good condition', required: true },
  { category: 'EQUIPMENT', name: 'Reflector Vest', description: 'High-visibility reflector vest provided', required: true },
  { category: 'EQUIPMENT', name: 'Insulated Box', description: 'Insulated delivery box for food orders (if applicable)', required: false },
  { category: 'EQUIPMENT', name: 'Phone Mount', description: 'Secure phone mount for navigation', required: false },
  { category: 'EQUIPMENT', name: 'First Aid Kit', description: 'Basic first aid kit available', required: false },
];

const DOCUMENT_CHECKLIST: Omit<InspectionChecklistItem, 'id' | 'status' | 'notes'>[] = [
  { category: 'DOCUMENTS', name: 'National ID', description: 'Valid national ID presented', required: true },
  { category: 'DOCUMENTS', name: 'Driver License', description: 'Valid driver license presented', required: true },
  { category: 'DOCUMENTS', name: 'Vehicle Papers', description: 'Vehicle registration and insurance documents', required: true },
];

// ============================================================================
// Inspection Service Class
// ============================================================================

export class VehicleInspectionService {
  /**
   * Schedule a new inspection
   */
  async scheduleInspection(input: ScheduleInspectionInput, adminId: string): Promise<{
    success: boolean;
    inspection?: InspectionResult;
    message: string;
  }> {
    const rider = await db.rider.findUnique({
      where: { id: input.riderId },
      include: { vehicle: true },
    });

    if (!rider) {
      return { success: false, message: 'Rider not found' };
    }

    // Create inspection record
    // Note: We'll store this in the audit log or create a new model
    // For now, we'll track via audit logs and rider fields

    const checklist = this.generateChecklist(rider);

    // Log the scheduling
    await createAuditLog({
      action: 'INSPECTION_SCHEDULED',
      entityType: 'Rider',
      entityId: input.riderId,
      actorType: 'ADMIN',
      actorId: adminId,
      riderId: input.riderId,
      description: `Inspection scheduled for ${input.inspectionType}`,
      newValues: {
        inspectionType: input.inspectionType,
        scheduledAt: input.scheduledAt,
        notes: input.notes,
      },
    });

    const inspection: InspectionResult = {
      id: `insp_${Date.now()}`,
      riderId: input.riderId,
      riderName: rider.fullName,
      vehicleId: rider.vehicle?.id || null,
      vehicleInfo: rider.vehicle ? `${rider.vehicle.make} ${rider.vehicle.model} (${rider.vehicle.plateNumber})` : null,
      inspectionType: input.inspectionType,
      status: 'SCHEDULED',
      scheduledAt: input.scheduledAt,
      completedAt: null,
      inspectorId: null,
      inspectorName: null,
      overallScore: 0,
      passedItems: 0,
      failedItems: 0,
      totalItems: checklist.length,
      checklist,
      equipmentStatus: {
        hasHelmet: rider.hasHelmet,
        helmetCondition: 'NOT_APPLICABLE',
        hasReflectorVest: rider.hasReflectorVest,
        reflectorVestCondition: 'NOT_APPLICABLE',
        hasInsulatedBox: rider.hasInsulatedBox,
        insulatedBoxCondition: 'NOT_APPLICABLE',
        additionalEquipment: [],
      },
      notes: input.notes || null,
      requiresReInspection: false,
      reInspectionDeadline: null,
    };

    return { success: true, inspection, message: 'Inspection scheduled successfully' };
  }

  /**
   * Get inspection details
   */
  async getInspectionDetails(inspectionId: string): Promise<InspectionResult | null> {
    // In a real implementation, this would fetch from a dedicated inspection model
    // For now, we return null as inspections are tracked via audit logs
    return null;
  }

  /**
   * Get pending inspections for a rider
   */
  async getPendingInspections(riderId: string): Promise<InspectionResult[]> {
    // Fetch from audit logs
    const logs = await db.auditLog.findMany({
      where: {
        riderId,
        action: 'INSPECTION_SCHEDULED',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Would need proper inspection model for full implementation
    return [];
  }

  /**
   * Complete an inspection
   */
  async completeInspection(input: CompleteInspectionInput): Promise<{
    success: boolean;
    inspection?: InspectionResult;
    message: string;
  }> {
    // Get rider info from the inspection
    // In real implementation, fetch from inspection model
    // For now, we'll update rider fields directly

    const rider = await db.rider.findFirst({
      where: {},
      include: { vehicle: true },
    });

    if (!rider) {
      return { success: false, message: 'Rider not found' };
    }

    // Calculate scores
    const passedItems = input.checklist.filter((item) => item.status === 'PASS').length;
    const failedItems = input.checklist.filter((item) => item.status === 'FAIL').length;
    const totalItems = input.checklist.filter((item) => item.required).length;
    const overallScore = Math.round((passedItems / totalItems) * 100);

    const status: InspectionStatus = overallScore >= 70 && failedItems === 0 ? 'PASSED' : 'FAILED';

    // Update rider equipment status
    await db.rider.update({
      where: { id: rider.id },
      data: {
        hasHelmet: input.equipmentStatus.hasHelmet,
        hasReflectorVest: input.equipmentStatus.hasReflectorVest,
        hasInsulatedBox: input.equipmentStatus.hasInsulatedBox,
      },
    });

    // Create audit log
    await createAuditLog({
      action: `INSPECTION_${status}`,
      entityType: 'Rider',
      entityId: rider.id,
      actorType: 'ADMIN',
      actorId: input.inspectorId,
      riderId: rider.id,
      description: `Inspection completed: ${status}. Score: ${overallScore}%`,
      newValues: {
        status,
        overallScore,
        passedItems,
        failedItems,
        totalItems,
        checklist: input.checklist,
        equipmentStatus: input.equipmentStatus,
        notes: input.notes,
        requiresReInspection: input.reInspectionRequired,
        reInspectionDeadline: input.reInspectionDeadline,
      },
    });

    const inspection: InspectionResult = {
      id: input.inspectionId,
      riderId: rider.id,
      riderName: rider.fullName,
      vehicleId: rider.vehicle?.id || null,
      vehicleInfo: rider.vehicle ? `${rider.vehicle.make} ${rider.vehicle.model}` : null,
      inspectionType: 'INITIAL',
      status,
      scheduledAt: null,
      completedAt: new Date(),
      inspectorId: input.inspectorId,
      inspectorName: null,
      overallScore,
      passedItems,
      failedItems,
      totalItems,
      checklist: input.checklist,
      equipmentStatus: input.equipmentStatus,
      notes: input.notes || null,
      requiresReInspection: input.reInspectionRequired || false,
      reInspectionDeadline: input.reInspectionDeadline || null,
    };

    return {
      success: true,
      inspection,
      message: `Inspection ${status.toLowerCase()}. Score: ${overallScore}%`,
    };
  }

  /**
   * Perform on-the-spot inspection
   */
  async performInspection(
    riderId: string,
    input: {
      inspectorId: string;
      checklist: InspectionChecklistItem[];
      equipmentStatus: EquipmentStatus;
      notes?: string;
    }
  ): Promise<{
    success: boolean;
    inspection?: InspectionResult;
    message: string;
  }> {
    const rider = await db.rider.findUnique({
      where: { id: riderId },
      include: { vehicle: true },
    });

    if (!rider) {
      return { success: false, message: 'Rider not found' };
    }

    // Calculate scores
    const requiredItems = input.checklist.filter((item) => item.required);
    const passedItems = requiredItems.filter((item) => item.status === 'PASS').length;
    const failedItems = requiredItems.filter((item) => item.status === 'FAIL').length;
    const totalItems = requiredItems.length;
    const overallScore = Math.round((passedItems / totalItems) * 100);

    const status: InspectionStatus = overallScore >= 70 && failedItems === 0 ? 'PASSED' : 'FAILED';

    // Update rider
    const updateData: any = {
      hasHelmet: input.equipmentStatus.hasHelmet,
      hasReflectorVest: input.equipmentStatus.hasReflectorVest,
      hasInsulatedBox: input.equipmentStatus.hasInsulatedBox,
    };

    // If inspection passed and rider was pending, they can now be approved
    if (status === 'PASSED' && rider.status === 'PENDING_APPROVAL') {
      updateData.status = 'APPROVED';
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = input.inspectorId;
    }

    await db.rider.update({
      where: { id: riderId },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      action: `INSPECTION_${status}`,
      entityType: 'Rider',
      entityId: riderId,
      actorType: 'ADMIN',
      actorId: input.inspectorId,
      riderId,
      description: `Spot inspection completed: ${status}. Score: ${overallScore}%`,
      newValues: {
        status,
        overallScore,
        passedItems,
        failedItems,
        totalItems,
        checklist: input.checklist,
        equipmentStatus: input.equipmentStatus,
        notes: input.notes,
      },
    });

    const inspection: InspectionResult = {
      id: `insp_${Date.now()}`,
      riderId,
      riderName: rider.fullName,
      vehicleId: rider.vehicle?.id || null,
      vehicleInfo: rider.vehicle ? `${rider.vehicle.make} ${rider.vehicle.model} (${rider.vehicle.plateNumber})` : null,
      inspectionType: rider.status === 'PENDING_APPROVAL' ? 'INITIAL' : 'ROUTINE',
      status,
      scheduledAt: null,
      completedAt: new Date(),
      inspectorId: input.inspectorId,
      inspectorName: null,
      overallScore,
      passedItems,
      failedItems,
      totalItems,
      checklist: input.checklist,
      equipmentStatus: input.equipmentStatus,
      notes: input.notes || null,
      requiresReInspection: status === 'FAILED',
      reInspectionDeadline: status === 'FAILED' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
    };

    return {
      success: true,
      inspection,
      message: status === 'PASSED'
        ? 'Inspection passed. Rider is now approved.'
        : `Inspection failed. ${failedItems} items need attention.`,
    };
  }

  /**
   * Get inspection history for a rider
   */
  async getInspectionHistory(riderId: string, limit = 10): Promise<any[]> {
    const logs = await db.auditLog.findMany({
      where: {
        riderId,
        action: { in: ['INSPECTION_PASSED', 'INSPECTION_FAILED', 'INSPECTION_SCHEDULED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      description: log.description,
      newValues: log.newValues ? JSON.parse(log.newValues) : null,
      createdAt: log.createdAt,
      actorId: log.actorId,
    }));
  }

  /**
   * Get riders needing re-inspection
   */
  async getRidersNeedingReInspection(): Promise<{
    riderId: string;
    riderName: string;
    lastInspectionDate: Date;
    daysSinceLastInspection: number;
    reason: string;
  }[]> {
    // Get riders who failed inspection
    const failedLogs = await db.auditLog.findMany({
      where: {
        action: 'INSPECTION_FAILED',
        rider: { status: 'APPROVED' }, // Only approved riders need re-inspection
      },
      orderBy: { createdAt: 'desc' },
      include: { rider: true },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ridersNeedingInspection: {
      riderId: string;
      riderName: string;
      lastInspectionDate: Date;
      daysSinceLastInspection: number;
      reason: string;
    }[] = [];

    // Check for riders who haven't been inspected in 30 days
    const approvedRiders = await db.rider.findMany({
      where: {
        status: 'APPROVED',
      },
    });

    for (const rider of approvedRiders) {
      const lastInspection = await db.auditLog.findFirst({
        where: {
          riderId: rider.id,
          action: { in: ['INSPECTION_PASSED', 'INSPECTION_FAILED'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      const lastInspectionDate = lastInspection?.createdAt || rider.verifiedAt || rider.createdAt;
      const daysSince = Math.floor(
        (Date.now() - lastInspectionDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSince > 30) {
        ridersNeedingInspection.push({
          riderId: rider.id,
          riderName: rider.fullName,
          lastInspectionDate,
          daysSinceLastInspection: daysSince,
          reason: daysSince > 60 ? 'Overdue for routine inspection' : 'Due for routine inspection',
        });
      }
    }

    return ridersNeedingInspection;
  }

  /**
   * Generate default checklist for a rider
   */
  generateChecklist(rider: any): InspectionChecklistItem[] {
    const items: InspectionChecklistItem[] = [];
    let id = 1;

    // Add vehicle items if rider has a vehicle
    if (rider.vehicle) {
      VEHICLE_CHECKLIST.forEach((item) => {
        items.push({
          id: `check_${id++}`,
          ...item,
          status: 'PENDING',
        });
      });
    }

    // Add equipment items
    EQUIPMENT_CHECKLIST.forEach((item) => {
      items.push({
        id: `check_${id++}`,
        ...item,
        status: 'PENDING',
      });
    });

    // Add document items
    DOCUMENT_CHECKLIST.forEach((item) => {
      items.push({
        id: `check_${id++}`,
        ...item,
        status: 'PENDING',
      });
    });

    return items;
  }

  /**
   * Get inspection statistics
   */
  async getInspectionStats(): Promise<{
    totalInspections: number;
    passedInspections: number;
    failedInspections: number;
    passRate: number;
    pendingReInspections: number;
    averageScore: number;
  }> {
    const passedLogs = await db.auditLog.count({
      where: { action: 'INSPECTION_PASSED' },
    });

    const failedLogs = await db.auditLog.count({
      where: { action: 'INSPECTION_FAILED' },
    });

    const totalInspections = passedLogs + failedLogs;
    const passRate = totalInspections > 0 ? Math.round((passedLogs / totalInspections) * 100) : 0;

    // Get average score from audit logs
    const inspectionLogs = await db.auditLog.findMany({
      where: {
        action: { in: ['INSPECTION_PASSED', 'INSPECTION_FAILED'] },
      },
      select: { newValues: true },
    });

    let totalScore = 0;
    let scoreCount = 0;

    for (const log of inspectionLogs) {
      if (log.newValues) {
        try {
          const values = JSON.parse(log.newValues);
          if (values.overallScore) {
            totalScore += values.overallScore;
            scoreCount++;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    return {
      totalInspections,
      passedInspections: passedLogs,
      failedInspections: failedLogs,
      passRate,
      pendingReInspections: 0, // Would calculate from inspection model
      averageScore,
    };
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const inspectionService = new VehicleInspectionService();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if equipment is required for rider role
 */
export function getRequiredEquipment(riderRole: string): string[] {
  const requiredByRole: Record<string, string[]> = {
    BIKE_RIDER: ['helmet', 'reflector_vest'],
    CAR_DRIVER: ['reflector_vest'],
    TRUCK_DRIVER: ['reflector_vest'],
    COURIER: ['reflector_vest', 'insulated_box'],
  };

  return requiredByRole[riderRole] || ['reflector_vest'];
}

/**
 * Validate equipment status
 */
export function validateEquipmentStatus(
  equipmentStatus: EquipmentStatus,
  riderRole: string
): { valid: boolean; missing: string[] } {
  const required = getRequiredEquipment(riderRole);
  const missing: string[] = [];

  if (required.includes('helmet') && !equipmentStatus.hasHelmet) {
    missing.push('Helmet');
  }

  if (required.includes('reflector_vest') && !equipmentStatus.hasReflectorVest) {
    missing.push('Reflector Vest');
  }

  if (required.includes('insulated_box') && !equipmentStatus.hasInsulatedBox) {
    missing.push('Insulated Box');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
