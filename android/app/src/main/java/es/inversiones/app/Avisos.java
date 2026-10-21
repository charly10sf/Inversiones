package es.inversiones.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Iterator;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

/**
 * Los avisos del móvil (solo si los activas en Ajustes > Avisos y resumen). Cada media hora, con internet, baja los
 * precios de la Action (los mismos del widget) y mira las reglas que le pasó la web la última vez que la abriste:
 * - una posición que baja de tu precio de salida, o se queda a menos de un 3 % de él;
 * - una posición que sube o baja más de un 5 % en el día;
 * - resultados o dividendos de lo tuyo mañana (a partir de las 18:00) u hoy (por la mañana);
 * - una pregunta de GrowIA que aún no has visto.
 * Cada aviso, una sola vez; de 22:00 a 8:00, nada. No necesita la contraseña de la cartera: las reglas no llevan
 * importes, solo precios.
 */
public class Avisos extends Worker {
    static final String CANAL = "avisos";
    static final String TRABAJO = "avisos";

    public Avisos(@NonNull Context c, @NonNull WorkerParameters p) {
        super(c, p);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            revisar(getApplicationContext(), true);
        } catch (Exception e) {
            // si algo falla, la próxima vez
        }
        return Result.success();
    }

    static boolean activados(Context c) {
        return Datos.prefs(c).getBoolean("avisos_on", false);
    }

    static void programar(Context c, boolean on) {
        Datos.prefs(c).edit().putBoolean("avisos_on", on).apply();
        WorkManager wm = WorkManager.getInstance(c);
        if (!on) {
            wm.cancelUniqueWork(TRABAJO);
            return;
        }
        Constraints red = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest r = new PeriodicWorkRequest.Builder(Avisos.class, 30, TimeUnit.MINUTES).setConstraints(red).build();
        wm.enqueueUniquePeriodicWork(TRABAJO, ExistingPeriodicWorkPolicy.KEEP, r);
    }

    static boolean permitidos(Context c) {
        return Build.VERSION.SDK_INT < 33 || c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    static void revisar(Context c, boolean bajar) throws Exception {
        if (!activados(c)) return;
        SharedPreferences p = Datos.prefs(c);
        String fotoTxt = p.getString("foto", null);
        if (fotoTxt == null) return;
        JSONObject av = new JSONObject(fotoTxt).optJSONObject("avisos");
        if (av == null || !av.optBoolean("on", false)) return;
        int hora = LocalTime.now().getHour();
        if (hora >= 22 || hora < 8) return;
        if (bajar && Datos.descargar(c)) Widget.actualizarTodos(c);

        JSONObject pr = new JSONObject(p.getString("precios", "{}"));
        JSONArray reglas = av.optJSONArray("reglas");
        boolean faltan = false;   // ¿algo que no está en los precios comunes (del radar o un fondo del catálogo)?
        for (int k = 0; reglas != null && k < reglas.length(); k++) {
            JSONObject x = reglas.getJSONObject(k);
            if (pr.optJSONArray(x.optString("id")) == null && (!x.optString("sym").isEmpty() || !x.optString("cid").isEmpty())) faltan = true;
        }
        if (bajar && faltan) Datos.descargarAvisos(c);
        JSONObject rp = new JSONObject(p.getString("radar_p", "{}"));
        JSONObject cp = new JSONObject(p.getString("cat_p", "{}"));
        JSONObject hechos = new JSONObject(p.getString("avisos_hechos", "{}"));
        long ahora = System.currentTimeMillis();
        for (Iterator<String> it = hechos.keys(); it.hasNext(); ) {
            if (ahora - hechos.optLong(it.next(), 0) > 10L * 86400000L) it.remove();
        }
        String hoy = LocalDate.now().toString(), manana = LocalDate.now().plusDays(1).toString();

        for (int k = 0; reglas != null && k < reglas.length(); k++) {
            JSONObject x = reglas.getJSONObject(k);
            String id = x.optString("id"), n = x.optString("n", id), sym = x.optString("sym"), cid = x.optString("cid");
            double precio = Double.NaN, cambio = Double.NaN;
            JSONArray q = pr.optJSONArray(id);
            if (q != null) {
                precio = q.optDouble(0);
                double ant = q.optDouble(1, Double.NaN);
                if (ant > 0) cambio = (precio / ant - 1) * 100;
            } else if (!sym.isEmpty() && rp.optJSONArray(sym) != null) {
                JSONArray r = rp.optJSONArray(sym);
                precio = r.optDouble(0);
                cambio = r.optDouble(1, Double.NaN);
            } else if (!cid.isEmpty() && cp.optJSONArray(cid) != null) {
                JSONArray r = cp.optJSONArray(cid);
                precio = r.optDouble(0);
                double ant = r.optDouble(1, Double.NaN);
                if (ant > 0) cambio = (precio / ant - 1) * 100;
            }
            if (Double.isNaN(precio) || precio <= 0) continue;
            double stop = x.optDouble("stop", 0);
            if (av.optBoolean("stop", true) && stop > 0) {
                if (precio <= stop) {
                    avisar(c, hechos, "stop:" + id + ":" + hoy, n + ": precio de salida roto",
                            "Está a " + eur(precio) + ", por debajo de tu salida (" + eur(stop) + "). Es lo que te dijiste que harías.", "cartera");
                } else if (precio <= stop * 1.03) {
                    avisar(c, hechos, "stopc:" + id + ":" + hoy, n + " se acerca a tu precio de salida",
                            "Está a un " + num((precio / stop - 1) * 100) + " % de " + eur(stop) + ".", "cartera");
                }
            }
            if (av.optBoolean("mov", true) && !Double.isNaN(cambio) && Math.abs(cambio) >= 5) {
                avisar(c, hechos, "mov:" + id + ":" + hoy, n + (cambio > 0 ? " sube un " : " baja un ") + num(Math.abs(cambio)) + " % hoy",
                        "Abre GrowFolio para ver qué ha pasado y qué dice GrowIA.", "cartera");
            }
        }

        JSONArray ev = av.optJSONArray("eventos");
        for (int k = 0; av.optBoolean("fechas", true) && ev != null && k < ev.length(); k++) {
            JSONObject e = ev.getJSONObject(k);
            String d = e.optString("d"), t = e.optString("t"), s = e.optString("s");
            if (d.equals(manana) && hora >= 18) avisar(c, hechos, "ev:" + e.optString("k"), "Mañana: " + t, s, "agenda");
            else if (d.equals(hoy) && hora < 13) avisar(c, hechos, "evh:" + e.optString("k"), "Hoy: " + t, s, "agenda");
        }

        JSONArray pq = av.optJSONArray("preg");
        for (int k = 0; av.optBoolean("preg", true) && pq != null && k < pq.length(); k++) {
            JSONObject x = pq.getJSONObject(k);
            avisar(c, hechos, "preg:" + x.optString("k"), "GrowIA te pregunta", x.optString("q"), "objetivos");
        }
        p.edit().putString("avisos_hechos", hechos.toString()).apply();
    }

    /** un aviso ya, si no se ha mandado antes (la clave lo dice) */
    static void avisar(Context c, JSONObject hechos, String clave, String titulo, String texto, String hash) throws Exception {
        if (hechos != null) {
            if (hechos.has(clave)) return;
            hechos.put(clave, System.currentTimeMillis());
        }
        mostrar(c, clave, titulo, texto, hash);
    }

    static void mostrar(Context c, String clave, String titulo, String texto, String hash) {
        if (!permitidos(c)) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        if (nm.getNotificationChannel(CANAL) == null) {
            NotificationChannel ch = new NotificationChannel(CANAL, "Avisos de tu cartera", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Precio de salida, movimientos fuertes, fechas de lo tuyo y preguntas de GrowIA");
            nm.createNotificationChannel(ch);
        }
        Intent i = new Intent(c, Principal.class).putExtra("hash", hash).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, clave.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, CANAL)
                .setSmallIcon(R.drawable.ic_aviso)
                .setColor(0xFFEDBB45)
                .setContentTitle(titulo)
                .setContentText(texto)
                .setStyle(new Notification.BigTextStyle().bigText(texto))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        nm.notify(clave.hashCode(), n);
    }

    private static String num(double v) {
        return String.format(new Locale("es", "ES"), "%.1f", v);
    }

    private static String eur(double v) {
        return String.format(new Locale("es", "ES"), v >= 100 ? "%,.2f €" : "%.3f €", v);
    }
}
