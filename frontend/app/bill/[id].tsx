import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { billsAPI } from '../../services/api';
import { Bill } from '../../types';

export default function BillReceiptScreen() {
  const { id } = useLocalSearchParams();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchBill();
  }, []);

  const fetchBill = async () => {
    try {
      const response = await billsAPI.getById(id as string);
      setBill(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load bill');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!bill) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.receipt}>
        {/* Header */}
        <View style={styles.receiptHeader}>
          <Ionicons name="receipt" size={48} color="#6366f1" />
          <Text style={styles.receiptTitle}>Tax Invoice</Text>
          <Text style={styles.billNumber}>{bill.bill_number}</Text>
          <Text style={styles.billDate}>
            {new Date(bill.created_at).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {bill.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemDetails}>
                  ₹{item.price} x {item.quantity} (GST: {item.gst_rate}%)
                </Text>
              </View>
              <View style={styles.itemAmount}>
                <Text style={styles.itemTotal}>₹{(item.item_total + item.gst_amount).toFixed(2)}</Text>
                <Text style={styles.itemGst}>+₹{item.gst_amount.toFixed(2)} GST</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>₹{bill.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total GST:</Text>
            <Text style={styles.totalValue}>₹{bill.gst_amount.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total:</Text>
            <Text style={styles.grandTotalValue}>₹{bill.total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Payment Info */}
        <View style={styles.section}>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentLabel}>Payment Method:</Text>
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentMethod}>{bill.payment_method.toUpperCase()}</Text>
            </View>
          </View>
          {bill.customer_name && (
            <View style={styles.customerInfo}>
              <Ionicons name="person" size={16} color="#6b7280" />
              <Text style={styles.customerName}>{bill.customer_name}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business!</Text>
          <Text style={styles.footerSubtext}>Visit again</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#6366f1" />
          <Text style={styles.actionButtonText}>Back</Text>
        </TouchableOpacity>
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
  receipt: {
    margin: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  receiptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 12,
  },
  billNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
    marginTop: 8,
  },
  billDate: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    color: '#6b7280',
  },
  itemAmount: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  itemGst: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  grandTotalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  grandTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  paymentBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 14,
    color: '#6b7280',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  footerSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  actions: {
    padding: 20,
    paddingTop: 0,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
});
