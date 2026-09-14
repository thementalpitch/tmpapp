import { ActivityIndicator, StyleSheet, Text, View, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colors, font, type as typeStyles } from "../theme";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image
        source={require("../../assets/images/mental_pitch_logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.subtitle}>{message || "Loading your mental performance space…"}</Text>
      <ActivityIndicator size="large" color={colors.accentSolid} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: { width: 180, height: 180, marginBottom: 28 },
  subtitle: { ...typeStyles.body, textAlign: "center", marginBottom: 20 },
  spinner: { marginTop: 4 },
});
