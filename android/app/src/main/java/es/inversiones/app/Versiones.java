package es.inversiones.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.graphics.drawable.Icon;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalTime;
import java.util.concurrent.TimeUnit;

/**
 * El aviso de las versiones nuevas: cada 3 horas, con internet, mira qué versión de GrowFolio está publicada
 * (version.json, que deja al día la Action del release) y cuál es la última app de Android (app.json). Si hay una
 * versión que aún no has abierto, un aviso con su título; si además trae app nueva, lo dice. Cada versión, un aviso.
 * Va aparte de los avisos de la cartera: viene encendido y se quita en Ajustes > Avisos y resumen (o en el canal
 * «Versiones nuevas» de Android). De 22:00 a 9:00, nada: espera a la siguiente vuelta.
 */
public class Versiones extends Worker {
    static final String CANAL = "versiones";
    static final String TRABAJO = "versiones";

    public Versiones(@NonNull Context c, @NonNull WorkerParameters p) {
        super(c, p);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            revisar(getApplicationContext());
        } catch (Exception e) {
            // si algo falla, a la próxima
        }
        return Result.success();
    }

    static boolean activados(Context c) {
        return Datos.prefs(c).getBoolean("versiones_on", true);
    }

    /** lo pone en marcha (o lo quita) según el ajuste; se llama al abrir la app y al cambiar el ajuste */
    static void programar(Context c) {
        WorkManager wm = WorkManager.getInstance(c);
        // 0.3.11e: corre aunque quites los avisos de versión, porque además actualiza la app sola
        Constraints red = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest r = new PeriodicWorkRequest.Builder(Versiones.class, 3, TimeUnit.HOURS).setConstraints(red).build();
        wm.enqueueUniquePeriodicWork(TRABAJO, ExistingPeriodicWorkPolicy.KEEP, r);
    }

    static void activar(Context c, boolean on) {
        Datos.prefs(c).edit().putBoolean("versiones_on", on).apply();
        programar(c);
    }

    /** la web, al abrirse, dice qué versión estás viendo: de esa (y de las de antes) ya no hace falta avisar */
    static void vista(Context c, String v) {
        SharedPreferences p = Datos.prefs(c);
        if (v != null && !v.isEmpty() && comparar(v, p.getString("version_vista", "")) > 0) p.edit().putString("version_vista", v).apply();
    }

    static void revisar(Context c) throws Exception {
        Datos.comprobarNombre(c);
        JSONObject a = leer(Datos.raw(c, "main", "app.json"));
        Actualizador.autoActualizar(c, a);
        if (!activados(c) || !Avisos.permitidos(c)) return;
        int hora = LocalTime.now().getHour();
        if (hora >= 22 || hora < 9) return;
        SharedPreferences p = Datos.prefs(c);
        JSONObject w = leer(Datos.raw(c, "main", "version.json"));
        boolean en = "en".equals(Datos.prefs(c).getString("idioma", "es"));
        String v = w == null ? "" : w.optString("v"), t = w == null ? "" : w.optString(en && w.has("te") ? "te" : "t");
        String vista = p.getString("version_vista", ""), avisada = p.getString("version_avisada", "");
        int app = a == null ? 0 : a.optInt("version", 0), appAvisada = p.getInt("app_avisada", 0);
        // la primera vez (recién instalada la app con esto), lo que hay ahora no es nuevo
        if (vista.isEmpty() && avisada.isEmpty()) {
            p.edit().putString("version_avisada", v).putInt("app_avisada", Math.max(app, BuildConfig.VERSION_CODE)).apply();
            return;
        }
        boolean web = !v.isEmpty() && comparar(v, vista) > 0 && comparar(v, avisada) > 0;
        boolean apk = app > BuildConfig.VERSION_CODE && app > appAvisada;
        // 0.4: con frases enteras. «GrowFolio 0.4 ya está aquí» y, debajo, lo que trae. Si viene con app nueva y ya se
        // está instalando sola (autoActualizar acaba de mandarla a Android), no se dice nada de la app: si sale bien, no
        // hay nada que hacer, y si Android pide confirmación, Instalado lo apunta y en la siguiente vuelta llega el aviso
        // de la app con lo que hay que tocar. Así ningún aviso promete algo que luego no pasa.
        boolean intentada = apk && !p.getBoolean("auto_no", false) && p.getInt("auto_intento", 0) >= app;
        boolean sola = Actualizador.puedeSola(c);
        if (web) {
            String titulo = en ? "GrowFolio " + v + " is here" : "GrowFolio " + v + " ya está aquí";
            String lo = t.isEmpty() ? "" : t + ". ";
            String texto = !apk || intentada ? lo + (en ? "Open it to see what's new." : "Ábrela para ver qué hay de nuevo.")
                    : sola ? lo + (en ? "There's a new app too: it installs itself when you're not using it, or tap Update." : "También hay app nueva: se instala sola cuando no la estés usando, o toca Actualizar.")
                    : lo + (en ? "There's a new app too: tap Update and it installs over this one, without losing anything." : "También hay app nueva: toca Actualizar y se instala encima, sin perder nada.");
            mostrar(c, "version:" + v, v, titulo, texto, apk && !intentada, en);
        } else if (apk && !intentada) {
            mostrar(c, "app:" + app, null, en ? "New version of the app" : "Versión nueva de la app",
                    sola ? (en ? "It installs itself when you're not using it, or tap Update. Nothing is lost." : "Se instala sola cuando no la estés usando, o toca Actualizar. No se pierde nada.")
                            : (en ? "Tap Update: it downloads and installs over the current one without losing anything." : "Toca Actualizar: se baja y se instala encima sin perder nada."), true, en);
        }
        SharedPreferences.Editor e = p.edit();
        if (web) e.putString("version_avisada", v);
        if (apk && !intentada) e.putInt("app_avisada", app);
        e.apply();
    }

    /** app.json (la última versión de la app y dónde está su APK), para «Actualizar» desde el aviso */
    static JSONObject app(Context c) {
        return leer(Datos.raw(c, "main", "app.json"));
    }

    private static JSONObject leer(String url) {
        HttpURLConnection con = null;
        try {
            con = (HttpURLConnection) new URL(url + "?t=" + (System.currentTimeMillis() / 60000)).openConnection();
            con.setConnectTimeout(8000);
            con.setReadTimeout(8000);
            con.setRequestProperty("Cache-Control", "no-cache");
            if (con.getResponseCode() != 200) return null;
            InputStream in = con.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] b = new byte[4096];
            int n;
            while ((n = in.read(b)) > 0) out.write(b, 0, n);
            return new JSONObject(out.toString("UTF-8"));
        } catch (Exception e) {
            return null;
        } finally {
            if (con != null) con.disconnect();
        }
    }

    /** 0.3.10 va después de 0.3.9: se comparan los números uno a uno; con los mismos números, la letra de las de
        arreglos (0.3.9 < 0.3.9a < 0.3.9b), igual que cmpVer en la web */
    static int comparar(String a, String b) {
        String[] x = a.split("\\."), y = b.isEmpty() ? new String[0] : b.split("\\.");
        for (int k = 0; k < Math.max(x.length, y.length); k++) {
            int i = k < x.length ? num(x[k]) : 0, j = k < y.length ? num(y[k]) : 0;
            if (i != j) return Integer.compare(i, j);
        }
        return Integer.signum(letra(a).compareTo(letra(b)));
    }

    private static String letra(String s) {
        int i = s.length();
        while (i > 0 && Character.isLetter(s.charAt(i - 1))) i--;
        return s.substring(i);
    }

    private static int num(String s) {
        try {
            return Integer.parseInt(s.replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            return 0;
        }
    }

    /** el aviso; con app nueva, un botón «Actualizar» que abre GrowFolio y empieza a bajarla (y tocar el aviso de la app,
     *  lo mismo) */
    private static void mostrar(Context c, String clave, String v, String titulo, String texto, boolean conApp, boolean en) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        if (nm.getNotificationChannel(CANAL) == null) {
            NotificationChannel ch = new NotificationChannel(CANAL, "Versiones nuevas", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Cuando sale una versión nueva de GrowFolio, con lo que trae");
            nm.createNotificationChannel(ch);
        }
        Intent i = new Intent(c, Principal.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (v != null) i.putExtra("version", true).putExtra("v", v); else i.putExtra("actualizarApp", true);
        PendingIntent pi = PendingIntent.getActivity(c, clave.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder nb = new Notification.Builder(c, CANAL)
                .setSmallIcon(R.drawable.ic_aviso)
                .setColor(0xFFEDBB45)
                .setContentTitle(titulo)
                .setContentText(texto)
                .setStyle(new Notification.BigTextStyle().bigText(texto))
                .setContentIntent(pi)
                .setAutoCancel(true);
        if (conApp) {
            Intent ia = new Intent(c, Principal.class).putExtra("actualizarApp", true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pa = PendingIntent.getActivity(c, (clave + ":app").hashCode(), ia, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            nb.addAction(new Notification.Action.Builder(Icon.createWithResource(c, R.drawable.ic_aviso), en ? "Update" : "Actualizar", pa).build());
        }
        nm.notify(clave.hashCode(), nb.build());
    }
}
