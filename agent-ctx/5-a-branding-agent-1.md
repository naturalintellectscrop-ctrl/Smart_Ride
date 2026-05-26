# Task 5-a: Rebrand Home, Profile, and Tab Layout screens

## Agent: branding-agent-1

## Work Completed

### 1. Tab Layout (`app/(tabs)/_layout.tsx`)
- Replaced all 4 emoji tab icons (🏠, 🚗, 📦, 👤) with Ionicons (home, car, receipt, person)
- Active tabs use filled Ionicon variant, inactive use outline variant
- Tab bar: dark glassmorphism style (`backgroundColor: 'rgba(13, 13, 18, 0.85)'`) with subtle border and shadow
- Active tab: neon green color with animated glow dot indicator below icon
- Inactive tab: textDim color
- Tab bar positioned absolute with elevated shadow for floating effect
- All colors from COLORS constant (no inline values)

### 2. Home Screen (`app/(tabs)/index.tsx`)
- Replaced solid green header with DARK header on COLORS.background
- Dark background with ambient gradient circles (green/cyan)
- Notification bell: Ionicons notifications-outline in white circle container
- Location bar: glass input style with location-outline Ionicon
- Search bar: glass input style with search-outline Ionicon and forward arrow badge
- Services grid: ServiceIcon component from shared components
  - Rides → boda (bike-outline, emerald)
  - Food → food (restaurant-outline, orange)
  - Shop → shopping (cart-outline, purple)
  - Delivery → delivery (gift-outline, teal)
  - Health → health (heart-outline, rose)
- Quick Ride cards: GlassCard with service color icon containers and LinearGradient Book buttons
- Promo banner: GlassCard variant="accent" with gradient Get Started button
- Header bottom: gradient glow border (green→cyan→transparent)

### 3. Profile Screen (`app/(tabs)/profile.tsx`)
- Replaced solid green header with DARK header on COLORS.background
- Avatar: green accent ring instead of solid green circle
- Avatar icon: person Ionicon in primary green color
- Stats container: GlassCard component
- Menu items: all emoji icons replaced with Ionicons in green-accented containers
- Menu chevron: Ionicons chevron-forward
- Logout: GlassCard wrapping GradientButton variant="danger" with log-out-outline Ionicon
- All logic, navigation, state management, API calls preserved unchanged

## Key Design Decisions
- Used shared components (GlassCard, GradientButton, ServiceIcon) for consistency
- Gradient glow borders at header bottoms match admin dashboard pattern
- All emoji icons completely eliminated in favor of Ionicons
- Dark backgrounds throughout - no solid green headers
- Service-specific colors from SERVICES constant for visual differentiation
