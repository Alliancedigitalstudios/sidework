import { Text, View } from "react-native";
import { CHEESECAKE_PRESET } from "@sidework/engine";
export default function Home() {
  return (<View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text>Side Work — preset: {CHEESECAKE_PRESET.workplace.name}</Text></View>);
}
