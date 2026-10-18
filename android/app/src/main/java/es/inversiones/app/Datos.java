package es.inversiones.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * Lo que enseña el widget. Dos fuentes:
 * - la foto que manda la web cada vez que está abierta (total, hoy, cantidades de cada posición, lo que toca);
 * - widget.json, que publica la Action cada 20 minutos con el precio de cada posición: con él se recalcula
 *   el valor sin abrir la app (cantidades de la foto por precios nuevos).
 * Todo se guarda en el almacenamiento privado de la app; nunca la contraseña de la cartera.
 */
final class Datos {
    static final String PRECIOS = "https://raw.githubusercontent.com/charly10sf/Inversiones/datos/widget.json";
    private static final String PREFS = "widget";

    private Datos() {}

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void guardarFoto(Context c, String json) {
        prefs(c).edit().putString("foto", json).putLong("foto_t", System.currentTimeMillis()).apply();
    }

    /** Baja los precios de la Action. Devuelve true si ha podido. */
    static boolean descargar(Context c) {
        HttpURLConnection con = null;
        try {
            con = (HttpURLConnection) new URL(PRECIOS + "?t=" + (System.currentTimeMillis() / 60000)).openConnection();
            con.setConnectTimeout(8000);
            con.setReadTimeout(8000);
            con.setRequestProperty("Cache-Control", "no-cache");
            if (con.getResponseCode() != 200) return false;
            InputStream in = con.getInputStream();
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] b = new byte[8192];
            int n;
            while ((n = in.read(b)) > 0) out.write(b, 0, n);
            JSONObject j = new JSONObject(out.toString("UTF-8"));
            long t = OffsetDateTime.parse(j.getString("generado")).toInstant().toEpochMilli();
            prefs(c).edit().putString("precios", j.getJSONObject("p").toString()).putLong("precios_t", t).putLong("bajado_t", System.currentTimeMillis()).apply();
            return true;
        } catch (Exception e) {
            return false;
        } finally {
            if (con != null) con.disconnect();
        }
    }

    static final class Mov {
        String nombre;
        double valor, dia;
    }

    static final class Resultado {
        boolean hay, oculto, conPrecios;
        double total, dia, diaPct, pl, plPct;
        String toca = "", cuando = "";
        long hora;
        List<Mov> movs = new ArrayList<>();
    }

    static Resultado calcular(Context c) {
        Resultado r = new Resultado();
        SharedPreferences p = prefs(c);
        String fotoTxt = p.getString("foto", null);
        if (fotoTxt == null) return r;
        try {
            JSONObject f = new JSONObject(fotoTxt);
            long fotoT = p.getLong("foto_t", 0);
            long preciosT = p.getLong("precios_t", 0);
            JSONObject pr = new JSONObject(p.getString("precios", "{}"));
            boolean nuevos = preciosT > fotoT;   // solo si los precios son posteriores a la última vez que abriste la app
            r.hay = true;
            r.oculto = f.optBoolean("oculto", false);
            r.toca = f.optString("toca", "");
            r.cuando = f.optString("cuando", "");
            double totalPos = 0, dia = 0;
            JSONArray pos = f.optJSONArray("pos");
            for (int k = 0; pos != null && k < pos.length(); k++) {
                JSONObject x = pos.getJSONObject(k);
                double valor = x.optDouble("valor", 0), d = x.optDouble("dia", 0);
                JSONArray q = nuevos ? pr.optJSONArray(x.optString("id")) : null;
                if (q != null && x.has("uds") && !Double.isNaN(q.optDouble(0))) {
                    double precio = q.optDouble(0), anterior = q.optDouble(1, Double.NaN);
                    valor = x.optDouble("uds") * precio;
                    d = Double.isNaN(anterior) || anterior <= 0 ? d : x.optDouble("uds") * (precio - anterior);
                    r.conPrecios = true;
                }
                totalPos += valor;
                dia += d;
                Mov m = new Mov();
                m.nombre = x.optString("n");
                m.valor = valor;
                m.dia = d;
                r.movs.add(m);
            }
            r.total = totalPos + f.optDouble("fijo", 0);
            r.dia = dia;
            r.diaPct = r.total - dia != 0 ? dia / (r.total - dia) * 100 : 0;
            double inv = f.optDouble("invertido", 0);
            r.pl = totalPos - inv;
            r.plPct = inv > 0 ? (totalPos / inv - 1) * 100 : 0;
            r.hora = r.conPrecios ? preciosT : fotoT;
            Collections.sort(r.movs, (a, b) -> Double.compare(Math.abs(b.dia), Math.abs(a.dia)));
        } catch (Exception e) {
            r.hay = false;
        }
        return r;
    }

    // ---------- números en español: 79.952 €, −0,07 % ----------
    private static DecimalFormat formato(String patron) {
        DecimalFormatSymbols s = new DecimalFormatSymbols(new Locale("es", "ES"));
        s.setGroupingSeparator('.');
        s.setDecimalSeparator(',');
        DecimalFormat f = new DecimalFormat(patron, s);
        f.setGroupingUsed(true);
        f.setGroupingSize(3);
        return f;
    }

    static String eur(double v, boolean signo) {
        String t = formato("#,##0").format(Math.abs(Math.round(v)));
        String s = v < -0.5 ? "−" : signo && v >= 0.5 ? "+" : "";
        return s + t + " €";
    }

    static String pct(double v) {
        String t = formato(Math.abs(v) < 10 ? "0.00" : "0.0").format(Math.abs(v));
        return (v < -0.0049 ? "−" : v > 0.0049 ? "+" : "") + t + " %";
    }
}
