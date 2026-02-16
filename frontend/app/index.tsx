import { useEffect } from 'react';
import { Redirect } from 'expo-router';

export default function Index() {
  // This will redirect to login screen which will then redirect to tabs if authenticated
  return <Redirect href="/(auth)/login" />;
}
