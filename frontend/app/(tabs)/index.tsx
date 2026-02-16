import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI } from '../../services/api';
import { DashboardStats } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      const [statsRes, billsRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRecentBills(5),
      ]);
      setStats(statsRes.data);
      setRecentBills(billsRes.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.storeName}>{user?.store_name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.primaryCard]}>
          <Ionicons name="cash" size={32} color="#ffffff" />
          <Text style={styles.statValue}>₹{stats?.today_sales.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Today's Sales</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="receipt" size={28} color="#6366f1" />
          <Text style={[styles.statValue, styles.darkText]}>{stats?.today_transactions}</Text>
          <Text style={[styles.statLabel, styles.grayText]}>Transactions</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="cube" size={28} color="#10b981" />
          <Text style={[styles.statValue, styles.darkText]}>{stats?.total_products}</Text>
          <Text style={[styles.statLabel, styles.grayText]}>Total Products</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="warning" size={28} color="#f59e0b" />
          <Text style={[styles.statValue, styles.darkText]}>{stats?.low_stock_count}</Text>
          <Text style={[styles.statLabel, styles.grayText]}>Low Stock</Text>
        </View>
      </View>

      {/* Inventory Value */}
      <View style={styles.inventoryCard}>
        <Text style={styles.inventoryLabel}>Total Inventory Value</Text>
        <Text style={styles.inventoryValue}>₹{stats?.total_inventory_value.toFixed(2)}</Text>
      </View>

      {/* Recent Bills */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Bills</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentBills.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No recent bills</Text>
          </View>
        ) : (
          recentBills.map((bill) => (
            <View key={bill.id} style={styles.billCard}>
              <View style={styles.billHeader}>
                <Text style={styles.billNumber}>{bill.bill_number}</Text>
                <Text style={styles.billAmount}>₹{bill.total.toFixed(2)}</Text>
              </View>
              <View style={styles.billFooter}>
                <Text style={styles.billItems}>{bill.items_count} items</Text>
                <Text style={styles.billDate}>
                  {new Date(bill.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  storeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryCard: {
    backgroundColor: '#6366f1',
    minWidth: '100%',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#ffffff',
    marginTop: 4,
    opacity: 0.9,
  },
  darkText: {
    color: '#1f2937',
  },
  grayText: {
    color: '#6b7280',
  },
  inventoryCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inventoryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  inventoryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 8,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
  billCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  billAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billItems: {
    fontSize: 14,
    color: '#6b7280',
  },
  billDate: {
    fontSize: 13,
    color: '#9ca3af',
  },
});
