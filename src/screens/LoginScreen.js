import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/theme';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        Alert.alert('Login Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSchool = () => {
    navigation.navigate('Register', { role: 'school' });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="bus" size={80} color="white" />
            </View>
            <Title style={styles.title}>School Bus Tracker</Title>
            <Paragraph style={styles.subtitle}>
              Real-time bus tracking for schools, drivers, and parents
            </Paragraph>
          </View>

          {/* Login Card */}
          <Card style={styles.loginCard}>
            <Card.Content>
              <Title style={styles.cardTitle}>Sign In</Title>
              
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                left={<TextInput.Icon icon="email" />}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                style={styles.input}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                style={styles.loginButton}
                disabled={isLoading}
                loading={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

              <Divider style={styles.divider} />

              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>Login for:</Text>
                <View style={styles.roleList}>
                  <View style={styles.roleItem}>
                    <Ionicons name="school" size={20} color={theme.colors.primary} />
                    <Text style={styles.roleText}>School Administrators</Text>
                  </View>
                  <View style={styles.roleItem}>
                    <Ionicons name="car" size={20} color={theme.colors.primary} />
                    <Text style={styles.roleText}>Bus Drivers</Text>
                  </View>
                  <View style={styles.roleItem}>
                    <Ionicons name="people" size={20} color={theme.colors.primary} />
                    <Text style={styles.roleText}>Parents</Text>
                  </View>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.registerSection}>
                <Text style={styles.registerText}>New to School Bus Tracker?</Text>
                <Button
                  mode="outlined"
                  onPress={handleRegisterSchool}
                  style={styles.registerButton}
                >
                  Register Your School
                </Button>
                <Text style={styles.registerNote}>
                  Contact your school administrator for driver and parent accounts
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <Title style={styles.featuresTitle}>Key Features</Title>
            <View style={styles.featuresGrid}>
              <View style={styles.featureItem}>
                <Ionicons name="location" size={30} color={theme.colors.primary} />
                <Text style={styles.featureText}>Real-time Tracking</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="notifications" size={30} color={theme.colors.primary} />
                <Text style={styles.featureText}>ETA Notifications</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="map" size={30} color={theme.colors.primary} />
                <Text style={styles.featureText}>Route Management</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark" size={30} color={theme.colors.primary} />
                <Text style={styles.featureText}>Secure & Reliable</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  loginCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    color: theme.colors.text,
  },
  input: {
    marginBottom: theme.spacing.md,
  },
  loginButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  divider: {
    marginVertical: theme.spacing.lg,
  },
  roleInfo: {
    marginBottom: theme.spacing.lg,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  roleList: {
    gap: theme.spacing.sm,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  roleText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  registerSection: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  registerButton: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  registerNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  featuresContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    color: 'white',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  featureItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featureText: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default LoginScreen; 