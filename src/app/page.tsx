'use client';

import { UserProvider } from '@/components/smart-ride/context/user-context';
import { SmartRideApp } from '@/components/smart-ride/smart-ride-app';

export default function Page() {
  return (
    <UserProvider>
      <SmartRideApp />
    </UserProvider>
  );
}
