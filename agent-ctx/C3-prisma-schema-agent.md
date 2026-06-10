# Task C3 - Prisma Schema Sync Agent

## Task
Sync Prisma schema with codebase to fix ~185 TypeScript errors caused by missing models, fields, and enum values.

## What Was Done

### New Models Added
1. **EmergencyContact** - Emergency contacts for SOS/alert system
   - Fields: id, userId, userType, name, phone, email, relationship, isPrimary, verificationCode, isVerified, verifiedAt
   - Referenced by: `src/app/api/emergency-contacts/route.ts`

2. **ExpoPushToken** - Push notification tokens for mobile devices
   - Fields: id, userId, token (unique), platform, deviceId, deviceInfo, isActive, lastUsedAt
   - Referenced by: `src/lib/services/push-notification.service.ts`

### Fields Added to Existing Models

1. **FraudAlert** - Added 14 fields:
   - alertNumber (String @unique), entityType, entityId, riskScoreAtDetection, evidence, detectedPatterns, relatedActivityIds, confidenceScore, falsePositiveRisk, detectionMethod, reviewNotes, resolvedBy, resolvedAt, resolutionAction, adminDecision, isFalsePositive, mlFeedbackGiven

2. **FraudRiskScore** - Added 3 fields:
   - isRestricted, restrictionsApplied, lastAnalyzedAt

3. **SuspiciousActivityLog** - Added 10 fields:
   - activityCategory, referenceType, referenceId, riskIndicators, riskScore, deviceFingerprint, ipAddress, userAgent, latitude, longitude, matchedPatterns

4. **DeviceFingerprint** - Added 5 fields:
   - associatedAccounts, accountCount, lastActivityAt, activityCount, riskScore, updatedAt

5. **Merchant** - Added 1 field:
   - userId (optional link to User)

6. **DriverReputation** - Renamed relation:
   - `alerts` → `performanceAlerts` (to match codebase)

7. **DriverReputationHistory** - Added 1 field:
   - metadata

8. **ConnectionAlert** - Added relation to Rider:
   - rider field, connectionAlerts on Rider

9. **MedicineCatalog** - Added 9 fields:
   - dosageForm, strength, packSize, discountedPrice, lowStockThreshold, isControlled, controlledLevel, shelfLife, searchKeywords

10. **PharmacyOrderTicket** - Added field + relation:
    - pharmacyId field, pharmacy relation, pharmacyOrderTickets on Pharmacy

### Enum Values Added

1. **ActorType**: HEALTH_PROVIDER
2. **NotificationType**: SURGE_ALERT, HIGH_DEMAND_ZONE, INCENTIVE_AVAILABLE, INCENTIVE_EARNED, INCENTIVE_EXPIRING, EARNINGS_OPPORTUNITY, PERFORMANCE_ALERT, SAFETY_ALERT, COMPLIANCE_UPDATE
3. **FraudAlertType**: ABNORMAL_ORDER_FREQUENCY, MULTIPLE_ACCOUNTS_SAME_DEVICE, SUSPICIOUS_GPS, PAYMENT_FRAUD
4. **FraudAlertStatus**: DISMISSED, ESCALATED
5. **IncentiveStatus**: SCHEDULED
6. **ParticipationStatus**: CANCELLED

## Validation
- `npx prisma format` ✅
- `npx prisma validate` ✅
- `npx prisma generate` ✅
- Did NOT run `prisma db push` (per instructions)
