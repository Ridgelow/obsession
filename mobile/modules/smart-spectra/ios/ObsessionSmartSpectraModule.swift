import ExpoModulesCore
import Foundation
import AVFoundation
import UIKit

enum SmartSpectraBridgeError: LocalizedError {
  case sdkNotLinked
  case bridgeCallFailed

  var errorDescription: String? {
    switch self {
    case .sdkNotLinked:
      return "Presage bridge missing — rebuild with SmartSpectra SPM on the app target."
    case .bridgeCallFailed:
      return "Presage bridge call failed."
    }
  }
}

/**
 * Expo module — does NOT import SmartSpectra.
 * Forwards to ObsessionPresageBridge in the app target (SPM-linked).
 */
public class ObsessionSmartSpectraModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ObsessionSmartSpectra")

    AsyncFunction("start") { (apiKey: String) in
      try await PresageBridgeClient.shared.start(apiKey: apiKey)
    }

    AsyncFunction("stop") {
      await PresageBridgeClient.shared.stop()
    }

    /**
     * DO NOT call between LiveKit dates.
     * Raw AVAudioSession deactivate/setCategory outside LKRTCAudioSession
     * desyncs activation holds → date #2 publishes mic at audioLevel 0
     * while playout still works. ElevenLabs detach already stops audio.
     */
    AsyncFunction("resetAudioSession") {
      try await Self.resetAudioSession()
    }

    /** Deactivate only — clear stuck activation before LiveKit startAudioSession. */
    AsyncFunction("deactivateAudioSession") {
      let session = AVAudioSession.sharedInstance()
      try? session.setActive(false, options: .notifyOthersOnDeactivation)
      try await Task.sleep(nanoseconds: 300_000_000)
    }

    /**
     * Device mic regression — measures capture RMS before/after Presage +
     * after a raw AVAudioSession bounce (the old date-2 "fix").
     * Returns evidence for what kills date #2 recording.
     */
    AsyncFunction("runMicCaptureRegression") { (apiKey: String) -> [String: Any] in
      try await Self.runMicCaptureRegression(apiKey: apiKey)
    }

    Function("latestReading") { () -> [String: Any]? in
      PresageBridgeClient.shared.latestReading()
    }

    Function("latestPreviewJpegBase64") { () -> String? in
      PresageBridgeClient.shared.latestPreviewJpegBase64()
    }

    View(PresagePreviewView.self) {}
  }

  /**
   * Bounce AVAudioSession between LiveKit dates.
   * Raw session surgery — kept only for regression testing, not app teardown.
   */
  static func resetAudioSession() async throws {
    let session = AVAudioSession.sharedInstance()
    try? session.setActive(false, options: .notifyOthersOnDeactivation)
    try await Task.sleep(nanoseconds: 200_000_000)
    try session.setCategory(
      .playAndRecord,
      mode: .videoChat,
      options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers]
    )
    try? session.setActive(false, options: .notifyOthersOnDeactivation)
  }

  /// Snapshot + 0.8s RMS capture. Ambient noise is enough; no speech required.
  static func runMicCaptureRegression(apiKey: String) async throws -> [String: Any] {
    var report: [String: Any] = [:]
    NSLog("[mic-regression] step t0")
    // Ensure no leftover Presage from a prior hung run.
    await PresageBridgeClient.shared.stop()
    report["t0_snapshot"] = audioSnapshot()
    report["t0_rms"] = await measureInputRms(seconds: 0.8)

    // --- Simulate date-1 LiveKit stop (deactivate only) ---
    NSLog("[mic-regression] step deactivate")
    let session = AVAudioSession.sharedInstance()
    try? session.setActive(false, options: .notifyOthersOnDeactivation)
    try await Task.sleep(nanoseconds: 300_000_000)
    report["after_deactivate_snapshot"] = audioSnapshot()

    // --- Presage camera start/stop with hard timeout ---
    NSLog("[mic-regression] step presage start")
    var presageError: String? = nil
    do {
      try await withThrowingTaskGroup(of: Void.self) { group in
        group.addTask {
          try await PresageBridgeClient.shared.start(apiKey: apiKey)
        }
        group.addTask {
          try await Task.sleep(nanoseconds: 8_000_000_000)
          throw SmartSpectraBridgeError.bridgeCallFailed
        }
        _ = try await group.next()
        group.cancelAll()
      }
      try await Task.sleep(nanoseconds: 1_200_000_000)
      report["during_presage_snapshot"] = audioSnapshot()
      NSLog("[mic-regression] step presage stop")
      await PresageBridgeClient.shared.stop()
      try await Task.sleep(nanoseconds: 500_000_000)
    } catch {
      presageError = error.localizedDescription
      report["presage_error"] = presageError as Any
      NSLog("[mic-regression] presage error/timeout: %@", error.localizedDescription)
      await PresageBridgeClient.shared.stop()
    }
    report["after_presage_snapshot"] = audioSnapshot()
    NSLog("[mic-regression] step after_presage rms")
    report["after_presage_rms"] = await measureInputRms(seconds: 0.8)

    // --- Old hardReset pattern (raw bounce) ---
    NSLog("[mic-regression] step hardReset")
    try? await resetAudioSession()
    try await Task.sleep(nanoseconds: 400_000_000)
    report["after_hardReset_snapshot"] = audioSnapshot()
    report["after_hardReset_rms"] = await measureInputRms(seconds: 0.8)

    // --- Second playAndRecord cycle (date-2 simulation without Presage path) ---
    NSLog("[mic-regression] step second_cycle")
    try? session.setActive(false, options: .notifyOthersOnDeactivation)
    try await Task.sleep(nanoseconds: 300_000_000)
    report["second_cycle_rms"] = await measureInputRms(seconds: 0.8)

    let t0 = (report["t0_rms"] as? NSNumber)?.floatValue ?? 0
    let afterP = (report["after_presage_rms"] as? NSNumber)?.floatValue ?? 0
    let afterH = (report["after_hardReset_rms"] as? NSNumber)?.floatValue ?? 0
    let second = (report["second_cycle_rms"] as? NSNumber)?.floatValue ?? 0
    let threshold: Float = 0.0003
    let verdict: [String: Any] = [
      "cold_capture_ok": t0 >= threshold,
      "after_presage_capture_ok": afterP >= threshold,
      "after_hardReset_capture_ok": afterH >= threshold,
      "second_cycle_capture_ok": second >= threshold,
      "presage_killed_capture": t0 >= threshold && afterP < threshold && afterP >= 0,
      "hardReset_killed_capture": afterP >= threshold && afterH < threshold && afterH >= 0,
      "threshold": threshold,
      "t0_rms": t0,
      "after_presage_rms": afterP,
      "after_hardReset_rms": afterH,
      "second_cycle_rms": second,
    ]
    report["verdict"] = verdict
    NSLog("[mic-regression] VERDICT %@", String(describing: verdict))
    return report
  }

  static func audioSnapshot() -> [String: Any] {
    let s = AVAudioSession.sharedInstance()
    let inputs = s.availableInputs?.map { $0.portName } ?? []
    let routeIns = s.currentRoute.inputs.map { "\($0.portType.rawValue):\($0.portName)" }
    let routeOuts = s.currentRoute.outputs.map { "\($0.portType.rawValue):\($0.portName)" }
    return [
      "category": s.category.rawValue,
      "mode": s.mode.rawValue,
      "options": s.categoryOptions.rawValue,
      "inputAvailable": s.isInputAvailable,
      "secondaryAudioShouldBeSilencedHint": s.secondaryAudioShouldBeSilencedHint,
      "availableInputs": inputs,
      "routeInputs": routeIns,
      "routeOutputs": routeOuts,
    ]
  }

  @MainActor
  static func measureInputRms(seconds: Double) async -> Float {
    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(
        .playAndRecord,
        mode: .videoChat,
        options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers]
      )
      try session.setActive(true, options: [])
    } catch {
      NSLog("[mic-regression] setActive failed: %@", error.localizedDescription)
      return -1
    }

    let engine = AVAudioEngine()
    let input = engine.inputNode
    let format = input.inputFormat(forBus: 0)
    if format.sampleRate <= 0 || format.channelCount == 0 {
      NSLog("[mic-regression] invalid input format %@", String(describing: format))
      try? session.setActive(false)
      return -2
    }

    var sumSquares: Float = 0
    var sampleCount: Int = 0
    let lock = NSLock()

    input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
      guard let channel = buffer.floatChannelData?[0] else { return }
      let n = Int(buffer.frameLength)
      var local: Float = 0
      for i in 0..<n {
        let v = channel[i]
        local += v * v
      }
      lock.lock()
      sumSquares += local
      sampleCount += n
      lock.unlock()
    }

    do {
      try engine.start()
    } catch {
      NSLog("[mic-regression] engine start failed: %@", error.localizedDescription)
      input.removeTap(onBus: 0)
      try? session.setActive(false)
      return -3
    }

    try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
    engine.stop()
    input.removeTap(onBus: 0)
    try? session.setActive(false, options: .notifyOthersOnDeactivation)

    lock.lock()
    let rms: Float = sampleCount > 0 ? sqrt(sumSquares / Float(sampleCount)) : 0
    lock.unlock()
    NSLog("[mic-regression] rms=%.6f samples=%d", rms, sampleCount)
    return rms
  }
}

