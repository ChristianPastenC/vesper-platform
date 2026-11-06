package com.vesper.ghostledger;

import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.TurboReactPackage;
import com.margelo.nitro.secureclient.GhostSecureClientOnLoad;

import java.util.HashMap;

// This module has no TurboModules of its own — it only exposes a Nitro
// HybridObject — but React Native's autolinking still needs a ReactPackage
// entry point per Android module, and this static initializer is what
// force-loads the native library (System.loadLibrary) at app startup.
// A Java `static {}` block (unlike Kotlin's `companion object { init {} }`)
// is guaranteed to run as soon as this class is loaded by the classloader.
public class GhostSecureClientPackage extends TurboReactPackage {
  private static final String TAG = "GhostSecureClient";

  @Nullable
  @Override
  public NativeModule getModule(String name, ReactApplicationContext reactContext) {
    return null;
  }

  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    return () -> new HashMap<>();
  }

  static {
    try {
      Log.i(TAG, "Loading GhostSecureClient C++ library...");
      GhostSecureClientOnLoad.initializeNative();
      Log.i(TAG, "Successfully loaded GhostSecureClient C++ library!");
    } catch (Throwable e) {
      Log.e(TAG, "Failed to load GhostSecureClient C++ library! Is it properly installed and linked?", e);
      throw e;
    }
  }
}
