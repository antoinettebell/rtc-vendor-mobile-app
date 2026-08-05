import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useSelector } from "react-redux";
import { AppColor } from "../utils/theme";

const MoreMenuScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.userReducer);
  const showEmployees = !!user?.foodTruck?.plan?.capabilities?.employeeLogin;
  const items = [
    ...(showEmployees
      ? [{ label: "Employees", detail: "Manage employees and schedules", icon: "people-alt", route: "employeesScreen" }]
      : []),
    { label: "Earnings", detail: "Sales and payout information", icon: "payments", route: "earningsScreen" },
    { label: "Operations", detail: "Inventory and daily checklists", icon: "fact-check", route: "operationsScreen" },
    { label: "Weekly Schedule", detail: "Set when your food trucks are open", icon: "calendar-month", route: "profileAvailabilityScreen" },
    { label: "Cuisines", detail: "Manage the cuisines customers see", icon: "restaurant-menu", route: "profileSelectCuisineScreen" },
    { label: "Serving Locations", detail: "Manage saved service locations", icon: "location-on", route: "profileServingLocationScreen" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="menu" size={28} color={AppColor.primary} />
        <Text style={styles.title}>More</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item) => (
          <TouchableOpacity key={item.route} style={styles.card} onPress={() => navigation.navigate(item.route)}>
            <View style={styles.icon}><MaterialIcons name={item.icon} size={25} color={AppColor.primary} /></View>
            <View style={styles.copy}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.detail}>{item.detail}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={26} color="#64748B" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { alignItems: "center", backgroundColor: "white", borderBottomColor: "#E2E8F0", borderBottomWidth: 1, flexDirection: "row", gap: 12, padding: 20 },
  title: { color: "#0F172A", fontSize: 26, fontWeight: "700" },
  content: { padding: 18 },
  card: { alignItems: "center", backgroundColor: "white", borderColor: "#E2E8F0", borderRadius: 14, borderWidth: 1, flexDirection: "row", marginBottom: 14, padding: 16 },
  icon: { alignItems: "center", backgroundColor: "#ECFDF5", borderRadius: 12, height: 48, justifyContent: "center", width: 48 },
  copy: { flex: 1, marginLeft: 14 },
  label: { color: "#0F172A", fontSize: 18, fontWeight: "700" },
  detail: { color: "#64748B", fontSize: 13, marginTop: 3 },
});

export default MoreMenuScreen;
