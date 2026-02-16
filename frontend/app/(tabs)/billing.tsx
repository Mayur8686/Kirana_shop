import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import { productsAPI, billsAPI } from '../../services/api';
import { Product, CartItem, BillItem } from '../../types';
import { useRouter } from 'expo-router';

export default function BillingScreen() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setShowScanner(false);
    try {
      const response = await productsAPI.getByBarcode(data);
      const product = response.data;
      addToCart(product);
    } catch (error: any) {
      Alert.alert('Error', 'Product not found with this barcode');
    }
  };

  const searchProducts = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await productsAPI.getAll({ search: searchQuery });
      setSearchResults(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to search products');
    } finally {
      setSearching(false);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalGst = 0;

    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      const gstAmount = itemTotal * (item.gst_rate / 100);
      subtotal += itemTotal;
      totalGst += gstAmount;
    });

    return {
      subtotal: subtotal.toFixed(2),
      gst: totalGst.toFixed(2),
      total: (subtotal + totalGst).toFixed(2),
    };
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }

    // Validate stock for all items
    for (const item of cart) {
      if (item.quantity > item.stock) {
        Alert.alert(
          'Insufficient Stock',
          `${item.name} has only ${item.stock} units in stock`
        );
        return;
      }
    }

    setProcessing(true);
    try {
      const billItems: BillItem[] = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        const gstAmount = itemTotal * (item.gst_rate / 100);
        return {
          product_id: item.id,
          product_name: item.name,
          barcode: item.barcode,
          quantity: item.quantity,
          price: item.price,
          gst_rate: item.gst_rate,
          item_total: itemTotal,
          gst_amount: gstAmount,
        };
      });

      const response = await billsAPI.create({
        items: billItems,
        payment_method: paymentMethod,
      });

      const bill = response.data;
      Alert.alert(
        'Success',
        `Bill ${bill.bill_number} created successfully!\nTotal: ₹${bill.total.toFixed(2)}`,
        [
          {
            text: 'View Receipt',
            onPress: () => router.push(`/bill/${bill.id}`),
          },
          {
            text: 'New Bill',
            onPress: () => setCart([]),
          },
        ]
      );
      setCart([]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create bill');
    } finally {
      setProcessing(false);
    }
  };

  const totals = calculateTotals();

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>₹{item.price} x {item.quantity}</Text>
        <Text style={styles.cartItemTotal}>₹{(item.price * item.quantity).toFixed(2)}</Text>
      </View>

      <View style={styles.cartItemActions}>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={18} color="#6366f1" />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
          disabled={item.quantity >= item.stock}
        >
          <Ionicons name="add" size={18} color="#6366f1" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.scanButton]}
          onPress={() => {
            if (hasPermission) {
              setShowScanner(true);
            } else {
              Alert.alert('Permission Required', 'Camera permission is required to scan barcodes');
            }
          }}
        >
          <Ionicons name="barcode-outline" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Scan Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.searchButton]}
          onPress={() => setShowSearch(true)}
        >
          <Ionicons name="search-outline" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Search Product</Text>
        </TouchableOpacity>
      </View>

      {/* Cart */}
      {cart.length === 0 ? (
        <View style={styles.emptyCart}>
          <Ionicons name="cart-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>Cart is empty</Text>
          <Text style={styles.emptySubtext}>Scan or search products to add</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cartList}
          />

          {/* Totals */}
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>₹{totals.subtotal}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST:</Text>
              <Text style={styles.totalValue}>₹{totals.gst}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total:</Text>
              <Text style={styles.grandTotalValue}>₹{totals.total}</Text>
            </View>

            {/* Payment Method */}
            <View style={styles.paymentMethods}>
              {['cash', 'card', 'upi'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === method && styles.paymentMethodActive,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === method && styles.paymentMethodTextActive,
                    ]}
                  >
                    {method.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.checkoutButton, processing && styles.buttonDisabled]}
              onPress={handleCheckout}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.checkoutButtonText}>Checkout</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Barcode Scanner Modal */}
      <Modal visible={showScanner} animationType="slide">
        <View style={styles.scannerContainer}>
          <BarCodeScanner
            onBarCodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          <TouchableOpacity
            style={styles.closeScannerButton}
            onPress={() => setShowScanner(false)}
          >
            <Ionicons name="close" size={32} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal visible={showSearch} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.searchModal}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>Search Products</Text>
              <TouchableOpacity onPress={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}>
                <Ionicons name="close" size={28} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Enter product name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchProducts}
              />
              <TouchableOpacity style={styles.searchButton2} onPress={searchProducts}>
                <Ionicons name="search" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {searching ? (
              <View style={styles.searchingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
              </View>
            ) : (
              <ScrollView style={styles.searchResults}>
                {searchResults.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.searchResultItem}
                    onPress={() => addToCart(product)}
                  >
                    <View>
                      <Text style={styles.searchResultName}>{product.name}</Text>
                      <Text style={styles.searchResultPrice}>₹{product.price}</Text>
                      <Text style={styles.searchResultStock}>Stock: {product.stock}</Text>
                    </View>
                    <Ionicons name="add-circle" size={32} color="#6366f1" />
                  </TouchableOpacity>
                ))}
                {searchQuery && searchResults.length === 0 && !searching && (
                  <Text style={styles.noResultsText}>No products found</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButton: {
    backgroundColor: '#6366f1',
  },
  searchButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  cartList: {
    padding: 16,
  },
  cartItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cartItemInfo: {
    marginBottom: 12,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    minWidth: 32,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 'auto',
    padding: 8,
  },
  totalsContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
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
  paymentMethods: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  paymentMethodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  paymentMethodActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  paymentMethodTextActive: {
    color: '#6366f1',
  },
  checkoutButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scannerContainer: {
    flex: 1,
  },
  closeScannerButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 24,
    padding: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  searchModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchInputContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  searchButton2: {
    width: 48,
    height: 48,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  searchResultPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 2,
  },
  searchResultStock: {
    fontSize: 13,
    color: '#6b7280',
  },
  noResultsText: {
    textAlign: 'center',
    padding: 40,
    fontSize: 16,
    color: '#9ca3af',
  },
});
