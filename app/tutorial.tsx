import { useRouter } from "expo-router";
import { FirstRunTutorial } from "../src/components/FirstRunTutorial";

export default function TutorialScreen() {
  const router = useRouter();
  return <FirstRunTutorial onComplete={() => router.back()} />;
}
