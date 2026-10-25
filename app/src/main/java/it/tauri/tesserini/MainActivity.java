package it.tauri.tesserini;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;
import androidx.webkit.WebViewAssetLoader;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.concurrent.TimeUnit;

public class MainActivity extends Activity {

    static final String EXTRA_OPEN_REQUESTS = "openRequests";
    private static final String WORK_NAME = "tauri-admin-watch";
    private static final int REQ_FILE = 41;
    private static final int REQ_NOTIFY = 42;
    private static final String START_URL = "https://appassets.androidplatform.net/assets/www/index.html";

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;
    private boolean pageReady = false;
    private boolean pendingOpenRequests = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("appassets.androidplatform.net".equals(u.getHost())) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (ActivityNotFoundException ignored) {
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                if (pendingOpenRequests) openRequestsSoon();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                cameraUri = null;
                Intent intent;
                if (params.isCaptureEnabled()) {
                    try {
                        File dir = new File(getCacheDir(), "camera");
                        //noinspection ResultOfMethodCallIgnored
                        dir.mkdirs();
                        File f = File.createTempFile("foto_", ".jpg", dir);
                        cameraUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".files", f);
                        intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    } catch (IOException e) {
                        cameraUri = null;
                        intent = galleryIntent();
                    }
                } else {
                    intent = galleryIntent();
                }
                try {
                    startActivityForResult(intent, REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, "Nessuna app disponibile per questa operazione", Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });

        web.addJavascriptInterface(new Bridge(), "TauriAndroid");

        pendingOpenRequests = getIntent() != null && getIntent().getBooleanExtra(EXTRA_OPEN_REQUESTS, false);
        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(START_URL);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.getBooleanExtra(EXTRA_OPEN_REQUESTS, false)) {
            pendingOpenRequests = true;
            if (pageReady) openRequestsSoon();
        }
    }

    private void openRequestsSoon() {
        pendingOpenRequests = false;
        // lascia il tempo all'accesso di completarsi
        web.postDelayed(() -> web.evaluateJavascript("window.__tauriOpenRequests && window.__tauriOpenRequests()", null), 1500);
    }

    private Intent galleryIntent() {
        Intent i = new Intent(Intent.ACTION_GET_CONTENT);
        i.setType("image/*");
        i.addCategory(Intent.CATEGORY_OPENABLE);
        return Intent.createChooser(i, "Scegli una foto");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            if (cameraUri != null) {
                result = new Uri[]{cameraUri};
            } else if (data != null && data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
        cameraUri = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private void js(String fn, String arg) {
        String code = "window." + fn + " && window." + fn + "(" + JSONObject.quote(arg == null ? "" : arg) + ")";
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    // ------------------------------------------------------------ accesso Google (Credential Manager)
    private void googleSignIn(String webClientId) {
        if (webClientId == null || webClientId.isEmpty() || webClientId.startsWith("INSERIRE")) {
            js("__tauriGoogleError", "ID client web non configurato");
            return;
        }
        GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(webClientId).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
        CredentialManager cm = CredentialManager.create(this);
        cm.getCredentialAsync(this, request, null, ContextCompat.getMainExecutor(this),
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse response) {
                        Credential c = response.getCredential();
                        if (c instanceof CustomCredential
                                && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(c.getType())) {
                            try {
                                GoogleIdTokenCredential g = GoogleIdTokenCredential.createFrom(c.getData());
                                js("__tauriGoogleToken", g.getIdToken());
                            } catch (Exception e) {
                                js("__tauriGoogleError", "risposta di Google non valida");
                            }
                        } else {
                            js("__tauriGoogleError", "tipo di credenziale non supportato");
                        }
                    }

                    @Override
                    public void onError(@NonNull GetCredentialException e) {
                        if (e instanceof GetCredentialCancellationException) js("__tauriGoogleError", "annullato");
                        else if (e instanceof NoCredentialException) js("__tauriGoogleError", "nessun account Google disponibile sul telefono");
                        else js("__tauriGoogleError", String.valueOf(e.getMessage()));
                    }
                });
    }

    private void googleSignOut() {
        CredentialManager.create(this).clearCredentialStateAsync(new ClearCredentialStateRequest(), null,
                ContextCompat.getMainExecutor(this),
                new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override
                    public void onResult(Void v) {}

                    @Override
                    public void onError(@NonNull ClearCredentialException e) {}
                });
    }

    // ------------------------------------------------------------ notifiche amministratore
    private void requestNotifyPermission() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFY);
        }
    }

    private void enableAdminWatch(String apiKey, String projectId, String refreshToken) {
        getSharedPreferences(Notifier.PREFS, Context.MODE_PRIVATE).edit()
                .putString(AdminWatchWorker.KEY_API, apiKey)
                .putString(AdminWatchWorker.KEY_PROJECT, projectId)
                .putString(AdminWatchWorker.KEY_REFRESH, refreshToken)
                .apply();
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(AdminWatchWorker.class, 15, TimeUnit.MINUTES)
                .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build();
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, req);
    }

    private void disableAdminWatch() {
        WorkManager.getInstance(this).cancelUniqueWork(WORK_NAME);
        getSharedPreferences(Notifier.PREFS, Context.MODE_PRIVATE).edit()
                .remove(AdminWatchWorker.KEY_API)
                .remove(AdminWatchWorker.KEY_PROJECT)
                .remove(AdminWatchWorker.KEY_REFRESH)
                .apply();
    }

    /** Ponte JavaScript → Android. */
    private class Bridge {
        @JavascriptInterface
        public String saveFile(String base64, String name, String mime) {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                ContentValues v = new ContentValues();
                v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Tesserini Tauri");
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (uri == null) return "Impossibile creare il file";
                try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                    if (os == null) return "Impossibile scrivere il file";
                    os.write(bytes);
                }
                return "ok";
            } catch (Exception e) {
                return "Errore salvataggio: " + e.getMessage();
            }
        }

        @JavascriptInterface
        public void shareFile(String base64, String name, String mime) {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                File dir = new File(getCacheDir(), "share");
                //noinspection ResultOfMethodCallIgnored
                dir.mkdirs();
                File f = new File(dir, name);
                try (FileOutputStream os = new FileOutputStream(f)) {
                    os.write(bytes);
                }
                final Uri uri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".files", f);
                final Intent send = new Intent(Intent.ACTION_SEND);
                send.setType(mime);
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() -> startActivity(Intent.createChooser(send, "Condividi tesserino")));
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Errore condivisione", Toast.LENGTH_LONG).show());
            }
        }

        @JavascriptInterface
        public void googleSignIn(String webClientId) {
            runOnUiThread(() -> MainActivity.this.googleSignIn(webClientId));
        }

        @JavascriptInterface
        public void googleSignOut() {
            runOnUiThread(MainActivity.this::googleSignOut);
        }

        @JavascriptInterface
        public void requestNotifyPermission() {
            runOnUiThread(MainActivity.this::requestNotifyPermission);
        }

        @JavascriptInterface
        public void notifyRequest(String uid, String who) {
            Notifier.notifyIfNew(getApplicationContext(), uid, who);
        }

        @JavascriptInterface
        public void enableAdminWatch(String apiKey, String projectId, String refreshToken) {
            MainActivity.this.enableAdminWatch(apiKey, projectId, refreshToken);
        }

        @JavascriptInterface
        public void disableAdminWatch() {
            MainActivity.this.disableAdminWatch();
        }
    }
}
