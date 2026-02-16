import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { billsAPI } from '../../services/api';
import { Bill } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HistoryScreen() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchBills = async () => {
    try {
      const response = await billsAPI.getAll();
      setBills(response.data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBills();
  }, []);

  const renderBillItem = ({ item }: { item: Bill }) => (
    <TouchableOpacity
      style={styles.billCard}
      onPress={() => router.push(`/bill/${item.id}`)}
    >
      <View style={styles.billHeader}>
        <View>
          <Text style={styles.billNumber}>{item.bill_number}</Text>
          <Text style={styles.billDate}>
            {new Date(item.created_at).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.billAmountContainer}>
          <Text style={styles.billAmount}>₹{item.total.toFixed(2)}</Text>
          <View style={styles.paymentBadge}>
            <Text style={styles.paymentText}>{item.payment_method.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.billDetails}>
        <View style={styles.billDetail}>
          <Ionicons name="cube-outline" size={16} color="#6b7280" />
          <Text style={styles.billDetailText}>{item.items.length} items</Text>
        </View>
        <View style={styles.billDetail}>
          <Ionicons name="pricetag-outline" size={16} color="#6b7280" />
          <Text style={styles.billDetailText}>GST: ₹{item.gst_amount.toFixed(2)}</Text>
        </View>
      </View>

      {item.customer_name && (
        <View style={styles.customerInfo}>
          <Ionicons name="person-outline" size={16} color="#6b7280" />
          <Text style={styles.customerText}>{item.customer_name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bills}
        renderItem={renderBillItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No bills yet</Text>
            <Text style={styles.emptySubtext}>Create your first bill to see history</Text>
          </View>
        }
      />
    </View>
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
  listContainer: {
    padding: 16,
  },
  billCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  billDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  billAmountContainer: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  paymentBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
  },
  billDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  billDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  billDetailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  customerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
  },
});
