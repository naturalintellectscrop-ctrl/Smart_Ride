/**
 * Rider Registration API
 * POST /api/riders/register - Register a new rider with documents
 * 
 * Creates user, rider profile, vehicle, and stores documents.
 * Document values may be either base64 data URLs OR plain URLs (e.g. from /uploads/documents).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { generateTokenPair, verifyAccessToken } from '@/lib/auth/jwt';
import { UserRole, UserStatus, RiderRole, RiderStatus, VehicleType } from '@prisma/client';
import { DocumentType } from '@prisma/client';

// Map rider role strings to enum
const RIDER_ROLE_MAP: Record<string, RiderRole> = {
  'SMART_BODA': RiderRole.SMART_BODA_RIDER,
  'SMART_BODA_RIDER': RiderRole.SMART_BODA_RIDER,
  'SMART_CAR': RiderRole.SMART_CAR_DRIVER,
  'SMART_CAR_DRIVER': RiderRole.SMART_CAR_DRIVER,
  'DELIVERY_PERSONNEL': RiderRole.DELIVERY_PERSONNEL,
};

// Map vehicle type strings to enum
const VEHICLE_TYPE_MAP: Record<string, VehicleType> = {
  'BODA': VehicleType.BODA,
  'MOTORCYCLE': VehicleType.BODA,
  'CAR': VehicleType.CAR,
  'BICYCLE': VehicleType.BICYCLE,
  'SCOOTER': VehicleType.SCOOTER,
};

/**
 * Determine if a string is a base64 data URL (e.g. "data:image/jpeg;base64,...")
 * vs. a regular URL (e.g. "https://...").
 */
function isDataUrl(value: string): boolean {
  return typeof value === 'string' && value.startsWith('data:');
}

/** Safely compute byte size of a base64 data URL, returns 0 for plain URLs. */
function dataUrlByteSize(value: string | undefined | null): number {
  if (!value || !isDataUrl(value)) return 0;
  try {
    const base64Part = value.split(',')[1] || '';
    return Buffer.from(base64Part, 'base64').length;
  } catch {
    return 0;
  }
}

