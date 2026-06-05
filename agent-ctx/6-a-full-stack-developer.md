# Task 6-a: Fix Client Wallet Component — Replace Mock Data with Real API Calls

**Agent**: full-stack-developer
**Status**: COMPLETED

## Summary
Refactored `ClientWallet` component at `src/components/smart-ride/dashboards/client/tabs/client-wallet.tsx` to replace all hardcoded mock data with real API calls to existing `/api/wallet` endpoints.

## Changes
- Removed all mock data (walletBalance, paymentMethods, transactions, promotions arrays)
- Added `fetchWalletData()` with `useEffect`/`useCallback` calling `GET /api/wallet`
- Added skeleton loading states for balance, payment methods, and transactions
- Added error state with retry button
- Mapped API transaction types (DEPOSIT, WITHDRAWAL, etc.) to credit/debit display
- Mapped API payment method types (MOBILE_MONEY, CARD, BANK) to display with icons
- Added `TopUpModal` calling `POST /api/wallet`
- Added `AddPaymentMethodModal` calling `POST /api/wallet/payment-methods`
- Added set default (`PUT`) and delete (`DELETE`) for payment methods
- Dynamic promotions section (empty state)
- Auth via `localStorage.getItem('accessToken')` Bearer token pattern
- All existing styling, layout, WalletTransfer integration preserved
- Zero lint errors
