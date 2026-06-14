// ============================================
// SMART RIDE MOBILE - WALLET SCREEN
// ============================================
// VERSION: DEBUG-TRACE-001
// PURPOSE: Manage user wallet and payments
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import { api } from '@/src/services';
import { COLORS } from '@/src/constants';

interface WalletData {
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  createdAt: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export default function WalletScreen() {
  const router = useRouter();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    setIsLoading(true);
    try {
      const response = await api.getWallet();
      if (response.success && response.data) {
        setWalletData(response.data);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View 
        entering={FadeInDown.duration(400).springify()}
        className="bg-primary-500 pt-12 pb-6 px-4"
      >
        <Text className="text-white text-2xl font-bold mb-4">Wallet</Text>
        
        {/* Balance Card */}
        <Animated.View 
          entering={ZoomIn.delay(200).duration(400)}
          className="bg-white/20 rounded-2xl p-4"
        >
          <Text className="text-white/80 text-sm">Available Balance</Text>
          <Text className="text-white text-3xl font-bold mt-1">
            {formatCurrency(walletData?.balance || 0)}
          </Text>
          {walletData?.pendingBalance ? (
            <Text className="text-white/80 text-sm mt-2">
              Pending: {formatCurrency(walletData.pendingBalance)}
            </Text>
          ) : null}
        </Animated.View>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View 
        entering={FadeInUp.duration(400).delay(100)}
        className="flex-row bg-white px-4 py-4 gap-3 shadow-sm"
      >
        <QuickAction 
          icon="💳" 
          label="Top Up" 
          onPress={() => {}}
        />
        <QuickAction 
          icon="📤" 
          label="Withdraw" 
          onPress={() => {}}
        />
        <QuickAction 
          icon="📱" 
          label="Transfer" 
          onPress={() => router.push('/wallet/transfer')}
        />
        <QuickAction 
          icon="📋" 
          label="History" 
          onPress={() => {}}
        />
      </Animated.View>

      {/* Transactions */}
      <ScrollView 
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text className="text-gray-900 font-semibold mb-3">Recent Transactions</Text>
        
        {walletData?.transactions?.length ? (
          walletData.transactions.map((tx, index) => (
            <Animated.View
              key={tx.id}
              entering={SlideInRight.duration(300).delay(index * 50)}
            >
              <TransactionItem 
                transaction={tx} 
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            </Animated.View>
          ))
        ) : (
          <Animated.View 
            entering={FadeIn.duration(400)}
            className="items-center py-12"
          >
            <Text className="text-4xl mb-4">💳</Text>
            <Text className="text-gray-500">No transactions yet</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-1 items-center">
      <View className="w-12 h-12 bg-primary-100 rounded-full items-center justify-center mb-1">
        <Text className="text-xl">{icon}</Text>
      </View>
      <Text className="text-xs text-gray-600">{label}</Text>
    </TouchableOpacity>
  );
}

function TransactionItem({ 
  transaction, 
  formatCurrency, 
  formatDate 
}: { 
  transaction: Transaction; 
  formatCurrency: (a: number) => string;
  formatDate: (d: string) => string;
}) {
  const isCredit = transaction.type === 'CREDIT';
  
  return (
    <View className="bg-white rounded-xl p-4 mb-2 flex-row items-center shadow-sm">
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isCredit ? 'bg-green-100' : 'bg-red-100'}`}>
        <Text className="text-lg">{isCredit ? '↓' : '↑'}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-medium text-gray-900">{transaction.description}</Text>
        <Text className="text-gray-500 text-sm">{formatDate(transaction.createdAt)}</Text>
      </View>
      <Text className={`font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
        {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
      </Text>
    </View>
  );
}