export async function POST(request: NextRequest) {
  await setServiceRoleContext();
  try {
    const body = await request.json();

    // The normal app flow is /auth/register (creates the User) → onboarding →
    // this endpoint. In that case the caller is AUTHENTICATED and we must
    // attach the rider profile to the EXISTING user, not create a new account
    // (which collides on phone/email). Standalone signup (no token) keeps the
    // create-user path below.
    const bearer = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = bearer ? verifyAccessToken(bearer) : null;
    const authedUserId = decoded?.userId || null;

    const {
      // Personal Info
      email,
      phone,
      password,
      fullName,
      physicalAddress,
      address, // alias
      
      // Role
      riderRoleType, // 'SMART_BODA', 'SMART_CAR', 'DELIVERY_PERSONNEL'
      riderRole,
      
      // Vehicle Info
      vehicleType,
      vehiclePlate,
      plateNumber, // alias
      vehicleModel,
      model, // alias
      make,
      vehicleColor,
      color, // alias
      year,
      
      // Documents — accept both nested object and top-level URL fields
      documents: documentsRaw,
      facePhoto,
      nationalIdFront,
      nationalIdBack,
      driversLicense,
      // URL-style fields (uploaded separately via /uploads/documents)
      photoUrl,
      nationalIdFrontUrl,
      nationalIdBackUrl,
      driverLicenseUrl,
      vehiclePhotoUrl,
    } = body;

    // Normalise documents object — supports both { documents: {...} } and top-level fields
    const documents = documentsRaw || {};
    const resolvedFacePhoto = facePhoto || documents.facePhoto || photoUrl || '';
    const resolvedNationalIdFront = nationalIdFront || documents.nationalIdFront || nationalIdFrontUrl || '';
    const resolvedNationalIdBack = nationalIdBack || documents.nationalIdBack || nationalIdBackUrl || '';
    const resolvedDriversLicense = driversLicense || documents.driversLicense || driverLicenseUrl || '';
    const resolvedVehiclePhoto = vehiclePhotoUrl || documents.vehiclePhoto || '';

    const resolvedPhone = phone || '';
    const resolvedAddress = physicalAddress || address || '';
    const resolvedRiderRoleType = riderRoleType || riderRole || '';
    const resolvedPlate = vehiclePlate || plateNumber || '';
    const resolvedModel = vehicleModel || model || '';
    const resolvedColor = vehicleColor || color || '';
    const resolvedMake = make || (resolvedModel ? resolvedModel.split(' ')[0] : 'Unknown');

    // Validate required fields
    if (!fullName || !resolvedPhone || !resolvedAddress || !resolvedRiderRoleType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: fullName, phone, address, riderRole' },
        { status: 400 }
      );
    }

    // Normalise phone to E.164 (+256...)
    const normalizedPhone = resolvedPhone.startsWith('+')
      ? resolvedPhone
      : resolvedPhone.startsWith('0')
        ? `+256${resolvedPhone.slice(1)}`
        : `+256${resolvedPhone}`;

    // For STANDALONE signup only (no auth token): reject duplicate phone/email.
    // Authenticated callers are attaching a rider profile to their own account,
    // so a "matching" user is expected (themselves) and must not be blocked.
    if (!authedUserId) {
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { email: email || `${resolvedPhone}@smartride.temp` },
          ],
        },
      });
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'User with this phone number already exists' },
          { status: 400 }
        );
      }
    }

    // Hash password if provided
    const passwordHash = password ? await hashPassword(password) : null;

    // Generate temporary email if not provided
    const userEmail = email || `${resolvedPhone}@smartride.ug`;

    // Determine vehicle type from rider role if not explicitly provided
    const resolvedVehicleType = vehicleType
      ? (VEHICLE_TYPE_MAP[vehicleType] || null)
      : (resolvedRiderRoleType === 'SMART_BODA' || resolvedRiderRoleType === 'SMART_BODA_RIDER'
          ? VehicleType.BODA
          : resolvedRiderRoleType === 'SMART_CAR' || resolvedRiderRoleType === 'SMART_CAR_DRIVER'
            ? VehicleType.CAR
            : null);

    // Shared document writer used by both flows.
    const writeDocs = (tx: any, riderId: string) => {
      const createDoc = (docType: DocumentType, fileName: string, fileUrl?: string | null) => {
        if (!fileUrl) return null;
        const isData = isDataUrl(fileUrl);
        return tx.document.create({
          data: {
            riderId, documentType: docType, fileName, fileUrl,
            fileSize: dataUrlByteSize(fileUrl) || null,
            mimeType: isData ? (fileUrl.match(/^data:(.*?);/)?.[1] || 'image/jpeg') : 'image/jpeg',
          },
        });
      };
      return Promise.all([
        createDoc(DocumentType.FACE_PHOTO, 'face_photo.jpg', resolvedFacePhoto),
        createDoc(DocumentType.NATIONAL_ID_FRONT, 'national_id_front.jpg', resolvedNationalIdFront),
        createDoc(DocumentType.NATIONAL_ID_BACK, 'national_id_back.jpg', resolvedNationalIdBack),
        createDoc(DocumentType.DRIVER_LICENSE, 'drivers_license.jpg', resolvedDriversLicense),
      ].filter(Boolean));
    };

    // ---- AUTHENTICATED FLOW: attach rider to the existing logged-in user ----
    if (authedUserId) {
      const existingUser = await db.user.findUnique({ where: { id: authedUserId } });
      if (!existingUser) {
        return NextResponse.json({ success: false, error: 'Authenticated user not found' }, { status: 401 });
      }

      // Vehicle plate numbers are globally unique. Fail fast with a clear message
      // if this plate is already registered to a DIFFERENT account, instead of
      // letting the unique-constraint violation surface as a generic 500.
      if (resolvedVehicleType && resolvedPlate) {
        const clash = await db.vehicle.findUnique({
          where: { plateNumber: resolvedPlate.toUpperCase() },
          select: { rider: { select: { userId: true } } },
        });
        if (clash && clash.rider?.userId !== authedUserId) {
          return NextResponse.json(
            { success: false, error: 'This vehicle plate number is already registered to another account.' },
            { status: 409 }
          );
        }
      }

      const authedResult = await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: authedUserId },
          data: { role: UserRole.RIDER, name: fullName || existingUser.name || undefined },
        });
        const riderData = {
          fullName,
          phone: normalizedPhone,
          email: existingUser.email,
          physicalAddress: resolvedAddress,
          riderRole: RIDER_ROLE_MAP[resolvedRiderRoleType] || RiderRole.DELIVERY_PERSONNEL,
          vehicleType: resolvedVehicleType,
          status: RiderStatus.PENDING_APPROVAL,
          facePhotoUrl: resolvedFacePhoto || null,
          nationalIdFrontUrl: resolvedNationalIdFront || null,
          nationalIdBackUrl: resolvedNationalIdBack || null,
          driverLicenseUrl: resolvedDriversLicense || null,
          vehiclePhotoUrl: resolvedVehiclePhoto || null,
        };
        const rider = await tx.rider.upsert({
          where: { userId: authedUserId },
          create: { userId: authedUserId, ...riderData },
          update: riderData,
        });
        if (resolvedVehicleType && resolvedPlate) {
          await tx.vehicle.upsert({
            where: { riderId: rider.id },
            create: {
              riderId: rider.id, make: resolvedMake, model: resolvedModel || 'Unknown',
              year: year ? Number(year) : null, color: resolvedColor || 'Unknown',
              plateNumber: resolvedPlate.toUpperCase(),
            },
            update: {
              make: resolvedMake, model: resolvedModel || 'Unknown',
              year: year ? Number(year) : null, color: resolvedColor || 'Unknown',
              plateNumber: resolvedPlate.toUpperCase(),
            },
          });
        }
        await writeDocs(tx, rider.id);
        return rider;
      });

      return NextResponse.json({
        success: true,
        message: 'Application submitted! Your account is pending admin approval.',
        rider: {
          id: authedResult.id,
          status: authedResult.status,
          riderRole: authedResult.riderRole,
        },
      });
    }

    // ---- STANDALONE FLOW: create a fresh user + rider ----
    // Reject a duplicate plate up front with a clear message (unique constraint).
    if (resolvedVehicleType && resolvedPlate) {
      const clash = await db.vehicle.findUnique({
        where: { plateNumber: resolvedPlate.toUpperCase() },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { success: false, error: 'This vehicle plate number is already registered to another account.' },
          { status: 409 }
        );
      }
    }

    // Create user with rider profile in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create user (if not already authenticated — for logged-in riders we still
      //    create a new user record because this endpoint registers a fresh account).
      const user = await tx.user.create({
        data: {
          email: userEmail,
          phone: normalizedPhone,
          passwordHash,
          name: fullName,
          role: UserRole.RIDER,
          status: UserStatus.ACTIVE,
          authProvider: 'phone',
        },
      });

      // 2. Create rider profile with document URLs
      const rider = await tx.rider.create({
        data: {
          userId: user.id,
          fullName,
          phone: normalizedPhone,
          email: userEmail,
          physicalAddress: resolvedAddress,
          riderRole: RIDER_ROLE_MAP[resolvedRiderRoleType] || RiderRole.DELIVERY_PERSONNEL,
          vehicleType: resolvedVehicleType,
          status: RiderStatus.PENDING_APPROVAL,
          facePhotoUrl: resolvedFacePhoto || null,
          nationalIdFrontUrl: resolvedNationalIdFront || null,
          nationalIdBackUrl: resolvedNationalIdBack || null,
          driverLicenseUrl: resolvedDriversLicense || null,
          vehiclePhotoUrl: resolvedVehiclePhoto || null,
        },
      });

      // 3. Create vehicle if applicable
      if (resolvedVehicleType && resolvedPlate) {
        await tx.vehicle.create({
          data: {
            riderId: rider.id,
            make: resolvedMake,
            model: resolvedModel || 'Unknown',
            year: year ? Number(year) : null,
            color: resolvedColor || 'Unknown',
            plateNumber: resolvedPlate.toUpperCase(),
          },
        });
      }

      // 4. Store documents (Document records) — supports both URL strings and base64 data URLs
      const documentPromises: Promise<unknown>[] = [];

      const createDoc = (
        docType: DocumentType,
        fileName: string,
        fileUrl: string | undefined | null,
      ) => {
        if (!fileUrl) return;
        const isData = isDataUrl(fileUrl);
        documentPromises.push(
          tx.document.create({
            data: {
              riderId: rider.id,
              documentType: docType,
              fileName,
              fileUrl,
              fileSize: dataUrlByteSize(fileUrl) || null,
              mimeType: isData ? (fileUrl.match(/^data:(.*?);/)?.[1] || 'image/jpeg') : 'image/jpeg',
            },
          })
        );
      };

      createDoc(DocumentType.FACE_PHOTO, 'face_photo.jpg', resolvedFacePhoto);
      createDoc(DocumentType.NATIONAL_ID_FRONT, 'national_id_front.jpg', resolvedNationalIdFront);
      createDoc(DocumentType.NATIONAL_ID_BACK, 'national_id_back.jpg', resolvedNationalIdBack);
      createDoc(DocumentType.DRIVER_LICENSE, 'drivers_license.jpg', resolvedDriversLicense);

      await Promise.all(documentPromises);

      return { user, rider };
    });

    // Generate tokens for auto-login
    const tokens = generateTokenPair(result.user);

    // Store refresh token
    await db.user.update({
      where: { id: result.user.id },
      data: {
        refreshToken: tokens.refreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Registration successful! Your application is pending approval.',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role,
      },
      rider: {
        id: result.rider.id,
        status: result.rider.status,
        riderRole: result.rider.riderRole,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });

    // Set refresh token cookie
    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Rider registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
