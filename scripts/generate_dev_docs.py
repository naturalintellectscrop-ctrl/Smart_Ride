#!/usr/bin/env python3
"""
Smart Ride Developer Documentation Generator
"""

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import os

# Register fonts
pdfmetrics.registerFont(TTFont('Times New Roman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
registerFontFamily('Times New Roman', normal='Times New Roman', bold='Times New Roman')

# Create document
output_path = '/home/z/my-project/public/Smart_Ride_Developer_Documentation.pdf'
doc = SimpleDocTemplate(
    output_path,
    pagesize=letter,
    title='Smart Ride Developer Documentation',
    author='Z.ai',
    creator='Z.ai',
    subject='Developer onboarding guide for Smart Ride platform'
)

# Styles
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'Title',
    parent=styles['Title'],
    fontName='Times New Roman',
    fontSize=28,
    textColor=colors.HexColor('#1F4E79'),
    spaceAfter=30,
    alignment=TA_CENTER
)

h1_style = ParagraphStyle(
    'H1',
    parent=styles['Heading1'],
    fontName='Times New Roman',
    fontSize=18,
    textColor=colors.HexColor('#1F4E79'),
    spaceBefore=20,
    spaceAfter=12
)

h2_style = ParagraphStyle(
    'H2',
    parent=styles['Heading2'],
    fontName='Times New Roman',
    fontSize=14,
    textColor=colors.HexColor('#22C55E'),
    spaceBefore=16,
    spaceAfter=8
)

body_style = ParagraphStyle(
    'Body',
    parent=styles['Normal'],
    fontName='Times New Roman',
    fontSize=10,
    leading=14,
    spaceAfter=8,
    alignment=TA_JUSTIFY
)

code_style = ParagraphStyle(
    'Code',
    parent=styles['Normal'],
    fontName='Times New Roman',
    fontSize=9,
    leading=12,
    leftIndent=20,
    textColor=colors.HexColor('#333333'),
    backColor=colors.HexColor('#F5F5F5')
)

# Build story
story = []

# Cover Page
story.append(Spacer(1, 100))
story.append(Paragraph('<b>Smart Ride</b>', title_style))
story.append(Paragraph('<b>Developer Documentation</b>', ParagraphStyle(
    'Subtitle',
    fontName='Times New Roman',
    fontSize=20,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#666666'),
    spaceAfter=40
)))
story.append(Paragraph('Multi-Service Mobility Platform', ParagraphStyle(
    'Tagline',
    fontName='Times New Roman',
    fontSize=14,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#888888'),
    spaceAfter=60
)))
story.append(Paragraph('Onboarding Guide for New Developers', ParagraphStyle(
    'Purpose',
    fontName='Times New Roman',
    fontSize=12,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#666666')
)))
story.append(PageBreak())

# Table of Contents
story.append(Paragraph('<b>Table of Contents</b>', h1_style))
story.append(Spacer(1, 12))

toc_items = [
    ('1. What is Smart Ride?', 3),
    ('2. Project Structure', 3),
    ('3. Tech Stack', 4),
    ('4. Database Models', 5),
    ('5. API Endpoints', 6),
    ('6. Approval Workflows', 7),
    ('7. Authentication Flow', 8),
    ('8. Real-time Features', 8),
    ('9. Mobile App Architecture', 9),
    ('10. External Integrations', 10),
    ('11. Quick Start Commands', 10),
    ('12. Important Notes', 11),
]

for item, page in toc_items:
    story.append(Paragraph(f'{item}', body_style))

story.append(PageBreak())

# Section 1: What is Smart Ride?
story.append(Paragraph('<b>1. What is Smart Ride?</b>', h1_style))
story.append(Paragraph(
    '<b>Smart Ride</b> is a multi-service mobility platform in Uganda offering:',
    body_style
))
story.append(Paragraph('<b>Smart Boda</b> - Motorcycle taxi rides', body_style))
story.append(Paragraph('<b>Smart Car</b> - Car rides', body_style))
story.append(Paragraph('<b>Food Delivery</b> - Restaurant ordering', body_style))
story.append(Paragraph('<b>Shopping Delivery</b> - Supermarket/retail', body_style))
story.append(Paragraph('<b>Item Delivery</b> - Parcel/package delivery', body_style))
story.append(Paragraph('<b>Smart Health</b> - Pharmacy delivery with prescription verification', body_style))
story.append(Spacer(1, 12))

# Section 2: Project Structure
story.append(Paragraph('<b>2. Project Structure</b>', h1_style))
story.append(Paragraph('/home/z/my-project/', code_style))
story.append(Paragraph('src/                          # Main Next.js application', code_style))
story.append(Paragraph('  app/                        # Pages and API routes (App Router)', code_style))
story.append(Paragraph('    api/                      # REST API endpoints', code_style))
story.append(Paragraph('    admin/                    # Admin dashboard pages', code_style))
story.append(Paragraph('    page.tsx                  # Home page', code_style))
story.append(Paragraph('  components/', code_style))
story.append(Paragraph('    ui/                       # 50+ shadcn/ui components', code_style))
story.append(Paragraph('    dashboard/                # Admin dashboard components', code_style))
story.append(Paragraph('    smart-ride/               # Main app components', code_style))
story.append(Paragraph('    mobile/                   # Mobile-specific screens', code_style))
story.append(Paragraph('  lib/                        # Core services and utilities', code_style))
story.append(Paragraph('prisma/                       # Database schema', code_style))
story.append(Paragraph('smart-ride-mobile/            # React Native/Expo mobile app', code_style))
story.append(Paragraph('mini-services/                # Microservices (Socket.io, etc.)', code_style))
story.append(Paragraph('db/                           # SQLite database', code_style))
story.append(Spacer(1, 12))

# Section 3: Tech Stack
story.append(Paragraph('<b>3. Tech Stack</b>', h1_style))

tech_data = [
    [Paragraph('<b>Layer</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=10, textColor=colors.white)),
     Paragraph('<b>Technology</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=10, textColor=colors.white))],
    [Paragraph('Frontend', body_style), Paragraph('Next.js 16, React 19, TypeScript, Tailwind CSS 4', body_style)],
    [Paragraph('UI Library', body_style), Paragraph('shadcn/ui (50+ components)', body_style)],
    [Paragraph('State', body_style), Paragraph('Zustand (client), TanStack Query (server)', body_style)],
    [Paragraph('Database', body_style), Paragraph('Prisma ORM + SQLite', body_style)],
    [Paragraph('Auth', body_style), Paragraph('JWT + Firebase (Google/Phone)', body_style)],
    [Paragraph('Real-time', body_style), Paragraph('Socket.io', body_style)],
    [Paragraph('Maps', body_style), Paragraph('Mapbox', body_style)],
    [Paragraph('Mobile', body_style), Paragraph('Expo (React Native) + NativeWind', body_style)],
]

tech_table = Table(tech_data, colWidths=[120, 350])
tech_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, -1), 'Times New Roman'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BACKGROUND', (0, 1), (-1, -1), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
]))
story.append(tech_table)
story.append(PageBreak())

