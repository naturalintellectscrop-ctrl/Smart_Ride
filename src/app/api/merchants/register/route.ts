import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { DocumentType, DocumentStatus, MerchantStatus, UserRole, UserStatus } from '@prisma/client';

/**
 * POST /api/merchants/register
 * Register a new merchant with documents stored in database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      phone,
      email,
      address,
      city,
      latitude,
      longitude,
      openingTime,
      closingTime,
      bankName,
      bankAccountName,
      bankAccountNumber,
      documents,
    } = body;

    // Validate required fields
    if (!name || !type || !phone || !address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, type, phone, address' },
        { status: 400 }
      );
    }

    // Check if user already exists with this phone
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { phone },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User already exists with this phone or email' },
        { status: 400 }
      );
    }

    // Check if merchant with same name exists
    const existingMerchant = await db.merchant.findFirst({
      where: { name },
    });

    if (existingMerchant) {
      return NextResponse.json(
        { success: false, error: 'A merchant with this name already exists' },
        { status: 400 }
      );
    }

    // Generate a temporary password for the user
    const tempPassword = `Merchant${Date.now()}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Use transaction to create user, merchant, and documents
    const result = await db.$transaction(async (tx) => {
      // Create user account
      const user = await tx.user.create({
        data: {
          email: email || `merchant_${Date.now()}@smartride.temp`,
          phone,
          name,
          passwordHash,
          role: UserRole.MERCHANT,
          status: UserStatus.ACTIVE,
          authProvider: 'email',
        },
      });

      // Create merchant record
      const merchant = await tx.merchant.create({
        data: {
          name,
          type: type as any,
          phone,
          email,
          address,
          city,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          openingTime,
          closingTime,
          bankName,
          bankAccountName,
          bankAccountNumber,
          status: MerchantStatus.PENDING_APPROVAL,
          isOpen: false,
        },
      });

      // Store documents in database
      const docPromises = [];

      if (documents?.businessLicense) {
        docPromises.push(
          tx.document.create({
            data: {
              merchantId: merchant.id,
              documentType: DocumentType.BUSINESS_LICENSE,
              fileName: 'business_license.jpg',
              fileUrl: documents.businessLicense, // Base64 or storage URL
              fileSize: Buffer.byteLength(documents.businessLicense, 'base64'),
              mimeType: 'image/jpeg',
              status: DocumentStatus.PENDING,
            },
          })
        );
      }

      if (documents?.nationalIdFront) {
        docPromises.push(
          tx.document.create({
            data: {
              merchantId: merchant.id,
              documentType: DocumentType.NATIONAL_ID_FRONT,
              fileName: 'national_id_front.jpg',
              fileUrl: documents.nationalIdFront,
              fileSize: Buffer.byteLength(documents.nationalIdFront, 'base64'),
              mimeType: 'image/jpeg',
              status: DocumentStatus.PENDING,
            },
          })
        );
      }

      if (documents?.nationalIdBack) {
        docPromises.push(
          tx.document.create({
            data: {
              merchantId: merchant.id,
              documentType: DocumentType.NATIONAL_ID_BACK,
              fileName: 'national_id_back.jpg',
              fileUrl: documents.nationalIdBack,
              fileSize: Buffer.byteLength(documents.nationalIdBack, 'base64'),
              mimeType: 'image/jpeg',
              status: DocumentStatus.PENDING,
            },
          })
        );
      }

      if (documents?.logo) {
        docPromises.push(
          tx.document.create({
            data: {
              merchantId: merchant.id,
              documentType: DocumentType.OTHER,
              fileName: 'logo.jpg',
              fileUrl: documents.logo,
              fileSize: Buffer.byteLength(documents.logo, 'base64'),
              mimeType: 'image/jpeg',
              status: DocumentStatus.PENDING,
              description: 'Merchant logo',
            },
          })
        );
      }

      await Promise.all(docPromises);

      return { user, merchant };
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
    });

    const refreshToken = generateRefreshToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
    });

    // Update user with refresh token
    await db.user.update({
      where: { id: result.user.id },
      data: {
        refreshToken,
        refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        lastLoginAt: new Date(),
      },
    });

    // Create audit log
    await createAuditLog({
      action: AuditActions.MERCHANT_REGISTERED,
      entityType: EntityTypes.MERCHANT,
      entityId: result.merchant.id,
      userId: result.user.id,
      actorType: 'USER',
      description: `New merchant registration: ${name} (${type})`,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        phone: result.user.phone,
        name: result.user.name,
        role: result.user.role,
      },
      merchant: {
        id: result.merchant.id,
        name: result.merchant.name,
        type: result.merchant.type,
        status: result.merchant.status,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Merchant registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register merchant' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/merchants/register
 * Get registration status for a merchant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');

    if (!merchantId) {
      return NextResponse.json(
        { error: 'merchantId is required' },
        { status: 400 }
      );
    }

    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
      include: {
        documents: {
          where: { merchantId },
        },
      },
    });

    if (!merchant) {
      return NextResponse.json({
        registered: false,
        merchant: null,
      });
    }

    return NextResponse.json({
      registered: true,
      merchant,
      documents: merchant.documents,
    });
  } catch (error) {
    console.error('Error fetching merchant registration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registration status' },
      { status: 500 }
    );
  }
}
