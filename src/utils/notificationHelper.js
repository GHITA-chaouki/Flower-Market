import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import api from "../api/axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== "granted") {
            console.warn("Failed to get push token for push notification!");
            return;
        }

        // Get the token that uniquely identifies this device
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: "db670a25-27e5-4e91-a1be-12a2049e06f3", // From app.json
        })).data;
        console.log("Expo Push Token:", token);
    } else {
        console.log("Must use physical device for Push Notifications");
    }

    return token;
}

export async function saveTokenToBackend(token, uid) {
    try {
        if (!token) return;

        // 1. Check Connectivity
        try {
            console.log("Checking backend connectivity...");
            await api.get("/notifications/ping");
            console.log("✅ Backend is reachable.");
        } catch (pingErr) {
            console.error("❌ Backend connectivity check failed:", pingErr.message);
            // We continue anyway, hoping it's just a fluke, or we return?
            // Let's return to avoid the 500 noise if backend is down
            return;
        }

        console.log("Saving token for UID:", uid);
        const headers = uid ? { "X-Firebase-UID": uid } : {};

        const response = await api.post("/notifications/register-token", { token }, { headers });
        if (response.data.success) {
            await AsyncStorage.setItem("expoPushToken", token);
            console.log("Token successfully registered on backend");
        }
    } catch (error) {
        if (error.response) {
            console.error("Error saving push token to backend:", error.response.status, error.response.data);
        } else {
            console.error("Error saving push token to backend:", error.message);
        }
    }
}

export function setupNotificationListeners() {
    // This listener is fired whenever a notification is received while the app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log("Notification received in foreground:", notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log("Notification response received:", response);
        // Handle navigation here if needed
    });

    return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
    };
}