# Section 4: Database Models
story.append(Paragraph('<b>4. Database Models (Key Entities)</b>', h1_style))
story.append(Paragraph('User - Base user model for all roles', body_style))
story.append(Paragraph('Rider - Service providers (drivers)', body_style))
story.append(Paragraph('Vehicle - Rider vehicle information', body_style))
story.append(Paragraph('Merchant - Restaurants, shops, pharmacies', body_style))
story.append(Paragraph('MenuItem - Merchant product catalog', body_style))
story.append(Paragraph('Order - Food/shopping orders', body_style))
story.append(Paragraph('Task - Unified model for all services', body_style))
story.append(Paragraph('Payment - Payment records', body_style))
story.append(Paragraph('HealthProvider - Pharmacies, clinics, doctors', body_style))
story.append(Paragraph('HealthOrder - Smart Health pharmacy orders', body_style))
story.append(Paragraph('Prescription - Medical prescriptions', body_style))
story.append(Paragraph('SOSAlert - Emergency alerts', body_style))
story.append(Spacer(1, 12))

story.append(Paragraph('<b>Task Lifecycle (State Machine)</b>', h2_style))
story.append(Paragraph('CREATED - MATCHING - ASSIGNED - ACCEPTED - ARRIVED - PICKED_UP - IN_TRANSIT - DELIVERED - COMPLETED', code_style))
story.append(Paragraph('(or CANCELLED at any point)', body_style))
story.append(Spacer(1, 12))

# Section 5: API Endpoints
story.append(Paragraph('<b>5. API Endpoints Overview</b>', h1_style))

