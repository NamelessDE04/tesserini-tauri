package it.tauri.tesserini;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.HashSet;
import java.util.Set;

/** Notifiche "nuova richiesta di accesso" per l'amministratore. */
final class Notifier {
    static final String PREFS = "tauri_watch";
    private static final String CHANNEL = "richieste";
    private static final String SEEN = "seen";

    private Notifier() {}

    /** Mostra la notifica solo se questa richiesta non è già stata notificata. */
    static synchronized void notifyIfNew(Context ctx, String uid, String who) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> seen = new HashSet<>(p.getStringSet(SEEN, new HashSet<>()));
        if (seen.contains(uid)) return;
        seen.add(uid);
        p.edit().putStringSet(SEEN, seen).apply();
        show(ctx, uid.hashCode(), "Nuova richiesta di accesso", who);
    }

    static void show(Context ctx, int id, String title, String text) {
        NotificationManagerCompat nm = NotificationManagerCompat.from(ctx);
        if (!nm.areNotificationsEnabled()) return;
        NotificationManager sys = ctx.getSystemService(NotificationManager.class);
        if (sys != null && sys.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Richieste di accesso", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Avvisa quando qualcuno chiede di usare l'app");
            sys.createNotificationChannel(ch);
        }
        Intent open = new Intent(ctx, MainActivity.class);
        open.putExtra(MainActivity.EXTRA_OPEN_REQUESTS, true);
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 7, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_notify)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(text + "\nTocca per approvare o rifiutare."))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setColor(0xFFC8B68A)
                .setAutoCancel(true)
                .setContentIntent(pi);
        try {
            nm.notify(id, b.build());
        } catch (SecurityException ignored) {
            // permesso notifiche non concesso
        }
    }
}
