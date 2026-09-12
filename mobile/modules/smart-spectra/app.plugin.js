const {
  withAppBuildGradle,
  withPodfile,
  withXcodeProject,
} = require("expo/config-plugins");

const ANDROID_DEP = 'implementation("com.presagetech:smartspectra:3.3.0")';
const SPM_URL = "https://github.com/Presage-Security/SmartSpectra-Swift";

/**
 * Adds SmartSpectra Maven + a Podfile note for the iOS SPM package.
 * iOS still needs the SmartSpectra-Swift package on the native target
 * (plugin tries Xcode SPM APIs; otherwise add it in Xcode after prebuild).
 */
function withSmartSpectra(config) {
  config = withAppBuildGradle(config, (cfg) => {
    if (
      cfg.modResults.language === "groovy" &&
      !cfg.modResults.contents.includes("com.presagetech:smartspectra")
    ) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*\{/,
        (match) => `${match}\n        ${ANDROID_DEP}`
      );
    }
    return cfg;
  });

  config = withPodfile(config, (cfg) => {
    if (!cfg.modResults.contents.includes("SmartSpectra-Swift")) {
      cfg.modResults.contents += `

# Obsession / Presage: add SmartSpectra via SPM if the Xcode project
# does not already reference it.
# File → Add Package Dependencies… → ${SPM_URL} (3.0.0+)
`;
    }
    return cfg;
  });

  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    if (typeof project.addSwiftPackage === "function") {
      try {
        project.addSwiftPackage({
          repositoryURL: SPM_URL,
          requirement: {
            kind: "upToNextMajorVersion",
            minimumVersion: "3.0.0",
          },
          productName: "SmartSpectra",
        });
      } catch {
        // Manual Xcode step documented in README.
      }
    }
    return cfg;
  });

  return config;
}

module.exports = withSmartSpectra;
