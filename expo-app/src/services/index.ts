// ============================================
// SMART RIDE MOBILE - SERVICES INDEX
// ============================================

export { api, default as apiService } from './api';
export { socketService, default } from './socket.service';
export { auditService, MobileAudit } from './audit.service';
export { notificationService } from './notification.service';
export {
  loginWithEmail,
  registerUser,
  loginWithGoogle,
  logout,
  isAuthenticated,
  getAccessToken,
  refreshAccessToken,
  getCurrentUser,
  saveTokens,
  saveUserData,
  getUserData,
  clearTokens,
  forgotPassword,
  resetPassword,
} from './auth';
export type { User, AuthResponse, LoginCredentials, RegisterData } from './auth';

// Re-export types
export type { ApiResponse, Task, Order, Merchant, User as ApiUser } from '../types';
