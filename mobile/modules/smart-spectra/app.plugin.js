const {
  withAppBuildGradle,
  withDangerousMod,
  withPodfile,
  withXcodeProject,
} = require("expo/config-plugins");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ANDROID_DEP = 'implementation("com.presagetech:smartspectra:3.3.0")';
const SPM_URL = "https://github.com/Presage-Security/SmartSpectra-Swift";
const SPM_PRODUCT = "SmartSpectra";
const SPM_MIN_VERSION = "3.0.0";
const BRIDGE_FILENAME = "ObsessionPresageBridge.swift";

function newId() {
  return crypto.randomBytes(12).toString("hex").toUpperCase();
}

function addSmartSpectraSwiftPackage(project) {
  const objects = project.hash.project.objects;
  objects.XCRemoteSwiftPackageReference =
    objects.XCRemoteSwiftPackageReference || {};
  objects.XCSwiftPackageProductDependency =
    objects.XCSwiftPackageProductDependency || {};

  for (const key of Object.keys(objects.XCRemoteSwiftPackageReference)) {
    if (key.endsWith("_comment")) continue;
    const entry = objects.XCRemoteSwiftPackageReference[key];
    if (
      entry &&
      typeof entry === "object" &&
      String(entry.repositoryURL || "").includes("SmartSpectra-Swift")
    ) {
      return;
    }
  }

  const packageRefId = newId();
  const productDepId = newId();

  objects.XCRemoteSwiftPackageReference[packageRefId] = {
    isa: "XCRemoteSwiftPackageReference",
    repositoryURL: SPM_URL,
    requirement: {
      kind: "upToNextMajorVersion",
      minimumVersion: SPM_MIN_VERSION,
    },
  };
  objects.XCRemoteSwiftPackageReference[`${packageRefId}_comment`] =
    `XCRemoteSwiftPackageReference "SmartSpectra-Swift"`;

  objects.XCSwiftPackageProductDependency[productDepId] = {
    isa: "XCSwiftPackageProductDependency",
    package: packageRefId,
    productName: SPM_PRODUCT,
  };
  objects.XCSwiftPackageProductDependency[`${productDepId}_comment`] =
    SPM_PRODUCT;

  const rootId = project.getFirstProject().uuid;
  const root = objects.PBXProject[rootId];
  if (root) {
    root.packageReferences = root.packageReferences || [];
    root.packageReferences.push(packageRefId);
  }

  const target = project.getFirstTarget();
  const nativeTarget =
    objects.PBXNativeTarget[target.uuid] ||
    objects.PBXNativeTarget[target.firstTarget];
  if (nativeTarget) {
    nativeTarget.packageProductDependencies =
      nativeTarget.packageProductDependencies || [];
    nativeTarget.packageProductDependencies.push(productDepId);
  }

  const frameworksPhaseId = Object.keys(
    objects.PBXFrameworksBuildPhase || {}
  ).find(
    (id) =>
      !id.endsWith("_comment") &&
      objects.PBXFrameworksBuildPhase[id]?.isa === "PBXFrameworksBuildPhase"
  );
  if (frameworksPhaseId) {
    const fileRefId = newId();
    objects.PBXBuildFile = objects.PBXBuildFile || {};
    objects.PBXBuildFile[fileRefId] = {
      isa: "PBXBuildFile",
      productRef: productDepId,
    };
    objects.PBXBuildFile[`${fileRefId}_comment`] =
      `${SPM_PRODUCT} in Frameworks`;
    const phase = objects.PBXFrameworksBuildPhase[frameworksPhaseId];
    phase.files = phase.files || [];
    phase.files.push(fileRefId);
  }
}

function addBridgeSourceFile(project, projectRoot) {
  const objects = project.hash.project.objects;
  objects.PBXFileReference = objects.PBXFileReference || {};
  objects.PBXBuildFile = objects.PBXBuildFile || {};
  objects.PBXGroup = objects.PBXGroup || {};
  objects.PBXSourcesBuildPhase = objects.PBXSourcesBuildPhase || {};

  // Already present?
  for (const key of Object.keys(objects.PBXFileReference)) {
    if (key.endsWith("_comment")) continue;
    const ref = objects.PBXFileReference[key];
    if (ref && String(ref.path || ref.name || "") === BRIDGE_FILENAME) {
      return;
    }
  }

  const fileRefId = newId();
  const buildFileId = newId();

  objects.PBXFileReference[fileRefId] = {
    isa: "PBXFileReference",
    lastKnownFileType: "sourcecode.swift",
    name: BRIDGE_FILENAME,
    path: `Obsession/${BRIDGE_FILENAME}`,
    sourceTree: '"<group>"',
  };
  objects.PBXFileReference[`${fileRefId}_comment`] = BRIDGE_FILENAME;

  objects.PBXBuildFile[buildFileId] = {
    isa: "PBXBuildFile",
    fileRef: fileRefId,
  };
  objects.PBXBuildFile[`${buildFileId}_comment`] =
    `${BRIDGE_FILENAME} in Sources`;

  // Add to Obsession group if we can find it.
  for (const key of Object.keys(objects.PBXGroup)) {
    if (key.endsWith("_comment")) continue;
    const group = objects.PBXGroup[key];
    if (!group || typeof group !== "object") continue;
    const name = String(group.name || group.path || "");
    if (name === "Obsession") {
      group.children = group.children || [];
      group.children.push(fileRefId);
      break;
    }
  }

  const sourcesPhaseId = Object.keys(objects.PBXSourcesBuildPhase).find(
    (id) =>
      !id.endsWith("_comment") &&
      objects.PBXSourcesBuildPhase[id]?.isa === "PBXSourcesBuildPhase"
  );
  if (sourcesPhaseId) {
    const phase = objects.PBXSourcesBuildPhase[sourcesPhaseId];
    phase.files = phase.files || [];
    phase.files.push(buildFileId);
  }

  // Ensure the physical file exists under ios/Obsession/
  const destDir = path.join(projectRoot, "ios", "Obsession");
  const dest = path.join(destDir, BRIDGE_FILENAME);
  const src = path.join(
    projectRoot,
    "plugins",
    "presage",
    BRIDGE_FILENAME
  );
  if (fs.existsSync(src)) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

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

# Obsession / Presage SmartSpectra is linked via SPM on the app target
# (see app.plugin.js). Requires use_frameworks! :linkage => :dynamic.
# Package: ${SPM_URL} (>= ${SPM_MIN_VERSION})
`;
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const destDir = path.join(projectRoot, "ios", "Obsession");
      const dest = path.join(destDir, BRIDGE_FILENAME);
      const src = path.join(projectRoot, "plugins", "presage", BRIDGE_FILENAME);
      if (fs.existsSync(src)) {
        fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(src, dest);
      }
      return cfg;
    },
  ]);

  config = withXcodeProject(config, (cfg) => {
    try {
      addSmartSpectraSwiftPackage(cfg.modResults);
      addBridgeSourceFile(cfg.modResults, cfg.modRequest.projectRoot);
    } catch (err) {
      console.warn(
        "[smart-spectra] SPM/bridge inject failed — add manually in Xcode:",
        err?.message || err
      );
    }
    return cfg;
  });

  return config;
}

module.exports = withSmartSpectra;
