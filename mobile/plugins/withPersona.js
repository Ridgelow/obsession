const {
  withAndroidManifest,
  withInfoPlist,
  withProjectBuildGradle,
} = require("expo/config-plugins");

const PERSONA_MAVEN = "https://sdk.withpersona.com/android/releases";

const LOCATION_USAGE =
  "Persona requires location permission as part of 18+ identity verification.";
const PHOTO_USAGE =
  "Obsession may use your photo library if you upload an ID during Persona verification.";

/**
 * Expo config plugin for react-native-persona.
 * Requires a development build (`npx expo prebuild` / EAS) — not Expo Go.
 *
 * - Android: Persona Maven repo (also listed in expo-build-properties extraMavenRepos)
 * - iOS: location + photo-library usage strings the Inquiry SDK expects
 */
function withPersona(config) {
  config = withProjectBuildGradle(config, (cfg) => {
    if (
      cfg.modResults.language === "groovy" &&
      !cfg.modResults.contents.includes("sdk.withpersona.com")
    ) {
      const mavenBlock = `
        maven { url '${PERSONA_MAVEN}' }
`;
      if (cfg.modResults.contents.includes("allprojects")) {
        cfg.modResults.contents = cfg.modResults.contents.replace(
          /allprojects\s*\{\s*repositories\s*\{/,
          (match) => `${match}${mavenBlock}`
        );
      } else {
        cfg.modResults.contents += `

allprojects {
    repositories {
        maven { url '${PERSONA_MAVEN}' }
    }
}
`;
      }
    }
    return cfg;
  });

  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSLocationWhenInUseUsageDescription =
      cfg.modResults.NSLocationWhenInUseUsageDescription || LOCATION_USAGE;
    cfg.modResults.NSPhotoLibraryUsageDescription =
      cfg.modResults.NSPhotoLibraryUsageDescription || PHOTO_USAGE;
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    const perms = [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
    ];
    for (const name of perms) {
      const exists = manifest["uses-permission"].some(
        (p) => p.$?.["android:name"] === name
      );
      if (!exists) {
        manifest["uses-permission"].push({ $: { "android:name": name } });
      }
    }
    return cfg;
  });

  return config;
}

module.exports = withPersona;
