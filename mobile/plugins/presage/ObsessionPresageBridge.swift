import Foundation
import AVFoundation
import SmartSpectra
import UIKit

/**
 * Lives in the Obsession *app* target (where SmartSpectra SPM is linked).
 * The Expo module `ObsessionSmartSpectra` talks to this via NSClassFromString
 * so the CocoaPods target does not need to import SmartSpectra directly.
 */
@objc(ObsessionPresageBridge)
public final class ObsessionPresageBridge: NSObject {
  @objc public static let shared = ObsessionPresageBridge()

  private var lastHeartRate: Double = 0
  private var lastBreathingRate: Double = 0
  private var lastExpression: String = ""
  private var lastExpressionConfidence: Double = 0
  private var lastTalking: Bool = false
  private var lastEngagement: Double = 0.5
  private var running = false
  /// Live camera frame for the native PiP (no JPEG / no JS bridge).
  private var lastPreviewImage: UIImage?

  @objc(startWithApiKey:completion:)
  public func start(
    apiKey: String,
    completion: @escaping (Error?) -> Void
  ) {
    Task { @MainActor in
      do {
        try await self.startCapture(apiKey: apiKey)
        completion(nil)
      } catch {
        completion(error)
      }
    }
  }

  @objc(stopWithCompletion:)
  public func stop(completion: @escaping () -> Void) {
    Task { @MainActor in
      await self.stopCapture()
      completion()
    }
  }

  @objc public func latestReading() -> [String: Any]? {
    guard running else { return nil }
    var payload: [String: Any] = [
      "engagement": lastEngagement,
      "talking": lastTalking,
    ]
    if lastHeartRate > 0 {
      payload["heartRate"] = lastHeartRate
    }
    if lastBreathingRate > 0 {
      payload["breathingRate"] = lastBreathingRate
    }
    if !lastExpression.isEmpty {
      payload["expression"] = lastExpression
      payload["expressionConfidence"] = lastExpressionConfidence
    }
    return payload
  }

  /// Native UIImage for the Expo preview view — skips base64 entirely.
  @objc public func latestPreviewImage() -> UIImage? {
    lastPreviewImage
  }

  @objc public func latestPreviewJpegBase64() -> String? {
    // Kept for debugging only — Live Date uses the native UIImageView path.
    guard let image = lastPreviewImage else { return nil }
    return image.jpegData(compressionQuality: 0.25)?.base64EncodedString()
  }

  @MainActor
  private func startCapture(apiKey: String) async throws {
    // Second date can race a still-stopping first capture — always reset first.
    if running
      || SmartSpectraSDK.shared.processingStatus == .running
      || SmartSpectraSDK.shared.processingStatus == .starting
    {
      await stopCapture()
    }
    let status = AVCaptureDevice.authorizationStatus(for: .video)
    if status == .notDetermined {
      _ = await AVCaptureDevice.requestAccess(for: .video)
    }
    let sdk = SmartSpectraSDK.shared
    sdk.config.apiKey = apiKey
    sdk.config.cameraPosition = .front
    sdk.config.imageOutputEnabled = true
    sdk.config.requestedMetrics =
      SmartSpectraConfig.breathingMetrics
      + SmartSpectraConfig.cardioMetrics
      + [.expressions, .talking]
    try await sdk.start()
    running = true
    pollMetrics()
    pollPreview()
  }

  @MainActor
  private func stopCapture() async {
    if SmartSpectraSDK.shared.processingStatus == .running
      || SmartSpectraSDK.shared.processingStatus == .starting
    {
      try? await SmartSpectraSDK.shared.stop()
    }
    running = false
    lastHeartRate = 0
    lastBreathingRate = 0
    lastExpression = ""
    lastExpressionConfidence = 0
    lastTalking = false
    lastEngagement = 0.5
    lastPreviewImage = nil
  }

  @MainActor
  private func pollMetrics() {
    guard running else { return }
    let metrics = SmartSpectraSDK.shared.metrics

    if let pulse = metrics?.cardio.pulseRate.last {
      let value = Double(pulse.value)
      if value > 0 { lastHeartRate = value }
    }
    if let breath = metrics?.breathing.rate.last {
      let value = Double(breath.value)
      if value > 0 { lastBreathingRate = value }
    }

    if let scores = metrics?.face.expression.last?.scores, !scores.isEmpty {
      let best = scores.max(by: { $0.confidence < $1.confidence })
      if let best {
        lastExpression = Self.label(for: best.type)
        lastExpressionConfidence = Double(best.confidence)
        let happy = scores.first(where: { $0.type == .happy })?.confidence ?? 0
        let surprise = scores.first(where: { $0.type == .surprise })?.confidence ?? 0
        let neutral = scores.first(where: { $0.type == .neutral })?.confidence ?? 0
        lastEngagement = min(
          1,
          max(0.15, Double(happy) * 0.85 + Double(surprise) * 0.35 + Double(neutral) * 0.25)
        )
      }
    }

    if let talking = metrics?.face.talking.last {
      lastTalking = talking.detected
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
      self?.pollMetrics()
    }
  }

  /// Pull camera frames ~24fps into a UIImage — never encode JPEG for the UI.
  @MainActor
  private func pollPreview() {
    guard running else { return }
    if let image = SmartSpectraSDK.shared.imageOutput {
      lastPreviewImage = image
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.04) { [weak self] in
      self?.pollPreview()
    }
  }

  private static func label(for type: ExpressionType) -> String {
    switch type {
    case .angry: return "tense"
    case .contempt: return "guarded"
    case .disgust: return "uneasy"
    case .fear: return "nervous"
    case .happy: return "smiling"
    case .neutral: return "neutral"
    case .sad: return "soft"
    case .surprise: return "surprised"
    default: return "neutral"
    }
  }
}
