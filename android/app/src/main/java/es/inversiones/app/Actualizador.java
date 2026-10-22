package es.inversiones.app;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Build;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Baja la versión nueva de la app (el APK de las releases de GitHub) a la caché de la propia app. */
final class Actualizador {
    static final String NOMBRE = "growfolio.apk";
    private static final String[] ORIGENES = {"https://github.com/charly10sf/GrowFolio/releases/", "https://github.com/charly10sf/Inversiones/releases/"};
    private static volatile boolean bajando;

    private Actualizador() {
    }

    static File archivo(Context c) {
        File d = new File(c.getCacheDir(), "actualizacion");
        if (!d.exists()) d.mkdirs();
        return new File(d, NOMBRE);
    }

    /** Solo acepta el APK publicado en las releases del repositorio, nunca otra dirección */
    static boolean valida(String url) {
        if (url == null || !url.endsWith(".apk")) return false;
        for (String o : ORIGENES) if (url.startsWith(o)) return true;
        return false;
    }

    interface Progreso { void p(int pct); }

    static void bajar(Principal act, String url) {
        if (bajando) return;
        bajando = true;
        try {
            File f = descargar(act, url, (p) -> act.progreso(Math.min(p, 99), ""));
            act.progreso(100, "instalar");
            act.runOnUiThread(() -> act.instalar(f));
        } catch (Exception e) {
            act.progreso(-1, e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
        } finally {
            bajando = false;
        }
    }

    /** baja el APK a la caché de la app; lanza error si algo falla */
    static File descargar(Context ctx, String url, Progreso prog) throws IOException {
        if (!valida(url)) throw new IOException("dirección no válida");
        File f = archivo(ctx), tmp = new File(f.getPath() + ".parte");
        HttpURLConnection con = null;
        try {
            URL u = new URL(url);
            // GitHub redirige a otro dominio de descarga: se siguen a mano hasta 5 saltos
            for (int i = 0; i < 5; i++) {
                con = (HttpURLConnection) u.openConnection();
                con.setInstanceFollowRedirects(false);
                con.setConnectTimeout(15000);
                con.setReadTimeout(30000);
                con.setRequestProperty("User-Agent", "InversionesApp");
                int c = con.getResponseCode();
                if (c >= 300 && c < 400) {
                    String loc = con.getHeaderField("Location");
                    con.disconnect();
                    if (loc == null) throw new IOException("redirección sin destino");
                    u = new URL(u, loc);
                    if (!"https".equals(u.getProtocol())) throw new IOException("descarga sin https");
                    continue;
                }
                if (c != 200) throw new IOException("HTTP " + c);
                break;
            }
            long total = con.getContentLengthLong();
            int ultimo = -1;
            try (InputStream in = con.getInputStream(); OutputStream out = new FileOutputStream(tmp)) {
                byte[] b = new byte[65536];
                long n = 0;
                int r;
                while ((r = in.read(b)) > 0) {
                    out.write(b, 0, r);
                    n += r;
                    if (total > 0) {
                        int p = (int) (n * 100 / total);
                        if (p >= ultimo + 3) {
                            ultimo = p;
                            if (prog != null) prog.p(p);
                        }
                    }
                }
            }
            if (tmp.length() < 100000) throw new IOException("archivo incompleto");
            if (f.exists()) f.delete();
            if (!tmp.renameTo(f)) throw new IOException("no se pudo guardar");
            return f;
        } catch (IOException e) {
            tmp.delete();
            throw e;
        } finally {
            if (con != null) con.disconnect();
        }
    }

    /* 0.3.11e: la app se actualiza sola, sin preguntar. Desde Android 12, una app que se actualiza a sí misma no
       necesita que toques «Instalar» si tiene el permiso de instalar apps y declara UPDATE_PACKAGES_WITHOUT_USER_ACTION.
       Si Android aun así pide confirmación (versiones antiguas, sin ese permiso), Instalado lo apunta y se vuelve al
       aviso de siempre. */
    @android.annotation.TargetApi(31)
    static boolean instalarSolo(Context c, File apk) {
        if (Build.VERSION.SDK_INT < 31 || apk == null || !apk.exists() || !c.getPackageManager().canRequestPackageInstalls()) return false;
        try {
            PackageInstaller pi = c.getPackageManager().getPackageInstaller();
            PackageInstaller.SessionParams sp = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
            sp.setAppPackageName(c.getPackageName());
            sp.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
            int id = pi.createSession(sp);
            try (PackageInstaller.Session s = pi.openSession(id)) {
                try (InputStream in = new FileInputStream(apk); OutputStream out = s.openWrite("growfolio", 0, apk.length())) {
                    byte[] b = new byte[65536];
                    int r;
                    while ((r = in.read(b)) > 0) out.write(b, 0, r);
                    s.fsync(out);
                }
                Intent i = new Intent(c, Instalado.class).setAction(Instalado.ACCION);
                PendingIntent pend = PendingIntent.getBroadcast(c, id, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
                s.commit(pend.getIntentSender());
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** en segundo plano (el trabajo de Versiones): si hay app nueva y no la estás usando, se baja y se instala sola */
    static void autoActualizar(Context c, org.json.JSONObject app) {
        if (Build.VERSION.SDK_INT < 31 || app == null || Principal.enPantalla) return;
        android.content.SharedPreferences p = Datos.prefs(c);
        int nueva = app.optInt("version", 0);
        if (nueva <= BuildConfig.VERSION_CODE || p.getBoolean("auto_no", false) || p.getInt("auto_intento", 0) >= nueva) return;
        if (!c.getPackageManager().canRequestPackageInstalls()) return;
        p.edit().putInt("auto_intento", nueva).apply();
        try {
            File f = descargar(c, app.optString("apk", ""), null);
            if (!instalarSolo(c, f)) p.edit().putInt("auto_intento", 0).apply();
        } catch (Exception e) {
            p.edit().putInt("auto_intento", 0).apply();
        }
    }
}