/**
 * Native face preview — paints SmartSpectra frames in a UIImageView.
 * Avoids shipping base64 JPEGs through the JS bridge (that was the lag).
 */
final class PresagePreviewView: ExpoView {
  private let imageView = UIImageView()
  private var link: CADisplayLink?
  private var lastAssigned: UIImage?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = UIColor(red: 0.07, green: 0.03, blue: 0.05, alpha: 1)
    imageView.contentMode = .scaleAspectFill
    imageView.clipsToBounds = true
    imageView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    imageView.frame = bounds
    addSubview(imageView)

    let link = CADisplayLink(target: self, selector: #selector(onFrame))
    // Native UIImage path — 24fps is cheap vs the old base64 JPEG bridge.
    link.preferredFramesPerSecond = 24
    link.add(to: .main, forMode: .common)
    self.link = link
  }

  deinit {
    link?.invalidate()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    imageView.frame = bounds
  }

  @objc private func onFrame() {
    guard let image = PresageBridgeClient.shared.latestPreviewImage() else { return }
    if image === lastAssigned { return }
    lastAssigned = image
    imageView.image = image
  }
}

/// Runtime client for `@objc(ObsessionPresageBridge)` in the app target.
final class PresageBridgeClient {
  static let shared = PresageBridgeClient()

