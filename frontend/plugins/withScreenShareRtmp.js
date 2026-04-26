// Expo config plugin to add Android in-app screen share RTMP publishing support.
// - Adds RootEncoder (rtmp-rtsp-stream-client-java) dependency via Jitpack
// - Adds a small React Native native module: ScreenShareRtmp (Android only)
//
// This runs during `expo prebuild` / EAS build.

const fs = require('fs');
const path = require('path');
const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withMainApplication,
  withDangerousMod,
  AndroidConfig,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const MODULE_PKG = 'com.unexa.superapp.screenshare';
const MODULE_DIR = ['com', 'unexa', 'superapp', 'screenshare'].join(path.sep);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function addJitpackToBuildGradle(contents) {
  if (contents.includes('https://jitpack.io')) return contents;
  // Try to add under allprojects.repositories
  const marker = /allprojects\s*\{\s*repositories\s*\{/m;
  if (marker.test(contents)) {
    return contents.replace(marker, (m) => `${m}\n        maven { url 'https://jitpack.io' }`);
  }
  // Fallback: append a block
  return `${contents}\n\nallprojects {\n  repositories {\n    maven { url 'https://jitpack.io' }\n  }\n}\n`;
}

function addDependencyToAppGradle(contents) {
  const dep = `implementation "com.github.pedroSG94.rtmp-rtsp-stream-client-java:rtplibrary:2.2.5"`;
  if (contents.includes(dep)) return contents;
  const depsRe = /dependencies\s*\{\s*/m;
  if (!depsRe.test(contents)) return contents;
  return contents.replace(depsRe, (m) => `${m}\n    ${dep}\n`);
}

function patchMainApplication(contents) {
  if (contents.includes('ScreenShareRtmpPackage')) return contents;

  // Add imports
  contents = contents.replace(
    /import com\.facebook\.react\.ReactPackage;\s*/m,
    (m) => `${m}\nimport ${MODULE_PKG}.ScreenShareRtmpPackage;\n`
  );

  // Add package to getPackages()
  // Typical Expo template:
  // List<ReactPackage> packages = new PackageList(this).getPackages();
  // return packages;
  contents = contents.replace(
    /new PackageList\(this\)\.getPackages\(\);\s*/m,
    (m) => `${m}\n    packages.add(new ScreenShareRtmpPackage());\n`
  );

  return contents;
}

function moduleJavaSources() {
  const pkgLine = `package ${MODULE_PKG};`;

  const module = `${pkgLine}

import android.app.Activity;
import android.content.Intent;
import android.util.DisplayMetrics;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import com.pedro.rtplibrary.rtmp.RtmpDisplay;
import com.pedro.rtmp.utils.ConnectCheckerRtmp;

public class ScreenShareRtmpModule extends ReactContextBaseJavaModule implements ActivityEventListener {
  private static final int REQUEST_CODE = 7331;

  private final ReactApplicationContext reactContext;
  private RtmpDisplay rtmpDisplay;
  private int lastResultCode = Activity.RESULT_CANCELED;
  private Intent lastData = null;
  private Promise permissionPromise = null;

  public ScreenShareRtmpModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    reactContext.addActivityEventListener(this);
  }

  @Override
  public String getName() {
    return "ScreenShareRtmp";
  }

  private void emit(String event, @Nullable String message) {
    WritableMap map = Arguments.createMap();
    if (message != null) map.putString("message", message);
    reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(event, map);
  }

  private RtmpDisplay getOrCreateDisplay() {
    if (rtmpDisplay != null) return rtmpDisplay;
    rtmpDisplay = new RtmpDisplay(reactContext, true, new ConnectCheckerRtmp() {
      @Override
      public void onConnectionSuccessRtmp() { emit("rtmp:connected", null); }
      @Override
      public void onConnectionFailedRtmp(String reason) { emit("rtmp:failed", reason); }
      @Override
      public void onDisconnectRtmp() { emit("rtmp:disconnected", null); }
      @Override
      public void onAuthErrorRtmp() { emit("rtmp:auth_error", null); }
      @Override
      public void onAuthSuccessRtmp() { emit("rtmp:auth_success", null); }
      @Override
      public void onNewBitrateRtmp(long bitrate) {
        // Optional: emit bitrate change event if needed
      }
      @Override
      public void onConnectionStartedRtmp(String rtmpUrl) {
        // Optional: emit connection started event if needed
      }
    });
    if (lastData != null) {
      rtmpDisplay.setIntentResult(lastResultCode, lastData);
    }
    return rtmpDisplay;
  }

  @ReactMethod
  public void requestPermission(Promise promise) {
    Activity activity = getCurrentActivity();
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No foreground activity");
      return;
    }
    RtmpDisplay display = getOrCreateDisplay();
    Intent intent = display.sendIntent();
    if (intent == null) {
      promise.reject("NO_INTENT", "Unable to create screen capture intent");
      return;
    }
    permissionPromise = promise;
    activity.startActivityForResult(intent, REQUEST_CODE);
  }

  @ReactMethod
  public void start(String rtmpUrl, int width, int height, int fps, int bitrate, Promise promise) {
    try {
      RtmpDisplay display = getOrCreateDisplay();
      if (lastData == null) {
        promise.reject("NO_PERMISSION", "Call requestPermission() first");
        return;
      }
      if (display.isStreaming()) {
        promise.resolve(true);
        return;
      }
      DisplayMetrics dm = reactContext.getResources().getDisplayMetrics();
      int dpi = dm.densityDpi;
      // rotation=0 (we keep OS orientation), profile/level default
      boolean okVideo = display.prepareVideo(width, height, fps, bitrate, 0, dpi);
      boolean okAudio = display.prepareAudio();
      if (!okVideo || !okAudio) {
        promise.reject("PREPARE_FAILED", "Unable to prepare encoders on this device");
        return;
      }
      display.startStream(rtmpUrl);
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("START_FAILED", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void stop(Promise promise) {
    try {
      if (rtmpDisplay != null && rtmpDisplay.isStreaming()) {
        rtmpDisplay.stopStream();
      }
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("STOP_FAILED", e.getMessage(), e);
    }
  }

  @ReactMethod
  public void isStreaming(Promise promise) {
    promise.resolve(rtmpDisplay != null && rtmpDisplay.isStreaming());
  }

  @Override
  public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
    if (requestCode != REQUEST_CODE) return;
    lastResultCode = resultCode;
    lastData = data;
    if (rtmpDisplay != null) {
      rtmpDisplay.setIntentResult(resultCode, data);
    }
    if (permissionPromise != null) {
      Promise p = permissionPromise;
      permissionPromise = null;
      if (resultCode == Activity.RESULT_OK) p.resolve(true);
      else p.reject("DENIED", "Screen capture permission denied");
    }
  }

  @Override
  public void onNewIntent(Intent intent) {}
}
`;

  const pkg = `${pkgLine}

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ScreenShareRtmpPackage implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new ScreenShareRtmpModule(reactContext));
    return modules;
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}
`;

  return { module, pkg };
}

function withScreenShareRtmp(config) {
  // Add Jitpack repo
  config = withProjectBuildGradle(config, (c) => {
    c.modResults.contents = addJitpackToBuildGradle(c.modResults.contents);
    return c;
  });

  // Add dependency
  config = withAppBuildGradle(config, (c) => {
    c.modResults.contents = addDependencyToAppGradle(c.modResults.contents);
    return c;
  });

  // Patch MainApplication to register package
  config = withMainApplication(config, (c) => {
    c.modResults.contents = patchMainApplication(c.modResults.contents);
    return c;
  });

  // Write Java sources into android project
  config = withDangerousMod(config, [
    'android',
    async (c) => {
      const projectRoot = c.modRequest.projectRoot;
      const javaRoot = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        MODULE_DIR
      );
      ensureDir(javaRoot);
      const { module, pkg } = moduleJavaSources();
      fs.writeFileSync(path.join(javaRoot, 'ScreenShareRtmpModule.java'), module);
      fs.writeFileSync(path.join(javaRoot, 'ScreenShareRtmpPackage.java'), pkg);
      return c;
    },
  ]);

  // Ensure required permissions exist (INTERNET is already, RECORD_AUDIO needed for mic)
  config = AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.RECORD_AUDIO',
    'android.permission.INTERNET',
  ]);

  return config;
}

module.exports = createRunOncePlugin(withScreenShareRtmp, 'with-screen-share-rtmp', '1.0.0');

