package com.obsession.smartspectra

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.presagetech.smartspectra.CameraPosition
import com.presagetech.smartspectra.SmartSpectraConfig
import com.presagetech.smartspectra.SmartSpectraSdk
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.roundToInt

class ObsessionSmartSpectraModule : Module() {
  @Volatile private var lastHeartRate: Double = 0.0
  @Volatile private var lastBreathingRate: Double = 0.0
  @Volatile private var running: Boolean = false

  override fun definition() = ModuleDefinition {
    Name("ObsessionSmartSpectra")

    AsyncFunction("start") { apiKey: String ->
      startCapture(apiKey)
    }

    AsyncFunction("stop") {
      stopCapture()
    }

    Function("latestReading") {
      if (!running || lastHeartRate <= 0.0) {
        null
      } else {
        val payload = mutableMapOf<String, Any>(
          "heartRate" to lastHeartRate,
          "engagement" to 0.6,
        )
        if (lastBreathingRate > 0.0) {
          payload["breathingRate"] = lastBreathingRate
        }
        payload
      }
    }
  }

  private suspend fun startCapture(apiKey: String) = withContext(Dispatchers.Main) {
    val context = appContext.reactContext
      ?: throw Exceptions.ReactContextLost()
    val camera = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
    if (camera != PackageManager.PERMISSION_GRANTED) {
      throw Exceptions.MissingPermissions(Manifest.permission.CAMERA)
    }

    val sdk = SmartSpectraSdk.shared
    sdk.config.apiKey = apiKey
    sdk.config.imageOutputEnabled = false
    sdk.config.cameraPosition = CameraPosition.FRONT
    sdk.config.requestedMetrics =
      SmartSpectraConfig.breathingMetrics + SmartSpectraConfig.cardioMetrics

    sdk.metrics.observeForever { metrics ->
      if (metrics == null) return@observeForever
      if (metrics.hasCardio()) {
        val pulse = metrics.cardio.pulseRateList
          .lastOrNull { it.timestamp > 0 }
          ?.value
          ?.toDouble()
        if (pulse != null && pulse > 0) {
          lastHeartRate = pulse.roundToInt().toDouble()
        }
      }
      if (metrics.hasBreathing() && metrics.breathing.rateCount > 0) {
        val breath = metrics.breathing.rateList.last().value.toDouble()
        if (breath > 0) lastBreathingRate = breath.roundToInt().toDouble()
      }
    }

    sdk.start()
    running = true
  }

  private suspend fun stopCapture() = withContext(Dispatchers.Main) {
    runCatching { SmartSpectraSdk.shared.stop() }
    running = false
    lastHeartRate = 0.0
    lastBreathingRate = 0.0
  }
}