api_data = [
    [Paragraph('<b>Route</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=10, textColor=colors.white)),
     Paragraph('<b>Purpose</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=10, textColor=colors.white))],
    [Paragraph('/api/auth/*', body_style), Paragraph('Login, register, OAuth, token refresh', body_style)],
    [Paragraph('/api/tasks/*', body_style), Paragraph('Create rides/deliveries, track, update status', body_style)],
    [Paragraph('/api/orders/*', body_style), Paragraph('Food/shopping orders', body_style)],
    [Paragraph('/api/riders/*', body_style), Paragraph('Rider management, approval', body_style)],
    [Paragraph('/api/merchants/*', body_style), Paragraph('Restaurant/shop management', body_style)],
    [Paragraph('/api/health-provider/*', body_style), Paragraph('Pharmacy registration, verification', body_style)],
    [Paragraph('/api/health-orders/*', body_style), Paragraph('Medicine delivery orders', body_style)],
    [Paragraph('/api/dispatch/*', body_style), Paragraph('Task matching and assignment', body_style)],
    [Paragraph('/api/sos/*', body_style), Paragraph('Emergency alerts', body_style)],
    [Paragraph('/api/payments/*', body_style), Paragraph('Payment processing', body_style)],
    [Paragraph('/api/admin/*', body_style), Paragraph('Admin operations', body_style)],
]

api_table = Table(api_data, colWidths=[150, 320])
api_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, -1), 'Times New Roman'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
]))
story.append(api_table)
story.append(PageBreak())

# Section 6: Approval Workflows
story.append(Paragraph('<b>6. Approval Workflows (CRITICAL)</b>', h1_style))
story.append(Paragraph('All service providers require admin verification:', body_style))
story.append(Spacer(1, 8))

story.append(Paragraph('<b>Riders</b>', h2_style))
story.append(Paragraph('Endpoint: POST /api/riders/approve', body_style))
story.append(Paragraph('Status: PENDING_APPROVAL - APPROVED/REJECTED/SUSPENDED', body_style))
story.append(Paragraph('Equipment tracked: hasReflectorVest, hasHelmet, hasInsulatedBox', body_style))
story.append(Spacer(1, 8))

story.append(Paragraph('<b>Merchants</b>', h2_style))
story.append(Paragraph('Endpoint: POST /api/admin/merchants/verify', body_style))
story.append(Paragraph('Status: PENDING_APPROVAL - APPROVED/REJECTED/SUSPENDED', body_style))
story.append(Paragraph('Actions: approve, reject, suspend, activate', body_style))
story.append(Spacer(1, 8))

story.append(Paragraph('<b>Health Providers</b>', h2_style))
story.append(Paragraph('Endpoint: POST /api/admin/health-providers/verify', body_style))
story.append(Paragraph('Status: PENDING - APPROVED/REJECTED/SUSPENDED/DOCUMENTS_REQUESTED', body_style))
story.append(Paragraph('Actions: approve, reject, suspend, activate, request_documents', body_style))
story.append(Spacer(1, 12))

approval_data = [
    [Paragraph('<b>Entity</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=10, textColor=colors.white)),
     Paragraph('<b>Initial Status</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=10, textColor=colors.white)),
     Paragraph('<b>Approval Endpoint</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=10, textColor=colors.white)),
     Paragraph('<b>Required Role</b>', ParagraphStyle('th', fontName='Times New Roman', fontSize=10, textColor=colors.white))],
    [Paragraph('Rider', body_style), Paragraph('PENDING_APPROVAL', body_style), Paragraph('/api/riders/approve', body_style), Paragraph('ADMIN', body_style)],
    [Paragraph('Merchant', body_style), Paragraph('PENDING_APPROVAL', body_style), Paragraph('/api/admin/merchants/verify', body_style), Paragraph('ADMIN', body_style)],
    [Paragraph('Health Provider', body_style), Paragraph('PENDING', body_style), Paragraph('/api/admin/health-providers/verify', body_style), Paragraph('ADMIN', body_style)],
]

approval_table = Table(approval_data, colWidths=[90, 90, 170, 90])
approval_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1F4E79')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, -1), 'Times New Roman'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
]))
story.append(approval_table)
story.append(PageBreak())

# Section 7: Authentication
story.append(Paragraph('<b>7. Authentication Flow</b>', h1_style))
story.append(Paragraph('Email/Password Login - JWT Token', body_style))
story.append(Paragraph('Google OAuth - Firebase - JWT Token', body_style))
story.append(Paragraph('Phone OTP - Firebase - JWT Token', body_style))
story.append(Spacer(1, 12))

story.append(Paragraph('<b>User Roles</b>', h2_style))
story.append(Paragraph('CLIENT - Regular users', body_style))
story.append(Paragraph('RIDER - Drivers (boda/car/delivery)', body_style))
story.append(Paragraph('MERCHANT - Restaurant/shop owners', body_style))
story.append(Paragraph('PHARMACIST / HEALTH_PROVIDER - Pharmacy staff', body_style))
story.append(Paragraph('ADMIN, SUPER_ADMIN, etc. - Platform management', body_style))
story.append(Spacer(1, 12))

# Section 8: Real-time Features
story.append(Paragraph('<b>8. Real-time Features (Socket.io)</b>', h1_style))
story.append(Paragraph('Port 3001 - WebSocket server', body_style))
story.append(Spacer(1, 8))

