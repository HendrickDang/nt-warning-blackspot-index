import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { OfflineBanner } from "@/components/OfflineBanner";
import { TabBar } from "@/components/TabBar";
import { TopBar } from "@/components/TopBar";

export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <TopBar />
      <OfflineBanner />
      <View style={styles.tabs}>
        <Tabs
          screenOptions={{ headerShown: false }}
          tabBar={(props) => <TabBar {...props} />}
        >
          <Tabs.Screen name="index" options={{ title: "Map" }} />
          <Tabs.Screen name="report" options={{ title: "Report" }} />
          <Tabs.Screen name="queue" options={{ title: "Queue" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fbfaf6",
  },
  tabs: {
    flex: 1,
  },
});