  private func instance() -> NSObject? {
    guard let bridgeClass = NSClassFromString("ObsessionPresageBridge") as? NSObject.Type
    else {
      return nil
    }
    let selector = NSSelectorFromString("shared")
    guard bridgeClass.responds(to: selector) else { return nil }
    return bridgeClass.perform(selector)?.takeUnretainedValue() as? NSObject
  }

  func start(apiKey: String) async throws {
    guard let raw = instance() else { throw SmartSpectraBridgeError.sdkNotLinked }
    try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
      let selector = NSSelectorFromString("startWithApiKey:completion:")
      guard raw.responds(to: selector), let method = raw.method(for: selector) else {
        cont.resume(throwing: SmartSpectraBridgeError.bridgeCallFailed)
        return
      }
      typealias StartFn = @convention(c) (
        AnyObject, Selector, NSString, @convention(block) (NSError?) -> Void
      ) -> Void
      let fn = unsafeBitCast(method, to: StartFn.self)
      let block: @convention(block) (NSError?) -> Void = { error in
        if let error {
          cont.resume(throwing: error)
        } else {
          cont.resume()
        }
      }
      fn(raw, selector, apiKey as NSString, block)
    }
  }

  func stop() async {
    guard let raw = instance() else { return }
    await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
      let selector = NSSelectorFromString("stopWithCompletion:")
      guard raw.responds(to: selector), let method = raw.method(for: selector) else {
        cont.resume()
        return
      }
      typealias StopFn = @convention(c) (
        AnyObject, Selector, @convention(block) () -> Void
      ) -> Void
      let fn = unsafeBitCast(method, to: StopFn.self)
      let block: @convention(block) () -> Void = {
        cont.resume()
      }
      fn(raw, selector, block)
    }
  }

  func latestReading() -> [String: Any]? {
    guard let raw = instance() else { return nil }
    let selector = NSSelectorFromString("latestReading")
    guard raw.responds(to: selector) else { return nil }
    return raw.perform(selector)?.takeUnretainedValue() as? [String: Any]
  }

  func latestPreviewJpegBase64() -> String? {
    guard let raw = instance() else { return nil }
    let selector = NSSelectorFromString("latestPreviewJpegBase64")
    guard raw.responds(to: selector) else { return nil }
    return raw.perform(selector)?.takeUnretainedValue() as? String
  }

  func latestPreviewImage() -> UIImage? {
    guard let raw = instance() else { return nil }
    let selector = NSSelectorFromString("latestPreviewImage")
    guard raw.responds(to: selector) else { return nil }
    return raw.perform(selector)?.takeUnretainedValue() as? UIImage
  }
}
