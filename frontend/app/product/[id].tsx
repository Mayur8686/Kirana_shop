import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { productsAPI } from '../../services/api';
import { Product } from '../../types';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: '',
    stock: '',
    min_stock_alert: '',
    category: '',
    gst_rate: '',
    image_base64: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProduct();
  }, []);

  const fetchProduct = async () => {
    try {
      const response = await productsAPI.getById(id as string);
      const p = response.data;
      setProduct(p);
      setFormData({
        name: p.name,
        barcode: p.barcode,
        price: p.price.toString(),
        stock: p.stock.toString(),
        min_stock_alert: p.min_stock_alert.toString(),
        category: p.category || '',
        gst_rate: p.gst_rate.toString(),
        image_base64: p.image_base64 || '',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load product');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData({
        ...formData,
        image_base64: `data:image/jpeg;base64,${result.assets[0].base64}`,
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.barcode || !formData.price || !formData.stock) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await productsAPI.update(id as string, {
        name: formData.name,
        barcode: formData.barcode,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        min_stock_alert: parseInt(formData.min_stock_alert),
        category: formData.category || null,
        gst_rate: parseFloat(formData.gst_rate),
        image_base64: formData.image_base64 || null,
      });

      Alert.alert('Success', 'Product updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Image Picker */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {formData.image_base64 ? (
            <Image source={{ uri: formData.image_base64 }} style={styles.productImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={40} color="#9ca3af" />
              <Text style={styles.imageText}>Change Product Image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter product name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Barcode *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter or scan barcode"
              value={formData.barcode}
              onChangeText={(text) => setFormData({ ...formData, barcode: text })}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Price (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Stock *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={formData.stock}
                onChangeText={(text) => setFormData({ ...formData, stock: text })}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Min Stock Alert</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                value={formData.min_stock_alert}
                onChangeText={(text) => setFormData({ ...formData, min_stock_alert: text })}
                keyboardType="number-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>GST Rate (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="18"
                value={formData.gst_rate}
                onChangeText={(text) => setFormData({ ...formData, gst_rate: text })}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Grocery, Snacks, Beverages"
              value={formData.category}
              onChangeText={(text) => setFormData({ ...formData, category: text })}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="save" size={24} color="#ffffff" />
                <Text style={styles.submitButtonText}>Update Product</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContainer: {
    padding: 20,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
