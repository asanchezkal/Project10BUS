import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  Divider,
  RadioButton,
  HelperText,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/theme';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'parent',
    schoolName: '',
    schoolAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { registerSchool, registerDriver, registerParent } = useAuth();

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Name validation
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    }

    // School validation for school admin
    if (formData.role === 'school') {
      if (!formData.schoolName) {
        newErrors.schoolName = 'School name is required';
      }
      if (!formData.schoolAddress) {
        newErrors.schoolAddress = 'School address is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let result;
      const userData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      };

      switch (formData.role) {
        case 'school':
          result = await registerSchool({
            ...userData,
            schoolName: formData.schoolName,
            schoolAddress: formData.schoolAddress,
          });
          break;
        case 'driver':
          result = await registerDriver(userData);
          break;
        case 'parent':
          result = await registerParent(userData);
          break;
        default:
          throw new Error('Invalid role selected');
      }

      if (result.success) {
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully!',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        error.message || 'An error occurred during registration. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.header}>
                <Ionicons name="school" size={40} color={theme.colors.primary} />
                <Title style={styles.title}>Create Account</Title>
                <Paragraph style={styles.subtitle}>
                  Join the School Bus Tracker community
                </Paragraph>
              </View>

              <Divider style={styles.divider} />

              {/* Role Selection */}
              <Title style={styles.sectionTitle}>Select Your Role</Title>
              <RadioButton.Group
                onValueChange={value => updateFormData('role', value)}
                value={formData.role}
              >
                <View style={styles.roleContainer}>
                  <RadioButton.Item
                    label="School Administrator"
                    value="school"
                    color={theme.colors.primary}
                  />
                  <RadioButton.Item
                    label="Bus Driver"
                    value="driver"
                    color={theme.colors.primary}
                  />
                  <RadioButton.Item
                    label="Parent"
                    value="parent"
                    color={theme.colors.primary}
                  />
                </View>
              </RadioButton.Group>

              <Divider style={styles.divider} />

              {/* Personal Information */}
              <Title style={styles.sectionTitle}>Personal Information</Title>
              
              <TextInput
                label="First Name"
                value={formData.firstName}
                onChangeText={value => updateFormData('firstName', value)}
                mode="outlined"
                style={styles.input}
                error={!!errors.firstName}
              />
              <HelperText type="error" visible={!!errors.firstName}>
                {errors.firstName}
              </HelperText>

              <TextInput
                label="Last Name"
                value={formData.lastName}
                onChangeText={value => updateFormData('lastName', value)}
                mode="outlined"
                style={styles.input}
                error={!!errors.lastName}
              />
              <HelperText type="error" visible={!!errors.lastName}>
                {errors.lastName}
              </HelperText>

              <TextInput
                label="Email"
                value={formData.email}
                onChangeText={value => updateFormData('email', value)}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                error={!!errors.email}
              />
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>

              <TextInput
                label="Phone Number"
                value={formData.phone}
                onChangeText={value => updateFormData('phone', value)}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
                error={!!errors.phone}
              />
              <HelperText type="error" visible={!!errors.phone}>
                {errors.phone}
              </HelperText>

              {/* School Information (for school admin) */}
              {formData.role === 'school' && (
                <>
                  <Divider style={styles.divider} />
                  <Title style={styles.sectionTitle}>School Information</Title>
                  
                  <TextInput
                    label="School Name"
                    value={formData.schoolName}
                    onChangeText={value => updateFormData('schoolName', value)}
                    mode="outlined"
                    style={styles.input}
                    error={!!errors.schoolName}
                  />
                  <HelperText type="error" visible={!!errors.schoolName}>
                    {errors.schoolName}
                  </HelperText>

                  <TextInput
                    label="School Address"
                    value={formData.schoolAddress}
                    onChangeText={value => updateFormData('schoolAddress', value)}
                    mode="outlined"
                    multiline
                    numberOfLines={3}
                    style={styles.input}
                    error={!!errors.schoolAddress}
                  />
                  <HelperText type="error" visible={!!errors.schoolAddress}>
                    {errors.schoolAddress}
                  </HelperText>
                </>
              )}

              <Divider style={styles.divider} />

              {/* Password */}
              <Title style={styles.sectionTitle}>Security</Title>
              
              <TextInput
                label="Password"
                value={formData.password}
                onChangeText={value => updateFormData('password', value)}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                error={!!errors.password}
              />
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>

              <TextInput
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={value => updateFormData('confirmPassword', value)}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                error={!!errors.confirmPassword}
              />
              <HelperText type="error" visible={!!errors.confirmPassword}>
                {errors.confirmPassword}
              </HelperText>

              <Button
                mode="contained"
                onPress={handleRegister}
                loading={loading}
                disabled={loading}
                style={styles.registerButton}
                contentStyle={styles.buttonContent}
              >
                Create Account
              </Button>

              <View style={styles.loginContainer}>
                <Paragraph>Already have an account? </Paragraph>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Login')}
                  style={styles.loginButton}
                >
                  Sign In
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 10,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  divider: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 15,
  },
  roleContainer: {
    marginBottom: 10,
  },
  input: {
    marginBottom: 5,
  },
  registerButton: {
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginButton: {
    marginLeft: 5,
  },
});

export default RegisterScreen; 