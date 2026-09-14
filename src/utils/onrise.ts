import { Alert, Linking } from "react-native";

export const ONRISE_URL = "http://app.onrisecare.com";

export async function openOnrise(): Promise<void> {
  try {
    await Linking.openURL(ONRISE_URL);
  } catch {
    Alert.alert("Onrise", "The Onrise link could not be opened. Please try again.");
  }
}
