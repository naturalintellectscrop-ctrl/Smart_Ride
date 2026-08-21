// ============================================
// SMART RIDE MOBILE - AUTH DESIGN LANGUAGE
// ============================================
// The shared vocabulary for every login and onboarding screen. Composition:
//
//   <AuthScreen lead="Create your" accent="account" step={…} showHero>
//     <FieldCard … />
//     <FieldCard … footer={<PasswordStrength … />} />
//     <GradientButton size="lg" shape="pill" iconPosition="right" … />
//     <AuthDivider />
//     <SocialButtons … />
//     <LegalFootnote />
//   </AuthScreen>
//
// Shape rule for this surface: cards and fields RADIUS.lg (16); CTAs, social
// buttons and chips RADIUS.full; the logo tile 14.
// ============================================

export { AuthScreen } from './AuthScreen';
export type { AuthScreenProps } from './AuthScreen';
export { AuthHeadline } from './AuthHeadline';
export { AuthHeroArt } from './AuthHeroArt';
export { AuthDivider } from './AuthDivider';
export { BrandLockup } from './BrandLockup';
export { StepRail } from './StepRail';
export { FieldCard } from './FieldCard';
export type { FieldCardProps } from './FieldCard';
export { PhoneFieldCard } from './PhoneFieldCard';
export { CountryCodePicker, SUPPORTED_COUNTRIES, UGANDA } from './CountryCodePicker';
export type { Country } from './CountryCodePicker';
export { UgFlag } from './UgFlag';
export { GoogleIcon } from './GoogleIcon';
export { SocialButtons } from './SocialButtons';
export { PasswordStrength } from './PasswordStrength';
export { LegalFootnote, TERMS_URL, PRIVACY_URL } from './LegalFootnote';
export { OtpBoxes, OTP_LENGTH } from './OtpBoxes';
