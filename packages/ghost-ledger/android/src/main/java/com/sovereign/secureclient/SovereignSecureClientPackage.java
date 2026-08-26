package com.sovereign.secureclient;

import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.TurboReactPackage;
import com.margelo.nitro.secureclient.SovereignSecureClientOnLoad;

import java.util.HashMap;

// This module has no TurboModules of its own — it only exposes a Nitro
// HybridObject — but React Native's autolinking still needs a ReactPackage
// entry point per Android module, and this static initializer is what
// force-loads the native library (System.loadLibrary) at app startup.
// A Java `static {}` block (unlike Kotlin's `companion object { init {} }`)
// is guaranteed to run as soon as this class is loaded by the classloader.
public class SovereignSecureClientPackage extends TurboReactPackage {
  private static final String TAG = "SovereignSecureClient";

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
      Log.i(TAG, "Loading SovereignSecureClient C++ library...");
      SovereignSecureClientOnLoad.initializeNative();
      Log.i(TAG, "Successfully loaded SovereignSecureClient C++ library!");
    } catch (Throwable e) {
      Log.e(TAG, "Failed to load SovereignSecureClient C++ library! Is it properly installed and linked?", e);
      throw e;
    }
  }
}
