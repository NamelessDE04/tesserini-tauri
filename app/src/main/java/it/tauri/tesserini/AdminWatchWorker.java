package it.tauri.tesserini;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Controllo periodico (circa ogni 15 minuti, anche ad app chiusa) delle richieste di accesso
 * in attesa: se ce n'è una nuova mostra la notifica all'amministratore.
 */
public class AdminWatchWorker extends Worker {

    static final String KEY_API = "apiKey";
    static final String KEY_PROJECT = "projectId";
    static final String KEY_REFRESH = "refreshToken";

    public AdminWatchWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        SharedPreferences p = ctx.getSharedPreferences(Notifier.PREFS, Context.MODE_PRIVATE);
        String apiKey = p.getString(KEY_API, null);
        String project = p.getString(KEY_PROJECT, null);
        String refresh = p.getString(KEY_REFRESH, null);
        if (apiKey == null || project == null || refresh == null) return Result.success();
        try {
            // 1) nuovo token di accesso dal refresh token dell'amministratore
            String body = "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(refresh, "UTF-8");
            Http r1 = post("https://securetoken.googleapis.com/v1/token?key=" + URLEncoder.encode(apiKey, "UTF-8"),
                    "application/x-www-form-urlencoded", body, null);
            if (r1.code == 400 || r1.code == 401 || r1.code == 403) return Result.success(); // sessione scaduta: si riattiva al prossimo accesso
            if (r1.code != 200) return Result.retry();
            JSONObject tok = new JSONObject(r1.body);
            String idToken = tok.getString("id_token");
            String newRefresh = tok.optString("refresh_token", refresh);
            if (!newRefresh.equals(refresh)) p.edit().putString(KEY_REFRESH, newRefresh).apply();

            // 2) richieste con stato "in_attesa"
            String q = "{\"structuredQuery\":{\"from\":[{\"collectionId\":\"utenti\"}],"
                    + "\"where\":{\"fieldFilter\":{\"field\":{\"fieldPath\":\"stato\"},\"op\":\"EQUAL\","
                    + "\"value\":{\"stringValue\":\"in_attesa\"}}}}}";
            Http r2 = post("https://firestore.googleapis.com/v1/projects/" + project
                    + "/databases/(default)/documents:runQuery", "application/json", q, "Bearer " + idToken);
            if (r2.code != 200) return Result.retry();
            JSONArray arr = new JSONArray(r2.body);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                JSONObject doc = o.optJSONObject("document");
                if (doc == null) continue;
                String name = doc.getString("name");
                String uid = name.substring(name.lastIndexOf('/') + 1);
                JSONObject f = doc.optJSONObject("fields");
                String email = str(f, "email"), nome = str(f, "nome");
                Notifier.notifyIfNew(ctx, uid, (nome.isEmpty() ? "" : nome + " · ") + email);
            }
            return Result.success();
        } catch (IOException e) {
            return Result.retry();
        } catch (Exception e) {
            return Result.success();
        }
    }

    private static String str(JSONObject fields, String key) {
        if (fields == null) return "";
        JSONObject v = fields.optJSONObject(key);
        return v == null ? "" : v.optString("stringValue", "");
    }

    private static final class Http {
        int code;
        String body;
    }

    private static Http post(String url, String type, String body, String auth) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod("POST");
        c.setConnectTimeout(15000);
        c.setReadTimeout(20000);
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", type);
        if (auth != null) c.setRequestProperty("Authorization", auth);
        try (OutputStream os = c.getOutputStream()) {
            os.write(body.getBytes(StandardCharsets.UTF_8));
        }
        Http h = new Http();
        h.code = c.getResponseCode();
        InputStream in = h.code >= 400 ? c.getErrorStream() : c.getInputStream();
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        if (in != null) {
            byte[] b = new byte[8192];
            int n;
            while ((n = in.read(b)) > 0) buf.write(b, 0, n);
            in.close();
        }
        h.body = buf.toString("UTF-8");
        c.disconnect();
        return h;
    }
}
