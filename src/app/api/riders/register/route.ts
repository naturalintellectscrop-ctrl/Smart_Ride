/**
 * Rider Registration API
 * POST /api/riders/register - Register a new rider with documents
 * 
 * Creates user, rider profile, vehicle, and stores documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { generateTokenPair } from '@/lib/auth/jwt';
import { UserRole, UserStatus, RiderRole, RiderStatus, VehicleType } from '@prisma/client';
import { DocumentType } from '@prisma/client';

// Map rider role strings to enum
const RIDER_ROLE_MAP: Record<string, RiderRole> = {
  'SMART_BODA': RiderRole.SMART_BODA_RIDER,
  'SMART_CAR': RiderRole.SMART_CAR_DRIVER,
  'DELIVERY_PERSONNEL': RiderRole.DELIVERY_PERSONNEL,
};

// Map vehicle type strings to enum
const VEHICLE_TYPE_MAP: Record<string, VehicleType> = {
  'BODA': VehicleType.BODA,
  'CAR': VehicleType.CAR,
  'BICYCLE': VehicleType.BICYCLE,
  'SCOOTER': VehicleType.SCOOTER,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      // Personal Info
      email,
      phone,
      password,
      fullName,
      physicalAddress,
      
      // Role
      riderRoleType, // 'SMART_BODA', 'SMART_CAR', 'DELIVERY_PERSONNEL'
      
      // Vehicle Info
      vehicleType,
      vehiclePlate,
      vehicleModel,
      vehicleColor,
      
      // Documents (base64 data URLs)
      documents: {
        facePhoto,
        nationalIdFront,
        nationalIdBack,
        driversLicense,
      },
    } = body;

    // Validate required fields
    if (!fullName || !phone || !physicalAddress || !riderRoleType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { phone: `+256${phone}` },
          { email: email || `${phone}@smartride.temp` },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this phone number already exists' },
        { status: 400 }
      );
    }

    // Hash password if provided
    const passwordHash = password ? await hashPassword(password) : null;

    // Generate temporary email if not provided
    const userEmail = email || `${phone}@smartride.ug`;

    // Create user with rider profile in a transaction
    const result = await db.$transaction(async (tx) => {
      // 1. Create user
      const user = await tx.user.create({
        data: {
          email: userEmail,
          phone: `+256${phone}`,
          passwordHash,
          name: fullName,
          role: UserRole.RIDER,
          status: UserStatus.ACTIVE,
          authProvider: 'phone',
        },
      });

      // 2. Create rider profile
      const rider = await tx.rider.create({
        data: {
          userId: user.id,
          fullName,
          phone: `+256${phone}`,
          email: userEmail,
          physicalAddress,
          riderRole: RIDER_ROLE_MAP[riderRoleType] || RiderRole.DELIVERY_PERSONNEL,
          vehicleType: vehicleType ? VEHICLE_TYPE_MAP[vehicleType] : null,
          status: RiderStatus.PENDING_APPROVAL,
        },
      });

      // 3. Create vehicle if applicable
      if (vehicleType && vehiclePlate) {
        await tx.vehicle.create({
          data: {
            riderId: rider.id,
            make: vehicleModel?.split(' ')[0] || 'Unknown',
            model: vehicleModel || 'Unknown',
            color: vehicleColor || 'Unknown',
            plateNumber: vehiclePlate.toUpperCase(),
          },
        });
      }

      // 4. Store documents
      const documentPromises = [];
      
      if (facePhoto) {
        documentPromises.push(
          tx.document.create({
            data: {
              riderId: rider.id,
              documentType: DocumentType.FACE_PHOTO,
              fileName: 'face_photo.jpg',
              fileUrl: facePhoto,
              fileSize: Buffer.from(facePhoto.split(',')[1], 'base64').length,
              mimeType: 'image/jpeg',
            },
          })
        );
      }

      if (nationalIdFront) {
        documentPromises.push(
          tx.document.create({
            data: {
              riderId: rider.id,
              documentType: DocumentType.NATIONAL_ID_FRONT,
              fileName: 'national_id_front.jpg',
              fileUrl: nationalIdFront,
              fileSize: Buffer.from(nationalIdFront.split(',')[1], 'base64').length,
              mimeType: 'image/jpeg',
            },
          })
        );
      }

      if (nationalIdBack) {
        documentPromises.push(
          tx.document.create({
            data: {
              riderId: rider.id,
              documentType: DocumentType.NATIONAL_ID_BACK,
              fileName: 'national_id_back.jpg',
              fileUrl: nationalIdBack,
              fileSize: Buffer.from(nationalIdBack.split(',')[1], 'base64').length,
              mimeType: 'image/jpeg',
            },
          })
        );
      }

      if (driversLicense) {
        documentPromises.push(
          tx.document.create({
            data: {
              riderId: rider.id,
              documentType: DocumentType.DRIVERS_LICENSE,
              fileName: 'drivers_license.jpg',
              fileUrl: driversLicense,
              fileSize: Buffer.from(driversLicense.split(',')[1], 'base64').length,
              mimeType: 'image/jpeg',
            },
          })
        );
      }

      await Promise.all(documentPromises);

      // 5. Update rider with document URLs
      await tx.rider.update({
        where: { id: rider.id },
        data: {
          facePhotoUrl: facePhoto || null,
          nationalIdFrontUrl: nationalIdFront || null,
          nationalIdBackUrl: nationalIdBack || null,
          driverLicenseUrl: driversLicense || null,
        },
      });

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
  }
}
