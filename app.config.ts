/// <reference path="./expo-env.d.ts" />


import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Mental Pitch",
  slug: "the-mental-pitch",
  version: "1.1.8",
  orientation: "portrait",
  scheme: "thementalpitch",
  platforms: ["ios", "android", "web"],
  icon: "./assets/images/mental_pitch_logo.png",
  plugins: [
    "expo-router",
    "expo-notifications",
    "expo-font",
    [
      "expo-speech-recognition",
      {
        microphonePermission:
          "Allow The Mental Pitch to use your microphone for spoken journal answers.",
        speechRecognitionPermission:
          "Allow The Mental Pitch to turn spoken journal answers into text.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true
  },
  ios: {
    bundleIdentifier: "com.mentalpitch.app",
    buildNumber: "32",
    supportsTablet: true,
    requireFullScreen: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSMicrophoneUsageDescription:
        "Allow The Mental Pitch to use your microphone for spoken journal answers.",
      NSSpeechRecognitionUsageDescription:
        "Allow The Mental Pitch to turn spoken journal answers into text.",
      NSPhotoLibraryUsageDescription:
        "Allow The Mental Pitch to access photos you choose to share with the app."
    }
  },
  android: {
    package: "com.mentalpitch.app",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/images/mental_pitch_logo.png",
      backgroundColor: "#203040",
    },
  },
  extra: {
    eas: {
      projectId: "b3ae1797-9e71-41a3-b535-c49b1d2f8b4c"
    },
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  },
  
};

export default config;
