#include <jni.h>
#include <fbjni/fbjni.h>
#include <cstdlib>
#include "SovereignSecureClientOnLoad.hpp"

namespace {
// Unlike iOS, Android app processes don't have TMPDIR set in their
// environment. SovereignTelemetryEngine's default mmap path falls back to
// getenv("TMPDIR"), so we resolve the app's real cache dir here (via the
// public Context.getCacheDir() API, reflected through ActivityThread) and
// export it as TMPDIR before any native code can construct that singleton.
void exportTmpDirFromAndroidContext(JNIEnv* env) {
  jclass activityThreadClass = env->FindClass("android/app/ActivityThread");
  if (activityThreadClass == nullptr) { env->ExceptionClear(); return; }

  jmethodID currentApplicationMethod = env->GetStaticMethodID(
      activityThreadClass, "currentApplication", "()Landroid/app/Application;");
  if (currentApplicationMethod == nullptr) { env->ExceptionClear(); return; }

  jobject application = env->CallStaticObjectMethod(activityThreadClass, currentApplicationMethod);
  if (application == nullptr) { env->ExceptionClear(); return; }

  jclass contextClass = env->FindClass("android/content/Context");
  if (contextClass == nullptr) { env->ExceptionClear(); return; }
  jmethodID getCacheDirMethod = env->GetMethodID(contextClass, "getCacheDir", "()Ljava/io/File;");
  if (getCacheDirMethod == nullptr) { env->ExceptionClear(); return; }
  jobject cacheDir = env->CallObjectMethod(application, getCacheDirMethod);
  if (cacheDir == nullptr) { env->ExceptionClear(); return; }

  jclass fileClass = env->FindClass("java/io/File");
  if (fileClass == nullptr) { env->ExceptionClear(); return; }
  jmethodID getAbsolutePathMethod = env->GetMethodID(fileClass, "getAbsolutePath", "()Ljava/lang/String;");
  if (getAbsolutePathMethod == nullptr) { env->ExceptionClear(); return; }
  jstring pathString = static_cast<jstring>(env->CallObjectMethod(cacheDir, getAbsolutePathMethod));
  if (pathString == nullptr) { env->ExceptionClear(); return; }

  const char* path = env->GetStringUTFChars(pathString, nullptr);
  if (path != nullptr) {
    setenv("TMPDIR", path, 1);
    env->ReleaseStringUTFChars(pathString, path);
  }
}
}

// This is the real JNI entry point the JVM calls automatically when
// System.loadLibrary("SovereignSecureClient") loads this .so. Without it,
// the library loads successfully but nothing ever registers the
// SovereignSecureClient HybridObject with Nitro's HybridObjectRegistry.
extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  JNIEnv* env = nullptr;
  if (vm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) == JNI_OK && env != nullptr) {
    exportTmpDirFromAndroidContext(env);
  }
  return margelo::nitro::secureclient::initialize(vm);
}
