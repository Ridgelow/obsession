import ExpoModulesCore
import AVFoundation

#if canImport(SmartSpectra)
import SmartSpectra
#endif

enum SmartSpectraBridgeError: LocalizedError {
  case sdkNotLinked

  var errorDescription: String? {
    "Add the SmartSpectra-Swift SPM package (see README) and rebuild the dev client."
  }
}

public class ObsessionSmartSpectraModule: Module {
  private var lastHeartRate: Double = 0
  private var lastBreathingRate: Double = 0
  private var running = false

  public func definition() -> ModuleDefinition {
    Name("ObsessionSmartSpectra")

    AsyncFunction("start") { (apiKey: String) in
      try await self.startCapture(apiKey: apiKey)
    }

    AsyncFunction("stop") {
      try await self.stopCapture()
    }

    Function("latestReading") { () -> [String: Any]? in
      guard self.running, self.lastHeartRate > 0 else { return nil }
      var payload: [String: Any] = ["heartRate": self.lastHeartRate]
      if self.lastBreathingRate > 0 {
        payload["breathingRate"] = self.lastBreathingRate
      }
      payload["engagement"] = 0.6
      return payload
    }
  }

  @MainActor
  private func startCapture(apiKey: String) async throws {
#if canImport(SmartSpectra)
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    if status == .notDetermined {
      _ = await AVCaptureDevice.requestAccess(for: .video)
    }
    let sdk = SmartSpectraSDK.shared
    sdk.config.apiKey = apiKey
    sdk.config.cameraPosition = .front
    sdk.config.imageOutputEnabled = false
    sdk.config.requestedMetrics =
      SmartSpectraConfig.breathingMetrics + SmartSpectraConfig.cardioMetrics
    try await sdk.start()
    self.running = true
    self.pollMetrics()
#else
    throw SmartSpectraBridgeError.sdkNotLinked
#endif
  }

  @MainActor
  private func stopCapture() async throws {
#if canImport(SmartSpectra)
    if SmartSpectraSDK.shared.processingStatus == .running
      || SmartSpectraSDK.shared.processingStatus == .starting {
      try? await SmartSpectraSDK.shared.stop()
    }
#endif
    self.running = false
    self.lastHeartRate = 0
    self.lastBreathingRate = 0
  }

#if canImport(SmartSpectra)
  @MainActor
  private func pollMetrics() {
    guard running else { return }
    if let pulse = SmartSpectraSDK.shared.metrics?.cardio.pulseRate.last {
      let value = Double(pulse.value)
      if value > 0 { lastHeartRate = value }
    }
    if let breath = SmartSpectraSDK.shared.metrics?.breathing.rate.last {
      let value = Double(breath.value)
      if value > 0 { lastBreathingRate = value }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
      self?.pollMetrics()
    }
  }
#endif
}