story.append(Paragraph('<b>Key Events:</b>', h2_style))
story.append(Paragraph('task:status - Live task updates', body_style))
story.append(Paragraph('rider:location - GPS tracking', body_style))
story.append(Paragraph('dispatch:request - New task notification to driver', body_style))
story.append(Paragraph('order:status - Order updates', body_style))
story.append(Paragraph('chat:message - In-app messaging', body_style))
story.append(Paragraph('sos:alert - Emergency broadcast', body_style))
story.append(Paragraph('heartbeat - Connection health', body_style))
story.append(Spacer(1, 12))

# Section 9: Mobile App
story.append(Paragraph('<b>9. Mobile App Architecture</b>', h1_style))
story.append(Paragraph('smart-ride-mobile/', code_style))
story.append(Paragraph('  app/                  # Expo Router screens', code_style))
story.append(Paragraph('    (tabs)/             # Tab navigation', code_style))
story.append(Paragraph('    auth/               # Login, Register', code_style))
story.append(Paragraph('    rider/              # Ride booking flow', code_style))
story.append(Paragraph('    driver/             # Driver dashboard', code_style))
story.append(Paragraph('    orders/             # Food/order screens', code_style))
story.append(Paragraph('  src/', code_style))
story.append(Paragraph('    store/              # Zustand stores', code_style))
story.append(Paragraph('    services/           # API client, Socket.io', code_style))
story.append(Paragraph('    config/             # Environment config', code_style))
story.append(PageBreak())

# Section 10: External Integrations
story.append(Paragraph('<b>10. External Integrations</b>', h1_style))

story.append(Paragraph('<b>Firebase</b>', h2_style))
story.append(Paragraph('Google Sign-In, Phone Authentication (SMS OTP), FCM Push Notifications', body_style))
story.append(Spacer(1, 8))

story.append(Paragraph('<b>Mapbox</b>', h2_style))
story.append(Paragraph('Geocoding (Uganda-focused), Reverse geocoding, Directions API, Static map generation', body_style))
story.append(Spacer(1, 8))

story.append(Paragraph('<b>Environment Variables Needed</b>', h2_style))
story.append(Paragraph('DATABASE_URL - SQLite database path', code_style))
story.append(Paragraph('JWT_SECRET - Authentication secret', code_style))
story.append(Paragraph('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN - Mapbox token', code_style))
story.append(Paragraph('NEXT_PUBLIC_FIREBASE_* - Firebase config keys', code_style))
story.append(Spacer(1, 12))

# Section 11: Quick Start
story.append(Paragraph('<b>11. Quick Start Commands</b>', h1_style))
story.append(Paragraph('# Install dependencies', code_style))
story.append(Paragraph('bun install', code_style))
story.append(Spacer(1, 6))
story.append(Paragraph('# Setup database', code_style))
story.append(Paragraph('bun run db:push', code_style))
story.append(Paragraph('bun run db:seed', code_style))
story.append(Spacer(1, 6))
story.append(Paragraph('# Run web app (port 3000)', code_style))
story.append(Paragraph('bun run dev', code_style))
story.append(Spacer(1, 6))
story.append(Paragraph('# Run Socket.io service (port 3001)', code_style))
story.append(Paragraph('cd mini-services/realtime-service && bun run index.ts', code_style))
story.append(Spacer(1, 6))
story.append(Paragraph('# Run mobile app (local development)', code_style))
story.append(Paragraph('cd smart-ride-mobile && npx expo start', code_style))
story.append(Spacer(1, 12))

# Section 12: Important Notes
story.append(Paragraph('<b>12. Important Notes</b>', h1_style))
story.append(Paragraph('1. Riders need admin approval before accessing driver features', body_style))
story.append(Paragraph('2. Merchants need admin approval before receiving orders', body_style))
story.append(Paragraph('3. Health Providers need admin approval before processing prescriptions', body_style))
story.append(Paragraph('4. Admin dashboard NOT available in mobile app - Role-based restriction', body_style))
story.append(Paragraph('5. All prices in UGX (Ugandan Shilling)', body_style))
story.append(Paragraph('6. Mapbox configured for Uganda - Kampala default coordinates', body_style))
story.append(Paragraph('7. Real-time features require Socket.io service running', body_style))
story.append(Spacer(1, 20))

story.append(Paragraph('Generated by Smart Ride Development Team', ParagraphStyle(
    'Footer',
    fontName='Times New Roman',
    fontSize=10,
    alignment=TA_CENTER,
    textColor=colors.HexColor('#888888')
)))

# Build PDF
doc.build(story)
print(f'PDF generated: {output_path}')
