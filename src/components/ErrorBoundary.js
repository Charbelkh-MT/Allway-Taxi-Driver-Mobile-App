import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={this.handleReset} activeOpacity={0.8}>
          <Text style={styles.btnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#111' },
  icon:      { fontSize: 52, marginBottom: 16 },
  title:     { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 10, textAlign: 'center' },
  message:   { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  btn:       { backgroundColor: '#F5B800', paddingVertical: 14, paddingHorizontal: 36, borderRadius: 12 },
  btnText:   { fontSize: 15, fontWeight: '800', color: '#000' },
});
