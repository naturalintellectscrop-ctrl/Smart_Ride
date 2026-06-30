import { NextRequest, NextResponse } from 'next/server';
import { db, setServiceRoleContext, resetRLSContext } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from '@/lib/auth/jwt';
import { createAuditLog, AuditActions, EntityTypes } from '@/lib/api/audit';
import { DocumentType, DocumentStatus, MerchantStatus, UserRole, UserStatus } from '@prisma/client';

/**
 * POST /api/merchants/register
 * Register a new merchant with documents stored in database
 */
export async function POST(request: NextRequest) {
  await setServiceRoleContext();
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

    // Normal app flow: /auth/register (User created) → onboarding → here, so the
    // caller is AUTHENTICATED. Attach the merchant to the existing user instead
    // of creating a new account (which collides on phone).
    const bearer = request.headers.get('authorization')?.replace('Bearer ', '');
    const decoded = bearer ? verifyAccessToken(bearer) : null;
    const authedUserId = decoded?.userId || null;

    // Validate required fields
    if (!name || !type || !phone || !address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, type, phone, address' },
        { status: 400 }
      );
    }

    // Duplicate-user check only for STANDALONE signup (no token). An
    // authenticated caller is attaching a merchant to their own account.
    if (!authedUserId) {
      const existingUser = await db.user.findFirst({
        where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
      });
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'User already exists with this phone or email' },
          { status: 400 }
        );
      }
    }

    // ---- AUTHENTICATED FLOW: attach merchant to the existing user ----
    if (authedUserId) {
      const existingUser = await db.user.findUnique({ where: { id: authedUserId } });
      if (!existingUser) {
        return NextResponse.json({ success: false, error: 'Authenticated user not found' }, { status: 401 });
      }
      const merchantData = {
        name, type: type as any, phone, email, address, city,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        openingTime, closingTime, bankName, bankAccountName, bankAccountNumber,
        status: MerchantStatus.PENDING_APPROVAL, isOpen: false,
        businessLicenseUrl: documents?.businessLicense || null,
        logoUrl: documents?.logo || null,
      };
      const merchant = await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: authedUserId }, data: { role: UserRole.MERCHANT } });
        const m = await tx.merchant.upsert({
          where: { userId: authedUserId },
          create: { userId: authedUserId, ...merchantData },
          update: merchantData,
        });
        const docs: Promise<unknown>[] = [];
        const addDoc = (dt: DocumentType, fn: string, url?: string, desc?: string) => {
          if (!url) return;
          docs.push(tx.document.create({ data: {
            merchantId: m.id, documentType: dt, fileName: fn, fileUrl: url,
            mimeType: 'image/jpeg', status: DocumentStatus.PENDING, ...(desc ? { description: desc } : {}),
          }}));
        };
        addDoc(DocumentType.BUSINESS_LICENSE, 'business_license.jpg', documents?.businessLicense);
        addDoc(DocumentType.NATIONAL_ID_FRONT, 'national_id_front.jpg', documents?.nationalIdFront);
        addDoc(DocumentType.NATIONAL_ID_BACK, 'national_id_back.jpg', documents?.nationalIdBack);
        addDoc(DocumentType.OTHER, 'logo.jpg', documents?.logo, 'Merchant logo');
        await Promise.all(docs);
        return m;
      });
      return NextResponse.json({
        success: true,
        message: 'Application submitted! Your store is pending admin approval.',
        merchant: { id: merchant.id, name: merchant.name, type: merchant.type, status: merchant.status },
      });
    }

    // Check if merchant with same name exists (standalone only)
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
  } finally {
    await resetRLSContext();
  }
}

/**
 * GET /api/merchants/register
 * Get registration status for a merchant
 */
export async function GET(request: NextRequest) {
  await setServiceRoleContext();
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');

    if (!merchantId) {
      return NextResponse.json({ success: false, error: 'merchantId is required' },
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
    return NextResponse.json({ success: false, error: 'Failed to fetch registration status' },
      { status: 500 }
    );
  } finally {
    await resetRLSContext();
  }
}
