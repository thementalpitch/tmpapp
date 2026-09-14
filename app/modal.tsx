import { Stack, useRouter } from "expo-router";
import { Text, StyleSheet } from "react-native";
import { AppButton, Page, PageHeader } from "../src/components/AppChrome";
import { type as typeStyles } from "../src/theme";

export default function ModalScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ presentation: "modal", title: "Modal" }} />
      <Page style={styles.page}>
        <PageHeader title="Modal" subtitle="Navigation check" />
        <Text style={typeStyles.body}>Temporary screen to verify navigation wiring.</Text>
        <AppButton label="Close" onPress={() => router.back()} variant="secondary" />
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  page: { gap: 20 },
});
