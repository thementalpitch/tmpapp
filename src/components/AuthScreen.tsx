/**
 * Authentication Landing Screen
 * 
 * Architecture Notes:
 * - Modern, sleek design with subtle motion
 * - Single screen with tabbed sign in/sign up (reduces navigation complexity)
 * - Form validation at component level
 * - Error handling with user-friendly messages
 * - Accessible design with proper labels and feedback
 */

import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../contexts/AuthContext";
import { FirstRunTutorial } from "./FirstRunTutorial";
import { colors, radius, font, button, type as typeStyles } from "../theme";

type AuthMode = "signin" | "signup";

const TUTORIAL_COMPLETE_KEY = "mentalPitch.hasCompletedTutorial.v1";

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState<boolean | null>(null);
  const { signIn, signUp } = useAuth();

  // Quiet entrance animation keeps the auth form from feeling abrupt.
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_COMPLETE_KEY)
      .then((value) => setHasCompletedTutorial(value === "true"))
      .catch(() => setHasCompletedTutorial(false));
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        delay: 200,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        delay: 200,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

  }, [logoOpacity, logoScale, contentOpacity, contentTranslateY]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert(
        "Error",
        "Password must be at least 6 characters long"
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        Alert.alert(
          "Success",
          "Account created successfully! You can now sign in."
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "An error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const completeTutorial = (nextMode: AuthMode) => {
    setMode(nextMode);
    setHasCompletedTutorial(true);
    AsyncStorage.setItem(TUTORIAL_COMPLETE_KEY, "true").catch(() => {});
  };

  if (hasCompletedTutorial === null) {
    return <View style={styles.container} />;
  }

  if (!hasCompletedTutorial) {
    return <FirstRunTutorial onComplete={completeTutorial} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <Animated.Image
              source={require("../../assets/images/mental_pitch_logo.png")}
              style={[
                styles.logo,
                {
                  transform: [{ scale: logoScale }],
                  opacity: logoOpacity,
                },
              ]}
              resizeMode="contain"
            />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === "signin" ? "Welcome Back" : "Get Started"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "signin"
                ? "Sign in to continue your mental performance journey"
                : "Create your account to start tracking your growth"}
            </Text>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === "signin" && styles.tabActive]}
              onPress={() => {
                setMode("signin");
                setEmail("");
                setPassword("");
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  mode === "signin" && styles.tabTextActive,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === "signup" && styles.tabActive]}
              onPress={() => {
                setMode("signup");
                setEmail("");
                setPassword("");
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  mode === "signup" && styles.tabTextActive,
                ]}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType={mode === "signup" ? "newPassword" : "password"}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 90,
    paddingBottom: 48,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 200,
    height: 200,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    ...typeStyles.pageTitle,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    ...typeStyles.body,
    textAlign: "center",
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 28,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  tabActive: {
    backgroundColor: colors.accentSolid,
  },
  tabText: {
    fontFamily: font,
    fontSize: 15,
    fontWeight: "500",
    color: colors.faint,
  },
  tabTextActive: {
    color: colors.onPrimary,
    fontWeight: "600",
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 10,
  },
  label: {
    ...typeStyles.label,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: font,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    ...button.base,
    ...button.primary,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: button.primaryText,
});
